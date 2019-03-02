
import { Zero } from '../constants';

import * as errors from '../errors';

import { BigNumber, bigNumberify } from './bignumber';
import { arrayify, hexlify, splitSignature, stripZeros, joinSignature, isArrayish } from './bytes';
import { checkProperties, resolveProperties, shallowCopy } from './properties';
import { encode as base64Encode, decode as base64Decode } from './base64';
import { toUtf8Bytes, toUtf8String } from './utf8';
// import * as RLP from './rlp';


///////////////////////////////
// Imported Types

import { Arrayish, Signature } from './bytes';
import { BigNumberish } from './bignumber';
import { isUndefinedOrNullOrEmpty } from '.';

import { Provider, TransactionFee } from '../providers/abstract-provider';
import { sha256 } from './sha2';

///////////////////////////////
// Exported Types

export type UnsignedTransaction = {
    type?: string,
    value?: {
        msg?: Array<{ type: string, value: any }>,
        fee?: {
            amount?: Array<{ denom: string, amount: BigNumberish }>,
            gas: BigNumberish
        },
        memo?: string
    }
}

export interface Transaction {
    type?: string,
    value?: {
        msg?: Array<{ type: string, value: any }>,
        fee?: TransactionFee | Promise<TransactionFee>,
        signatures?: Array<
            {
                publicKey: {
                    type: string,
                    value: string
                },
                signature: string
            }
        >,
        memo?: string
    }
    checkTransaction?: {
        gasWanted?: BigNumberish;
        gasUsed?: BigNumberish;
    }
    deliverTransaction?: {
        log?: string;
        gasWanted?: BigNumberish;
        gasUsed?: BigNumberish
        tags?: Array<{ key: string; value: string }>
    }
    hash?: string;
    blockNumber?: number;
}

///////////////////////////////

// function handleAddress(value: string): string {
//     if (value === '0x') { return null; }
//     return getAddress(value);
// }

function handleNumber(value: string): number {
    if (value === '0x') { return bigNumberify(value).toNumber(); }
    return parseInt(value);
}

function handleBigNumber(value: string): BigNumber {
    if (value === '0x') { return Zero; }
    return bigNumberify(value);
}

const transactionFields: Array<{ name: string, length?: number, maxLength?: number }> = [
    { name: 'type' }, { name: 'value' }
];

const allowedTransactionKeys: { [key: string]: boolean } = {
    type: true, value: true, nonce: true, chainId: true, fee: true,
    check_tx: true, deliver_tx: true, hash: true, height: true
}

const allowedTransactionValueKeys: { [key: string]: boolean } = {
    type: true, msg: true, fee: true, signatures: true, memo: true
}

function checkTransaction(transaction: any): void {
    checkProperties(transaction, allowedTransactionKeys);
    if (transaction.value)
        checkProperties(transaction.value, allowedTransactionValueKeys);
}

export function serialize(unsignedTransaction: UnsignedTransaction, signature?: Arrayish | Signature, publicKey?: string): string {
    checkTransaction(unsignedTransaction);

    if (!signature) { return base64Encode(toUtf8Bytes(JSON.stringify(unsignedTransaction))); }

    if (!unsignedTransaction.value)
        return errors.throwError('invalid unsigned transaction', errors.INVALID_ARGUMENT, { arg: 'unsignedTransaction', value: unsignedTransaction });

    let transaction: Transaction = {};

    transactionFields.forEach(function (fieldInfo) {
        let value = (<any>unsignedTransaction)[fieldInfo.name] || ([]);

        // Fixed-width field
        if (fieldInfo.length && value.length !== fieldInfo.length && value.length > 0) {
            errors.throwError('invalid length for ' + fieldInfo.name, errors.INVALID_ARGUMENT, { arg: ('transaction' + fieldInfo.name), value: value });
        }

        // Variable-width (with a maximum)
        if (fieldInfo.maxLength) {
            value = stripZeros(value);
            if (value.length > fieldInfo.maxLength) {
                errors.throwError('invalid length for ' + fieldInfo.name, errors.INVALID_ARGUMENT, { arg: ('transaction' + fieldInfo.name), value: value });
            }
        }

        transaction[fieldInfo.name] = 'object' === typeof value ? shallowCopy(value) : value;
    });

    if (!transaction.value.signatures)
        transaction.value.signatures = [];

    transaction.value.signatures.push(<any>{
        // Have to match the endpoint defined naming convention
        pub_key: {
            type: "tendermint/PubKeySecp256k1",
            value: base64Encode(publicKey)
        },
        signature: isArrayish(signature) ? signature : joinSignature(signature)
    });

    return base64Encode(toUtf8Bytes(JSON.stringify(transaction)));
}

export function parse(rawTransaction: any): Transaction {
    let tx: Transaction = {};

    if ("string" === typeof rawTransaction) {
        try {
            tx.hash = sha256(rawTransaction);
            rawTransaction = toUtf8String(base64Decode(rawTransaction));
            rawTransaction = JSON.parse(rawTransaction);
        }
        catch (error) {
            errors.throwError('invalid raw transaction', errors.INVALID_ARGUMENT, { arg: 'rawTransactin', value: rawTransaction });
        }
    }

    checkTransaction(rawTransaction);

    if (rawTransaction.type) {
        tx.type = rawTransaction.type;
        tx.value = rawTransaction.value;
    }
    else {
        if (!rawTransaction.check_tx) {
            tx.checkTransaction = {
                gasWanted: handleBigNumber(rawTransaction.check_tx.gasWanted),
                gasUsed: handleBigNumber(rawTransaction.check_tx.gasUsed)
            }
        }

        if (!rawTransaction.deliver_tx) {
            tx.deliverTransaction = {
                log: rawTransaction.deliver_tx.log,
                gasWanted: handleBigNumber(rawTransaction.deliver_tx.gasWanted),
                gasUsed: handleBigNumber(rawTransaction.deliver_tx.gasUsed),
                tags: []
            }

            if (!rawTransaction.deliver_tx.tags) {
                for (let tag of rawTransaction.deliver_tx.tags) {
                    tx.deliverTransaction.tags.push({
                        key: tag.key,
                        value: tag.value
                    });
                }
            }
        }

        tx.hash = rawTransaction.hash;
        tx.blockNumber = handleNumber(rawTransaction.height);
    }

    return tx;
}

export function populateTransaction(transaction: any, provider: Provider, from: string | Promise<string>): Promise<Transaction> {
    if (!Provider.isProvider(provider)) {
        errors.throwError('missing provider', errors.INVALID_ARGUMENT, {
            argument: 'provider',
            value: provider
        });
    }

    checkTransaction(transaction);

    let tx = shallowCopy(transaction);

    if (null == tx.nonce) {
        tx.nonce = provider.getTransactionCount(from);
    }

    if (null == tx.fee) {
        tx.fee = provider.getTransactionFee();
    }

    if (null == tx.chainId) {
        tx.chainId = provider.getNetwork().then((network) => network.chainId);
    }

    return resolveProperties(tx);
}
