const asyncHandler = require('../utils/asyncHandler');
const { Mesa, Comanda, Pagamento } = require('../models');

/**
 * RF11 - Processamento de Pagamento (Caixa)
 * Fecha todas as comandas abertas de uma mesa, calcula subtotal/desconto/
 * total de cada uma, registra os valores recebidos por método e o troco,
 * e libera a mesa (volta para "livre").
 */
const fecharMesa = asyncHandler(async (req, res) => {
  const { metodos } = req.body; // [{ tipo: 'pix', valor: 50 }, ...]

  const mesa = await Mesa.findById(req.params.mesaId);
  const comandas = await Comanda.find({ mesa: mesa._id, status: 'aberta' });

  let valorTotal = 0;

  for (const comanda of comandas) {
    const subtotal = comanda.itens
      .filter((i) => !i.estornado)
      .reduce((soma, i) => soma + i.precoUnitario * i.quantidade, 0);

    const valorDesconto =
      comanda.desconto?.tipo === 'percentual'
        ? subtotal * ((comanda.desconto.valor || 0) / 100)
        : comanda.desconto?.valor || 0;

    const total = subtotal - valorDesconto + (comanda.taxaServico?.valor || 0);

    comanda.subtotal = subtotal;
    comanda.total = total;
    comanda.status = 'fechada';
    comanda.fechadaEm = new Date();
    comanda.fechadaPor = req.funcionario._id;
    await comanda.save();

    valorTotal += total;
  }

  const valorRecebido = metodos.reduce((soma, m) => soma + m.valor, 0);
  const troco = Math.max(0, valorRecebido - valorTotal);

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
 * NOVO - RF11/RF24: fecha e paga UMA comanda específica, sem mexer nas
 * outras comandas da mesma mesa. Permite dividir a conta por comanda.
 * Se essa era a última comanda aberta da mesa, libera a mesa automaticamente.
 */
const fecharComanda = asyncHandler(async (req, res) => {
  const { metodos } = req.body;

  const comanda = await Comanda.findById(req.params.comandaId);
  if (!comanda || comanda.status !== 'aberta') {
    return res.status(409).json({ erro: 'Comanda não está aberta.' });
  }

  const subtotal = comanda.itens
    .filter((i) => !i.estornado)
    .reduce((soma, i) => soma + i.precoUnitario * i.quantidade, 0);

  const valorDesconto =
    comanda.desconto?.tipo === 'percentual'
      ? subtotal * ((comanda.desconto.valor || 0) / 100)
      : comanda.desconto?.valor || 0;

  const total = subtotal - valorDesconto + (comanda.taxaServico?.valor || 0);

  comanda.subtotal = subtotal;
  comanda.total = total;
  comanda.status = 'fechada';
  comanda.fechadaEm = new Date();
  comanda.fechadaPor = req.funcionario._id;
  await comanda.save();

  const valorRecebido = metodos.reduce((soma, m) => soma + m.valor, 0);
  const troco = Math.max(0, valorRecebido - total);

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