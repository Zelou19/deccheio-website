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
