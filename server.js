// =====================================================================================
// De Cheio — servidor completo num único ficheiro.
//
// Está organizado em blocos, cada um é um ficheiro "virtual" (igual ao que antes estava em
// models/, routes/, services/ e config/). Para procurar uma parte, pesquisa por:  ===== pasta/ficheiro
//   config/orcamentoBase    preços, textos e notas do catálogo De Cheio
//   models/*                esquemas da base de dados
//   routes/*                a API (/api/...)
//   services/*              emails (Resend) e fotos iniciais do catálogo
//   server                  arranque (no fim do ficheiro)
// =====================================================================================

const __caminho = require('path');
const __defs = {};
const __cache = {};

function __define(chave, fn) { __defs[chave] = fn; }

function __carregar(chave) {
  if (__cache[chave]) return __cache[chave].exports;
  const modulo = { exports: {} };
  __cache[chave] = modulo;
  const pasta = __caminho.posix.dirname(chave);
  const dir = pasta === '.' ? __dirname : __caminho.join(__dirname, pasta);
  const exigir = (pedido) => {
    if (pedido[0] !== '.') return require(pedido); // pacotes (express, mongoose, ...)
    return __carregar(__caminho.posix.normalize(__caminho.posix.join(pasta, pedido)).replace(/\.js$/, ''));
  };
  __defs[chave].call(modulo.exports, modulo, modulo.exports, exigir, dir, __caminho.join(dir, __caminho.posix.basename(chave) + '.js'));
  return modulo.exports;
}

// ===== config/orcamentoBase ============================================================
__define('config/orcamentoBase', function (module, exports, require, __dirname, __filename) {
// Base dos orçamentos De Cheio — tirada da "Proposta de Orçamento" (modelo Casamento).
// É a ÚNICA fonte de preços/textos: o servidor usa-a para preencher os orçamentos novos e
// o editor usa-a para o "Catálogo De Cheio" (GET /api/orcamentos/base).
// Para mudar um preço ou um texto, é só editar aqui.

// Texto -> "chave" segura (sem acentos, minúsculas, hífens). Cada item do catálogo tem uma
// chave estável que liga o item à sua foto (guardada na base de dados).
function slug(texto) {
  return String(texto)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Cria uma lista de "opções" que só diferem no preço (as fotos do PDF mostram só o valor).
// Preços repetidos ficam com (A), (B)... para se distinguirem na lista.
function opcoes(nome, precos) {
  const contagem = {};
  precos.forEach((p) => { contagem[p] = (contagem[p] || 0) + 1; });
  const usados = {};
  return precos.map((preco) => {
    usados[preco] = (usados[preco] || 0) + 1;
    const letra = contagem[preco] > 1 ? ` (${String.fromCharCode(64 + usados[preco])})` : '';
    return {
      chave: `${slug(nome)}-${String(preco).replace('.', '-')}${letra ? letra.trim().replace(/[()]/g, '').toLowerCase() : ''}`,
      descricao: `${nome} — opção de ${String(preco).replace('.', ',')} €${letra}`,
      precoUnitario: preco,
    };
  });
}

// Item que entra automaticamente em todos os orçamentos novos
const valorBase = {
  secao: 'Valor base',
  descricao: 'Valor base — recursos humanos & deslocações (reunião, visitas técnicas, pré-montagem, montagem, desmontagem e deslocações da equipa)',
  quantidade: 1,
  precoUnitario: 590,
};

// Condições que aparecem em todos os orçamentos novos (editáveis em cada orçamento).
// NOTA: o IBAN não está aqui de propósito (o repositório é público). Acrescenta-o nas notas
// de cada orçamento, ou diz-me para o ler de uma variável de ambiente.
const notasPadrao = [
  '• A proposta de orçamento só poderá ser validada se respondida até 5 dias após o envio; a partir daí ficará sem efeito e a data voltará a ficar disponível na agenda.',
  '• O orçamento é discriminado para que possa escolher a(s) opção(ões)/elemento(s) que mais lhe convêm. Caso escolha apenas alguns dos elementos apresentados, o valor dos recursos humanos permanecerá.',
  '• Para adjudicação, 300 € deverão ser efetuados no ato da reserva do evento; o restante será pago na semana antecedente ao evento. O pagamento pode ser feito em numerário ou por transferência bancária.',
  '• Deverá partilhar os dados para faturação.',
  '• A ementa e o seating plan deverão ser partilhados impreterivelmente 15 dias antes do evento.',
  '• Caso haja desistência do cliente, o valor não poderá ser restituído/devolvido.',
  '• Todo o material utilizado na decoração é fornecido em regime de aluguer; qualquer dano verificado na recolha será cobrado pelo seu valor.',
].join('\n');

const secoes = [
  {
    nome: 'Spot boas-vindas',
    nota: 'Flores e design, na paleta escolhida. De 95 € a 130 €, conforme a opção.',
    itens: opcoes('Spot boas-vindas', [130, 125, 110, 95]),
  },
  {
    nome: 'Seating plan',
    nota: 'De 105 € a 140 €. Inclui flores e design na paleta escolhida, listagem de convidados + distribuição das mesas personalizada, apontamentos florais + adereços e design e impressões. A distribuição de mesas deve ser partilhada com a equipa 3 semanas antes do evento.',
    itens: opcoes('Seating plan', [105, 130, 130, 140]),
  },
  {
    nome: 'Cerimónia',
    itens: [
      { descricao: 'Arranjos florais de chão ou em cestos médios/grandes', precoUnitario: 45 },
      { descricao: 'Arranjo floral pequeno para consola do celebrante', precoUnitario: 27.5 },
      { descricao: 'Cadeiras sem flor', precoUnitario: 3.5 },
      { descricao: 'Cadeiras com flor e laço', precoUnitario: 8.5 },
      { descricao: 'Cadeiras com tecido + 1 verdura', precoUnitario: 6 },
      { descricao: 'Arranjo floral de chão para a banqueta dos noivos (avaliar necessidade)', precoUnitario: 60 },
      { descricao: 'Pétalas no corredor', precoUnitario: 60 },
      { descricao: 'Conjunto de 2 colunas com 3 arranjos florais (2 nas colunas e 1 no chão)', precoUnitario: 195 },
      { descricao: 'Estrutura retangular 2,20 m com 2 arranjos florais, colunas e tecidos drapeados', precoUnitario: 345 },
      { descricao: 'Velas ao longo do corredor em tubos de vidro, várias dimensões', precoUnitario: 85 },
      { descricao: 'Passadeira branca (1,5 m ou 2 m de largura x 15 m de comprimento)', precoUnitario: 170 },
    ],
  },
  {
    nome: 'Spot arroz e pétalas',
    nota: 'Mesas, flores, recipientes com arroz, pétalas e tecidos. De 65 € a 80 €.',
    itens: opcoes('Spot arroz e pétalas', [65, 75, 80]),
  },
  {
    nome: 'Mesa dos noivos',
    nota: 'De 140 € a 610 €, conforme a opção escolhida.',
    itens: opcoes('Mesa dos noivos', [140, 180, 180, 190, 350, 610]),
  },
  {
    nome: 'Mesa dos convidados',
    nota: 'Preço por mesa, máximo 10 pessoas por mesa. Inclui apontamentos florais, castiçais/copos com velas, bases de madeira + identificação de mesa e ementas individuais personalizadas (design e impressão).',
    itens: [
      ...opcoes('Mesa dos convidados (por mesa)', [40, 42.5, 42.5, 50, 52.5]),
      { descricao: 'Identificação individual por convidado', precoUnitario: 0.9 },
      { descricao: 'Copo azul (por pessoa)', precoUnitario: 1 },
    ],
  },
  {
    nome: 'Spot corte do bolo',
    nota: 'Sob orçamento após reunião; valor conforme a opção escolhida após partilha da inspiração. Tentamos sempre reaproveitar arranjos florais de outros spots.',
    itens: [
      { descricao: 'Spot corte do bolo (sob orçamento após reunião)', precoUnitario: 0 },
    ],
  },
  {
    nome: 'Bouquets e ramos',
    nota: 'Bouquet da noiva de 115 € a 130 €, conforme a inspiração partilhada.',
    itens: [
      ...opcoes('Bouquet da noiva', [115, 120, 125, 130]),
      { descricao: 'Lapela', precoUnitario: 17.5 },
      { descricao: '2.º ramo', precoUnitario: 45 },
      { descricao: 'Ramo das madrinhas', precoUnitario: 40 },
    ],
  },
  {
    nome: 'Extras',
    itens: [
      { descricao: 'Máquina de fogo de artifício até 6 m de altura', precoUnitario: 75 },
      { descricao: 'Repuxos de fogo de artifício de chão (conjunto de 2)', precoUnitario: 60 },
      { descricao: 'Sparklers de 70 cm', precoUnitario: 0.95 },
      { descricao: 'DJ — a partir de (várias opções disponíveis)', precoUnitario: 1000 },
      { descricao: 'Animação infantil — 3 h, modelagem de balões e pinturas faciais (85 € a 90 €, valor já com deslocações)', precoUnitario: 85 },
      { descricao: 'Insuflável — durante todo o evento, sem monitor (95 € a 130 €)', precoUnitario: 95 },
      { descricao: 'Fotografia — a partir de (valor já com deslocações)', precoUnitario: 1350 },
      { descricao: 'Vídeo (valor por definir, já com deslocações)', precoUnitario: 0 },
    ],
  },
];

// Todos os itens do catálogo ficam com quantidade 1, com o nome da secção e com a sua chave
secoes.forEach((secao) => {
  secao.itens = secao.itens.map((item) => ({
    quantidade: 1,
    ...item,
    secao: secao.nome,
    chave: item.chave || slug(`${secao.nome} ${item.descricao}`).slice(0, 70),
  }));
});

module.exports = { valorBase, notasPadrao, secoes };
});

// ===== models/AdminUser ================================================================
__define('models/AdminUser', function (module, exports, require, __dirname, __filename) {
const mongoose = require('mongoose');

// Cada pessoa da equipa que tem acesso ao painel de admin fica registada aqui.
// "owner" é o dono do site: só ele pode criar/remover outros utilizadores admin.
const adminUserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, unique: true },
    // Opcional: quando definido, também pode ser usado para entrar (mais fácil de
    // lembrar do que o nome de utilizador). Fica sempre em minúsculas para a
    // comparação no login não depender de maiúsculas/minúsculas.
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    senhaHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['owner', 'admin'], default: 'admin' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminUser', adminUserSchema);
});

// ===== models/Calendario ===============================================================
__define('models/Calendario', function (module, exports, require, __dirname, __filename) {
const mongoose = require('mongoose');

// Cada entrada é um Google Calendar público (da dona, de um empregado, etc.) que
// vai aparecer embutido no painel admin, todos sobrepostos no mesmo calendário.
const calendarioSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    googleCalendarId: { type: String, required: true, trim: true },
    // Cor de fundo do Google Calendar para este calendário no embed (formato #RRGGBB).
    // Lista de cores aceites pelo Google: https://support.google.com/calendar/answer/37034
    cor: { type: String, trim: true, default: '#6B2A34' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Calendario', calendarioSchema);
});

// ===== models/CatalogoFoto =============================================================
__define('models/CatalogoFoto', function (module, exports, require, __dirname, __filename) {
const mongoose = require('mongoose');

// Foto de uma opção do catálogo De Cheio (ex: "Mesa dos noivos — opção de 350 €").
// A "chave" é a do item em config/orcamentoBase.js. Guardada como binário na base de dados
// (não como ficheiro) porque o disco do Render grátis é apagado a cada deploy.
const catalogoFotoSchema = new mongoose.Schema(
  {
    chave: { type: String, required: true, unique: true, trim: true },
    mime: { type: String, required: true },
    dados: { type: Buffer, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CatalogoFoto', catalogoFotoSchema);
});

// ===== models/Categoria ================================================================
__define('models/Categoria', function (module, exports, require, __dirname, __filename) {
const mongoose = require('mongoose');

// Cada categoria é um grupo de fotos para a secção "Os nossos eventos" da
// página principal (ex: "Casamentos", "Aniversários", "Capuchinho Vermelho").
// As fotos ficam guardadas como data URL (base64) diretamente no Mongo —
// mais simples e evita depender de armazenamento em disco no Render.
const categoriaSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true, unique: true },

    fotos: [
      {
        dataUrl: { type: String, required: true },
        legenda: { type: String, trim: true },
        criadoEm: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Categoria', categoriaSchema);
});

// ===== models/Orcamento ================================================================
__define('models/Orcamento', function (module, exports, require, __dirname, __filename) {
const mongoose = require('mongoose');

// O "orçamento" formal — o documento com itens e preços que os admins criam e enviam
// ao cliente. É diferente do `QuoteRequest` (que é só o pedido/conversa inicial):
// este é o documento em si, o que costuma chamar-se "fazer um orçamento".
const itemOrcamentoSchema = new mongoose.Schema(
  {
    descricao: { type: String, required: true, trim: true },
    // Secção do catálogo De Cheio a que o item pertence (ex: "Cerimónia"). Opcional.
    secao: { type: String, trim: true },
    // Chave do item no catálogo (liga o item à foto do catálogo). Opcional.
    chave: { type: String, trim: true },
    quantidade: { type: Number, required: true, min: 0, default: 1 },
    precoUnitario: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const orcamentoSchema = new mongoose.Schema(
  {
    // Opcional: liga este orçamento a um pedido existente. Quando presente, os dados do
    // cliente abaixo são copiados de lá no momento da criação (mas depois podem ser
    // editados aqui à parte, sem afetar o pedido original).
    quoteRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuoteRequest' },

    nome: { type: String, required: true, trim: true },
    nomeFestejado: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    telefone: { type: String, trim: true },
    tipoEvento: { type: String, trim: true },
    dataEvento: { type: Date },
    localEvento: { type: String, trim: true },
    numeroConvidados: { type: Number, min: 0 },

    // Versão da proposta (V00, V01...) — aparece na capa do documento
    versao: { type: String, trim: true, default: 'V00' },

    itens: {
      type: [itemOrcamentoSchema],
      default: [],
    },

    // Desconto em euros, aplicado ao subtotal (soma dos itens). Não é percentagem, para
    // manter simples — se precisares de percentagem, calculas o valor e pões aqui.
    desconto: { type: Number, min: 0, default: 0 },

    notas: { type: String, trim: true },
    validoAte: { type: Date },

    // Imagens de inspiração a incluir no documento — herdadas do pedido de origem (quando
    // existe) e/ou adicionadas à mão pelo admin. Guardadas como data URL, tal como as
    // imagens do pedido e do chat.
    imagens: [{ type: String }],

    // Página do evento no documento (moodboard = "imagens" acima) e página das flores
    tema: { type: String, trim: true },
    palavrasChave: { type: String, trim: true },
    paleta: [{ type: String }], // cores em hexadecimal, ex: "#2f4a5e"
    flores: { type: String, trim: true },
    imagensFlores: [{ type: String }],

    status: {
      type: String,
      enum: ['rascunho', 'enviado'],
      default: 'rascunho',
    },

    // Nome de utilizador do admin que criou o orçamento
    criadoPor: { type: String, trim: true },
  },
  { timestamps: true }
);

// Calcula o total sempre que o documento é convertido para JSON (ex: respostas da API),
// para o frontend nunca ter de repetir esta conta.
orcamentoSchema.methods.calcularTotal = function () {
  const subtotal = this.itens.reduce(
    (soma, item) => soma + item.quantidade * item.precoUnitario,
    0
  );
  return Math.max(0, subtotal - (this.desconto || 0));
};

orcamentoSchema.set('toJSON', {
  transform(doc, ret) {
    ret.total = doc.calcularTotal();
    return ret;
  },
});

module.exports = mongoose.model('Orcamento', orcamentoSchema);
});

// ===== models/QuoteRequest =============================================================
__define('models/QuoteRequest', function (module, exports, require, __dirname, __filename) {
const mongoose = require('mongoose');

// Esta é a "ficha" de cada pedido de orçamento.
// O campo `status` é o que vais usar no painel de gestão (parte 3) para
// saberes rapidamente em que ponto está cada pedido.
const quoteRequestSchema = new mongoose.Schema(
  {
    // Se a pessoa tinha sessão iniciada quando fez o pedido, fica ligado à conta dela —
    // assim aparece na aba "As minhas conversas" e não depende só do link.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    nome: { type: String, required: true, trim: true },
    // Nome de quem o evento é sobre (aniversariante, noivos, empresa...), quando é diferente
    // de quem está a pedir o orçamento. Opcional, porque nem todo o tipo de evento precisa disto.
    nomeFestejado: { type: String, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    telefone: { type: String, trim: true },

    tipoEvento: {
      type: String,
      required: true,
      enum: [
        'Casamento',
        'Aniversário',
        'Batizado',
        'Evento corporativo',
        'Baby shower',
        'Outro',
      ],
    },
    dataEvento: { type: Date },
    localEvento: { type: String, trim: true },
    numeroConvidados: { type: Number },
    mensagem: { type: String, trim: true },

    // Fotos de inspiração enviadas com o pedido inicial (ex: prints do Pinterest, fotos de
    // outros eventos). Guardadas como "data URL" (a imagem já codificada em base64), tal como
    // as fotos do portefólio em Categoria — mais simples do que gerir ficheiros em disco.
    imagensInspiracao: [{ type: String }],

    // Estado interno do pedido — usado no painel de admin (fase 3)
    status: {
      type: String,
      enum: ['nao_respondido', 'em_andamento', 'concluido'],
      default: 'nao_respondido',
    },

    // Fechar uma conversa é diferente de mudar o `status`: serve só para a arrumar
    // (passa a aparecer no separador "Fechadas" em vez de "Abertas"), sem apagar nada.
    // Tanto o cliente como o admin podem fechar e reabrir sempre que precisarem.
    fechado: { type: Boolean, default: false },
    fechadoEm: { type: Date },

    // Preparado para a fase 2 (chat): cada pedido vai poder ter mensagens associadas
    mensagens: [
      {
        autor: { type: String, enum: ['cliente', 'admin'] },
        texto: String,
        // Uma imagem opcional anexada à mensagem (ex: mais uma referência visual durante a
        // conversa). Também guardada como data URL, tal como as imagens de inspiração acima.
        imagem: { type: String },
        criadoEm: { type: Date, default: Date.now },
        // Só preenchido em mensagens do admin: guarda o nome de utilizador de quem respondeu.
        enviadoPor: { type: String },
      },
    ],
  },
  { timestamps: true } // cria automaticamente createdAt / updatedAt
);

module.exports = mongoose.model('QuoteRequest', quoteRequestSchema);
});

// ===== models/Review ===================================================================
__define('models/Review', function (module, exports, require, __dirname, __filename) {
const mongoose = require('mongoose');

// Testemunhos de clientes mostrados na página inicial.
// Só o dono da conta (owner) pode adicionar ou remover — ver routes/reviews.js.
const reviewSchema = new mongoose.Schema(
  {
    nomeCliente: { type: String, required: true, trim: true },
    tipoEvento: { type: String, trim: true }, // ex: "Casamento", opcional — dá contexto ao testemunho
    texto: { type: String, required: true, trim: true },
    classificacao: { type: Number, min: 1, max: 5, default: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
});

// ===== models/User =====================================================================
__define('models/User', function (module, exports, require, __dirname, __filename) {
const mongoose = require('mongoose');

// Cada pessoa que cria conta no site (por email ou por Google) fica registada aqui.
// Isto permite que os pedidos/conversas fiquem "presos" a uma conta, em vez de
// dependerem só de um link que se pode perder.
const userSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },

    // Só existe se a conta foi criada por email/senha
    senhaHash: { type: String, select: false },

    // Só existe se a conta foi criada (ou associada) através do login com Google
    googleId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
});

// ===== routes/adminAuth ================================================================
__define('routes/adminAuth', function (module, exports, require, __dirname, __filename) {
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const AdminUser = require('../models/AdminUser');

const JWT_SECRET = process.env.JWT_SECRET; // definida (ou gerada) no arranque, em server.js

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
  try {
    const admin = await AdminUser.findById(req.admin.id);
    if (!admin) return res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
    res.json({ admin: dadosPublicos(admin) });
  } catch (erro) {
    // Um erro da base de dados (ou um id inválido no token) não pode deitar o servidor abaixo
    console.error('Erro ao validar a sessão de admin:', erro.message);
    res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
  }
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
});

// ===== routes/auth =====================================================================
__define('routes/auth', function (module, exports, require, __dirname, __filename) {
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET; // definida (ou gerada) no arranque, em server.js
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

// Middleware: exige que a pessoa esteja autenticada (usado noutras rotas, ex. "os meus orçamentos")
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

// Middleware: se houver sessão válida põe req.user, mas nunca bloqueia (usado ao criar pedidos,
// para ligar o pedido à conta quando a pessoa está autenticada, sem obrigar ninguém a ter conta)
function optionalUser(req, res, next) {
  const token = req.cookies?.[NOME_COOKIE];
  if (!token) return next();

  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (erro) {
    // token inválido/expirado — segue em frente como visitante anónimo
  }
  next();
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

module.exports = { router, requireUser, optionalUser };
});

// ===== routes/calendarios ==============================================================
__define('routes/calendarios', function (module, exports, require, __dirname, __filename) {
const express = require('express');
const router = express.Router();
const Calendario = require('../models/Calendario');
const { requireAdmin } = require('./adminAuth');

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
});

// ===== routes/categorias ===============================================================
__define('routes/categorias', function (module, exports, require, __dirname, __filename) {
const express = require('express');
const router = express.Router();
const Categoria = require('../models/Categoria');
const { requireAdmin } = require('./adminAuth');

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
});

// ===== routes/orcamentos ===============================================================
__define('routes/orcamentos', function (module, exports, require, __dirname, __filename) {
const express = require('express');
const router = express.Router();
const Orcamento = require('../models/Orcamento');
const QuoteRequest = require('../models/QuoteRequest');
const { requireAdmin } = require('./adminAuth');
const orcamentoBase = require('../config/orcamentoBase');
const CatalogoFoto = require('../models/CatalogoFoto');

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

const MAX_CORES_PALETA = 8;

function limparPaleta(cores) {
  if (!Array.isArray(cores)) return undefined;
  return cores
    .filter((cor) => typeof cor === 'string' && /^#[0-9a-fA-F]{6}$/.test(cor))
    .map((cor) => cor.toLowerCase())
    .slice(0, MAX_CORES_PALETA);
}

function textoCurto(valor, max) {
  return String(valor ?? '').trim().slice(0, max);
}

// Tudo neste ficheiro é só para admins — o cliente ainda não vê orçamentos (fase futura).
router.use(requireAdmin);

function limparItens(itens) {
  if (!Array.isArray(itens)) return [];
  return itens
    .filter((item) => item && String(item.descricao || '').trim())
    .map((item) => ({
      descricao: String(item.descricao).trim(),
      secao: item.secao ? String(item.secao).trim() : undefined,
      chave: item.chave ? String(item.chave).trim().slice(0, 80) : undefined,
      quantidade: Number(item.quantidade) || 0,
      precoUnitario: Number(item.precoUnitario) || 0,
    }));
}

// POST /api/orcamentos — cria um orçamento, do zero ou a partir de um pedido existente
// (envia { quoteRequestId } para pré-preencher os dados do cliente a partir desse pedido)
router.post('/', async (req, res) => {
  try {
    // Orçamentos novos arrancam com a base De Cheio: o valor base (recursos humanos &
    // deslocações) e as condições padrão. Só se aplica quando o pedido não traz itens/notas
    // (ex: "Criar orçamento" a partir de um pedido); o editor envia sempre o que lá está.
    const dados = {
      itens: req.body.itens === undefined ? [{ ...orcamentoBase.valorBase }] : limparItens(req.body.itens),
      desconto: Number(req.body.desconto) || 0,
      notas: req.body.notas === undefined ? orcamentoBase.notasPadrao : req.body.notas || '',
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
      dados.numeroConvidados = pedido.numeroConvidados;
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
      dados.numeroConvidados = Number(req.body.numeroConvidados) || undefined;
      dados.versao = String(req.body.versao || '').trim() || undefined;
      dados.imagens = limparImagens(req.body.imagens) || [];
    }

    // Página do evento / flores (valem para os dois modos de criação)
    if (req.body.tema) dados.tema = textoCurto(req.body.tema, 120);
    if (req.body.palavrasChave) dados.palavrasChave = textoCurto(req.body.palavrasChave, 200);
    if (req.body.flores) dados.flores = textoCurto(req.body.flores, 400);
    const paleta = limparPaleta(req.body.paleta);
    if (paleta) dados.paleta = paleta;
    const imagensFlores = limparImagens(req.body.imagensFlores);
    if (imagensFlores) dados.imagensFlores = imagensFlores;

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

// GET /api/orcamentos/base — o catálogo De Cheio (secções, itens e preços) + valor base e notas padrão.
// Tem de vir antes de "/:id" para o Express não confundir "base" com um ID.
router.get('/base', async (req, res) => {
  try {
    // Junta a cada item o endereço da sua foto (se tiver). O "v" muda quando a foto é trocada,
    // para o navegador não mostrar a antiga.
    const fotos = await CatalogoFoto.find({}, 'chave updatedAt');
    const versoes = new Map(fotos.map((f) => [f.chave, f.updatedAt.getTime()]));
    const secoes = orcamentoBase.secoes.map((secao) => ({
      ...secao,
      itens: secao.itens.map((item) => ({
        ...item,
        foto: versoes.has(item.chave)
          ? `/api/orcamentos/catalogo-fotos/${item.chave}?v=${versoes.get(item.chave)}`
          : undefined,
      })),
    }));
    res.json({ ...orcamentoBase, secoes });
  } catch (erro) {
    console.error('Erro ao ler o catálogo:', erro);
    res.json(orcamentoBase); // sem fotos, mas o catálogo continua a funcionar
  }
});

// ---------- Fotos do catálogo ----------
const CHAVES_DO_CATALOGO = new Set(orcamentoBase.secoes.flatMap((s) => s.itens.map((i) => i.chave)));
const MAX_FOTO_CATALOGO_BYTES = 2 * 1024 * 1024; // 2MB já descodificada

// GET /api/orcamentos/catalogo-fotos/:chave — devolve a imagem
router.get('/catalogo-fotos/:chave', async (req, res) => {
  try {
    const foto = await CatalogoFoto.findOne({ chave: req.params.chave });
    if (!foto) return res.status(404).end();
    res.set('Content-Type', foto.mime);
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(foto.dados);
  } catch (erro) {
    res.status(400).end();
  }
});

// PUT /api/orcamentos/catalogo-fotos/:chave — põe ou troca a foto de uma opção
router.put('/catalogo-fotos/:chave', async (req, res) => {
  try {
    const { chave } = req.params;
    if (!CHAVES_DO_CATALOGO.has(chave)) return res.status(404).json({ erro: 'Item de catálogo desconhecido.' });

    const partes = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body.imagem || ''));
    if (!partes) return res.status(400).json({ erro: 'Imagem inválida.' });
    const dados = Buffer.from(partes[2], 'base64');
    if (!dados.length || dados.length > MAX_FOTO_CATALOGO_BYTES) {
      return res.status(400).json({ erro: 'A imagem é demasiado grande (máx. 2 MB).' });
    }

    const foto = await CatalogoFoto.findOneAndUpdate(
      { chave },
      { chave, mime: partes[1], dados },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ sucesso: true, foto: `/api/orcamentos/catalogo-fotos/${chave}?v=${foto.updatedAt.getTime()}` });
  } catch (erro) {
    console.error('Erro ao guardar foto do catálogo:', erro);
    res.status(500).json({ erro: 'Não foi possível guardar a foto.' });
  }
});

// DELETE /api/orcamentos/catalogo-fotos/:chave — tira a foto de uma opção
router.delete('/catalogo-fotos/:chave', async (req, res) => {
  try {
    await CatalogoFoto.deleteOne({ chave: req.params.chave });
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: 'Não foi possível apagar a foto.' });
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
      'numeroConvidados',
      'versao',
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
    if (Object.prototype.hasOwnProperty.call(req.body, 'tema')) alteracoes.tema = textoCurto(req.body.tema, 120);
    if (Object.prototype.hasOwnProperty.call(req.body, 'palavrasChave')) alteracoes.palavrasChave = textoCurto(req.body.palavrasChave, 200);
    if (Object.prototype.hasOwnProperty.call(req.body, 'flores')) alteracoes.flores = textoCurto(req.body.flores, 400);
    if (Object.prototype.hasOwnProperty.call(req.body, 'paleta')) {
      const paleta = limparPaleta(req.body.paleta);
      if (paleta === undefined) return res.status(400).json({ erro: 'Paleta inválida.' });
      alteracoes.paleta = paleta;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'imagensFlores')) {
      const imagensFlores = limparImagens(req.body.imagensFlores);
      if (imagensFlores === undefined) return res.status(400).json({ erro: 'Lista de imagens inválida.' });
      alteracoes.imagensFlores = imagensFlores;
    }
    if (alteracoes.dataEvento === '') alteracoes.dataEvento = null;
    if (alteracoes.validoAte === '') alteracoes.validoAte = null;
    if (alteracoes.numeroConvidados === '' || alteracoes.numeroConvidados === 0) alteracoes.numeroConvidados = null;
    if (alteracoes.versao !== undefined && !String(alteracoes.versao).trim()) alteracoes.versao = 'V00';
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
});

// ===== routes/quotes ===================================================================
__define('routes/quotes', function (module, exports, require, __dirname, __filename) {
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
});

// ===== routes/reviews ==================================================================
__define('routes/reviews', function (module, exports, require, __dirname, __filename) {
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
});

// ===== services/notificacoes ===========================================================
__define('services/notificacoes', function (module, exports, require, __dirname, __filename) {
// Notificações por email (via Resend) + deteção de "página aberta".
//
// Regra principal: se a pessoa tiver a conversa aberta no momento, NÃO se envia email
// (ela já está a ver as mensagens a chegar). A página da conversa pede o pedido ao servidor
// a cada 5 segundos; cada pedido regista aqui "esta pessoa esteve cá agora mesmo".
//
// Nada daqui pode partir o site: se o email falhar (ou não estiver configurado), só fica
// uma linha no log e o pedido/mensagem segue normalmente.

const JANELA_PRESENCA_MS = 15 * 1000; // 3 ciclos de polling — se passou mais do que isto, a página já não está aberta
const INTERVALO_MINIMO_AVISOS_MS = 5 * 60 * 1000; // no máx. 1 email de "mensagem nova" por conversa a cada 5 min

const presenca = new Map(); // "idPedido:cliente" | "idPedido:admin" -> timestamp
const ultimoAviso = new Map(); // "idPedido:destino" -> timestamp

function registarPresenca(idPedido, quem) {
  presenca.set(`${idPedido}:${quem}`, Date.now());
}

function estaPresente(idPedido, quem) {
  const visto = presenca.get(`${idPedido}:${quem}`);
  return Boolean(visto) && Date.now() - visto < JANELA_PRESENCA_MS;
}

// Limpeza periódica para os Maps não crescerem para sempre
setInterval(() => {
  const agora = Date.now();
  for (const [chave, t] of presenca) if (agora - t > JANELA_PRESENCA_MS) presenca.delete(chave);
  for (const [chave, t] of ultimoAviso) if (agora - t > INTERVALO_MINIMO_AVISOS_MS) ultimoAviso.delete(chave);
}, 60 * 1000).unref();

function podeAvisar(chave) {
  const t = ultimoAviso.get(chave);
  return !t || Date.now() - t >= INTERVALO_MINIMO_AVISOS_MS;
}

function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resumir(texto, max = 300) {
  const limpo = String(texto || '').trim();
  return limpo.length > max ? `${limpo.slice(0, max)}…` : limpo;
}

function urlSite() {
  return (process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
}

function destinatariosEquipa() {
  return (process.env.EMAIL_EQUIPA || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

async function enviarEmail({ para, assunto, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('✉️  Email não enviado (falta RESEND_API_KEY no .env / Render).');
    return false;
  }
  try {
    const resposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'DecoraçãoCheio <onboarding@resend.dev>',
        to: Array.isArray(para) ? para : [para],
        subject: assunto,
        html,
      }),
    });
    if (!resposta.ok) {
      console.error('✉️  Erro ao enviar email (Resend):', resposta.status, await resposta.text());
      return false;
    }
    return true;
  } catch (erro) {
    console.error('✉️  Erro ao enviar email:', erro.message);
    return false;
  }
}

function modeloEmail({ titulo, paragrafos, botao }) {
  const corpo = paragrafos.map((p) => `<p style="margin:0 0 14px;line-height:1.5;">${p}</p>`).join('');
  const link = botao
    ? `<p style="margin:22px 0 0;"><a href="${botao.url}" style="background:#8a2e3b;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;display:inline-block;">${botao.texto}</a></p>`
    : '';
  return `<div style="font-family:Georgia,serif;color:#2b2b2b;max-width:520px;margin:0 auto;padding:24px;">
    <h2 style="margin:0 0 18px;color:#8a2e3b;">${titulo}</h2>${corpo}${link}
    <p style="margin:28px 0 0;font-size:12px;color:#888;">DecoraçãoCheio</p>
  </div>`;
}

// ---------- Avisos para a EQUIPA ----------

// Pedido novo (envia sempre: ninguém pode ter a conversa aberta antes de ela existir)
async function avisarEquipaNovoPedido(pedido) {
  try {
    const para = destinatariosEquipa();
    if (!para.length) return;
    const base = urlSite();
    const ligacao = base ? { url: `${base}/admin/chat.html?id=${pedido._id}`, texto: 'Abrir o pedido' } : null;
    await enviarEmail({
      para,
      assunto: `Novo pedido de orçamento — ${pedido.tipoEvento} (${pedido.nome})`,
      html: modeloEmail({
        titulo: 'Novo pedido de orçamento',
        paragrafos: [
          `<strong>${escaparHtml(pedido.nome)}</strong> (${escaparHtml(pedido.email)}) pediu um orçamento para <strong>${escaparHtml(pedido.tipoEvento)}</strong>.`,
          pedido.mensagem ? `“${escaparHtml(resumir(pedido.mensagem))}”` : '',
        ].filter(Boolean),
        botao: ligacao,
      }),
    });
  } catch (erro) {
    console.error('✉️  Falha no aviso de novo pedido:', erro.message);
  }
}

// Mensagem nova do cliente (não envia se a equipa tiver esta conversa aberta)
async function avisarEquipaMensagemCliente(pedido, texto, temImagem) {
  try {
    const para = destinatariosEquipa();
    if (!para.length) return;
    if (estaPresente(pedido._id, 'admin')) return;
    const chave = `${pedido._id}:equipa`;
    if (!podeAvisar(chave)) return;
    ultimoAviso.set(chave, Date.now());

    const base = urlSite();
    const ligacao = base ? { url: `${base}/admin/chat.html?id=${pedido._id}`, texto: 'Abrir a conversa' } : null;
    await enviarEmail({
      para,
      assunto: `Nova mensagem de ${pedido.nome}`,
      html: modeloEmail({
        titulo: 'Nova mensagem de cliente',
        paragrafos: [
          `<strong>${escaparHtml(pedido.nome)}</strong> escreveu na conversa do pedido (${escaparHtml(pedido.tipoEvento)}):`,
          texto ? `“${escaparHtml(resumir(texto))}”` : '(enviou uma imagem)',
          texto && temImagem ? '(e anexou uma imagem)' : '',
        ].filter(Boolean),
        botao: ligacao,
      }),
    });
  } catch (erro) {
    console.error('✉️  Falha no aviso de mensagem do cliente:', erro.message);
  }
}

// ---------- Aviso para o CLIENTE ----------

// A equipa respondeu (não envia se o cliente tiver a conversa aberta).
// Só fica ativo com EMAIL_CLIENTES=true, porque no Resend sem domínio próprio verificado
// só é possível enviar para o email da própria conta.
async function avisarClienteResposta(pedido, texto) {
  try {
    if (process.env.EMAIL_CLIENTES !== 'true') return;
    if (!pedido.email) return;
    if (estaPresente(pedido._id, 'cliente')) return;
    const chave = `${pedido._id}:cliente`;
    if (!podeAvisar(chave)) return;
    ultimoAviso.set(chave, Date.now());

    const base = urlSite();
    const ligacao = base ? { url: `${base}/pedido.html?id=${pedido._id}`, texto: 'Ver a conversa' } : null;
    await enviarEmail({
      para: pedido.email,
      assunto: 'A nossa equipa respondeu ao seu pedido de orçamento',
      html: modeloEmail({
        titulo: 'Temos uma resposta para si',
        paragrafos: [
          `Olá ${escaparHtml(pedido.nome)}, a nossa equipa respondeu ao seu pedido de orçamento:`,
          texto ? `“${escaparHtml(resumir(texto))}”` : '(enviámos-lhe uma imagem)',
        ],
        botao: ligacao,
      }),
    });
  } catch (erro) {
    console.error('✉️  Falha no aviso ao cliente:', erro.message);
  }
}

module.exports = {
  registarPresenca,
  avisarEquipaNovoPedido,
  avisarEquipaMensagemCliente,
  avisarClienteResposta,
};
});

// ===== services/seedFotosCatalogo ======================================================
__define('services/seedFotosCatalogo', function (module, exports, require, __dirname, __filename) {
// Carrega as fotos de arranque (ficheiro seed-fotos.json, tiradas da proposta modelo) para a base
// de dados. Só corre quando ainda não existe NENHUMA foto de catálogo — por isso não volta a pôr
// fotos que a Filipa tenha apagado ou trocado. Depois do primeiro arranque o ficheiro já não é
// necessário e pode ser apagado do repositório.

const fs = require('fs');
const path = require('path');
const CatalogoFoto = require('../models/CatalogoFoto');
const orcamentoBase = require('../config/orcamentoBase');

const FICHEIRO = path.join(__dirname, '..', 'seed-fotos.json');

async function semearFotosDoCatalogo() {
  try {
    if (!fs.existsSync(FICHEIRO)) return;
    if ((await CatalogoFoto.estimatedDocumentCount()) > 0) return;

    const fotos = JSON.parse(fs.readFileSync(FICHEIRO, 'utf8')); // { chave: jpeg em base64 }
    const chavesValidas = new Set(orcamentoBase.secoes.flatMap((s) => s.itens.map((i) => i.chave)));
    let importadas = 0;
    for (const [chave, base64] of Object.entries(fotos)) {
      if (!chavesValidas.has(chave)) continue;
      await CatalogoFoto.create({ chave, mime: 'image/jpeg', dados: Buffer.from(base64, 'base64') });
      importadas += 1;
    }
    if (importadas) console.log(`🖼️  ${importadas} fotos do catálogo carregadas (seed-fotos.json)`);
  } catch (erro) {
    console.error('Não foi possível carregar as fotos iniciais do catálogo:', erro.message);
  }
}

module.exports = { semearFotosDoCatalogo };
});

// ===== server (arranque) ==========================================================
__define('server', function (module, exports, require, __dirname, __filename) {
require('dotenv').config();

// Chave que assina as sessões de login. Tem de estar definida no Render (Environment → JWT_SECRET).
// Se faltar, gera-se uma aleatória só para esta execução: é seguro, mas as sessões caem sempre
// que o servidor reinicia. (Antes usava-se uma chave fixa escrita no código — que, num repositório
// público, qualquer pessoa conseguia ver e usar para forjar uma sessão de admin.)
const crypto = require('crypto');
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  JWT_SECRET não está definido: a usar uma chave temporária. Define JWT_SECRET no Render para as sessões durarem.');
}
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
const { semearFotosDoCatalogo } = require('./services/seedFotosCatalogo');

// Rede de segurança: um erro inesperado numa rota não deve deitar o servidor inteiro abaixo
// (no Render grátis, um reinício demora cerca de um minuto).
process.on('unhandledRejection', (erro) => console.error('Erro não tratado:', erro && erro.message ? erro.message : erro));

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
// A palavra-passe vem de OWNER_PASSWORD (Render → Environment). Se não estiver definida, gera-se
// uma aleatória que aparece UMA vez nos logs — nunca fica escrita no código.
async function garantirOwner() {
  const jaExisteAlgumAdmin = await AdminUser.countDocuments();
  if (jaExisteAlgumAdmin > 0) return;

  const username = process.env.OWNER_USERNAME || 'Filipa C.';
  const definida = process.env.OWNER_PASSWORD && process.env.OWNER_PASSWORD.length >= 10;
  const senha = definida ? process.env.OWNER_PASSWORD : crypto.randomBytes(9).toString('base64url');

  const senhaHash = await bcrypt.hash(senha, 10);
  await AdminUser.create({ username, senhaHash, role: 'owner' });
  if (definida) {
    console.log(`👑 Conta de dono criada: "${username}" (palavra-passe = OWNER_PASSWORD). Podes mudá-la em "A minha conta".`);
  } else {
    console.log(`👑 Conta de dono criada: "${username}". Palavra-passe temporária (só aparece esta vez): ${senha} — muda-a em "A minha conta" assim que entrares.`);
  }
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Ligado ao MongoDB');
    return garantirOwner().then(semearFotosDoCatalogo);
  })
  .catch((erro) => console.error('❌ Erro ao ligar ao MongoDB:', erro.message));

app.listen(PORT, () => {
  console.log(`🚀 Servidor a correr em http://localhost:${PORT}`);
});
});

__carregar('server');
