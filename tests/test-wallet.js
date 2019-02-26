'use strict';

const { expect } = require('chai');

let utils = require('./utils');
let mxw = utils.getMxw(__filename);
let wallet = undefined;
let indent = "     ";

describe('Suite: Wallet', function () {
    it("Wallet.createRandom", function () {
        let randomWallet = mxw.Wallet.createRandom();
        expect(randomWallet).to.exist;
        console.log(indent, "Wallet:", JSON.stringify(randomWallet));
    });

    it("Wallet.fromMnemonic", function () {
        wallet = mxw.Wallet.fromMnemonic("skill forget expose useful ball toe useful deliver property stumble faint comic");
        expect(wallet).to.exist;
        console.log(indent, "Wallet:", JSON.stringify(wallet));
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
            console.log(indent, "Balance:", balance.toString(), "(" + wallet.address + ")");
        }).catch(error => {
            console.log("error:", error);
        });
    });
});
