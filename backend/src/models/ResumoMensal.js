const { Schema, model } = require('mongoose');

/**
 * RF14 - Consolidação Mensal de Dados (Data Rollup)
 * RF15 - Expurgamento Automatizado
 * RF16 - Automação Oculta de Virada de Mês (sem botão na UI — ver
 *        backend/src/jobs/rollupMensal.js, agendado com node-cron)
 *
 * No 1º dia do mês, um job:
 *  1) agrega Comandas/Pagamentos/estornos do mês anterior neste documento;
 *  2) só depois de salvo com sucesso, deleta os registros individuais
 *     (Comanda/Pagamento) daquele período (RF15).
 * Isto preserva o BI histórico (RF17) sem manter todo o detalhe transacional
 * indefinidamente no banco "quente".
 */
const totalPorProdutoSchema = new Schema(
  {
    produto: { type: Schema.Types.ObjectId, ref: 'Produto' },
    nomeProduto: { type: String },
    quantidadeVendida: { type: Number, default: 0 },
    valorTotal: { type: Number, default: 0 },
  },
  { _id: false }
);

const motivoEstornoResumoSchema = new Schema(
  {
    motivo: { type: String },
    ocorrencias: { type: Number, default: 0 },
    valorPerdido: { type: Number, default: 0 },
  },
  { _id: false }
);

const resumoMensalSchema = new Schema(
  {
    ano: { type: Number, required: true },
    mes: { type: Number, required: true, min: 1, max: 12 },

    faturamentoTotal: { type: Number, default: 0 },
    totalPedidos: { type: Number, default: 0 },
    totalCancelamentos: { type: Number, default: 0 },

    totalPorProduto: [totalPorProdutoSchema],
    motivosEstorno: [motivoEstornoResumoSchema],

    // marca se o expurgo (RF15) dos registros individuais já ocorreu
    expurgado: { type: Boolean, default: false },
    expurgadoEm: { type: Date, default: null },
  },
  { timestamps: true }
);

resumoMensalSchema.index({ ano: 1, mes: 1 }, { unique: true });

module.exports = { ResumoMensal: model('ResumoMensal', resumoMensalSchema) };
