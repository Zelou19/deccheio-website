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
