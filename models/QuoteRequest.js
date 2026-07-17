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
    numeroConvidados: { type: Number },
    orcamentoAproximado: { type: String, trim: true }, // ex: "500-1000€", texto livre por agora
    mensagem: { type: String, trim: true },

    // Estado interno do pedido — usado no painel de admin (fase 3)
    status: {
      type: String,
      enum: ['nao_respondido', 'em_andamento', 'concluido'],
      default: 'nao_respondido',
    },

    // Preparado para a fase 2 (chat): cada pedido vai poder ter mensagens associadas
    mensagens: [
      {
        autor: { type: String, enum: ['cliente', 'admin'] },
        texto: String,
        criadoEm: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true } // cria automaticamente createdAt / updatedAt
);

module.exports = mongoose.model('QuoteRequest', quoteRequestSchema);
