const express = require('express');
const app = require('./src/app');
require('dotenv').config();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
