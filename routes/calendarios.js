const express = require('express');
const router = express.Router();
const Calendario = require('../models/Calendario');

// Mesma chave de admin partilhada usada nas outras rotas
function requireAdmin(req, res, next) {
  const chave = req.headers['x-admin-key'];
  if (!process.env.ADMIN_KEY || chave !== process.env.ADMIN_KEY) {
    return res.status(401).json({ erro: 'Não autorizado.' });
  }
  next();
}

// GET /api/calendarios — lista os calendários guardados (só usado no painel admin,
// mas sem chave de propósito: os IDs de calendários públicos não são segredo).
router.get('/', async (req, res) => {
  try {
    const calendarios = await Calendario.find().sort({ createdAt: 1 });
    res.json(calendarios);
  } catch (erro) {
    console.error('Erro ao listar calendários:', erro);
    res.status(500).json({ erro: 'Não foi possível carregar os calendários.' });
  }
});

// POST /api/calendarios — adiciona um calendário. Protegido por chave de admin.
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { nome, googleCalendarId, cor } = req.body;
    if (!nome || !nome.trim() || !googleCalendarId || !googleCalendarId.trim()) {
      return res.status(400).json({ erro: 'Preenche o nome e o ID do calendário.' });
    }

    const calendario = await Calendario.create({
      nome: nome.trim(),
      googleCalendarId: googleCalendarId.trim(),
      cor: cor || undefined,
    });
    res.status(201).json(calendario);
  } catch (erro) {
    console.error('Erro ao criar calendário:', erro);
    res.status(500).json({ erro: 'Não foi possível adicionar o calendário.' });
  }
});

// DELETE /api/calendarios/:id — remove um calendário da lista. Protegido por chave de admin.
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const calendario = await Calendario.findByIdAndDelete(req.params.id);
    if (!calendario) return res.status(404).json({ erro: 'Calendário não encontrado.' });
    res.json({ sucesso: true });
  } catch (erro) {
    console.error('Erro ao apagar calendário:', erro);
    res.status(400).json({ erro: 'Não foi possível apagar o calendário.' });
  }
});

module.exports = router;
