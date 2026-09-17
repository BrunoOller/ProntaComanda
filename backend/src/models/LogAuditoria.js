const { Schema, model } = require('mongoose');

/**
 * RNF10 - Tratamento Global de Falhas (logs de erro estruturados)
 * RF08  - Justificativa para Auditoria (estornos)
 *
 * Usado tanto pelo middleware global de erro (winston) quanto por ações
 * sensíveis específicas (estorno de item, desconto aplicado, reabertura de
 * comanda) para compor os "relatórios de auditoria" do Dashboard (RF17).
 */
const logAuditoriaSchema = new Schema(
  {
    tipo: {
      type: String,
      enum: ['erro_sistema', 'estorno_item', 'desconto_aplicado', 'reabertura_comanda', 'ajuste_estoque'],
      required: true,
    },
    funcionario: { type: Schema.Types.ObjectId, ref: 'Funcionario', default: null },

    entidade: { type: String }, // ex: "Comanda", "Mesa"
    entidadeId: { type: Schema.Types.ObjectId },

    detalhes: { type: Schema.Types.Mixed }, // payload livre (stack trace, motivo, valores antes/depois)
  },
  { timestamps: true }
);

logAuditoriaSchema.index({ tipo: 1, createdAt: -1 });

module.exports = { LogAuditoria: model('LogAuditoria', logAuditoriaSchema) };
