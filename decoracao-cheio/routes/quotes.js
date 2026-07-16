const express = require('express');
const router = express.Router();
const QuoteRequest = require('../models/QuoteRequest');

// Middleware simples: protege ações de admin com uma chave partilhada (definida no .env).
// Isto é temporário — na Fase 3 (painel de gestão) isto passa a ter um login a sério.
function requireAdmin(req, res, next) {
  const chave = req.headers['x-admin-key'];
  if (!process.env.ADMIN_KEY || chave !== process.env.ADMIN_KEY) {
    return res.status(401).json({ erro: 'Não autorizado.' });
  }
  next();
}

// POST /api/quotes — cliente envia um novo pedido de orçamento pelo site
router.post('/', async (req, res) => {
  try {
    const { nome, email, telefone, tipoEvento, dataEvento, numeroConvidados, orcamentoAproximado, mensagem } = req.body;

    if (!nome || !email || !tipoEvento) {
      return res.status(400).json({ erro: 'Faltam campos obrigatórios (nome, email, tipo de evento).' });
    }

    const novoPedido = await QuoteRequest.create({
      nome,
      email,
      telefone,
      tipoEvento,
      dataEvento: dataEvento || undefined,
      numeroConvidados: numeroConvidados || undefined,
      orcamentoAproximado,
      mensagem,
    });

    res.status(201).json({ sucesso: true, pedido: novoPedido });
  } catch (erro) {
    console.error('Erro ao criar pedido de orçamento:', erro);
    res.status(500).json({ erro: 'Não foi possível guardar o pedido. Tenta novamente.' });
  }
});

// GET /api/quotes — lista pedidos (usado pelo admin). Protegido pela chave de admin.
// Aceita filtros opcionais por query string: ?status=em_andamento&tipoEvento=Casamento
router.get('/', requireAdmin, async (req, res) => {
  try {
    const filtro = {};
    if (req.query.status) filtro.status = req.query.status;
    if (req.query.tipoEvento) filtro.tipoEvento = req.query.tipoEvento;

    const pedidos = await QuoteRequest.find(filtro).sort({ createdAt: -1 });
    res.json(pedidos);
  } catch (erro) {
    console.error('Erro ao listar pedidos:', erro);
    res.status(500).json({ erro: 'Não foi possível carregar os pedidos.' });
  }
});

// GET /api/quotes/:id — um pedido específico, com as mensagens.
// Sem chave de admin de propósito: é assim que o CLIENTE acede à sua própria conversa,
// através do link único que recebe depois de submeter o pedido (ex: /pedido.html?id=...).
router.get('/:id', async (req, res) => {
  try {
    const pedido = await QuoteRequest.findById(req.params.id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    res.json(pedido);
  } catch (erro) {
    res.status(400).json({ erro: 'Link inválido.' });
  }
});

// POST /api/quotes/:id/messages/cliente — o CLIENTE envia uma mensagem no chat do seu pedido
router.post('/:id/messages/cliente', async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto || !texto.trim()) return res.status(400).json({ erro: 'A mensagem está vazia.' });

    const pedido = await QuoteRequest.findById(req.params.id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });

    pedido.mensagens.push({ autor: 'cliente', texto: texto.trim() });
    await pedido.save();

    res.status(201).json(pedido);
  } catch (erro) {
    console.error('Erro ao enviar mensagem do cliente:', erro);
    res.status(400).json({ erro: 'Não foi possível enviar a mensagem.' });
  }
});

// POST /api/quotes/:id/messages/admin — TU respondes no chat de um pedido. Protegido pela chave de admin.
router.post('/:id/messages/admin', requireAdmin, async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto || !texto.trim()) return res.status(400).json({ erro: 'A mensagem está vazia.' });

    const pedido = await QuoteRequest.findById(req.params.id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });

    pedido.mensagens.push({ autor: 'admin', texto: texto.trim() });

    // Assim que respondes pela primeira vez, o estado passa automaticamente para "em andamento"
    if (pedido.status === 'nao_respondido') {
      pedido.status = 'em_andamento';
    }

    await pedido.save();
    res.status(201).json(pedido);
  } catch (erro) {
    console.error('Erro ao enviar mensagem do admin:', erro);
    res.status(400).json({ erro: 'Não foi possível enviar a mensagem.' });
  }
});

// PATCH /api/quotes/:id/status — muda o estado de um pedido (vai ganhar uma interface própria na Fase 3)
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['nao_respondido', 'em_andamento', 'concluido'].includes(status)) {
      return res.status(400).json({ erro: 'Estado inválido.' });
    }
    const pedido = await QuoteRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    res.json(pedido);
  } catch (erro) {
    res.status(400).json({ erro: 'Não foi possível atualizar o estado.' });
  }
});

module.exports = router;
