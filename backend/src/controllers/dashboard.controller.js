const dayjs = require('dayjs');
const asyncHandler = require('../utils/asyncHandler');
const { Comanda, Pagamento } = require('../models');

// Somar valores em ponto flutuante gera dízimas (ex.: 25.999999999999996).
// Todo valor em reais que sai da API é arredondado para 2 casas decimais.
const arredondar = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;

/**
 * RF17 - Dashboard de Gestão (BI)
 * Indicadores vistos no design: Ganho Total, Total de Pedidos, Pedidos
 * Cancelados, Taxa de Conversão, Faturamento por Mês e Top 5 Produtos.
 */
const visaoGeral = asyncHandler(async (req, res) => {
  const inicio = dayjs().startOf('month').toDate();

  const [pagamentos, comandas] = await Promise.all([
    Pagamento.find({ createdAt: { $gte: inicio }, estornado: false }),
    Comanda.find({ createdAt: { $gte: inicio } }),
  ]);

  const ganhoTotal = pagamentos.reduce((soma, p) => soma + p.valorTotal, 0);
  const totalPedidos = comandas.length;
  const totalItensEstornados = comandas.reduce(
    (soma, c) => soma + c.itens.filter((i) => i.estornado).length,
    0
  );
  const totalItens = comandas.reduce((soma, c) => soma + c.itens.length, 0);
  const taxaConversao = totalItens ? ((totalItens - totalItensEstornados) / totalItens) * 100 : 0;

  res.json({
    ganhoTotal: arredondar(ganhoTotal),
    totalPedidos,
    pedidosCancelados: totalItensEstornados,
    taxaConversao: Number(taxaConversao.toFixed(1)),
  });
});

// Top 5 produtos mais vendidos no mês corrente
const topProdutos = asyncHandler(async (req, res) => {
  const inicio = dayjs().startOf('month').toDate();

  const ranking = await Comanda.aggregate([
    { $match: { createdAt: { $gte: inicio } } },
    { $unwind: '$itens' },
    { $match: { 'itens.estornado': false } },
    {
      $group: {
        _id: '$itens.nomeProduto',
        quantidade: { $sum: '$itens.quantidade' },
        valorTotal: { $sum: { $multiply: ['$itens.precoUnitario', '$itens.quantidade'] } },
      },
    },
    { $addFields: { valorTotal: { $round: ['$valorTotal', 2] } } },
    { $sort: { quantidade: -1 } },
    { $limit: 5 },
  ]);

  res.json(ranking);
});

module.exports = { visaoGeral, topProdutos };
