const { Schema, model } = require('mongoose');

/**
 * RF21 - Sugestão de Observações por IA
 *
 * Não é um modelo de IA de verdade: a "sugestão" é simplesmente consultar
 * as observações mais usadas para aquele produto (contagem decrescente).
 * Toda vez que um item de comanda é salvo com observação (ver Comanda.js),
 * um job/hook incrementa `contagem` aqui via upsert.
 */
const observacaoFrequenteSchema = new Schema(
  {
    produto: { type: Schema.Types.ObjectId, ref: 'Produto', required: true },
    texto: { type: String, required: true, trim: true }, // ex: "Sem cebola"
    contagem: { type: Number, default: 1 },
  },
  { timestamps: true }
);

observacaoFrequenteSchema.index({ produto: 1, texto: 1 }, { unique: true });
observacaoFrequenteSchema.index({ produto: 1, contagem: -1 }); // top-N para sugestão

module.exports = { ObservacaoFrequente: model('ObservacaoFrequente', observacaoFrequenteSchema) };
