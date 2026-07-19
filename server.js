require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const quotesRouter = require('./routes/quotes');
const categoriasRouter = require('./routes/categorias');
const { router: authRouter } = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/decoracao-de-cheio';

app.use(cors({ origin: true, credentials: true }));
// Limite maior do que o padrão (100kb) porque as fotos das categorias vão em base64 no corpo do pedido
app.use(express.json({ limit: '15mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Config pública para o frontend (nada secreto — só o ID do cliente Google, que é público por natureza)
app.get('/api/config', (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || '' });
});

app.use('/api/auth', authRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/categorias', categoriasRouter);

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ Ligado ao MongoDB'))
  .catch((erro) => console.error('❌ Erro ao ligar ao MongoDB:', erro.message));

app.listen(PORT, () => {
  console.log(`🚀 Servidor a correr em http://localhost:${PORT}`);
});
