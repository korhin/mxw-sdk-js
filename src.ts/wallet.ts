'use strict';

import { arrayify, concat, joinSignature } from './utils/bytes';
import { BigNumber, BigNumberish } from './utils/bignumber';
import { hashMessage } from './utils/hash';
import { defaultPath, HDNode, entropyToMnemonic, fromMnemonic } from './utils/hdnode';
import { isCrowdsaleWallet, isSecretStorageWallet } from './utils/json-wallet';
import { defineReadOnly, resolveProperties, shallowCopy, deepCopy } from './utils/properties';
import { randomBytes } from './utils/random-bytes';
import * as secretStorage from './utils/secret-storage';
import { SigningKey } from './utils/signing-key';
import { populateTransaction, serialize as serializeTransaction } from './utils/transaction';
import { Wordlist } from './utils/wordlist';
import { sha256 } from './utils/sha2';

// Imported Abstracts
import { Signer as AbstractSigner } from './abstract-signer';
import { Provider } from './providers/abstract-provider';

// Imported Types
import { ProgressCallback } from './utils/secret-storage';
import { Arrayish } from './utils/bytes';
import { BlockTag, TransactionRequest, TransactionResponse } from './providers/abstract-provider';

import * as errors from './errors';
import { ZeroFee } from './constants';
import { toUtf8Bytes } from './utils';

export class Wallet extends AbstractSigner {

    readonly provider: Provider;
    readonly accountNumber: BigNumber;

    private readonly signingKey: SigningKey;

    constructor(privateKey: SigningKey | HDNode | Arrayish, provider?: Provider) {
        super();
        errors.checkNew(this, Wallet);

        // Make sure we have a valid signing key
        if (SigningKey.isSigningKey(privateKey)) {
            defineReadOnly(this, 'signingKey', privateKey);
        } else {
            defineReadOnly(this, 'signingKey', new SigningKey(privateKey));
        }

        defineReadOnly(this, 'provider', provider);
    }

    get address(): string { return this.signingKey.address; }

    get mnemonic(): string { return this.signingKey.mnemonic; }
    get path(): string { return this.signingKey.path; }

    get privateKey(): string { return this.signingKey.privateKey; }
    get compressedPublicKey(): string { return this.signingKey.compressedPublicKey; }


    /**
     *  Create a new instance of this Wallet connected to provider.
     */
    connect(provider: Provider): Wallet {
        if (!(Provider.isProvider(provider))) {
            errors.throwError('invalid provider', errors.INVALID_ARGUMENT, { argument: 'provider', value: provider });
        }
        return new Wallet(this.signingKey, provider);
    }

    getAddress(): Promise<string> {
        return Promise.resolve(this.address);
    }

    sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
        if (!this.provider) { throw new Error('missing provider'); }

        if (transaction.nonce == null) {
            transaction = shallowCopy(transaction);
            transaction.nonce = this.getTransactionCount("pending");
        }

        return populateTransaction(transaction, this.provider, this.address).then((tx) => {
            return this.sign(tx).then((signedTransaction) => {
                return this.provider.sendTransaction(signedTransaction);
            });
        });
    }

    sign(transaction: TransactionRequest): Promise<string> {
        return resolveProperties(transaction).then((tx) => {
            if (!tx.value) {
                errors.throwError('missing transaction field', errors.MISSING_ARGUMENT, { argument: 'value', value: tx });
            }

            if (!tx.value.fee) {
                tx.value.fee = transaction.fee;
            }

            return this.getAccountNumber().then((accountNumber) => {
                let payload = {
                    account_number: accountNumber.toString() || '0',
                    chain_id: tx.chainId,
                    fee: tx.fee,
                    memo: tx.value.memo,
                    msgs: [],
                    sequence: '0'
                }

                // This is a hacks!! It should be copy exactly from tx.value.msg
                if (tx.value.msg) {
                    for (let msg of tx.value.msg) {
                        if ("cosmos-sdk/Send" !== msg.type) {
                            if ("mint/mint" !== msg.type)
                                payload.msgs.push(msg.value);
                            else {
                                payload.msgs.push({
                                    amount: Number(msg.value.amount),
                                    requester: msg.value.requester
                                });
                            }
                        }
                        else {
                            payload.msgs.push(msg);
                        }
                    }
                }

                if (tx.nonce)
                    payload.sequence = tx.nonce.toString();

                let bytes = toUtf8Bytes(JSON.stringify(payload));
                let hash = arrayify(sha256(bytes));
                let signature = this.signingKey.signDigest(hash);
                return serializeTransaction(tx, signature, this.compressedPublicKey);
            });
        });
    }

    signMessage(message: Arrayish | string): Promise<string> {
        return Promise.resolve(joinSignature(this.signingKey.signDigest(hashMessage(message))));
    }

    getBalance(blockTag?: BlockTag): Promise<BigNumber> {
        if (!this.provider) { throw new Error('missing provider'); }
        return this.provider.getBalance(this.address, blockTag);
    }

    getAccountNumber(blockTag?: BlockTag): Promise<BigNumber> {
        if (!this.provider) { throw new Error('missing provider'); }

        if (!this.accountNumber) {
            return this.provider.getAccountNumber(this.address, blockTag).then((accountNumber) => {
                defineReadOnly(this, 'accountNumber', accountNumber);
                return Promise.resolve(this.accountNumber);
            });
        }

        return Promise.resolve(this.accountNumber);
    }

    getTransactionCount(blockTag?: BlockTag): Promise<BigNumber> {
        if (!this.provider) { throw new Error('missing provider'); }
        return this.provider.getTransactionCount(this.address, blockTag);
    }

    transfer(addressOrName: string | Promise<string>, value: BigNumberish, overrides?: any): Promise<TransactionResponse> {
        if (!this.provider) { throw new Error('missing provider'); }

        if (addressOrName instanceof Promise) {
            return addressOrName.then((address) => {
                return this.transfer(address, value, overrides);
            });
        }

        return this.provider.resolveName(addressOrName).then((address) => {
            let transaction: TransactionRequest = {
                type: "auth/StdTx",
                value: {
                    msg: [
                        {
                            type: "cosmos-sdk/Send",
                            value: {
                                amount: [
                                    {
                                        amount: value.toString(),
                                        denom: (overrides && overrides.denom) ? overrides.denom : "siu",
                                    },
                                ],
                                from_address: this.address,
                                to_address: addressOrName,
                            },
                        }
                    ],
                    memo: (overrides && overrides.memo) ? overrides.memo : ""
                },
                fee: (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee()
            };

            return this.sendTransaction(transaction);
        });
    }

    whitelist(addressOrName: string | Promise<string>, overrides?: any): Promise<TransactionResponse> {
        if (!this.provider) { throw new Error('missing provider'); }

        if (addressOrName instanceof Promise) {
            return addressOrName.then((address) => {
                return this.whitelist(address, overrides);
            });
        }

        return this.provider.resolveName(addressOrName).then((address) => {
            let transaction: TransactionRequest = {
                type: "auth/StdTx",
                value: {
                    msg: [
                        {
                            type: "kyc/Whitelist",
                            value: {
                                owner: this.address,
                                target: address
                            }
                        }
                    ],
                    memo: (overrides && overrides.memo) ? overrides.memo : ""
                },
                fee: (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee()
            };

            return this.sendTransaction(transaction);
        });
    }

    isWhitelisted(blockTag?: BlockTag): Promise<Boolean> {
        if (!this.provider) { throw new Error('missing provider'); }
        return this.provider.isWhitelisted(this.address, blockTag);
    }

    setName(name: string | Promise<string>, overrides?: any): Promise<TransactionResponse> {
        if (!this.provider) { throw new Error('missing provider'); }

        if (name instanceof Promise) {
            return name.then((name) => {
                return this.whitelist(name, overrides);
            });
        }

        let transaction: TransactionRequest = {
            type: "auth/StdTx",
            value: {
                msg: [
                    {
                        type: "nameservice/SetAlias",
                        value: {
                            owner: this.address,
                            alias: name,
                        }
                    }
                ],
                memo: (overrides && overrides.memo) ? overrides.memo : ""
            },
            fee: (overrides && overrides.fee) ? overrides.fee : this.provider.getTransactionFee()
        };

        return this.sendTransaction(transaction);
    }

    faucet(value: BigNumberish | Promise<BigNumberish>, overrides?: any): Promise<TransactionResponse> {
        if (!this.provider) { throw new Error('missing provider'); }

        if (value instanceof Promise) {
            return value.then((value) => {
                return this.faucet(value, overrides);
            });
        }

        let transaction: TransactionRequest = {
            type: "auth/StdTx",
            value: {
                msg: [
                    {
                        type: "mint/mint",
                        value: {
                            amount: value.toString(),
                            requester: this.address
                        }
                    }
                ],
                memo: (overrides && overrides.memo) ? overrides.memo : ""
            },
            fee: ZeroFee
        };

        return this.sendTransaction(transaction);
    }

    encrypt(password: Arrayish | string, options?: any, progressCallback?: ProgressCallback): Promise<string> {
        if (typeof (options) === 'function' && !progressCallback) {
            progressCallback = options;
            options = {};
        }

        if (progressCallback && typeof (progressCallback) !== 'function') {
            throw new Error('invalid callback');
        }

        if (!options) { options = {}; }

        if (this.mnemonic) {
            // Make sure we don't accidentally bubble the mnemonic up the call-stack
            options = shallowCopy(options);

            // Set the mnemonic and path
            options.mnemonic = this.mnemonic;
            options.path = this.path
        }

        return secretStorage.encrypt(this.privateKey, password, options, progressCallback);
    }


    /**
     *  Static methods to create Wallet instances.
     */
    static createRandom(options?: any): Wallet {
        var entropy: Uint8Array = randomBytes(16);

        if (!options) { options = {}; }

        if (options.extraEntropy) {
            entropy = arrayify(sha256(concat([entropy, options.extraEntropy])).substring(0, 34));
        }

        var mnemonic = entropyToMnemonic(entropy, options.locale);
        return Wallet.fromMnemonic(mnemonic, options.path, options.locale);
    }

    static fromEncryptedJson(json: string, password: Arrayish, progressCallback?: ProgressCallback): Promise<Wallet> {
        if (isCrowdsaleWallet(json)) {
            try {
                if (progressCallback) { progressCallback(0); }
                let privateKey = secretStorage.decryptCrowdsale(json, password);
                if (progressCallback) { progressCallback(1); }
                return Promise.resolve(new Wallet(privateKey));
            } catch (error) {
                return Promise.reject(error);
            }

        } else if (isSecretStorageWallet(json)) {

            return secretStorage.decrypt(json, password, progressCallback).then(function (signingKey) {
                return new Wallet(signingKey);
            });
        }

        return Promise.reject('invalid wallet JSON');
    }

    static fromMnemonic(mnemonic: string, path?: string, wordlist?: Wordlist): Wallet {
        if (!path) { path = defaultPath; }
        return new Wallet(fromMnemonic(mnemonic, wordlist).derivePath(path));
    }
}
