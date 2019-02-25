'use strict';

var assert = require('assert');
const { expect } = require('chai');

var utils = require('./utils');
var mxw = utils.getMxw(__filename);

describe('Suite: Constants', function () {
    it("constant variables should exists", function () {
        let constants = mxw.constants;
        expect(constants).to.exist;
    });
});
