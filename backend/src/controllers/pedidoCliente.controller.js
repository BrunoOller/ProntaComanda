const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { Mesa, Comanda, Produto, PedidoCliente } = require('../models');

// Fila de pedidos de cliente aguardando confirmação (mais antigo primeiro).
const listarPendentes = asyncHandler(async (req, res) => {
  const pedidos = await PedidoCliente.find({ status: 'pendente' })
    .sort({ createdAt: 1 })
    .populate('mesa', 'numero')
    .lean();
  res.json(pedidos);
});

/**
 * Aceitar = o funcionário conferiu no salão. Aí sim: abre/reaproveita a
 * comanda, marca a mesa como ocupada e manda os itens para a cozinha/bar.
 *
 * - Preço, nome e setor (cozinha/bar) são relidos do cadastro agora, igual
 *   ao lançamento do garçom (comanda.controller.js > adicionarItem).
 * - "Tomar posse" do pedido é atômico: se dois funcionários tocarem em
 *   Aceitar ao mesmo tempo, só um vence e nada é lançado em dobro.
 * - Mesa com mais de uma comanda aberta: usa a mais recente.
 */
const aceitar = asyncHandler(async (req, res) => {
  const pedido = await PedidoCliente.findById(req.params.id);
  if (!pedido) throw new AppError('Pedido não encontrado.', 404);
  if (pedido.status !== 'pendente') {
    throw new AppError('Este pedido já foi tratado por outro funcionário.', 409);
  }

  const mesa = await Mesa.findOne({ _id: pedido.mesa, ativo: true });
  if (!mesa) throw new AppError('A mesa deste pedido não existe mais. Recuse o pedido.', 409);
  if (mesa.status === 'aguardando_fechamento') {
    throw new AppError('Mesa aguardando fechamento. Recuse o pedido e avise o cliente.', 409);
  }

  const produtos = await Produto.find({
    _id: { $in: pedido.itens.map((i) => i.produto) },
    ativo: true,
  });
  const porId = new Map(produtos.map((p) => [String(p._id), p]));
  const faltando = pedido.itens.filter((i) => !porId.get(String(i.produto))?.disponivel);
  if (faltando.length) {
    const nomes = [...new Set(faltando.map((i) => i.nomeProduto))].join(', ');
    throw new AppError(`Indisponível agora: ${nomes}. Recuse o pedido e avise o cliente.`, 409);
  }

  const tomado = await PedidoCliente.findOneAndUpdate(
    { _id: pedido._id, status: 'pendente' },
    { status: 'aceito', resolvidoPor: req.funcionario._id, resolvidoEm: new Date() },
    { new: true }
  );
  if (!tomado) throw new AppError('Este pedido já foi tratado por outro funcionário.', 409);

  let comanda;
  try {
    comanda = await Comanda.findOne({ mesa: mesa._id, status: 'aberta' }).sort({ abertaEm: -1 });
    if (!comanda) {
      const total = await Comanda.countDocuments({ mesa: mesa._id });
      comanda = new Comanda({
        mesa: mesa._id,
        numero: total + 1,
        abertaPor: req.funcionario._id,
      });
    }

    for (const item of pedido.itens) {
      const p = porId.get(String(item.produto));
      comanda.itens.push({
        produto: p._id,
        nomeProduto: p.nome,
        precoUnitario: p.preco,
        tempoPreparoMinutos: p.tempoPreparoMinutos ?? null,
        quantidade: item.quantidade,
        observacao: item.observacao,
        setorPreparo: p.setor ?? 'cozinha',
        lancadoPor: req.funcionario._id, // quem aceitou responde pelo lançamento
        origem: 'cliente',
      });
    }
    await comanda.save();
  } catch (err) {
    // nada foi lançado: devolve o pedido para a fila em vez de perdê-lo
    await PedidoCliente.updateOne(
      { _id: pedido._id },
      { status: 'pendente', resolvidoPor: null, resolvidoEm: null }
    );
    throw err;
  }

  const itensNovos = comanda.itens.slice(-pedido.itens.length);
  await PedidoCliente.updateOne(
    { _id: pedido._id },
    { comanda: comanda._id, itensLancados: itensNovos.map((i) => i._id) }
  );

  if (mesa.status === 'livre') {
    mesa.status = 'ocupada';
    mesa.abertaEm = new Date();
    mesa.abertaPor = req.funcionario._id;
    await mesa.save();
    req.io?.to('mapa-mesas').emit('mesa:atualizada', mesa);
  }

  // cada item novo aparece na tela da cozinha/bar em tempo real (RF05)
  for (const item of itensNovos) {
    req.io?.to(item.setorPreparo).emit('kds:novo-item', { comandaId: comanda._id, item });
  }
  req.io
    ?.to('pedidos-cliente')
    .emit('pedido-cliente:resolvido', { _id: pedido._id, status: 'aceito' });

  res.json({ mesaId: mesa._id, numeroMesa: mesa.numero, comandaId: comanda._id });
});

const recusar = asyncHandler(async (req, res) => {
  const { motivo } = req.body;

  const recusado = await PedidoCliente.findOneAndUpdate(
    { _id: req.params.id, status: 'pendente' },
    {
      status: 'recusado',
      resolvidoPor: req.funcionario._id,
      resolvidoEm: new Date(),
      motivoRecusa: motivo,
    },
    { new: true }
  );

  if (!recusado) {
    const existe = await PedidoCliente.exists({ _id: req.params.id });
    if (!existe) throw new AppError('Pedido não encontrado.', 404);
    throw new AppError('Este pedido já foi tratado por outro funcionário.', 409);
  }

  req.io
    ?.to('pedidos-cliente')
    .emit('pedido-cliente:resolvido', { _id: recusado._id, status: 'recusado' });

  res.json({ _id: recusado._id, status: recusado.status });
});

module.exports = { listarPendentes, aceitar, recusar };
