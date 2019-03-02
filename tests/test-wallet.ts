'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw } from '../src.ts/index';

let indent = "     ";

let wallet: mxw.Wallet;
let encryptedWallet = "";

describe('Suite: Wallet', function () {
    // it("Wallet.createRandom", function () {
    //     let randomWallet = mxw.Wallet.createRandom();
    //     expect(randomWallet).to.exist;
    //     // console.log(indent, "Wallet:", JSON.stringify(randomWallet));
    // });

    it("Wallet.fromMnemonic", function () {
        wallet = mxw.Wallet.fromMnemonic("skill forget expose useful ball toe useful deliver property stumble faint comic");
        expect(wallet).to.exist;
        console.log(indent, "Wallet:", JSON.stringify(wallet));
    });

    it("Wallet.connect JSON RPC provider", function () {
        wallet = wallet.connect(new mxw.providers.JsonRpcProvider("http://node-1.testnet.space:26657", {
            chainId: "mxw",
            name: 'mxw'
        }));

        expect(wallet).to.exist;
    });

    // it("Wallet.sendTransaction", function () {
    //     let transaction: mxw.providers.TransactionRequest = {
    //         type: "auth/StdTx",
    //         value: {
    //             msg: [
    //                 {
    //                     type: "kyc/Whitelist",
    //                     value: {
    //                         owner: wallet.address,
    //                         target: wallet.address
    //                     }
    //                 }
    //             ],
    //             memo: ""
    //         },
    //         fee: wallet.provider.getTransactionFee()
    //     };

    //     return wallet.sendTransaction(transaction).then((receipt) => {
    //         expect(receipt).to.exist;
    //         console.log(indent, "Receipt:", JSON.stringify(receipt, null, 2));
    //     });
    // });

    // it("Wallet.whitelist", function () {
    //     return wallet.whitelist("js").then((receipt) => {
    //         expect(receipt).to.exist;
    //         console.log(indent, "receipt:", JSON.stringify(receipt));
    //     });
    // });

    // it("Wallet.isWhitelisted", function () {
    //     return wallet.isWhitelisted().then((whitelisted) => {
    //         expect(whitelisted).to.exist;
    //         // console.log(indent, "Whitelisted:", whitelisted.toString());
    //     });
    // });

    // it("Wallet.setName", function () {
    //     return wallet.setName("js").then((receipt) => {
    //         expect(receipt).to.exist;
    //         console.log(indent, "receipt:", JSON.stringify(receipt));
    //     });
    // });

    it("Wallet.faucet", function () {
        return wallet.faucet("1000000000").then((receipt) => {
            expect(receipt).to.exist;
            console.log(indent, "receipt:", JSON.stringify(receipt));
        });
    });

    // it("Wallet.getAccountNumber", function () {
    //     return wallet.getAccountNumber().then((accountNumber) => {
    //         expect(accountNumber).to.exist;
    //         console.log(indent, "AccountNumber:", accountNumber.toString(), "(" + wallet.address + ")");
    //     });
    // });

    it("Wallet.getBalance", function () {
        return wallet.getBalance().then((balance) => {
            expect(balance).to.exist;
            console.log(indent, "Balance:", balance.toString(), "(" + wallet.address + ")");
        });
    });

    it("Wallet.transfer", function () {
        return wallet.transfer("mxw1hlcxdc2d5qh2760tynmmennfpdzx55h2j2lyvd", "100000000").then((receipt) => {
            expect(receipt).to.exist;
            console.log(indent, "receipt:", JSON.stringify(receipt,null,2));
        });
    });

    // it("Wallet.getTransactionCount", function () {
    //     return wallet.getTransactionCount().then((nonce) => {
    //         expect(nonce).to.exist;
    //         // console.log(indent, "Nonce:", nonce.toString(), "(" + wallet.address + ")");
    //     });
    // });

    // it("Wallet.signMessage", function () {
    //     let message = "MAXONROW";
    //     return wallet.signMessage(message).then((signature) => {
    //         expect(signature).to.exist;
    //         console.log(indent, "signature:", signature);
    //         console.log(indent, "by:", mxw.utils.verifyMessage(message, signature));
    //     });
    // });

    // it("Wallet.encrypt", function () {
    //     return wallet.encrypt("ABC").then((encrypted) => {
    //         expect(encrypted).to.exist;
    //         encryptedWallet = encrypted;
    //         // console.log(indent, "Encrypted Wallet:", encryptedWallet);
    //     });
    // });

    // it("Wallet.fromEncryptedJson", function () {
    //     return mxw.Wallet.fromEncryptedJson(encryptedWallet, "ABC").then((wallet) => {
    //         expect(wallet).to.exist;
    //         // console.log(indent, "Clear Wallet:", wallet);    
    //     });
    // });
});
