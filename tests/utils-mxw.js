var assert = require('assert');

function getMxw(filename) {
    let instance = require('../dist/index');
    console.log('Loaded local mxw: ' + filename);
    return instance;
}

module.exports = getMxw;
