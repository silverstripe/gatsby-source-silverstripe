const API = require('./API');

let inst = {};

module.exports.initialise = (params) => {
    inst = new API(params);
}

module.exports.inst = () => inst;