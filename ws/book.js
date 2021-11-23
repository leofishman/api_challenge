/*
Bitfinex ws Api from:
https://docs.bitfinex.com/reference#ws-public-books

USAGE:
npm install ws lodash async moment crc-32
mkdir logs
node bfx_test_book.js BTCUSD
*/

// set the BOOK object with the proper values or error 

const WS = require('ws')
const _ = require('lodash')
const moment = require('moment')
const CRC = require('crc-32')
const { result } = require('lodash')
require('dotenv').config();

const conf = {
  wshost:  process.env.EXCHANGE_WS_URL || 'wss://api.bitfinex.com/ws/2',
}

let BOOK = [];

let connected = false
let connecting = false
let cli
let seq = null

// TODO: Move this function to a service
function get_pair_index(msg) {
  return _.findKey(BOOK, (o) => { return o.channel_id === msg[0] });
}

function connect () {
  if (connecting || connected) return
  connecting = true

  cli = new WS(conf.wshost, { /* rejectUnauthorized: false */ })

  cli.on('open', function open () {
    console.log('WS open ')
    connecting = false
    connected = true

    // Bulk updates with a flag value of 536870912. 
    // With bulk updates enabled, updates will arrive as an array of arrays.
    cli.send(JSON.stringify({ event: 'conf', flags: 65536 + 131072 }))

    // Subscribe to the orderbook for every pair
    const validPairs =  process.env.validPairs ? process.env.validPairs.split(", ") : ['BTCUSD', 'ETHUSD'];
    validPairs.forEach( (pair) => {
        BOOK[pair] = {};
        BOOK[pair].bids = {};
        BOOK[pair].asks = {};
        BOOK[pair].psnap = {};
        BOOK[pair].mcnt = 0;
        BOOK[pair].channel_id = 0;
        cli.send(JSON.stringify({ event: 'subscribe', channel: 'book', pair: pair, prec: 'P0', len: 100 }));
      });
  })

  cli.on('close', function open () {
    seq = null
    console.log('WS close')
    connecting = false
    connected = false
  })

  cli.on('message', function (msg) {
    msg = JSON.parse(msg)
    if (msg.event == 'subscribed') {
      // Asign the channel id to the pair array element
      BOOK[msg.pair].channel_id = msg.chanId;
    }

  // TODO:
  // handle info events
  // Info Codes

  // 20051 : Stop/Restart Websocket Server (please reconnect)
  // 20060 : Entering in Maintenance mode. Please pause any activity and resume after receiving the info message 20061 (it should take 120 seconds at most).
  // 20061 : Maintenance ended. You can resume normal activity. It is advised to unsubscribe/subscribe again all channels.
  // Only rely on 'CODE' for 'info' events

    if (msg.event) return
    if (msg[1] === 'hb') {
      connected = true;
      seq = +msg[2]
      return
    } else if (msg[1] === 'cs') {
      seq = +msg[3]

      // find which pair has channel_id in BOOK
      const pair_index = get_pair_index(msg);
      if (!pair_index) return

      const checksum = msg[2]
      const csdata = []
      const bids_keys = BOOK[pair_index].psnap['bids']
      const asks_keys = BOOK[pair_index].psnap['asks']

      for (let i = 0; i < 25; i++) {
        if (bids_keys[i]) {
          const price = bids_keys[i]
          const pp = BOOK[pair_index].bids[price]
          csdata.push(pp.price, pp.amount)
        }
        if (asks_keys[i]) {
          const price = asks_keys[i]
          const pp = BOOK[pair_index].asks[price]
          csdata.push(pp.price, -pp.amount)
        }
      }

      const cs_str = csdata.join(':')
      const cs_calc = CRC.str(cs_str)

      if (cs_calc !== checksum) {
        console.error('CHECKSUM_FAILED')
        connected = false;
        connecting = false;
        return;
        // process.exit(-1)
      }
      connected = true;
      return
    }

    // find which pair has channel_id in BOOK
    const pair_index =  get_pair_index(msg);
    if (!pair_index) return

    // psnap = price snapshot
    // csdata = checksum data
    // mcnt = message count
    if (BOOK[pair_index].mcnt === 0) {
      _.each(msg[1], function (pp) {
        pp = { price: pp[0], cnt: pp[1], amount: pp[2] }
        const side = pp.amount >= 0 ? 'bids' : 'asks'
        pp.amount = Math.abs(pp.amount)
        BOOK[pair_index][side][pp.price] = pp
      })
    } else {
      const cseq = +msg[2]
      msg = msg[1]

      if (!seq) {
        seq = cseq - 1
      }

      if (cseq - seq !== 1 ) {
        console.error('OUT OF SEQUENCE', seq, cseq, cseq - seq);
        connected = false;
        connecting = false;
        // process.exit()
      }

      seq = cseq

      let pp = { price: msg[0], cnt: msg[1], amount: msg[2] }

      if (!pp.cnt) {
        let found = true

        if (pp.amount > 0) {
          if (BOOK[pair_index]['bids'][pp.price]) {
            delete BOOK[pair_index]['bids'][pp.price]
          } else {
            found = false
          }
        } else if (pp.amount < 0) {
          if (BOOK[pair_index]['asks'][pp.price]) {
            delete BOOK[pair_index]['asks'][pp.price]
          } else {
            found = false
          }
        }

      } else {
        let side = pp.amount >= 0 ? 'bids' : 'asks'
        pp.amount = Math.abs(pp.amount)
        BOOK[pair_index][side][pp.price] = pp
      }
    }

    _.each(['bids', 'asks'], function (side) {
      let sbook = BOOK[pair_index][side]
      let bprices = Object.keys(sbook)

      let prices = bprices.sort(function (a, b) {
        if (side === 'bids') {
          return +a >= +b ? -1 : 1
        } else {
          return +a <= +b ? -1 : 1
        }
      })

      BOOK[pair_index].psnap[side] = prices
    })

    BOOK[pair_index].mcnt++

  })
}

setInterval(function () {
  // 3.5 seconds interval for reconnection in order to avoid passing the limit
  if (connected) return
  connect()
}, 3500)

connect();

// TODO: Move this function to a service
function get_price(op, pair, ordersize) {
  let result = false;
  let amount = 0;
  if (connected) {
    pair = pair.replace(/[^a-zA-Z]/g, '').toUpperCase();
    op.includes('buy') ? op = 'bids' : op.includes('sell') ? op = 'asks' : result = {'error' : 'invalid operation'};
    // check if order size is a float number
    if (ordersize.match(/^[0-9]*\.?[0-9]+$/) && ordersize > 0) {
        amount = parseFloat(ordersize);
    } else {
      result = {'error' : 'invalid order size'};
    }

    if (result) return result;

    if (BOOK[pair] && BOOK[pair][op]) {
      let price = 0;
      let levels = 0;
      // for each price in the book add the price until reaching the amount
      _.forEach(BOOK[pair][op], function (pp) {
        levels++;
        if (amount > 0) {
          if (amount >= pp.amount) {
            amount -= pp.amount
            price += pp.price * pp.amount
          } else {
            //TODO: Check that there is data in the orderbook
            if (pp.price > 0) {
              price += amount * pp.price
              amount = 0
            } else {
              return {'error': 'no data'};
            }
          }
        }
      });
      if (levels > 0) {
        if (amount > 0) {
          return {'error': 'no enoguh offer for this size'};
        }
        return price;
      } else {
        return {'error': 'no data'};
      }    
    } else {
      return {'error': 'no data'};
    }     
  } else {
    return {'error': 'not connected'}
  }
  
}
 

// TODO: Move this function to a service
function get_orderbook(pair) {
  if (connected) {
    pair = pair.replace(/[^a-zA-Z]/g, '').toUpperCase();
      
    if (BOOK[pair].psnap) {
      return { 
        'asks': BOOK[pair].psnap.asks[0],
        'bids': BOOK[pair].psnap.bids[0],
      }
    } else {
      return {
        'error': 'No orderbook available'
      } 
    }
  } else {
    return {
      'error': 'Not connected'
    }
  }

  return result;
} 

module.exports = { get_price, get_orderbook }