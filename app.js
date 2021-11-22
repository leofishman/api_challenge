const api = require('./routes/api');
const express = require('express');
const morgan = require('morgan');
const app = express();

global.validPairs = [
    'BTCUSD',
    'ETHUSD'
];

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static('public'));
app.use('/api/', api);


if(app.get('env') === 'development'){
    app.use(morgan('tiny'));
}

app.get('/', (req, res) => {
    res.send('Lattice API V1');
});

const port = process.env.PORT || 80;
app.listen(port, () => {
    console.log(`Escuchando en el puerto ${port}...`);
})


