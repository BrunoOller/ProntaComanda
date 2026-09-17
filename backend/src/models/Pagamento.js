const { Schema, model } = require('mongoose');

/**
 * RF11 - Processamento de Pagamento (Caixa)
 * RF12 - Reabertura Operacional (ver campo `estornadoEm` abaixo)
 *
 * Um Pagamento fecha uma ou mais Comandas de uma Mesa. Guarda os valores
 * recebidos por método para permitir o cálculo do troco e para auditoria/BI
 * (Dashboard: Ganho Total, Total de Pedidos etc.).
 */
const metodoPagamentoSchema = new Schema(
  {
    tipo: { type: String, enum: ['pix', 'cartao', 'dinheiro'], required: true },
    valor: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const pagamentoSchema = new Schema(
  {
    mesa: { type: Schema.Types.ObjectId, ref: 'Mesa', required: true },
    comandas: [{ type: Schema.Types.ObjectId, ref: 'Comanda', required: true }],

    valorTotal: { type: Number, required: true, min: 0 },
    metodos: [metodoPagamentoSchema],
    troco: { type: Number, default: 0, min: 0 },

    recebidoPor: { type: Schema.Types.ObjectId, ref: 'Funcionario', required: true },

    // RF12 - se o caixa reabrir a mesa por engano, o pagamento é estornado
    // (soft delete) em vez de removido, preservando o log para auditoria.
    estornado: { type: Boolean, default: false },
    estornadoEm: { type: Date, default: null },
    estornadoPor: { type: Schema.Types.ObjectId, ref: 'Funcionario', default: null },
  },
  { timestamps: true }
);

pagamentoSchema.index({ mesa: 1, createdAt: -1 });

module.exports = { Pagamento: model('Pagamento', pagamentoSchema) };
