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
    orcamentoAproximado: { type: String, trim: true }, // ex: "500-1000€", texto livre por agora
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
