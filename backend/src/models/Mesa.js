const { Schema, model } = require('mongoose');

/**
 * RF04 - Mapa de Mesas Geral
 *
 * O grid de mesas do design usa a borda colorida para indicar o status
 * (verde = livre, vermelho = ocupada/atenção). `status` é a fonte da
 * verdade; a cor é apenas uma projeção no frontend (RNF03).
 */
const STATUS_MESA = ['livre', 'ocupada', 'aguardando_fechamento'];

const mesaSchema = new Schema(
  {
    numero: { type: Number, required: true }, // unicidade tratada pelo índice parcial abaixo
    status: { type: String, enum: STATUS_MESA, default: 'livre' },

    // preenchidos quando a mesa é aberta; usados para o timer "Desde 14:32 / 01h18m"
    abertaEm: { type: Date, default: null },
    abertaPor: { type: Schema.Types.ObjectId, ref: 'Funcionario', default: null },

    ativo: { type: Boolean, default: true }, // soft delete (RNF11)
  },
  { timestamps: true }
);

// Único por número, mas só entre as mesas ativas — permite reaproveitar o
// número de uma mesa removida (soft delete) sem colidir com o índice.
mesaSchema.index({ numero: 1 }, { unique: true, partialFilterExpression: { ativo: true } });

module.exports = { Mesa: model('Mesa', mesaSchema), STATUS_MESA };