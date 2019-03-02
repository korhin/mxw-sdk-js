'use strict';

// See: https://github.com/ethereum/wiki/wiki/JSON-RPC

import { BaseProvider } from './base-provider';

import { Signer } from '../abstract-signer';

import * as errors from '../errors';

import { getAddress } from '../utils/address';
import { BigNumber } from '../utils/bignumber';
import { hexlify, hexStripZeros } from '../utils/bytes';
import { getNetwork } from '../utils/networks';
import { checkProperties, resolveProperties, defineReadOnly, shallowCopy } from '../utils/properties';
import { toUtf8String } from '../utils/utf8';
import { fetchJson, } from '../utils/web';
import { decode as base64Decode } from '../utils/base64';
import { encode as bech32Encode, toWords as bech32ToWords } from '../utils/bech32';
import { computeHexAddress } from '../utils/secp256k1';

// Imported Types
import { Arrayish } from '../utils/bytes';
import { Network, Networkish } from '../utils/networks';
import { ConnectionInfo, poll } from '../utils/web';

import { BlockTag, TransactionRequest, TransactionResponse, TransactionFee } from '../providers/abstract-provider';
import { AddressPrefix } from '../constants';

// function timer(timeout: number): Promise<any> {
//     return new Promise(function (resolve) {
//         setTimeout(function () {
//             resolve();
//         }, timeout);
//     });
// }

function getResult(payload: { error?: { code?: number, data?: any, message?: string }, result?: any }): any {
    if (payload.error) {
        // @TODO: not any
        let error: any = new Error(payload.error.message);
        error.code = payload.error.code;
        error.data = payload.error.data;
        throw error;
    }

    return payload.result;
}

function getLowerCase(value: string): string {
    if (value) { return value.toLowerCase(); }
    return value;
}

const _constructorGuard = {};

export class JsonRpcSigner extends Signer {
    readonly provider: JsonRpcProvider;
    private _index: number;
    private _address: string;

    constructor(constructorGuard: any, provider: JsonRpcProvider, addressOrIndex?: string | number) {
        super();
        errors.checkNew(this, JsonRpcSigner);

        if (constructorGuard !== _constructorGuard) {
            throw new Error('do not call the JsonRpcSigner constructor directly; use provider.getSigner');
        }

        defineReadOnly(this, 'provider', provider);

        // Statically attach to a given address
        if (addressOrIndex) {
            if (typeof (addressOrIndex) === 'string') {
                defineReadOnly(this, '_address', getAddress(addressOrIndex));
            } else if (typeof (addressOrIndex) === 'number') {
                defineReadOnly(this, '_index', addressOrIndex);
            } else {
                errors.throwError('invalid address or index', errors.INVALID_ARGUMENT, { argument: 'addressOrIndex', value: addressOrIndex });
            }
        } else {
            defineReadOnly(this, '_index', 0);
        }
    }

    getAddress(): Promise<string> {
        return Promise.resolve(this._address);
    }

    getBalance(blockTag?: BlockTag): Promise<BigNumber> {
        return this.provider.getBalance(this.getAddress(), blockTag);
    }

    getTransactionCount(blockTag?: BlockTag): Promise<BigNumber> {
        return this.provider.getTransactionCount(this.getAddress(), blockTag);
    }

    resolveName(name: string | Promise<string>): Promise<string> {
        return this.provider.resolveName(name);
    }

    lookupAddress(address: string | Promise<string>): Promise<string> {
        return this.provider.lookupAddress(address);
    }

    sendUncheckedTransaction(transaction: TransactionRequest): Promise<string> {
        transaction = shallowCopy(transaction);

        let fromAddress = this.getAddress().then((address) => {
            if (address) { address = address.toLowerCase(); }
            return address;
        });

        return Promise.all([
            resolveProperties(transaction),
            fromAddress
        ]).then((results) => {
            let tx = results[0];
            let hexTx = JsonRpcProvider.hexlifyTransaction(tx);
            hexTx.from = results[1];
            return this.provider.send('sendTransaction', [hexTx]).then((hash) => {
                return hash;
            }, (error) => {
                if (error.responseText) {
                    // See: JsonRpcProvider.sendTransaction (@TODO: Expose a ._throwError??)
                    if (error.responseText.indexOf('insufficient funds') >= 0) {
                        errors.throwError('insufficient funds', errors.INSUFFICIENT_FUNDS, {
                            transaction: tx
                        });
                    }
                    if (error.responseText.indexOf('nonce too low') >= 0) {
                        errors.throwError('nonce has already been used', errors.NONCE_EXPIRED, {
                            transaction: tx
                        });
                    }
                    if (error.responseText.indexOf('replacement transaction underpriced') >= 0) {
                        errors.throwError('replacement fee too low', errors.REPLACEMENT_UNDERPRICED, {
                            transaction: tx
                        });
                    }
                }
                throw error;
            });
        });
    }

    sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
        return this.sendUncheckedTransaction(transaction).then((hash) => {
            return poll(() => {
                return this.provider.getTransaction(hash).then((tx: TransactionResponse) => {
                    if (tx === null) { return undefined; }
                    return this.provider._wrapTransaction(tx, hash);
                });
            }, { onceBlock: this.provider }).catch((error: Error) => {
                (<any>error).transactionHash = hash;
                throw error;
            });
        });
    }

    signMessage(message: Arrayish | string): Promise<string> {
        let method = "signMessage";
        return errors.throwError(method + ' not implemented', errors.NOT_IMPLEMENTED, { operation: method });
    }
}

const allowedTransactionKeys: { [key: string]: boolean } = {
    chainId: true, data: true, gasLimit: true, gasPrice: true, nonce: true, to: true, value: true
}

export class JsonRpcProvider extends BaseProvider {
    readonly connection: ConnectionInfo;

    // private _pendingFilter: Promise<number>;

    constructor(url?: ConnectionInfo | string, network?: Networkish) {

        // One parameter, but it is a network name, so swap it with the URL
        if (typeof (url) === 'string') {
            if (network === null && getNetwork(url)) {
                network = url;
                url = null;
            }
        }

        if (network) {
            // The network has been specified explicitly, we can use it
            super(network);

        } else {

            // The network is unknown, query the JSON-RPC for it
            let ready: Promise<Network> = new Promise((resolve, reject) => {
                setTimeout(() => {
                    this.send('net_version', []).then((result) => {
                        return resolve(getNetwork(parseInt(result)));
                    }).catch((error) => {
                        reject(error);
                    });
                });
            });
            super(ready);
        }

        errors.checkNew(this, JsonRpcProvider);

        // Default URL
        if (!url) { url = 'http://localhost:26657'; }

        if (typeof (url) === 'string') {
            this.connection = {
                url: url
            };
        } else {
            this.connection = url;
        }

    }

    getSigner(addressOrIndex?: string | number): JsonRpcSigner {
        return new JsonRpcSigner(_constructorGuard, this, addressOrIndex);
    }

    send(method: string, params: any): Promise<any> {
        let request = {
            method: method,
            params: params,
            id: 42,
            jsonrpc: "2.0"
        };

        return fetchJson(this.connection, JSON.stringify(request), getResult).then((result) => {
            this.emit('debug', {
                action: 'send',
                request: request,
                response: result,
                provider: this
            });
            return result;
        });
    }

    perform(method: string, params: any): Promise<any> {
        switch (method) {
            case 'sendTransaction':
                return this.send('broadcast_tx_commit', [params.signedTransaction]).then((result) => {
                    if (result.deliver_tx && result.deliver_tx.log) {
                        try {
                            let logs = JSON.parse(result.deliver_tx.log);
                            if (0 < logs.length) {
                                if (logs[0].success)
                                    return result;
                            }
                        }
                        catch (error) {
                            return errors.throwError(method + ' invalid json response', errors.INVALID_ARGUMENT, { operation: method, response: result });
                        }
                    }

                    throw result;

                }).catch((error) => {
                    if (error.check_tx && error.check_tx.log) {
                        // "KYC registration is required"
                        if (0 < error.check_tx.log.indexOf('all signers must pass kyc')) {
                            errors.throwError('KYC registration is required', errors.KYC_REQUIRED, { operation: method, response: error });
                        }
                        // insufficient funds to pay for fees
                        if (0 < error.check_tx.log.indexOf('insufficient funds to pay for fees')) {
                            errors.throwError('insufficient funds for fees', errors.INSUFFICIENT_FUNDS, { operation: method, response: error });
                        }
                    }
                    throw error;
                });

            case 'isWhitelisted':
                return this.send('abci_query', ["/custom/kyc/is_whitelisted/" + params.address, "", params.blockTag, null]).then(result => {
                    if (result && result.response) {
                        if (result.response.value) {
                            try {
                                let value = base64Decode(result.response.value);
                                return ("True" === toUtf8String(value));
                            }
                            catch (error) {
                            }
                        }
                        else {
                            if (7 /* not whitelisted */ == result.response.code)
                                return false;
                        }
                    }

                    return errors.throwError(method + ' invalid json response', errors.INVALID_ARGUMENT, { operation: method, response: result });
                });

            case 'getStatus':
                return this.send('status', []);

            case 'getTransactionFee':
                // TODO: To be confirmed
                return Promise.resolve(<TransactionFee>{
                    amount: [
                        {
                            amount: '100000000',
                            denom: 'siu',
                        },
                    ],
                    gas: '200000'
                });

            case 'getAccountState':
                return this.send('abci_query', ["/store/acc/key", getLowerCase('01' + computeHexAddress(params.address).substring(2)), params.blockTag, null]).then(result => {
                    if (result && result.response) {
                        if (result.response.value) {
                            try {
                                let value = base64Decode(result.response.value);
                                return JSON.parse(toUtf8String(value));
                            }
                            catch (error) {
                            }
                        }

                        return null;
                    }

                    return errors.throwError(method + ' invalid json response', errors.INVALID_ARGUMENT, { operation: method, response: result });
                });

            case 'resolveName':
                return this.send('abci_query', ["/custom/nameservice/resolve/" + params.name, "", params.blockTag, null]).then(result => {
                    if (result && result.response) {
                        if (result.response.value) {
                            try {
                                let value = base64Decode(result.response.value);
                                return bech32Encode(AddressPrefix, bech32ToWords(value));
                            }
                            catch (error) {
                            }
                        }
                        else {
                            switch (result.response.code) {
                                case 6: // could not resolve name
                                    return errors.throwError('could not resolve name', errors.NOT_AVAILABLE, { operation: method, response: result });
                                case 7: // name not set
                                    return errors.throwError('name is not registered', errors.NOT_REGISTERED, { operation: method, response: result });
                            }
                        }
                    }

                    return errors.throwError(method + ' invalid json response', errors.INVALID_ARGUMENT, { operation: method, response: result });
                });

            case 'lookupAddress':
                return this.send('abci_query', ["/custom/nameservice/whois/" + params.address, "", params.blockTag, null]).then(result => {
                    if (result && result.response) {
                        if (result.response.value) {
                            try {
                                let value = base64Decode(result.response.value);
                                return toUtf8String(value);
                            }
                            catch (error) {
                            }
                        }
                        else {
                            switch (result.response.code) {
                                case 6: // could not resolve address
                                    return errors.throwError('could not resolve address', errors.NOT_AVAILABLE, { operation: method, response: result });
                                case 7: // address not set
                                    return errors.throwError('name is not registered', errors.NOT_REGISTERED, { operation: method, response: result });
                            }
                        }
                    }

                    return errors.throwError(method + ' invalid json response', errors.INVALID_ARGUMENT, { operation: method, response: result });
                });

            case 'getBlock':
                return this.send('block', [params.blockTag]);

            case 'getTransaction':
                return this.send('tx', [params.transactionHash, null]);

            case 'getTransactionReceipt':
                return this.send('tx', [params.transactionHash, null]);

            // case 'call':
            //     return this.send('eth_call', [JsonRpcProvider.hexlifyTransaction(params.transaction, { from: true }), params.blockTag]);

            // case 'estimateGas':
            //     return this.send('eth_estimateGas', [JsonRpcProvider.hexlifyTransaction(params.transaction, { from: true })]);

            // case 'getLogs':
            //     if (params.filter && params.filter.address != null) {
            //         params.filter.address = getLowerCase(params.filter.address);
            //     }
            //     return this.send('eth_getLogs', [params.filter]);

            default:
                break;
        }

        errors.throwError(method + ' not implemented', errors.NOT_IMPLEMENTED, { operation: method });
        return null;
    }

    // protected _startPending(): void {
    //     if (this._pendingFilter != null) { return; }
    //     let self = this;

    //     let pendingFilter: Promise<number> = this.send('eth_newPendingTransactionFilter', []);
    //     this._pendingFilter = pendingFilter;

    //     pendingFilter.then(function (filterId) {
    //         function poll() {
    //             self.send('eth_getFilterChanges', [filterId]).then(function (hashes: Array<string>) {
    //                 if (self._pendingFilter != pendingFilter) { return null; }

    //                 let seq = Promise.resolve();
    //                 hashes.forEach(function (hash) {
    //                     // @TODO: This should be garbage collected at some point... How? When?
    //                     self._emitted['t:' + hash.toLowerCase()] = 'pending';
    //                     seq = seq.then(function () {
    //                         return self.getTransaction(hash).then(function (tx) {
    //                             self.emit('pending', tx);
    //                             return null;
    //                         });
    //                     });
    //                 });

    //                 return seq.then(function () {
    //                     return timer(1000);
    //                 });
    //             }).then(function () {
    //                 if (self._pendingFilter != pendingFilter) {
    //                     self.send('eth_uninstallFilter', [filterId]);
    //                     return;
    //                 }
    //                 setTimeout(function () { poll(); }, 0);

    //                 return null;
    //             }).catch((error: Error) => { });
    //         }
    //         poll();

    //         return filterId;
    //     }).catch((error: Error) => { });
    // }

    // protected _stopPending(): void {
    //     this._pendingFilter = null;
    // }

    // Convert transaction into a JSON-RPC transaction
    //  - gasLimit => gas
    //  - All values hexlified
    //  - All numeric values zero-striped
    // NOTE: This allows a TransactionRequest, but all values should be resolved
    //       before this is called
    static hexlifyTransaction(transaction: TransactionRequest, allowExtra?: { [key: string]: boolean }): { [key: string]: string } {

        // Check only allowed properties are given
        let allowed = shallowCopy(allowedTransactionKeys);
        if (allowExtra) {
            for (let key in allowExtra) {
                if (allowExtra[key]) { allowed[key] = true; }
            }
        }
        checkProperties(transaction, allowed);

        let result: { [key: string]: string } = {};

        // TODO

        // // Some nodes (INFURA ropsten; INFURA mainnet is fine) don't like leading zeros.
        // ['gasLimit', 'gasPrice', 'nonce', 'value'].forEach(function (key) {
        //     if ((<any>transaction)[key] == null) { return; }
        //     let value = hexStripZeros(hexlify((<any>transaction)[key]));
        //     if (key === 'gasLimit') { key = 'gas'; }
        //     result[key] = value;
        // });

        // ['id', 'to', 'data'].forEach(function (key) {
        //     if ((<any>transaction)[key] == null) { return; }
        //     result[key] = hexlify((<any>transaction)[key]);
        // });

        return result;
    }
}
