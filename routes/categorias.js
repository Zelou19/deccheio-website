const express = require('express');
const router = express.Router();
const Categoria = require('../models/Categoria');

// Mesma chave de admin partilhada usada em routes/quotes.js
function requireAdmin(req, res, next) {
  const chave = req.headers['x-admin-key'];
  if (!process.env.ADMIN_KEY || chave !== process.env.ADMIN_KEY) {
    return res.status(401).json({ erro: 'Não autorizado.' });
  }
  next();
}

// GET /api/categorias — lista todas as categorias com as suas fotos.
// Pública: é o que alimenta a secção "Os nossos eventos" na página principal.
router.get('/', async (req, res) => {
  try {
    const categorias = await Categoria.find().sort({ createdAt: 1 });
    res.json(categorias);
  } catch (erro) {
    console.error('Erro ao listar categorias:', erro);
    res.status(500).json({ erro: 'Não foi possível carregar as categorias.' });
  }
});

// POST /api/categorias — cria uma nova categoria. Protegido por chave de admin.
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ erro: 'O nome da categoria é obrigatório.' });
    }

    const existente = await Categoria.findOne({ nome: nome.trim() });
    if (existente) {
      return res.status(409).json({ erro: 'Já existe uma categoria com este nome.' });
    }

    const categoria = await Categoria.create({ nome: nome.trim() });
    res.status(201).json(categoria);
  } catch (erro) {
    console.error('Erro ao criar categoria:', erro);
    res.status(500).json({ erro: 'Não foi possível criar a categoria.' });
  }
});

// DELETE /api/categorias/:id — apaga a categoria e todas as suas fotos. Protegido por chave de admin.
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const categoria = await Categoria.findByIdAndDelete(req.params.id);
    if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada.' });
    res.json({ sucesso: true });
  } catch (erro) {
    console.error('Erro ao apagar categoria:', erro);
    res.status(400).json({ erro: 'Não foi possível apagar a categoria.' });
  }
});

// POST /api/categorias/:id/fotos — adiciona uma foto a uma categoria. Protegido por chave de admin.
router.post('/:id/fotos', requireAdmin, async (req, res) => {
  try {
    const { dataUrl, legenda } = req.body;
    if (!dataUrl) return res.status(400).json({ erro: 'Falta a imagem.' });

    const categoria = await Categoria.findById(req.params.id);
    if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada.' });

    categoria.fotos.push({ dataUrl, legenda: legenda?.trim() });
    await categoria.save();

    res.status(201).json(categoria);
  } catch (erro) {
    console.error('Erro ao adicionar foto:', erro);
    res.status(400).json({ erro: 'Não foi possível adicionar a foto.' });
  }
});

// DELETE /api/categorias/:id/fotos/:fotoId — remove uma foto específica. Protegido por chave de admin.
router.delete('/:id/fotos/:fotoId', requireAdmin, async (req, res) => {
  try {
    const categoria = await Categoria.findById(req.params.id);
    if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada.' });

    categoria.fotos.id(req.params.fotoId)?.deleteOne();
    await categoria.save();

    res.json(categoria);
  } catch (erro) {
    console.error('Erro ao apagar foto:', erro);
    res.status(400).json({ erro: 'Não foi possível apagar a foto.' });
  }
});

module.exports = router;
