'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw } from '../src.ts/index';

let indent = "     ";

describe('Suite: Provider', function () {
    let provider = new mxw.providers.JsonRpcProvider("http://node-1.testnet.space:26657", {
        chainId: "mxw",
        name: 'mxw'
    });

    it("Provider.getStatus", function () {
        return provider.getStatus().then((status) => {
            console.log(indent, "Status:", status);
        });
    });

    it("Provider.resolveName", function () {
        return provider.resolveName("js").then((address) => {
            console.log(indent, "Resolve name:", address ? address : "<EMPTY>");
        });
    });

    it("Provider.lookupAddress", function () {
        return provider.lookupAddress("mxw1jmyd57jkjt0n63uzgwed290qv0fmwwdxr5w9jk").then((name) => {
            console.log(indent, "Lookup Address:", name ? name : "<EMPTY>");
        });
    });

    it("Provider.isWhitelisted", function () {
        return provider.isWhitelisted("mxw1qj75krmwsug5le85quhxjmy4pjj2uh9mmyaqdv").then((name) => {
            console.log(indent, "Lookup Address:", name ? name : "<EMPTY>");
        });
    });

    it("Provider.getTransactionFee", function () {
        return provider.getTransactionFee().then((transactionFee) => {
            console.log(indent, "transactionFee:", transactionFee ? transactionFee : "<EMPTY>");
        });
    });
});
