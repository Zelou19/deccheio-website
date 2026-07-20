const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const AdminUser = require('../models/AdminUser');

const JWT_SECRET = process.env.JWT_SECRET || 'muda-esta-chave-no-.env';

// Cookie próprio dos admins (separado do "token" dos clientes em routes/auth.js),
// para nunca haver confusão entre uma sessão de cliente e uma sessão de admin.
const NOME_COOKIE = 'admin_token';
const OPCOES_COOKIE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
};

function gerarToken(admin) {
  return jwt.sign({ id: admin._id, username: admin.username, role: admin.role }, JWT_SECRET, { expiresIn: '30d' });
}

function dadosPublicos(admin) {
  return { id: admin._id, username: admin.username, email: admin.email || '', role: admin.role };
}

// Middleware: exige sessão de admin válida (qualquer role)
function requireAdmin(req, res, next) {
  const token = req.cookies?.[NOME_COOKIE];
  if (!token) return res.status(401).json({ erro: 'Não autorizado.' });

  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch (erro) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
  }
}

// Middleware: exige que seja especificamente o owner (dono do site)
function requireOwner(req, res, next) {
  requireAdmin(req, res, () => {
    if (req.admin.role !== 'owner') {
      return res.status(403).json({ erro: 'Só o dono da conta pode fazer isto.' });
    }
    next();
  });
}

// POST /api/admin/auth/login
// Aceita tanto o nome de utilizador (ex: "Filipa C.") como o email, e ignora
// maiúsculas/minúsculas e espaços a mais — para não ser fácil de errar ao escrever.
router.post('/login', async (req, res) => {
  try {
    const { username, senha } = req.body;
    if (!username || !senha) {
      return res.status(400).json({ erro: 'Preenche o utilizador (ou email) e a palavra-passe.' });
    }

    const identificador = username.trim();
    const admin = await AdminUser.findOne({
      $or: [
        { username: new RegExp(`^${identificador.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        { email: identificador.toLowerCase() },
      ],
    }).select('+senhaHash');
    if (!admin) return res.status(401).json({ erro: 'Utilizador ou palavra-passe incorretos.' });

    const senhaCorreta = await bcrypt.compare(senha, admin.senhaHash);
    if (!senhaCorreta) return res.status(401).json({ erro: 'Utilizador ou palavra-passe incorretos.' });

    res.cookie(NOME_COOKIE, gerarToken(admin), OPCOES_COOKIE);
    res.json({ sucesso: true, admin: dadosPublicos(admin) });
  } catch (erro) {
    console.error('Erro ao iniciar sessão de admin:', erro);
    res.status(500).json({ erro: 'Não foi possível iniciar sessão. Tenta novamente.' });
  }
});

// POST /api/admin/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(NOME_COOKIE, OPCOES_COOKIE);
  res.json({ sucesso: true });
});

// GET /api/admin/auth/me — devolve o admin autenticado (ou 401 se não houver sessão)
router.get('/me', requireAdmin, async (req, res) => {
  const admin = await AdminUser.findById(req.admin.id);
  if (!admin) return res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
  res.json({ admin: dadosPublicos(admin) });
});

// POST /api/admin/auth/senha — o próprio admin muda a sua palavra-passe
router.post('/senha', requireAdmin, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ erro: 'Preenche a palavra-passe atual e a nova.' });
    }
    if (novaSenha.length < 6) {
      return res.status(400).json({ erro: 'A nova palavra-passe deve ter pelo menos 6 caracteres.' });
    }

    const admin = await AdminUser.findById(req.admin.id).select('+senhaHash');
    if (!admin) return res.status(404).json({ erro: 'Utilizador não encontrado.' });

    const senhaCorreta = await bcrypt.compare(senhaAtual, admin.senhaHash);
    if (!senhaCorreta) return res.status(401).json({ erro: 'A palavra-passe atual está incorreta.' });

    admin.senhaHash = await bcrypt.hash(novaSenha, 10);
    await admin.save();

    res.json({ sucesso: true });
  } catch (erro) {
    console.error('Erro ao mudar palavra-passe de admin:', erro);
    res.status(500).json({ erro: 'Não foi possível mudar a palavra-passe. Tenta novamente.' });
  }
});

// POST /api/admin/auth/email — o próprio admin define ou muda o email da conta
// (confirma com a palavra-passe atual, tal como ao mudar a palavra-passe)
router.post('/email', requireAdmin, async (req, res) => {
  try {
    const { email, senhaAtual } = req.body;
    if (!email || !senhaAtual) {
      return res.status(400).json({ erro: 'Preenche o email e a palavra-passe atual.' });
    }

    const emailLimpo = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      return res.status(400).json({ erro: 'Este email não parece válido.' });
    }

    const admin = await AdminUser.findById(req.admin.id).select('+senhaHash');
    if (!admin) return res.status(404).json({ erro: 'Utilizador não encontrado.' });

    const senhaCorreta = await bcrypt.compare(senhaAtual, admin.senhaHash);
    if (!senhaCorreta) return res.status(401).json({ erro: 'A palavra-passe está incorreta.' });

    const emailEmUso = await AdminUser.findOne({ email: emailLimpo, _id: { $ne: admin._id } });
    if (emailEmUso) return res.status(409).json({ erro: 'Já há outra conta a usar este email.' });

    admin.email = emailLimpo;
    await admin.save();

    res.json({ sucesso: true, admin: dadosPublicos(admin) });
  } catch (erro) {
    console.error('Erro ao atualizar email de admin:', erro);
    res.status(500).json({ erro: 'Não foi possível guardar o email. Tenta novamente.' });
  }
});

// POST /api/admin/auth/verificar-senha — confirma a password do admin autenticado,
// sem a mudar. Usado como confirmação extra para ações irreversíveis (ex: apagar conversa).
router.post('/verificar-senha', requireAdmin, async (req, res) => {
  try {
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ erro: 'Escreve a tua palavra-passe.' });

    const admin = await AdminUser.findById(req.admin.id).select('+senhaHash');
    if (!admin) return res.status(404).json({ erro: 'Utilizador não encontrado.' });

    const senhaCorreta = await bcrypt.compare(senha, admin.senhaHash);
    if (!senhaCorreta) return res.status(401).json({ erro: 'Palavra-passe incorreta.' });

    res.json({ sucesso: true });
  } catch (erro) {
    console.error('Erro ao verificar palavra-passe de admin:', erro);
    res.status(500).json({ erro: 'Não foi possível verificar. Tenta novamente.' });
  }
});

// GET /api/admin/auth/utilizadores — lista todos os admins (só o owner vê isto)
router.get('/utilizadores', requireOwner, async (req, res) => {
  try {
    const admins = await AdminUser.find().sort({ createdAt: 1 });
    res.json(admins.map(dadosPublicos));
  } catch (erro) {
    console.error('Erro ao listar utilizadores admin:', erro);
    res.status(500).json({ erro: 'Não foi possível carregar os utilizadores.' });
  }
});

// POST /api/admin/auth/utilizadores — cria um novo admin (só o owner pode)
router.post('/utilizadores', requireOwner, async (req, res) => {
  try {
    const { username, senha } = req.body;
    if (!username || !senha) {
      return res.status(400).json({ erro: 'Preenche o utilizador e a palavra-passe.' });
    }
    if (senha.length < 6) {
      return res.status(400).json({ erro: 'A palavra-passe deve ter pelo menos 6 caracteres.' });
    }

    const existente = await AdminUser.findOne({ username: username.trim() });
    if (existente) {
      return res.status(409).json({ erro: 'Já existe um utilizador com este nome.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const admin = await AdminUser.create({ username: username.trim(), senhaHash, role: 'admin' });

    res.status(201).json(dadosPublicos(admin));
  } catch (erro) {
    console.error('Erro ao criar utilizador admin:', erro);
    res.status(500).json({ erro: 'Não foi possível criar o utilizador. Tenta novamente.' });
  }
});

// DELETE /api/admin/auth/utilizadores/:id — remove um admin (só o owner pode)
router.delete('/utilizadores/:id', requireOwner, async (req, res) => {
  try {
    if (req.params.id === req.admin.id) {
      return res.status(400).json({ erro: 'Não podes remover a tua própria conta.' });
    }

    const alvo = await AdminUser.findById(req.params.id);
    if (!alvo) return res.status(404).json({ erro: 'Utilizador não encontrado.' });
    if (alvo.role === 'owner') {
      return res.status(400).json({ erro: 'Não é possível remover o dono da conta.' });
    }

    await alvo.deleteOne();
    res.json({ sucesso: true });
  } catch (erro) {
    console.error('Erro ao remover utilizador admin:', erro);
    res.status(400).json({ erro: 'Não foi possível remover o utilizador.' });
  }
});

module.exports = { router, requireAdmin, requireOwner };
