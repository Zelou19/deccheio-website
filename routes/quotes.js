const express = require('express');
const router = express.Router();
const QuoteRequest = require('../models/QuoteRequest');
const { requireUser } = require('./auth');
const { requireAdmin } = require('./adminAuth');
const notificacoes = require('../services/notificacoes');

// Limites simples para as imagens enviadas em base64 (o frontend já as comprime antes de
// enviar, isto é só uma rede de segurança do lado do servidor).
const MAX_IMAGENS_POR_PEDIDO = 5;
const MAX_TAMANHO_IMAGEM_BYTES = 4 * 1024 * 1024; // 4MB por imagem, já em base64

function imagemValida(dataUrl) {
  return typeof dataUrl === 'string' && dataUrl.startsWith('data:image/') && dataUrl.length <= MAX_TAMANHO_IMAGEM_BYTES;
}

const MENSAGEM_BOAS_VINDAS =
  'Olá e bem-vindo(a)! 💛 Recebemos o seu pedido de orçamento. Aguarde, por favor, a resposta da nossa equipa aqui nesta conversa. Responderemos o mais rápido possível. Entretanto, pode acrescentar mais ideias ou imagens de inspiração.';

// POST /api/quotes — cliente envia um novo pedido de orçamento pelo site
// (requireUser: é obrigatório ter sessão iniciada — assim o pedido fica sempre ligado
// à conta da pessoa e ela consegue acompanhar tudo em "Os meus orçamentos")
router.post('/', requireUser, async (req, res) => {
  try {
    const { nome, nomeFestejado, email, telefone, tipoEvento, dataEvento, localEvento, numeroConvidados, mensagem, imagens } = req.body;

    if (!nome || !email || !tipoEvento || !mensagem || !String(mensagem).trim()) {
      return res.status(400).json({ erro: 'Faltam campos obrigatórios (nome, email, tipo de evento, a sua ideia).' });
    }

    let imagensInspiracao = [];
    if (imagens !== undefined) {
      if (!Array.isArray(imagens) || imagens.length > MAX_IMAGENS_POR_PEDIDO) {
        return res.status(400).json({ erro: `Só pode enviar até ${MAX_IMAGENS_POR_PEDIDO} imagens.` });
      }
      if (!imagens.every(imagemValida)) {
        return res.status(400).json({ erro: 'Uma das imagens é inválida ou demasiado grande.' });
      }
      imagensInspiracao = imagens;
    }

    const novoPedido = await QuoteRequest.create({
      userId: req.user.id,
      nome,
      nomeFestejado: nomeFestejado || undefined,
      email,
      telefone,
      tipoEvento,
      dataEvento: dataEvento || undefined,
      localEvento: localEvento || undefined,
      numeroConvidados: numeroConvidados || undefined,
      mensagem,
      imagensInspiracao,
      // Mensagem automática de boas-vindas: aparece logo que o cliente abre a conversa.
      // Não altera o estado do pedido (continua "não respondido" até a equipa responder).
      mensagens: [
        {
          autor: 'admin',
          texto: MENSAGEM_BOAS_VINDAS,
          enviadoPor: 'Equipa DecoraçãoCheio',
        },
      ],
    });

    notificacoes.avisarEquipaNovoPedido(novoPedido); // sem await: não atrasa a resposta ao cliente

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
    if (req.query.fechado === 'true') filtro.fechado = true;
    if (req.query.fechado === 'false') filtro.fechado = false;

    const pedidos = await QuoteRequest.find(filtro).sort({ createdAt: -1 });
    res.json(pedidos);
  } catch (erro) {
    console.error('Erro ao listar pedidos:', erro);
    res.status(500).json({ erro: 'Não foi possível carregar os pedidos.' });
  }
});

// GET /api/quotes/minhas — lista os orçamentos da pessoa com sessão iniciada.
// Tem de vir antes de "/:id" para o Express não confundir "minhas" com um ID de pedido.
router.get('/minhas', requireUser, async (req, res) => {
  try {
    const filtro = { userId: req.user.id };
    if (req.query.fechado === 'true') filtro.fechado = true;
    if (req.query.fechado === 'false') filtro.fechado = false;

    const pedidos = await QuoteRequest.find(filtro).sort({ updatedAt: -1 });
    res.json(pedidos);
  } catch (erro) {
    console.error('Erro ao listar os meus orçamentos:', erro);
    res.status(500).json({ erro: 'Não foi possível carregar os seus orçamentos.' });
  }
});

// GET /api/quotes/:id — um pedido específico, com as mensagens.
// Sem chave de admin de propósito: é assim que o CLIENTE acede à sua própria conversa,
// através do link único que recebe depois de submeter o pedido (ex: /pedido.html?id=...).
router.get('/:id', async (req, res) => {
  try {
    const pedido = await QuoteRequest.findById(req.params.id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });

    // A página da conversa pede isto a cada 5s com ?viewer=cliente ou ?viewer=admin —
    // é assim que sabemos que alguém tem a conversa aberta (e não lhe mandamos email).
    if (req.query.viewer === 'cliente' || req.query.viewer === 'admin') {
      notificacoes.registarPresenca(req.params.id, req.query.viewer);
    }

    res.json(pedido);
  } catch (erro) {
    res.status(400).json({ erro: 'Link inválido.' });
  }
});

// POST /api/quotes/:id/messages/cliente — o CLIENTE envia uma mensagem no chat do seu pedido
router.post('/:id/messages/cliente', async (req, res) => {
  try {
    const { texto, imagem } = req.body;
    const textoLimpo = (texto || '').trim();
    if (!textoLimpo && !imagem) return res.status(400).json({ erro: 'Escreva uma mensagem ou anexe uma imagem.' });
    if (imagem && !imagemValida(imagem)) return res.status(400).json({ erro: 'A imagem é inválida ou demasiado grande.' });

    const pedido = await QuoteRequest.findById(req.params.id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    if (pedido.fechado) {
      return res.status(409).json({ erro: 'Esta conversa está fechada. Reabra-a para poder enviar mais mensagens.' });
    }

    pedido.mensagens.push({ autor: 'cliente', texto: textoLimpo, imagem: imagem || undefined });
    await pedido.save();

    notificacoes.avisarEquipaMensagemCliente(pedido, textoLimpo, Boolean(imagem));

    res.status(201).json(pedido);
  } catch (erro) {
    console.error('Erro ao enviar mensagem do cliente:', erro);
    res.status(400).json({ erro: 'Não foi possível enviar a mensagem.' });
  }
});

// POST /api/quotes/:id/messages/admin — TU respondes no chat de um pedido. Protegido pela chave de admin.
router.post('/:id/messages/admin', requireAdmin, async (req, res) => {
  try {
    const { texto, imagem } = req.body;
    const textoLimpo = (texto || '').trim();
    if (!textoLimpo && !imagem) return res.status(400).json({ erro: 'Escreva uma mensagem ou anexe uma imagem.' });
    if (imagem && !imagemValida(imagem)) return res.status(400).json({ erro: 'A imagem é inválida ou demasiado grande.' });

    const pedido = await QuoteRequest.findById(req.params.id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    if (pedido.fechado) {
      return res.status(409).json({ erro: 'Esta conversa está fechada. Reabra-a para poder responder.' });
    }

    pedido.mensagens.push({ autor: 'admin', texto: textoLimpo, imagem: imagem || undefined, enviadoPor: req.admin.username });

    // Assim que respondes pela primeira vez, o estado passa automaticamente para "em andamento"
    if (pedido.status === 'nao_respondido') {
      pedido.status = 'em_andamento';
    }

    await pedido.save();

    notificacoes.avisarClienteResposta(pedido, textoLimpo);

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

// PATCH /api/quotes/:id/fechar — fecha a conversa (passa para o separador "Fechadas",
// nada é apagado). Sem chave de admin de propósito: tal como as mensagens, tanto o
// cliente (pelo link/pedido.html) como o admin podem fechar a conversa.
router.patch('/:id/fechar', async (req, res) => {
  try {
    const pedido = await QuoteRequest.findById(req.params.id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });

    pedido.fechado = true;
    pedido.fechadoEm = new Date();
    await pedido.save();

    res.json(pedido);
  } catch (erro) {
    res.status(400).json({ erro: 'Não foi possível fechar a conversa.' });
  }
});

// PATCH /api/quotes/:id/reabrir — reabre uma conversa fechada, para qualquer um dos
// dois lados poder continuar a falar se precisar de mais alguma coisa.
router.patch('/:id/reabrir', async (req, res) => {
  try {
    const pedido = await QuoteRequest.findById(req.params.id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });

    pedido.fechado = false;
    pedido.fechadoEm = undefined;
    await pedido.save();

    res.json(pedido);
  } catch (erro) {
    res.status(400).json({ erro: 'Não foi possível reabrir a conversa.' });
  }
});

// PATCH /api/quotes/:id — o admin edita os dados do pedido (nome, contactos, data, orçamento, etc.)
// Só os campos enviados são atualizados; o resto do pedido (mensagens, status, fechado...) não é tocado.
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const CAMPOS_EDITAVEIS = [
      'nome',
      'nomeFestejado',
      'email',
      'telefone',
      'tipoEvento',
      'dataEvento',
      'localEvento',
      'numeroConvidados',
      'mensagem',
    ];

    const alteracoes = {};
    for (const campo of CAMPOS_EDITAVEIS) {
      if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
        alteracoes[campo] = req.body[campo];
      }
    }

    if (alteracoes.nome !== undefined && !alteracoes.nome.trim()) {
      return res.status(400).json({ erro: 'O nome não pode ficar vazio.' });
    }
    if (alteracoes.email !== undefined && !alteracoes.email.trim()) {
      return res.status(400).json({ erro: 'O email não pode ficar vazio.' });
    }
    if (alteracoes.dataEvento === '') alteracoes.dataEvento = null;
    if (alteracoes.numeroConvidados === '') alteracoes.numeroConvidados = null;

    const pedido = await QuoteRequest.findByIdAndUpdate(req.params.id, alteracoes, {
      new: true,
      runValidators: true,
    });
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });

    res.json(pedido);
  } catch (erro) {
    console.error('Erro ao editar pedido:', erro);
    res.status(400).json({ erro: 'Não foi possível guardar as alterações.' });
  }
});

// DELETE /api/quotes/:id — apaga um pedido e a conversa para sempre. Além de exigir sessão de
// admin, o frontend pede sempre a palavra-passe do próprio admin outra vez neste caso específico
// (verificada em /api/admin/auth/verificar-senha antes de chegar aqui), como confirmação extra.
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const pedido = await QuoteRequest.findByIdAndDelete(req.params.id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    res.json({ sucesso: true });
  } catch (erro) {
    console.error('Erro ao apagar pedido:', erro);
    res.status(400).json({ erro: 'Não foi possível apagar o pedido.' });
  }
});

module.exports = router;
