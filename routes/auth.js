const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'muda-esta-chave-no-.env';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const NOME_COOKIE = 'token';
const OPCOES_COOKIE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
};

function gerarToken(user) {
  return jwt.sign({ id: user._id, nome: user.nome, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
}

function dadosPublicos(user) {
  return { id: user._id, nome: user.nome, email: user.email };
}

// Middleware: exige que a pessoa esteja autenticada (usado noutras rotas, ex. "as minhas conversas")
function requireUser(req, res, next) {
  const token = req.cookies?.[NOME_COOKIE];
  if (!token) return res.status(401).json({ erro: 'É preciso ter sessão iniciada.' });

  try {
    const dados = jwt.verify(token, JWT_SECRET);
    req.user = dados;
    next();
  } catch (erro) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
  }
}

// POST /api/auth/registo — cria conta com nome + email + senha
router.post('/registo', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Preenche nome, email e senha.' });
    }
    if (senha.length < 6) {
      return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const existente = await User.findOne({ email: email.toLowerCase().trim() });
    if (existente) {
      return res.status(409).json({ erro: 'Já existe uma conta com este email. Tenta iniciar sessão.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const user = await User.create({ nome: nome.trim(), email: email.toLowerCase().trim(), senhaHash });

    res.cookie(NOME_COOKIE, gerarToken(user), OPCOES_COOKIE);
    res.status(201).json({ sucesso: true, user: dadosPublicos(user) });
  } catch (erro) {
    console.error('Erro ao criar conta:', erro);
    res.status(500).json({ erro: 'Não foi possível criar a conta. Tenta novamente.' });
  }
});

// POST /api/auth/login — entra com email + senha
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ erro: 'Preenche email e senha.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+senhaHash');
    if (!user || !user.senhaHash) {
      return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    }

    const senhaCorreta = await bcrypt.compare(senha, user.senhaHash);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    }

    res.cookie(NOME_COOKIE, gerarToken(user), OPCOES_COOKIE);
    res.json({ sucesso: true, user: dadosPublicos(user) });
  } catch (erro) {
    console.error('Erro ao iniciar sessão:', erro);
    res.status(500).json({ erro: 'Não foi possível iniciar sessão. Tenta novamente.' });
  }
});

// POST /api/auth/google — entra (ou cria conta) com um "credential" (ID token) do botão do Google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ erro: 'Falta o token do Google.' });
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ erro: 'O login com Google ainda não está configurado no servidor.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(400).json({ erro: 'Não foi possível confirmar a conta Google.' });

    let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] });

    if (!user) {
      user = await User.create({
        nome: payload.name || payload.email.split('@')[0],
        email: payload.email.toLowerCase(),
        googleId: payload.sub,
      });
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      await user.save();
    }

    res.cookie(NOME_COOKIE, gerarToken(user), OPCOES_COOKIE);
    res.json({ sucesso: true, user: dadosPublicos(user) });
  } catch (erro) {
    console.error('Erro no login com Google:', erro);
    res.status(401).json({ erro: 'Não foi possível confirmar a conta Google.' });
  }
});

// POST /api/auth/logout — termina a sessão
router.post('/logout', (req, res) => {
  res.clearCookie(NOME_COOKIE, OPCOES_COOKIE);
  res.json({ sucesso: true });
});

// GET /api/auth/me — devolve a pessoa autenticada (ou 401 se não houver sessão)
router.get('/me', requireUser, (req, res) => {
  res.json({ user: req.user });
});

module.exports = { router, requireUser };
