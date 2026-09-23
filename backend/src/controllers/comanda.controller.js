const asyncHandler = require('../utils/asyncHandler');
const { Comanda, Produto, ObservacaoFrequente, Mesa } = require('../models'); // Mesa adicionado

// NOVO - abre uma comanda numa mesa. Funciona tanto para a primeira comanda
// (mesa livre -> vira ocupada) quanto para comandas adicionais (mesa já
// ocupada, permite múltiplas comandas simultâneas na mesma mesa).
const abrirComanda = asyncHandler(async (req, res) => {
  const { mesaId } = req.body;

  const mesa = await Mesa.findById(mesaId);
  if (!mesa) {
    return res.status(404).json({ erro: 'Mesa não encontrada.' });
  }
  if (mesa.status === 'aguardando_fechamento') {
    return res
      .status(409)
      .json({ erro: 'Mesa aguardando fechamento. Não é possível abrir nova comanda.' });
  }

  const totalComandas = await Comanda.countDocuments({ mesa: mesa._id });
  const comanda = await Comanda.create({
    mesa: mesa._id,
    numero: totalComandas + 1,
    abertaPor: req.funcionario._id,
  });

  if (mesa.status === 'livre') {
    mesa.status = 'ocupada';
    mesa.abertaEm = new Date();
    mesa.abertaPor = req.funcionario._id;
    await mesa.save();
    req.io?.to('mapa-mesas').emit('mesa:atualizada', mesa);
  }

  res.status(201).json({ mesa, comanda });
});

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

// RF05 - Fluxo Operacional KDS: lista os pedidos pendentes/em preparo/prontos
// de um setor (cozinha ou bar), agrupados por comanda — é o que alimenta os
// cards "#1042 Mesa 08" do design, com todos os itens daquele lançamento.
const listarKDS = asyncHandler(async (req, res) => {
  const { setor = 'cozinha' } = req.query;

  const comandas = await Comanda.find({
    status: 'aberta',
    itens: {
      $elemMatch: { setorPreparo: setor, estornado: false, statusKDS: { $ne: 'entregue' } },
    },
  }).populate('mesa', 'numero');

  const pedidos = comandas.map((comanda) => {
    const itens = comanda.itens.filter(
      (i) => i.setorPreparo === setor && !i.estornado && i.statusKDS !== 'entregue'
    );

    // RF06 - semáforo: o frontend usa `lancadoEm` (o item mais antigo do
    // pedido) para calcular o tempo decorrido e decidir a cor do card.
    const lancadoEm = itens.reduce(
      (maisAntigo, i) => (i.lancadoEm < maisAntigo ? i.lancadoEm : maisAntigo),
      itens[0].lancadoEm
    );

    const statusGeral = itens.some((i) => i.statusKDS === 'pendente')
      ? 'pendente'
      : itens.some((i) => i.statusKDS === 'em_preparo')
        ? 'em_preparo'
        : 'pronto';

    return {
      comandaId: comanda._id,
      numeroComanda: comanda.numero,
      mesa: comanda.mesa,
      statusGeral,
      lancadoEm,
      itens: itens.map((i) => ({
        itemId: i._id,
        nomeProduto: i.nomeProduto,
        quantidade: i.quantidade,
        observacao: i.observacao,
        statusKDS: i.statusKDS,
      })),
    };
  });

  res.json(pedidos);
});

const ORDEM_STATUS_KDS = ['pendente', 'em_preparo', 'pronto', 'entregue'];

// RF05 - avança TODOS os itens do pedido (naquele setor) que estão no
// estágio mais atrasado para o próximo estágio de uma vez — é o que o botão
// único "Marcar como pronto" do card do design faz.
const avancarStatusPedido = asyncHandler(async (req, res) => {
  const { setor = 'cozinha' } = req.query;

  const comanda = await Comanda.findById(req.params.comandaId);
  if (!comanda) {
    return res.status(404).json({ erro: 'Comanda não encontrada.' });
  }

  const itensDoSetor = comanda.itens.filter(
    (i) => i.setorPreparo === setor && !i.estornado && i.statusKDS !== 'entregue'
  );
  if (!itensDoSetor.length) {
    return res.status(409).json({ erro: 'Nenhum item pendente para este setor nesta comanda.' });
  }

  const estagioAtual = Math.min(
    ...itensDoSetor.map((i) => ORDEM_STATUS_KDS.indexOf(i.statusKDS))
  );
  const proximoStatus = ORDEM_STATUS_KDS[estagioAtual + 1];
  const agora = new Date();

  itensDoSetor
    .filter((i) => ORDEM_STATUS_KDS.indexOf(i.statusKDS) === estagioAtual)
    .forEach((item) => {
      item.statusKDS = proximoStatus;
      if (proximoStatus === 'em_preparo') item.emPreparoEm = agora;
      if (proximoStatus === 'pronto') item.prontoEm = agora;
      if (proximoStatus === 'entregue') item.entregueEm = agora;
    });

  await comanda.save();

  req.io?.emit('kds:status-atualizado', { comandaId: comanda._id, setor, status: proximoStatus });
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
  abrirComanda,
  adicionarItem,
  sugerirObservacoes,
  listarKDS,
  avancarStatusPedido,
  atualizarStatusItem,
  estornarItem,
  aplicarDesconto,
  transferirItens,
};