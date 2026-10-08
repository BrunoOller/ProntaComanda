const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));

const asyncHandler = require('../utils/asyncHandler');
const { Comanda, Pagamento, ResumoMensal, STATUS_ITEM_KDS } = require('../models');

/**
 * RF17 - Dashboard de Gestão (BI)
 * Indicadores do design: Ganhos Totais, Total de Pedidos, Ticket Médio,
 * Pedidos Cancelados, Taxa de Conversão, Faturamento por Mês, Status dos
 * Pedidos e Top 5 Produtos.
 *
 * "Pedido" aqui é cada ITEM lançado numa comanda (não a comanda inteira,
 * nem só os pagos) — inclui os que depois foram estornados, que é
 * justamente o que os cartões de cancelamento/conversão medem.
 */
const TIMEZONE = process.env.TZ_ESTABELECIMENTO || 'America/Sao_Paulo';
const arredondar = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;

function limitesDoPeriodo(periodo, agora) {
  switch (periodo) {
    case 'hoje':
      return {
        inicio: agora.startOf('day'),
        fim: agora,
        inicioAnterior: agora.subtract(1, 'day').startOf('day'),
        fimAnterior: agora.subtract(1, 'day').endOf('day'),
      };
    case 'semana':
      // Janela corrida dos últimos 7 dias (não a semana de calendário).
      return {
        inicio: agora.subtract(6, 'day').startOf('day'),
        fim: agora,
        inicioAnterior: agora.subtract(13, 'day').startOf('day'),
        fimAnterior: agora.subtract(7, 'day').endOf('day'),
      };
    case 'mes':
    default:
      return {
        inicio: agora.startOf('month'),
        fim: agora,
        inicioAnterior: agora.subtract(1, 'month').startOf('month'),
        fimAnterior: agora.subtract(1, 'month').endOf('month'),
      };
  }
}

/** Soma ganho (Pagamento) e conta pedidos/cancelados (itens) num intervalo. */
async function totaisDoPeriodo(inicio, fim) {
  const [pagamentos, [agg]] = await Promise.all([
    Pagamento.find({ createdAt: { $gte: inicio, $lte: fim }, estornado: false }).lean(),
    Comanda.aggregate([
      { $unwind: '$itens' },
      { $match: { 'itens.lancadoEm': { $gte: inicio, $lte: fim } } },
      {
        $group: {
          _id: null,
          totalPedidos: { $sum: 1 },
          pedidosCancelados: { $sum: { $cond: ['$itens.estornado', 1, 0] } },
        },
      },
    ]),
  ]);

  return {
    ganhoTotal: arredondar(pagamentos.reduce((soma, p) => soma + p.valorTotal, 0)),
    totalPedidos: agg?.totalPedidos ?? 0,
    pedidosCancelados: agg?.pedidosCancelados ?? 0,
  };
}

/**
 * Totais do período ANTERIOR de "mes": se o mês já foi expurgado (RF15), os
 * dados individuais não existem mais — lê do resumo consolidado em vez de
 * tentar uma consulta que sempre voltaria zerada.
 */
async function totaisMesAnterior(inicioAnterior, fimAnterior) {
  const resumo = await ResumoMensal.findOne({
    ano: inicioAnterior.year(),
    mes: inicioAnterior.month() + 1,
  });

  if (resumo?.expurgado) {
    // resumo criado antes do campo totalItens existir: sem como comparar pedidos
    if (resumo.totalItens == null) return null;
    return {
      ganhoTotal: resumo.faturamentoTotal,
      totalPedidos: resumo.totalItens,
      pedidosCancelados: resumo.totalCancelamentos,
    };
  }

  return totaisDoPeriodo(inicioAnterior.toDate(), fimAnterior.toDate());
}

/**
 * Para "hoje"/"semana", só confia numa consulta ao vivo se a janela inteira
 * cair dentro do mês corrente — antes disso, o expurgo pode já ter apagado
 * os registros individuais (e não existe resumo diário/semanal pra buscar).
 */
function totaisAnterior(periodo, inicioAnterior, fimAnterior, agora) {
  if (periodo === 'mes') return totaisMesAnterior(inicioAnterior, fimAnterior);

  const inicioMesAtual = agora.startOf('month');
  if (fimAnterior.isBefore(inicioMesAtual)) return null; // sem dado confiável

  return totaisDoPeriodo(inicioAnterior.toDate(), fimAnterior.toDate());
}

// null quando não dá pra comparar (sem período anterior, ou base zerada)
function variacaoPercentual(atual, anterior) {
  if (anterior === null || anterior === undefined || anterior === 0) return null;
  return arredondar(((atual - anterior) / anterior) * 100);
}

// GET /dashboard/visao-geral?periodo=hoje|semana|mes
const visaoGeral = asyncHandler(async (req, res) => {
  const agora = dayjs().tz(TIMEZONE);
  const { periodo } = req.query;
  const { inicio, fim, inicioAnterior, fimAnterior } = limitesDoPeriodo(periodo, agora);

  const [atual, anterior] = await Promise.all([
    totaisDoPeriodo(inicio.toDate(), fim.toDate()),
    totaisAnterior(periodo, inicioAnterior, fimAnterior, agora),
  ]);

  const pedidosValidos = atual.totalPedidos - atual.pedidosCancelados;
  const ticketMedio = pedidosValidos > 0 ? arredondar(atual.ganhoTotal / pedidosValidos) : 0;
  const taxaConversao = atual.totalPedidos
    ? Number(((pedidosValidos / atual.totalPedidos) * 100).toFixed(1))
    : 0;

  const anteriorPedidosValidos = anterior
    ? anterior.totalPedidos - anterior.pedidosCancelados
    : null;
  const anteriorTicketMedio =
    anterior && anteriorPedidosValidos > 0 ? anterior.ganhoTotal / anteriorPedidosValidos : null;

  res.json({
    periodo,
    ganhoTotal: {
      valor: atual.ganhoTotal,
      variacao: variacaoPercentual(atual.ganhoTotal, anterior?.ganhoTotal),
    },
    totalPedidos: {
      valor: atual.totalPedidos,
      variacao: variacaoPercentual(atual.totalPedidos, anterior?.totalPedidos),
    },
    ticketMedio: {
      valor: ticketMedio,
      variacao: variacaoPercentual(ticketMedio, anteriorTicketMedio),
    },
    pedidosCancelados: {
      valor: atual.pedidosCancelados,
      variacao: variacaoPercentual(atual.pedidosCancelados, anterior?.pedidosCancelados),
    },
    taxaConversao: { valor: taxaConversao, variacao: null }, // percentual de percentual confunde mais do que ajuda
  });
});

// GET /dashboard/faturamento-mensal — últimos 12 meses, mês atual incluso.
// É o gráfico de barras; não usa o filtro Hoje/Semana/Mês (é sempre anual).
const faturamentoMensal = asyncHandler(async (req, res) => {
  const agora = dayjs().tz(TIMEZONE);
  const inicioMesAtual = agora.startOf('month');

  const meses = Array.from({ length: 12 }, (_, i) => inicioMesAtual.subtract(11 - i, 'month'));

  const [resumos, pagamentosMesAtual] = await Promise.all([
    ResumoMensal.find({
      $or: meses.slice(0, -1).map((m) => ({ ano: m.year(), mes: m.month() + 1 })),
    }).lean(),
    Pagamento.find({ createdAt: { $gte: inicioMesAtual.toDate() }, estornado: false }).lean(),
  ]);

  const porMes = new Map(resumos.map((r) => [`${r.ano}-${r.mes}`, r.faturamentoTotal]));
  porMes.set(
    `${inicioMesAtual.year()}-${inicioMesAtual.month() + 1}`,
    arredondar(pagamentosMesAtual.reduce((soma, p) => soma + p.valorTotal, 0))
  );

  res.json(
    meses.map((m) => ({
      ano: m.year(),
      mes: m.month() + 1,
      rotulo: m.format('MMM'),
      faturamento: porMes.get(`${m.year()}-${m.month() + 1}`) ?? 0,
      mesAtual: m.isSame(inicioMesAtual, 'month'),
    }))
  );
});

// GET /dashboard/status-pedidos?periodo=
// Os 4 estágios do KDS + "cancelado" (item estornado, independente de onde
// estava na esteira quando foi estornado).
const statusPedidos = asyncHandler(async (req, res) => {
  const agora = dayjs().tz(TIMEZONE);
  const { periodo } = req.query;
  const { inicio, fim } = limitesDoPeriodo(periodo, agora);

  const contagem = await Comanda.aggregate([
    { $unwind: '$itens' },
    { $match: { 'itens.lancadoEm': { $gte: inicio.toDate(), $lte: fim.toDate() } } },
    {
      $group: {
        _id: { $cond: ['$itens.estornado', 'cancelado', '$itens.statusKDS'] },
        quantidade: { $sum: 1 },
      },
    },
  ]);

  const porStatus = Object.fromEntries(contagem.map((c) => [c._id, c.quantidade]));
  const total = contagem.reduce((soma, c) => soma + c.quantidade, 0);
  const status = [...STATUS_ITEM_KDS, 'cancelado'];

  res.json(
    status.map((s) => {
      const quantidade = porStatus[s] ?? 0;
      return {
        status: s,
        quantidade,
        percentual: total ? Number(((quantidade / total) * 100).toFixed(1)) : 0,
      };
    })
  );
});

// GET /dashboard/top-produtos?periodo= — ordenado por faturamento (design
// mostra o valor em R$ de cada produto, não só a quantidade).
const topProdutos = asyncHandler(async (req, res) => {
  const agora = dayjs().tz(TIMEZONE);
  const { periodo } = req.query;
  const { inicio, fim } = limitesDoPeriodo(periodo, agora);

  const ranking = await Comanda.aggregate([
    { $unwind: '$itens' },
    {
      $match: {
        'itens.lancadoEm': { $gte: inicio.toDate(), $lte: fim.toDate() },
        'itens.estornado': false,
      },
    },
    {
      $group: {
        _id: '$itens.nomeProduto',
        quantidade: { $sum: '$itens.quantidade' },
        valorTotal: { $sum: { $multiply: ['$itens.precoUnitario', '$itens.quantidade'] } },
      },
    },
    { $addFields: { valorTotal: { $round: ['$valorTotal', 2] } } },
    { $sort: { valorTotal: -1 } },
    { $limit: 5 },
  ]);

  res.json(
    ranking.map((r) => ({ nomeProduto: r._id, quantidade: r.quantidade, valorTotal: r.valorTotal }))
  );
});

module.exports = { visaoGeral, faturamentoMensal, statusPedidos, topProdutos };
