function getMxw(filename) {
    let instance = require('../dist/index.js');
    console.log('Loaded local mxw: ' + filename);
    return instance;
}

module.exports = getMxw;
