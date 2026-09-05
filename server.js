require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const bcrypt = require('bcryptjs');

const quotesRouter = require('./routes/quotes');
const orcamentosRouter = require('./routes/orcamentos');
const categoriasRouter = require('./routes/categorias');
const calendariosRouter = require('./routes/calendarios');
const reviewsRouter = require('./routes/reviews');
const { router: authRouter } = require('./routes/auth');
const { router: adminAuthRouter } = require('./routes/adminAuth');
const AdminUser = require('./models/AdminUser');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/decoracao-de-cheio';

app.use(cors({ origin: true, credentials: true }));
// Limite maior do que o padrão (100kb) porque as fotos (categorias, imagens de inspiração,
// anexos no chat) vão em base64 no corpo do pedido.
app.use(express.json({ limit: '20mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Config pública para o frontend (nada secreto — só o ID do cliente Google, que é público por natureza)
app.get('/api/config', (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || '' });
});

app.use('/api/auth', authRouter);
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/orcamentos', orcamentosRouter);
app.use('/api/categorias', categoriasRouter);
app.use('/api/calendarios', calendariosRouter);
app.use('/api/reviews', reviewsRouter);

// Cria a conta do dono automaticamente na primeira vez que o servidor liga
// (só corre se ainda não existir nenhum utilizador admin na base de dados).
async function garantirOwner() {
  const jaExisteAlgumAdmin = await AdminUser.countDocuments();
  if (jaExisteAlgumAdmin > 0) return;

  const senhaHash = await bcrypt.hash('JoaoDinis2011', 10);
  await AdminUser.create({ username: 'Filipa C.', senhaHash, role: 'owner' });
  console.log('👑 Conta de dono criada: "Filipa C." (muda a palavra-passe em "A minha conta" assim que entrares)');
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Ligado ao MongoDB');
    return garantirOwner();
  })
  .catch((erro) => console.error('❌ Erro ao ligar ao MongoDB:', erro.message));

app.listen(PORT, () => {
  console.log(`🚀 Servidor a correr em http://localhost:${PORT}`);
});
