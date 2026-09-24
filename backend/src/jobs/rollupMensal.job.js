const cron = require('node-cron');
const dayjs = require('dayjs');
const logger = require('../utils/logger');
const { Comanda, Pagamento, ResumoMensal } = require('../models');

/*
Consolidação Mensal de Dados (Data Rollup)
Expurgamento Automatizado
Automação Oculta de Virada de Mês (sem botão na UI)

Roda todo dia 1 às 00:05, processando o mês ANTERIOR (mês fechado).
Passo 1: agrega em ResumoMensal. Passo 2: só se o resumo foi salvo com
 sucesso, apaga os registros individuais daquele período.
 */
async function executarRollup() {
  const mesReferencia = dayjs().subtract(1, 'month');
  const inicio = mesReferencia.startOf('month').toDate();
  const fim = mesReferencia.endOf('month').toDate();

  const jaExiste = await ResumoMensal.findOne({
    ano: mesReferencia.year(),
    mes: mesReferencia.month() + 1,
  });
  if (jaExiste) return; // idempotente - evita rodar duas vezes o mesmo mês

  const comandas = await Comanda.find({ createdAt: { $gte: inicio, $lte: fim } });
  const pagamentos = await Pagamento.find({
    createdAt: { $gte: inicio, $lte: fim },
    estornado: false,
  });

  const porProduto = new Map();
  const motivosEstorno = new Map();

  for (const comanda of comandas) {
    for (const item of comanda.itens) {
      if (item.estornado) {
        const atual = motivosEstorno.get(item.motivoEstorno) || { ocorrencias: 0, valorPerdido: 0 };
        atual.ocorrencias += 1;
        atual.valorPerdido += item.precoUnitario * item.quantidade;
        motivosEstorno.set(item.motivoEstorno, atual);
        continue;
      }

      const atual = porProduto.get(item.nomeProduto) || { quantidadeVendida: 0, valorTotal: 0 };
      atual.quantidadeVendida += item.quantidade;
      atual.valorTotal += item.precoUnitario * item.quantidade;
      porProduto.set(item.nomeProduto, atual);
    }
  }

  const resumo = await ResumoMensal.create({
    ano: mesReferencia.year(),
    mes: mesReferencia.month() + 1,
    faturamentoTotal: pagamentos.reduce((soma, p) => soma + p.valorTotal, 0),
    totalPedidos: comandas.length,
    totalCancelamentos: [...motivosEstorno.values()].reduce((s, m) => s + m.ocorrencias, 0),
    totalPorProduto: [...porProduto.entries()].map(([nomeProduto, v]) => ({
      nomeProduto,
      ...v,
    })),
    motivosEstorno: [...motivosEstorno.entries()].map(([motivo, v]) => ({ motivo, ...v })),
  });

  // RF15 - só expurga depois que o resumo foi confirmado no banco.
  await Comanda.deleteMany({ createdAt: { $gte: inicio, $lte: fim } });
  await Pagamento.deleteMany({ createdAt: { $gte: inicio, $lte: fim } });

  resumo.expurgado = true;
  resumo.expurgadoEm = new Date();
  await resumo.save();

  logger.info(`Rollup mensal concluído: ${mesReferencia.format('MM/YYYY')}`);
}

// RF16 - agendamento oculto, sem qualquer botão na interface
function agendarRollupMensal() {
  cron.schedule('5 0 1 * *', () => {
    executarRollup().catch((err) =>
      logger.error('Falha no rollup mensal', { error: err.message })
    );
  });
}

module.exports = { agendarRollupMensal, executarRollup };
