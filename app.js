const api = require('./routes/api');
const express = require('express');
const morgan = require('morgan');
const app = express();

// Move this to config module
global.validPairs = [
    'BTCUSD',
    'ETHUSD'
];

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static('public'));
app.use('/api/v1/', api);


if(app.get('env') === 'development'){
    app.use(morgan('tiny'));
}

app.get('/', (req, res) => {
    res.send('Lattice API V1');
});

const port = process.env.PORT || 80;
app.listen(port, () => {
    console.log(`Listening on ${port}...`);
})


