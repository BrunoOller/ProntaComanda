const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const escaparRegex = require('../utils/escaparRegex');
const logger = require('../utils/logger');
const { Insumo, MovimentacaoEstoque, Produto, LogAuditoria } = require('../models');

/**
 * RF10 - Gestão e Entrada de Estoque
 * RF22 - Alerta de Ruptura em Tempo Real (via socket.io)
 * RNF11 - Soft delete: insumo é inativado, nunca apagado (o histórico de
 *         movimentações referencia o _id dele).
 */

async function buscarOu404(id) {
  const insumo = await Insumo.findById(id);
  if (!insumo) throw new AppError('Insumo não encontrado.', 404);
  return insumo;
}

async function garantirNomeLivre(nome, ignorarId) {
  const filtro = { ativo: true, nome: { $regex: `^${escaparRegex(nome.trim())}$`, $options: 'i' } };
  if (ignorarId) filtro._id = { $ne: ignorarId };

  if ((await Insumo.countDocuments(filtro)) > 0) {
    throw new AppError('Já existe um insumo com este nome.', 409);
  }
}

async function auditar(req, tipo, insumo, detalhes = {}) {
  try {
    await LogAuditoria.create({
      tipo,
      funcionario: req.funcionario._id,
      entidade: 'Insumo',
      entidadeId: insumo._id,
      detalhes: { insumo: insumo.nome, ...detalhes },
    });
  } catch (err) {
    logger.error('Falha ao gravar auditoria de estoque', { error: err.message });
  }
}

// GET /estoque?ativo=true|false|todos
const listarInsumos = asyncHandler(async (req, res) => {
  const { ativo } = req.query;
  const filtro = ativo === 'todos' ? {} : { ativo: ativo === 'true' };

  res.json(await Insumo.find(filtro).sort({ nome: 1 }));
});

// GET /estoque/:id
const obterInsumo = asyncHandler(async (req, res) => {
  res.json(await buscarOu404(req.params.id));
});

// POST /estoque
const cadastrarInsumo = asyncHandler(async (req, res) => {
  await garantirNomeLivre(req.body.nome);
  res.status(201).json(await Insumo.create(req.body));
});

// PUT /estoque/:id
const atualizarInsumo = asyncHandler(async (req, res) => {
  const alvo = await buscarOu404(req.params.id);

  if (req.body.nome !== undefined && alvo.ativo) {
    await garantirNomeLivre(req.body.nome, alvo._id);
  }

  res.json(await Insumo.findByIdAndUpdate(alvo._id, req.body, { new: true, runValidators: true }));
});

// DELETE /estoque/:id -> RNF11: inativação lógica
const inativarInsumo = asyncHandler(async (req, res) => {
  const alvo = await buscarOu404(req.params.id);
  if (!alvo.ativo) return res.status(204).send(); // já inativo: idempotente

  await Insumo.findByIdAndUpdate(alvo._id, { ativo: false });
  res.status(204).send();
});

// PATCH /estoque/:id/reativar
const reativarInsumo = asyncHandler(async (req, res) => {
  const alvo = await buscarOu404(req.params.id);
  if (alvo.ativo) return res.json(alvo);

  await garantirNomeLivre(alvo.nome, alvo._id);
  res.json(await Insumo.findByIdAndUpdate(alvo._id, { ativo: true }, { new: true }));
});

// POST /estoque/:id/movimentar  { tipo, quantidade, motivo? }
const movimentar = asyncHandler(async (req, res) => {
  const { tipo, quantidade, motivo } = req.body;

  const insumo = await buscarOu404(req.params.id);
  if (!insumo.ativo) throw new AppError('Este insumo está inativo.', 409);

  const delta = tipo === 'saida' ? -quantidade : quantidade;
  const saldoAnterior = insumo.saldoAtual;

  // Nunca deixa o saldo ir a negativo (ex.: dar saída maior que o estoque).
  insumo.saldoAtual = Math.max(0, saldoAnterior + delta);
  await insumo.save();

  await MovimentacaoEstoque.create({
    insumo: insumo._id,
    tipo,
    quantidade,
    motivo,
    responsavel: req.funcionario._id,
  });

  if (tipo === 'ajuste') {
    await auditar(req, 'ajuste_estoque', insumo, {
      de: saldoAnterior,
      para: insumo.saldoAtual,
      motivo,
    });
  }

  // RF22 - zerou o insumo => desativa os produtos que dependem dele, em
  // todos os dispositivos simultaneamente. Volta a ficar disponível quando
  // o saldo sai de 0 de novo (reposição), sem exigir ação manual no produto.
  if (saldoAnterior !== insumo.saldoAtual && (saldoAnterior === 0) !== (insumo.saldoAtual === 0)) {
    const disponivel = insumo.saldoAtual > 0;
    const produtosAfetados = await Produto.find({
      'insumosNecessarios.insumo': insumo._id,
      ativo: true,
    });
    if (produtosAfetados.length) {
      await Produto.updateMany(
        { _id: { $in: produtosAfetados.map((p) => p._id) } },
        { disponivel }
      );
      produtosAfetados.forEach((p) =>
        req.io?.emit('produto:atualizado', { ...p.toObject(), disponivel })
      );
    }
  }

  res.json(insumo);
});

// GET /estoque/:id/movimentacoes - histórico, mais recente primeiro
const listarMovimentacoes = asyncHandler(async (req, res) => {
  await buscarOu404(req.params.id);

  const movimentacoes = await MovimentacaoEstoque.find({ insumo: req.params.id })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('responsavel', 'nome');

  res.json(movimentacoes);
});

module.exports = {
  listarInsumos,
  obterInsumo,
  cadastrarInsumo,
  atualizarInsumo,
  inativarInsumo,
  reativarInsumo,
  movimentar,
  listarMovimentacoes,
};
