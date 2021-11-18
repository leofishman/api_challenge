const express = require('express');
const api = express.Router();

const validPairs = [
    'BTC-USD',
    'ETH-USD'
];

api.get('/', (req, res) => {
    res.json({'app':'Lattice API V1'});
});

api.get('/price/:op/:pair/:size',(req, res) => {
    validatepair(req.params.pair) ? res.json({'op': req.params.op,'pair': req.params.pair, 'size': req.params.size}) : res.json({'error':'invalid pair'});
});

api.get('/orderbook/:pair', (req, res) => {
    validatepair(req.params.pair) ? res.json({'pair': req.params.pair}) : res.json({'error':'invalid pair'});
});

function validatepair(pair){
    return validPairs.includes(pair.toUpperCase());
}

module.exports = api;