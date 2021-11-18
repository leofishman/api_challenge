const api = require('./routes/api');
const express = require('express');
const config = require('config');
const morgan = require('morgan');
const debug = require('debug')('app');
const app = express();

app.use(express.json());//body 
app.use(express.urlencoded({extended:true}));
app.use(express.static('public'));
app.use('/api/', api);


if(app.get('env') === 'development'){
    app.use(morgan('tiny'));
    debug('Morgan enabled.');
}

app.get('/', (req, res) => {
    res.send('Lattice API V1');
});

const port = process.env.PORT || 80;
app.listen(port, () => {
    console.log(`Escuchando en el puerto ${port}...`);
})


