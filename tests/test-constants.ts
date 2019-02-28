'use strict';

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mxw } from '../src.ts/index';

describe('Suite: Constants', function () {
    it("constant variables should exists", function () {
        let constants = mxw.constants;
        expect(constants).to.exist;
    });
});
