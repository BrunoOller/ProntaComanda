const asyncHandler = require('../utils/asyncHandler');
const { Comanda, Produto, ObservacaoFrequente } = require('../models');

// RF23 - Espelho de Consumo & KDS (mobile) / painel "MESA 00" (admin)
const listarPorMesa = asyncHandler(async (req, res) => {
  const comandas = await Comanda.find({ mesa: req.params.mesaId }).populate(
    'itens.produto',
    'nome'
  );
  res.json(comandas);
});

// RF20 - Seleção e lançamento de item (Mobile, touch-friendly)
const adicionarItem = asyncHandler(async (req, res) => {
  const { produtoId, quantidade = 1, observacao, setorPreparo = 'cozinha' } = req.body;

  const produto = await Produto.findById(produtoId);
  if (!produto || !produto.disponivel) {
    return res.status(409).json({ erro: 'Produto indisponível.' });
  }

  const comanda = await Comanda.findById(req.params.comandaId);
  if (!comanda || comanda.status !== 'aberta') {
    return res.status(409).json({ erro: 'Comanda não está aberta.' });
  }

  comanda.itens.push({
    produto: produto._id,
    nomeProduto: produto.nome, // snapshot
    precoUnitario: produto.preco, // snapshot
    quantidade,
    observacao,
    setorPreparo,
    lancadoPor: req.funcionario._id,
  });
  await comanda.save();

  // RF21 - alimenta as observações frequentes para sugestão futura
  if (observacao?.trim()) {
    await ObservacaoFrequente.findOneAndUpdate(
      { produto: produto._id, texto: observacao.trim() },
      { $inc: { contagem: 1 } },
      { upsert: true }
    );
  }

  // RF05 - notifica a tela da cozinha/bar em tempo real
  req.io?.to(setorPreparo).emit('kds:novo-item', {
    comandaId: comanda._id,
    item: comanda.itens[comanda.itens.length - 1],
  });

  res.status(201).json(comanda);
});

// RF21 - sugestões de observação mais frequentes para um produto
const sugerirObservacoes = asyncHandler(async (req, res) => {
  const sugestoes = await ObservacaoFrequente.find({ produto: req.params.produtoId })
    .sort({ contagem: -1 })
    .limit(5);
  res.json(sugestoes.map((s) => s.texto));
});

// RF05/RF06 - Fluxo Operacional KDS (pendente -> em_preparo -> pronto -> entregue)
const atualizarStatusItem = asyncHandler(async (req, res) => {
  const { status } = req.body; // 'em_preparo' | 'pronto' | 'entregue'
  const comanda = await Comanda.findOneAndUpdate(
    { _id: req.params.comandaId, 'itens._id': req.params.itemId },
    {
      $set: {
        'itens.$.statusKDS': status,
        ...(status === 'em_preparo' && { 'itens.$.emPreparoEm': new Date() }),
        ...(status === 'pronto' && { 'itens.$.prontoEm': new Date() }),
        ...(status === 'entregue' && { 'itens.$.entregueEm': new Date() }),
      },
    },
    { new: true }
  );

  req.io?.emit('kds:status-atualizado', {
    comandaId: comanda._id,
    itemId: req.params.itemId,
    status,
  });
  res.json(comanda);
});

// RF07/RF08 - Estorno detalhado de item + justificativa obrigatória
const estornarItem = asyncHandler(async (req, res) => {
  const { motivo } = req.body;

  if (!motivo?.trim()) {
    return res.status(400).json({ erro: 'O motivo do estorno é obrigatório.' });
  }

  const comanda = await Comanda.findOneAndUpdate(
    { _id: req.params.comandaId, 'itens._id': req.params.itemId },
    {
      $set: {
        'itens.$.estornado': true,
        'itens.$.motivoEstorno': motivo,
        'itens.$.estornadoPor': req.funcionario._id,
        'itens.$.estornadoEm': new Date(),
      },
    },
    { new: true }
  );

  res.json(comanda);
});

// RF09 - Concessões Financeiras (restrito ao Administrador na rota)
const aplicarDesconto = asyncHandler(async (req, res) => {
  const { tipo, valor, observacao } = req.body;

  const comanda = await Comanda.findByIdAndUpdate(
    req.params.comandaId,
    {
      desconto: { tipo, valor, observacao, aplicadoPor: req.funcionario._id },
    },
    { new: true }
  );

  res.json(comanda);
});

// RF25 - Transferência/Junção de itens entre mesas ou comandas
const transferirItens = asyncHandler(async (req, res) => {
  const { itemIds, comandaDestinoId } = req.body;

  const origem = await Comanda.findById(req.params.comandaId);
  const destino = await Comanda.findById(comandaDestinoId);

  const itensTransferidos = origem.itens.filter((i) => itemIds.includes(String(i._id)));
  destino.itens.push(...itensTransferidos);
  origem.itens = origem.itens.filter((i) => !itemIds.includes(String(i._id)));

  destino.origemTransferencia = { comanda: origem._id, mesa: origem.mesa };

  await Promise.all([origem.save(), destino.save()]);
  res.json({ origem, destino });
});

module.exports = {
  listarPorMesa,
  adicionarItem,
  sugerirObservacoes,
  atualizarStatusItem,
  estornarItem,
  aplicarDesconto,
  transferirItens,
};
