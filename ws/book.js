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
const fs = require('fs')
const moment = require('moment')
const CRC = require('crc-32')

// const pair = 'BTCUSD'; //process.argv[2]

const conf = {
  wshost: "wss://api.bitfinex.com/ws/2"
}

const book = [];


let BOOK = [];

let connected = false
let connecting = false
let cli
let seq = null

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

    cli.send(JSON.stringify({ event: 'conf', flags: 65536 + 131072 }))
    global.validPairs.forEach( (pair) => {
        console.log(pair, BOOK)
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
      BOOK[msg.pair].channel_id = msg.chanId;
    }

  // handle info events
  // Info Codes

  // 20051 : Stop/Restart Websocket Server (please reconnect)
  // 20060 : Entering in Maintenance mode. Please pause any activity and resume after receiving the info message 20061 (it should take 120 seconds at most).
  // 20061 : Maintenance ended. You can resume normal activity. It is advised to unsubscribe/subscribe again all channels.
  // Only rely on 'CODE' for 'info' events

    if (msg.event) return
    if (msg[1] === 'hb') {
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

//        fs.appendFileSync(logfile, '[' + moment().format('YYYY-MM-DDTHH:mm:ss.SSS') + '] ' + pair + ' | ' + JSON.stringify(['cs_string=' + cs_str, 'cs_calc=' + cs_calc, 'server_checksum=' + checksum]) + '\n')
      if (cs_calc !== checksum) {
        console.error('CHECKSUM_FAILED')
        process.exit(-1)
      }
      return
    }

//      fs.appendFileSync(logfile, '[' + moment().format('YYYY-MM-DDTHH:mm:ss.SSS') + '] ' + pair + ' | ' + JSON.stringify(msg) + '\n')

    // find which pair has channel_id in BOOK
    const pair_index =  get_pair_index(msg);
    if (!pair_index) return
    if (BOOK[pair_index].mcnt === 0) {
      _.each(msg[1], function (pp) {
        pp = { price: pp[0], cnt: pp[1], amount: pp[2] }
        const side = pp.amount >= 0 ? 'bids' : 'asks'
        pp.amount = Math.abs(pp.amount)
        if (BOOK[pair_index][side][pp.price]) {
//            fs.appendFileSync(logfile, '[' + moment().format() + '] ' + pair + ' | ' + JSON.stringify(pp) + ' BOOK snap existing bid override\n')
        }
        BOOK[pair_index][side][pp.price] = pp
      })
    } else {
      const cseq = +msg[2]
      msg = msg[1]

      if (!seq) {
        seq = cseq - 1
      }

      if (cseq - seq > 2) {
        console.error('OUT OF SEQUENCE', seq, cseq)
        process.exit()
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

        if (!found) {
//            fs.appendFileSync(logfile, '[' + moment().format() + '] ' + pair + ' | ' + JSON.stringify(pp) + ' BOOK delete fail side not found\n')
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
    // checkCross(msg)
  })
}

setInterval(function () {
  if (connected) return
  connect()
}, 3500)

function checkCross (msg) {
  let bid = BOOK.psnap.bids[0]
  let ask = BOOK.psnap.asks[0]
  if (bid >= ask) {
    let lm = [moment.utc().format(), 'bid(' + bid + ')>=ask(' + ask + ')']
//      fs.appendFileSync(logfile, lm.join('/') + '\n')
    console.log(lm.join('/'))
  }
}

connect();

function get_book(pair) {
  return BOOK[pair.toUpperCase()];
}

function get_orderbook(pair) {
  pair = pair.replace(/[^a-zA-Z]/g, '').toUpperCase();
  console.log(BOOK[pair]);
  if (BOOK[pair].psnap && BOOK[pair]) {
    result = { 
      'asks': BOOK[pair].psnap.asks[0],
      'bids': BOOK[pair].psnap.bids[0],
    }
  } else {
    result = {
      'asks': 0,
      'bids': 0,
    } 
  }

  return result;
}

module.exports = { get_book, get_orderbook }