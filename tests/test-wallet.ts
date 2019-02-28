'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw } from '../src.ts/index';

let indent = "     ";

let wallet: mxw.Wallet;
let encryptedWallet = "";

describe('Suite: Wallet', function () {
    it("Wallet.createRandom", function () {
        let randomWallet = mxw.Wallet.createRandom();
        expect(randomWallet).to.exist;
        // console.log(indent, "Wallet:", JSON.stringify(randomWallet));
    });

    it("Wallet.fromMnemonic", function () {
        wallet = mxw.Wallet.fromMnemonic("skill forget expose useful ball toe useful deliver property stumble faint comic");
        expect(wallet).to.exist;
        // console.log(indent, "Wallet:", JSON.stringify(wallet));
    });

    it("Wallet.connect JSON RPC provider", function () {
        wallet = wallet.connect(new mxw.providers.JsonRpcProvider("http://node-1.testnet.space:26657", {
            chainId: 1,
            name: 'mxw'
        }));

        expect(wallet).to.exist;
    });

    it("Wallet.getBalance", function () {
        return wallet.getBalance().then((balance) => {
            expect(balance).to.exist;
            // console.log(indent, "Balance:", balance.toString(), "(" + wallet.address + ")");
        });
    });

    it("Wallet.getTransactionCount", function () {
        return wallet.getTransactionCount().then((nonce) => {
            expect(nonce).to.exist;
            // console.log(indent, "Nonce:", nonce.toString(), "(" + wallet.address + ")");
        });
    });

    it("Wallet.signMessage", function () {
        let message = "MAXONROW";
        return wallet.signMessage(message).then((signedMessage) => {
            expect(signedMessage).to.exist;
            console.log(indent, "signedMessage:", signedMessage);
        });
    });

    it("Wallet.encrypt", function () {
        return wallet.encrypt("ABC").then((encrypted) => {
            expect(encrypted).to.exist;
            encryptedWallet = encrypted;
            // console.log(indent, "Encrypted Wallet:", encryptedWallet);
        });
    });

    it("Wallet.fromEncryptedJson", function () {
        return mxw.Wallet.fromEncryptedJson(encryptedWallet, "ABC").then((wallet)=>{
            expect(wallet).to.exist;
            // console.log(indent, "Clear Wallet:", wallet);    
        });
    });
});
