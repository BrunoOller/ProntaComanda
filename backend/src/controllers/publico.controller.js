const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { Mesa, Produto, PedidoCliente, Comanda } = require('../models');

// Máximo de pedidos aguardando confirmação por mesa. Segura quem fica
// apertando "enviar" (ou brincando) sem travar uma mesa que realmente pede.
const MAX_PENDENTES_POR_MESA = 5;

// Autoatendimento: o cliente escolhe a mesa numa lista. Só devolve o
// necessário (id + número + se aceita pedido); nada de quem está na mesa.
const listarMesas = asyncHandler(async (req, res) => {
  const mesas = await Mesa.find({ ativo: true }).sort({ numero: 1 }).select('numero status').lean();
  res.json(
    mesas.map((m) => ({
      _id: m._id,
      numero: m.numero,
      aceitaPedido: m.status !== 'aguardando_fechamento',
    }))
  );
});

// Cliente envia o pedido. Vira "pendente" e aparece NA HORA para os
// garçons (socket 'pedidos-cliente'); nada é lançado antes do aceite.
const criarPedido = asyncHandler(async (req, res) => {
  const { mesaId, nomeCliente, itens } = req.body;

  const mesa = await Mesa.findOne({ _id: mesaId, ativo: true });
  if (!mesa) throw new AppError('Mesa não encontrada. Escolha a sua mesa de novo.', 404);
  if (mesa.status === 'aguardando_fechamento') {
    throw new AppError('Esta mesa está fechando a conta. Chame um garçom.', 409);
  }

  const pendentes = await PedidoCliente.countDocuments({ mesa: mesa._id, status: 'pendente' });
  if (pendentes >= MAX_PENDENTES_POR_MESA) {
    throw new AppError(
      'Esta mesa já tem pedidos aguardando confirmação. Aguarde o garçom ou chame-o.',
      409
    );
  }

  // Preço e nome vêm do cadastro, nunca do que o cliente mandou.
  const ids = [...new Set(itens.map((i) => i.produtoId))];
  const produtos = await Produto.find({ _id: { $in: ids }, ativo: true }).lean();
  const porId = new Map(produtos.map((p) => [String(p._id), p]));

  const indisponiveis = [];
  const itensPedido = [];
  for (const i of itens) {
    const p = porId.get(i.produtoId);
    if (!p || !p.disponivel) {
      indisponiveis.push(p?.nome ?? 'um item que saiu do cardápio');
      continue;
    }
    itensPedido.push({
      produto: p._id,
      nomeProduto: p.nome,
      precoUnitario: p.preco,
      quantidade: i.quantidade,
      observacao: i.observacao,
    });
  }
  if (indisponiveis.length) {
    throw new AppError(
      `Indisponível no momento: ${[...new Set(indisponiveis)].join(', ')}. Remova do pedido e envie de novo.`,
      409
    );
  }

  const pedido = await PedidoCliente.create({ mesa: mesa._id, nomeCliente, itens: itensPedido });

  req.io?.to('pedidos-cliente').emit('pedido-cliente:novo', {
    _id: pedido._id,
    mesa: { _id: mesa._id, numero: mesa.numero },
    nomeCliente: pedido.nomeCliente,
    itens: pedido.itens,
    status: pedido.status,
    createdAt: pedido.createdAt,
  });

  res.status(201).json({ _id: pedido._id, status: pedido.status, mesaNumero: mesa.numero });
});

// Andamento de cada item, como o cliente enxerga (vem do KDS da cozinha/bar).
const SITUACAO_POR_STATUS_KDS = {
  pendente: 'na_fila',
  em_preparo: 'preparando',
  pronto: 'pronto',
  entregue: 'entregue',
};

const arredondar = (v) => Math.round(v * 100) / 100;

/**
 * "Visão do cliente" dos pedidos: o que ele pediu, quanto custa e em que pé
 * está cada item. Mostra SÓ os itens do pedido dele (identificados pelo id do
 * pedido, que é impossível de adivinhar), nunca a comanda inteira da mesa:
 * com QR único qualquer pessoa pode escolher qualquer mesa, então expor a
 * comanda da mesa vazaria o consumo de quem está sentado lá.
 *
 * - pendente / recusado: itens do próprio pedido (preço visto no envio).
 * - aceito: itens reais da comanda, com o andamento do KDS e estornos.
 */
async function montarVisaoCliente(pedidos) {
  const idsItens = pedidos.flatMap((p) => p.itensLancados ?? []);
  const itensDaComanda = new Map();
  if (idsItens.length) {
    // procura em qualquer comanda: itens podem ter sido transferidos (RF25)
    const comandas = await Comanda.find({ 'itens._id': { $in: idsItens } })
      .select('itens')
      .lean();
    for (const c of comandas) {
      for (const i of c.itens) itensDaComanda.set(String(i._id), i);
    }
  }

  return pedidos.map((p) => {
    const lancados = (p.itensLancados ?? [])
      .map((id) => itensDaComanda.get(String(id)))
      .filter(Boolean);

    const itens =
      p.status === 'aceito' && lancados.length
        ? lancados.map((i) => ({
            nomeProduto: i.nomeProduto,
            quantidade: i.quantidade,
            precoUnitario: i.precoUnitario,
            observacao: i.observacao ?? null,
            situacao: i.estornado ? 'cancelado' : (SITUACAO_POR_STATUS_KDS[i.statusKDS] ?? 'na_fila'),
          }))
        : p.itens.map((i) => ({
            nomeProduto: i.nomeProduto,
            quantidade: i.quantidade,
            precoUnitario: i.precoUnitario,
            observacao: i.observacao ?? null,
            situacao: p.status === 'recusado' ? 'recusado' : p.status === 'aceito' ? 'na_fila' : 'aguardando',
          }));

    const total =
      p.status === 'recusado'
        ? 0
        : arredondar(
            itens
              .filter((i) => i.situacao !== 'cancelado')
              .reduce((soma, i) => soma + i.quantidade * i.precoUnitario, 0)
          );

    return {
      _id: p._id,
      status: p.status,
      motivoRecusa: p.motivoRecusa ?? null,
      mesaNumero: p.mesa?.numero ?? null,
      nomeCliente: p.nomeCliente ?? null,
      criadoEm: p.createdAt,
      itens,
      total,
    };
  });
}

const CAMPOS_VISAO = 'status motivoRecusa mesa nomeCliente itens itensLancados createdAt';

// O cliente acompanha UM pedido pelo id.
const consultarPedido = asyncHandler(async (req, res) => {
  const pedido = await PedidoCliente.findById(req.params.id)
    .select(CAMPOS_VISAO)
    .populate('mesa', 'numero')
    .lean();
  if (!pedido) throw new AppError('Pedido não encontrado.', 404);

  const [visao] = await montarVisaoCliente([pedido]);
  res.json(visao);
});

// O celular consulta de uma vez todos os pedidos que fez (?ids=a,b,c).
// Ids desconhecidos simplesmente não voltam na lista.
const consultarPedidos = asyncHandler(async (req, res) => {
  const pedidos = await PedidoCliente.find({ _id: { $in: req.query.ids } })
    .select(CAMPOS_VISAO)
    .populate('mesa', 'numero')
    .sort({ createdAt: 1 })
    .lean();

  res.json(await montarVisaoCliente(pedidos));
});

module.exports = { listarMesas, criarPedido, consultarPedido, consultarPedidos };
