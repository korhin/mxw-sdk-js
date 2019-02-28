import { mxw } from '../dist/index';

function getMxw(filename) {

    let instance = mxw; //require('../dist/index.js');
    console.log('Loaded local mxw: ' + filename);
    return instance;
}

module.exports = getMxw;
