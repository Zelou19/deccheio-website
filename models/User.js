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
