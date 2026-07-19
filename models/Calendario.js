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
