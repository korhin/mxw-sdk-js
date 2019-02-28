'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw } from '../src.ts/index';

let indent = "     ";

describe('Suite: Provider', function () {
    let provider = new mxw.providers.JsonRpcProvider("http://node-1.testnet.space:26657", {
        chainId: 1,
        name: 'mxw'
    });

    it("Provider.resolveName", function () {
        return provider.resolveName("jss").then((address) => {
            console.log(indent, "Resolve name:", address ? address : "<EMPTY>");
        });
    });

    it("Provider.lookupAddress", function () {
        return provider.lookupAddress("mxw1qj75krmwsug5le85quhxjmy4pjj2uh9mmyaqda").then((name) => {
            console.log(indent, "Lookup Address:", name ? name : "<EMPTY>");
        });
    });
});
