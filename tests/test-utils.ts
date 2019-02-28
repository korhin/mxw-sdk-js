'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw } from '../src.ts/index';

describe('Suite: Utils', function () {
    it("Test bytes", function () {
        expect(mxw.utils.isHexString("0x01")).to.be.true;
    });

    it("Test properties", function () {
        let abc = {
            a:1,
            b: "123"
        };
        let def = mxw.utils.shallowCopy(abc);
        expect(def).to.exist;
    });
});
