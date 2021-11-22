const express = require('express');
const api = express.Router();
const { get_book, get_orderbook } = require('../ws/book');


//  let BTCUSD = get_book('BTCUSD')
//  let ETHUSD = get_book('ETHUSD')

api.get('/', (req, res) => {
    res.json({'app':'Lattice API V1'});
});

api.get('/price/:op/:pair/:size',(req, res) => {
    validatepair(req.params.pair)
     ? res.json({'op': req.params.op,'pair': req.params.pair, 'size': req.params.size, 'pair': get_book(req.params.pair) }) 
     : res.json({'error':'invalid pair'});
});

api.get('/orderbook/:pair', (req, res) => {
    validatepair(req.params.pair)
     ? res.json({'pair': req.params.pair, value: get_orderbook(req.params.pair)})
     : res.json({'error':'invalid pair'});
});

function validatepair(pair){
    pair = pair.replace(/[^a-zA-Z]/g, '');
    console.log(pair);
    return global.validPairs.includes(pair.toUpperCase());
}

module.exports = api;