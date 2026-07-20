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
