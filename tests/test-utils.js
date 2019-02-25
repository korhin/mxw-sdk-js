'use strict';

var assert = require('assert');
const { expect } = require('chai');

var utils = require('./utils');
var mxw = utils.getMxw(__filename);

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
