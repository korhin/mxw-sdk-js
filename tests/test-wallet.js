'use strict';

const { expect } = require('chai');

let utils = require('./utils');
let mxw = utils.getMxw(__filename);
let wallet = undefined;

describe('Suite: Wallet', function () {
    it("Test createRandom", function () {
        let randomWallet = mxw.Wallet.createRandom();
        expect(randomWallet).to.exist;
        // console.log("randomWallet:", JSON.stringify(randomWallet, null, 2));
    });
// new: skill forget expose useful ball toe useful deliver property stumble faint comic
// exists: staff forward sentence jump mean summer rescue mule cart wet diet churn
    it("Test fromMnemonic", function () {
        wallet = mxw.Wallet.fromMnemonic("skill forget expose useful ball toe useful deliver property stumble faint comic");
        expect(wallet).to.exist;
        // console.log("wallet:", JSON.stringify(wallet, null, 2));
    });

    it("Test wallet provider", function () {
        wallet = wallet.connect(new mxw.providers.JsonRpcProvider("http://node-1.testnet.space:26657", {
            chainId: 1,
            name: 'mxw'
        }));

        expect(wallet).to.exist;
        // console.log("wallet:", JSON.stringify(wallet, null, 2));
    });

    it("Test getBalance", function () {
        return wallet.getBalance().then((balance) => {
            expect(balance).to.exist;
            console.log("Balance:", balance.toString());
        }).catch(error => {
            console.log("error:", error);
        });
    });
});
