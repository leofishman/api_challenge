const express = require('express');
const api = express.Router();
const { get_book } = require('../ws/book');


let BTCUSD = get_book('BTCUSD')
let ETHUSD = get_book('ETHUSD')

api.get('/', (req, res) => {
    res.json({'app':'Lattice API V1'});
});

api.get('/price/:op/:pair/:size',(req, res) => {
    validatepair(req.params.pair) ? res.json({'op': req.params.op,'pair': req.params.pair, 'size': req.params.size, ETHUSD, BTCUSD}) : res.json({'error':'invalid pair'});
});

api.get('/orderbook/:pair', (req, res) => {
    validatepair(req.params.pair) ? res.json({'pair': req.params.pair, books}) : res.json({'error':'invalid pair'});
});

function validatepair(pair){
    pair = pair.replace(/[^a-zA-Z]/g, '');
    console.log(pair);
    return global.validPairs.includes(pair.toUpperCase());
}

module.exports = api;