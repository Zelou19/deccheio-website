require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const quotesRouter = require('./routes/quotes');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/decoracao-de-cheio';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/quotes', quotesRouter);

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ Ligado ao MongoDB'))
  .catch((erro) => console.error('❌ Erro ao ligar ao MongoDB:', erro.message));

app.listen(PORT, () => {
  console.log(`🚀 Servidor a correr em http://localhost:${PORT}`);
});
