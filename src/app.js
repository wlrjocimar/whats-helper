const express = require('express');
const bodyParser = require('body-parser');
const whatsappRoutes = require('./routes/whatsappRoutes');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/api/whatsapp', whatsappRoutes);

module.exports = app;
