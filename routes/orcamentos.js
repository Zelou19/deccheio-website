const express = require('express');
const router = express.Router();
const Orcamento = require('../models/Orcamento');
const QuoteRequest = require('../models/QuoteRequest');
const { requireAdmin } = require('./adminAuth');

const MAX_IMAGENS_POR_ORCAMENTO = 8;
const MAX_TAMANHO_IMAGEM_BYTES = 4 * 1024 * 1024; // 4MB por imagem, já em base64

function imagemValida(dataUrl) {
  return typeof dataUrl === 'string' && dataUrl.startsWith('data:image/') && dataUrl.length <= MAX_TAMANHO_IMAGEM_BYTES;
}

function limparImagens(imagens) {
  if (!Array.isArray(imagens)) return undefined;
  const validas = imagens.filter(imagemValida).slice(0, MAX_IMAGENS_POR_ORCAMENTO);
  return validas;
}

// Tudo neste ficheiro é só para admins — o cliente ainda não vê orçamentos (fase futura).
router.use(requireAdmin);

function limparItens(itens) {
  if (!Array.isArray(itens)) return [];
  return itens
    .filter((item) => item && String(item.descricao || '').trim())
    .map((item) => ({
      descricao: String(item.descricao).trim(),
      quantidade: Number(item.quantidade) || 0,
      precoUnitario: Number(item.precoUnitario) || 0,
    }));
}

// POST /api/orcamentos — cria um orçamento, do zero ou a partir de um pedido existente
// (envia { quoteRequestId } para pré-preencher os dados do cliente a partir desse pedido)
router.post('/', async (req, res) => {
  try {
    const dados = {
      itens: limparItens(req.body.itens),
      desconto: Number(req.body.desconto) || 0,
      notas: req.body.notas || '',
      validoAte: req.body.validoAte || undefined,
      criadoPor: req.admin.username,
    };

    if (req.body.quoteRequestId) {
      const pedido = await QuoteRequest.findById(req.body.quoteRequestId);
      if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });

      dados.quoteRequestId = pedido._id;
      dados.nome = pedido.nome;
      dados.nomeFestejado = pedido.nomeFestejado;
      dados.email = pedido.email;
      dados.telefone = pedido.telefone;
      dados.tipoEvento = pedido.tipoEvento;
      dados.dataEvento = pedido.dataEvento;
      dados.localEvento = pedido.localEvento;
      // Ponto de partida: as imagens de inspiração que o cliente já tinha enviado no pedido.
      // O admin pode depois remover as que não interessam e/ou adicionar outras.
      dados.imagens = (pedido.imagensInspiracao || []).slice(0, MAX_IMAGENS_POR_ORCAMENTO);
    } else {
      // Criado do zero: exige pelo menos o nome do cliente
      if (!req.body.nome || !req.body.nome.trim()) {
        return res.status(400).json({ erro: 'O nome do cliente é obrigatório.' });
      }
      dados.nome = req.body.nome.trim();
      dados.nomeFestejado = req.body.nomeFestejado || undefined;
      dados.email = req.body.email || undefined;
      dados.telefone = req.body.telefone || undefined;
      dados.tipoEvento = req.body.tipoEvento || undefined;
      dados.dataEvento = req.body.dataEvento || undefined;
      dados.localEvento = req.body.localEvento || undefined;
      dados.imagens = limparImagens(req.body.imagens) || [];
    }

    const orcamento = await Orcamento.create(dados);
    res.status(201).json(orcamento);
  } catch (erro) {
    console.error('Erro ao criar orçamento:', erro);
    res.status(400).json({ erro: 'Não foi possível criar o orçamento.' });
  }
});

// GET /api/orcamentos — lista todos os orçamentos (filtro opcional por status)
router.get('/', async (req, res) => {
  try {
    const filtro = {};
    if (req.query.status) filtro.status = req.query.status;
    if (req.query.quoteRequestId) filtro.quoteRequestId = req.query.quoteRequestId;

    const orcamentos = await Orcamento.find(filtro).sort({ createdAt: -1 });
    res.json(orcamentos);
  } catch (erro) {
    console.error('Erro ao listar orçamentos:', erro);
    res.status(500).json({ erro: 'Não foi possível carregar os orçamentos.' });
  }
});

// GET /api/orcamentos/:id — um orçamento específico
router.get('/:id', async (req, res) => {
  try {
    const orcamento = await Orcamento.findById(req.params.id);
    if (!orcamento) return res.status(404).json({ erro: 'Orçamento não encontrado.' });
    res.json(orcamento);
  } catch (erro) {
    res.status(400).json({ erro: 'Orçamento inválido.' });
  }
});

// PATCH /api/orcamentos/:id — edita um orçamento (dados do cliente, itens, notas, estado...)
router.patch('/:id', async (req, res) => {
  try {
    const CAMPOS_SIMPLES = [
      'nome',
      'nomeFestejado',
      'email',
      'telefone',
      'tipoEvento',
      'dataEvento',
      'localEvento',
      'notas',
      'validoAte',
      'desconto',
      'status',
    ];

    const alteracoes = {};
    for (const campo of CAMPOS_SIMPLES) {
      if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
        alteracoes[campo] = req.body[campo];
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'itens')) {
      alteracoes.itens = limparItens(req.body.itens);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'imagens')) {
      const imagens = limparImagens(req.body.imagens);
      if (imagens === undefined) {
        return res.status(400).json({ erro: 'Lista de imagens inválida.' });
      }
      alteracoes.imagens = imagens;
    }
    if (alteracoes.dataEvento === '') alteracoes.dataEvento = null;
    if (alteracoes.validoAte === '') alteracoes.validoAte = null;
    if (alteracoes.status && !['rascunho', 'enviado'].includes(alteracoes.status)) {
      return res.status(400).json({ erro: 'Estado inválido.' });
    }
    if (alteracoes.nome !== undefined && !String(alteracoes.nome).trim()) {
      return res.status(400).json({ erro: 'O nome não pode ficar vazio.' });
    }

    const orcamento = await Orcamento.findByIdAndUpdate(req.params.id, alteracoes, {
      new: true,
      runValidators: true,
    });
    if (!orcamento) return res.status(404).json({ erro: 'Orçamento não encontrado.' });

    res.json(orcamento);
  } catch (erro) {
    console.error('Erro ao editar orçamento:', erro);
    res.status(400).json({ erro: 'Não foi possível guardar as alterações.' });
  }
});

// DELETE /api/orcamentos/:id — apaga um orçamento
router.delete('/:id', async (req, res) => {
  try {
    const orcamento = await Orcamento.findByIdAndDelete(req.params.id);
    if (!orcamento) return res.status(404).json({ erro: 'Orçamento não encontrado.' });
    res.json({ sucesso: true });
  } catch (erro) {
    console.error('Erro ao apagar orçamento:', erro);
    res.status(400).json({ erro: 'Não foi possível apagar o orçamento.' });
  }
});

module.exports = router;
