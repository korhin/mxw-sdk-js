
import { BigNumber } from '../utils/bignumber';
import { isType, setType } from '../utils/properties';

///////////////////////////////
// Imported Types

import { Arrayish } from '../utils/bytes';
import { BigNumberish } from '../utils/bignumber';
import { Network } from '../utils/networks';
import { OnceBlockable } from '../utils/web';
import { Transaction } from '../utils/transaction';

///////////////////////////////
// Exported Types

export interface Status {
    type: string,
    value: {
        address: string,
        coins: [
            {
                denom: string,
                amount: BigNumberish,
            }
        ],
        public_key: {
            type: string,
            value: string
        },
        account_number: BigNumberish,
        sequence: BigNumberish,
    }
};

export interface AccountState {
    type: string,
    value: {
        address: string,
        coins: [
            {
                denom: string,
                amount: BigNumberish,
            }
        ],
        public_key: {
            type: string,
            value: string
        },
        account_number: BigNumberish,
        sequence: BigNumberish,
    }
};

export interface Block {
    blockMeta: {
        blockId: BlockId,
        header: BlockHeader
    },
    block: {
        header: BlockHeader
        data: {
            txs: any
        },
        evidence: {
            evidence: any
        },
        last_commit: {
            block_id: BlockId,
            precommits: Array<PreCommit>
        }
    }
};

export type BlockTag = string | number;

export type Filter = {
    fromBlock?: BlockTag,
    toBlock?: BlockTag,
    address?: string,
    topics?: Array<string | Array<string>>,
}

export interface BlockId {
    hash: string,
    parts: {
        total: number,
        hash: string
    }
};

export interface BlockHeader {
    version: {
        block: number,
        app: number
    },
    chainId: string,
    height: number,
    time: string,
    numTxs: number,
    totalTxs: number,
    lastBlockId: {
        hash: string,
        parts: {
            total: number,
            hash: string
        }
    },
    lastCommitHash: string,
    dataHash?: string,
    validatorsHash: string,
    nextValidatorsHash: string,
    consensusHash: string,
    appHash: string,
    lastResultsHash?: string,
    evidenceHash?: string,
    proposerAddress: string
};

export interface PreCommit {
    type: number,
    height: number,
    round: number,
    timestamp: string,
    block_id: BlockId,
    validator_address: string,
    validator_index: number,
    signature: string
};

export interface TransactionReceipt {
    blockNumber?: number,
    confirmations?: number,
    status?: number
};

export type TransactionRequest = {
    to?: string | Promise<string>,
    from?: string | Promise<string>,
    nonce?: BigNumberish | Promise<BigNumberish>,

    gasLimit?: BigNumberish | Promise<BigNumberish>,
    gasPrice?: BigNumberish | Promise<BigNumberish>,

    data?: Arrayish | Promise<Arrayish>,
    value?: BigNumberish | Promise<BigNumberish>,
    chainId?: number | Promise<number>,
};

export interface TransactionResponse extends Transaction {
    // Only if a transaction has been mined
    blockNumber?: number,
    blockHash?: string,
    timestamp?: number,

    confirmations: number,

    // Not optional (as it is in Transaction)
    from: string;

    // The raw transaction
    raw?: string,

    // This function waits until the transaction has been mined
    wait: (confirmations?: number) => Promise<TransactionReceipt>
};

export type EventType = string | Array<string> | Filter;

export type Listener = (...args: Array<any>) => void;

///////////////////////////////
// Exported Abstracts

export abstract class Provider implements OnceBlockable {
    abstract getNetwork(): Promise<Network>;

    abstract getBlockNumber(): Promise<number>;

    abstract getStatus(): Promise<Status>;
    abstract getAccountState(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<AccountState>;
    abstract getAccountNumber(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<BigNumber>;
    abstract getBalance(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<BigNumber>;

    abstract getTransactionCount(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<BigNumber>;
    // abstract getCode(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string>;
    // abstract getStorageAt(addressOrName: string | Promise<string>, position: BigNumberish | Promise<BigNumberish>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string>;

    abstract sendTransaction(signedTransaction: string | Promise<string>): Promise<TransactionResponse>;
    // abstract call(transaction: TransactionRequest, blockTag?: BlockTag | Promise<BlockTag>): Promise<string>;
    abstract estimateGas(transaction: TransactionRequest): Promise<BigNumber>;

    // abstract getBlock(blockHashOrBlockTag: BlockTag | string | Promise<BlockTag | string>, includeTransactions?: boolean): Promise<Block>;
    // abstract getTransaction(transactionHash: string): Promise<TransactionResponse>;
    // abstract getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt>;

    // abstract getLogs(filter: Filter | FilterByBlock): Promise<Array<Log>>;

    abstract isWhitelisted(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string>;
    
    abstract resolveName(name: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string>;
    abstract lookupAddress(address: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<string>;
    abstract on(eventName: EventType, listener: Listener): Provider;
    abstract once(eventName: EventType, listener: Listener): Provider;
    // abstract listenerCount(eventName?: EventType): number;
    // abstract listeners(eventName: EventType): Array<Listener>;
    // abstract removeAllListeners(eventName: EventType): Provider;
    // abstract removeListener(eventName: EventType, listener: Listener): Provider;

    // // @TODO: This *could* be implemented here, but would pull in events...
    // abstract waitForTransaction(transactionHash: string, timeout?: number): Promise<TransactionReceipt>;

    constructor() {
        setType(this, 'Provider');
    }

    static isProvider(value: any): value is Provider {
        return isType(value, 'Provider');
    }

    //    readonly inherits: (child: any) => void;
}

//defineReadOnly(Signer, 'inherits', inheritable(Abstract));

