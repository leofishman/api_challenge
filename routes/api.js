const express = require('express');
const api = express.Router();
const { get_price, get_orderbook } = require('../ws/book');


api.get('/', (req, res) => {
    res.json({'app':'Lattice API V1'});
});

api.get('/price/:op/:pair/:size',(req, res) => {
    // Create function to get price 
    validatepair(req.params.pair)
     ? res.json({
         'op': req.params.op,'pair': req.params.pair, 'size': req.params.size,
         'price (usd)': get_price( req.params.op, req.params.pair, req.params.size)
     }) 
     : res.json({'error':'invalid pair'});
});

api.get('/orderbook/:pair', (req, res) => {
    validatepair(req.params.pair)
     ? res.json({'pair': req.params.pair, value: get_orderbook(req.params.pair)})
     : res.json({'error':'invalid pair'});
});

function validatepair(pair){
    pair = pair.replace(/[^a-zA-Z]/g, '');
    return global.validPairs.includes(pair.toUpperCase());
}

module.exports = api;