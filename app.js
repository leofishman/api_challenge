const api = require('./routes/api');
const express = require('express');
const morgan = require('morgan');
const app = express();
const { books, BOOK } = require('./ws/book');

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static('public'));
app.use('/api/', api);

const BTCUSD = books('BTCUSD')
const ETHUSD = books('ETHUSD')
console.log(16, BTCUSD, ETHUSD, BOOK);



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


