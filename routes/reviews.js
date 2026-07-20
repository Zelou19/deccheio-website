const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const { requireOwner } = require('./adminAuth');

// GET /api/reviews — lista as avaliações para a página inicial. Pública.
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (erro) {
    console.error('Erro ao listar avaliações:', erro);
    res.status(500).json({ erro: 'Não foi possível carregar as avaliações.' });
  }
});

// POST /api/reviews — adiciona uma avaliação. Só o dono da conta pode.
router.post('/', requireOwner, async (req, res) => {
  try {
    const { nomeCliente, tipoEvento, texto, classificacao } = req.body;

    if (!nomeCliente || !nomeCliente.trim() || !texto || !texto.trim()) {
      return res.status(400).json({ erro: 'Preenche o nome do cliente e o texto da avaliação.' });
    }

    const nota = Number(classificacao) || 5;
    if (nota < 1 || nota > 5) {
      return res.status(400).json({ erro: 'A classificação tem de estar entre 1 e 5.' });
    }

    const review = await Review.create({
      nomeCliente: nomeCliente.trim(),
      tipoEvento: tipoEvento?.trim(),
      texto: texto.trim(),
      classificacao: nota,
    });

    res.status(201).json(review);
  } catch (erro) {
    console.error('Erro ao criar avaliação:', erro);
    res.status(500).json({ erro: 'Não foi possível guardar a avaliação.' });
  }
});

// DELETE /api/reviews/:id — remove uma avaliação. Só o dono da conta pode.
router.delete('/:id', requireOwner, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ erro: 'Avaliação não encontrada.' });
    res.json({ sucesso: true });
  } catch (erro) {
    console.error('Erro ao apagar avaliação:', erro);
    res.status(400).json({ erro: 'Não foi possível apagar a avaliação.' });
  }
});

module.exports = router;
