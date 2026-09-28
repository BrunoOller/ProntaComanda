const { Schema, model } = require('mongoose');

// Fonte única dos tipos: usada pelo schema, pelo filtro da API e pela tela de auditoria.
const TIPOS_AUDITORIA = [
  'erro_sistema',
  'estorno_item',
  'desconto_aplicado',
  'reabertura_comanda',
  'reabertura_mesa',
  'ajuste_estoque',
  'funcionario_criado',
  'funcionario_atualizado',
  'funcionario_desligado',
  'funcionario_reativado',
  'produto_preco_alterado',
  'produto_inativado',
  'produto_reativado',
];

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
      enum: TIPOS_AUDITORIA,
      required: true,
    },
    funcionario: { type: Schema.Types.ObjectId, ref: 'Funcionario', default: null },

    entidade: { type: String }, // ex: "Comanda", "Mesa"
    entidadeId: { type: Schema.Types.ObjectId },

    detalhes: { type: Schema.Types.Mixed }, // payload livre (stack trace, motivo, valores antes/depois)
  },
  { timestamps: true }
);

// Listagem da tela de auditoria: mais recentes primeiro, com filtros opcionais.
logAuditoriaSchema.index({ tipo: 1, createdAt: -1 });
logAuditoriaSchema.index({ createdAt: -1 });
logAuditoriaSchema.index({ funcionario: 1, createdAt: -1 });

module.exports = { LogAuditoria: model('LogAuditoria', logAuditoriaSchema), TIPOS_AUDITORIA };
