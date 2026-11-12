const mongoose = require('mongoose');

// O "orçamento" formal — o documento com itens e preços que os admins criam e enviam
// ao cliente. É diferente do `QuoteRequest` (que é só o pedido/conversa inicial):
// este é o documento em si, o que costuma chamar-se "fazer um orçamento".
const itemOrcamentoSchema = new mongoose.Schema(
  {
    descricao: { type: String, required: true, trim: true },
    // Secção do catálogo De Cheio a que o item pertence (ex: "Cerimónia"). Opcional.
    secao: { type: String, trim: true },
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
