const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { Mesa, Comanda, Pagamento } = require('../models');

// Somar valores em ponto flutuante gera dízimas (ex.: 25.999999999999996).
// Todo valor em reais que sai da API é arredondado para 2 casas decimais.
const arredondar = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;

/** Recalcula subtotal/total de uma comanda a partir dos itens não estornados. */
function calcularTotal(comanda) {
  const subtotal = comanda.itens
    .filter((i) => !i.estornado)
    .reduce((soma, i) => soma + i.precoUnitario * i.quantidade, 0);

  const valorDesconto =
    comanda.desconto?.tipo === 'percentual'
      ? subtotal * ((comanda.desconto.valor || 0) / 100)
      : comanda.desconto?.valor || 0;

  const total = subtotal - valorDesconto + (comanda.taxaServico?.valor || 0);
  return { subtotal: arredondar(subtotal), total: arredondar(total) };
}

// Tolerância de meio centavo para diferenças de ponto flutuante entre o
// valor calculado e a soma dos métodos informados (ex.: 3 parcelas de 1/3).
const TOLERANCIA_CENTAVOS = 0.005;

/**
 * RF11 - o caixa nunca pode liberar a mesa/comanda tendo recebido menos do
 * que o total devido: antes disso o sistema só calculava o troco (0 quando
 * o valor recebido era menor), sem barrar o fechamento.
 */
function exigirValorSuficiente(valorRecebido, valorTotal) {
  if (valorRecebido + TOLERANCIA_CENTAVOS < valorTotal) {
    const faltam = arredondar(valorTotal - valorRecebido);
    throw new AppError(
      `Valor recebido insuficiente. Faltam R$ ${faltam.toFixed(2)} para completar o total de R$ ${valorTotal.toFixed(2)}.`,
      409
    );
  }
}

/**
 * RF11 - Processamento de Pagamento (Caixa)
 * Fecha todas as comandas abertas de uma mesa, calcula subtotal/desconto/
 * total de cada uma, registra os valores recebidos por método e o troco,
 * e libera a mesa (volta para "livre").
 */
const fecharMesa = asyncHandler(async (req, res) => {
  const { metodos } = req.body;

  const mesa = await Mesa.findById(req.params.mesaId);
  if (!mesa) throw new AppError('Mesa não encontrada.', 404);

  const comandas = await Comanda.find({ mesa: mesa._id, status: 'aberta' });
  if (!comandas.length) {
    throw new AppError('Esta mesa não tem comanda aberta para fechar.', 409);
  }

  const totaisPorComanda = comandas.map((comanda) => calcularTotal(comanda));
  const valorTotal = arredondar(totaisPorComanda.reduce((soma, t) => soma + t.total, 0));
  const valorRecebido = arredondar(metodos.reduce((soma, m) => soma + m.valor, 0));

  exigirValorSuficiente(valorRecebido, valorTotal);

  for (const [i, comanda] of comandas.entries()) {
    comanda.subtotal = totaisPorComanda[i].subtotal;
    comanda.total = totaisPorComanda[i].total;
    comanda.status = 'fechada';
    comanda.fechadaEm = new Date();
    comanda.fechadaPor = req.funcionario._id;
    await comanda.save();
  }

  const troco = arredondar(Math.max(0, valorRecebido - valorTotal));

  const pagamento = await Pagamento.create({
    mesa: mesa._id,
    comandas: comandas.map((c) => c._id),
    valorTotal,
    metodos,
    troco,
    recebidoPor: req.funcionario._id,
  });

  mesa.status = 'livre';
  mesa.abertaEm = null;
  mesa.abertaPor = null;
  await mesa.save();

  req.io?.to('mapa-mesas').emit('mesa:atualizada', mesa);
  res.status(201).json(pagamento);
});

/**
 * RF11/RF24 - fecha e paga UMA comanda específica, sem mexer nas outras
 * comandas da mesma mesa. Permite dividir a conta por comanda. Se essa era
 * a última comanda aberta da mesa, libera a mesa automaticamente.
 */
const fecharComanda = asyncHandler(async (req, res) => {
  const { metodos } = req.body;

  const comanda = await Comanda.findById(req.params.comandaId);
  if (!comanda || comanda.status !== 'aberta') {
    throw new AppError('Comanda não está aberta.', 409);
  }

  const { subtotal, total } = calcularTotal(comanda);
  const valorRecebido = arredondar(metodos.reduce((soma, m) => soma + m.valor, 0));

  exigirValorSuficiente(valorRecebido, total);

  comanda.subtotal = subtotal;
  comanda.total = total;
  comanda.status = 'fechada';
  comanda.fechadaEm = new Date();
  comanda.fechadaPor = req.funcionario._id;
  await comanda.save();

  const troco = arredondar(Math.max(0, valorRecebido - total));

  const pagamento = await Pagamento.create({
    mesa: comanda.mesa,
    comandas: [comanda._id],
    valorTotal: total,
    metodos,
    troco,
    recebidoPor: req.funcionario._id,
  });

  // se não sobrou nenhuma comanda aberta nessa mesa, libera a mesa
  const restam = await Comanda.countDocuments({ mesa: comanda.mesa, status: 'aberta' });
  if (restam === 0) {
    const mesa = await Mesa.findByIdAndUpdate(
      comanda.mesa,
      { status: 'livre', abertaEm: null, abertaPor: null },
      { new: true }
    );
    req.io?.to('mapa-mesas').emit('mesa:atualizada', mesa);
  }

  res.status(201).json(pagamento);
});

module.exports = { fecharMesa, fecharComanda };
