const asyncHandler = require('../utils/asyncHandler');
const { Insumo, MovimentacaoEstoque, Produto } = require('../models');

// RF10 - Gestão e Entrada de Estoque
const listarInsumos = asyncHandler(async (req, res) => {
  const insumos = await Insumo.find({ ativo: true }).sort({ nome: 1 });
  res.json(insumos);
});

const cadastrarInsumo = asyncHandler(async (req, res) => {
  const insumo = await Insumo.create(req.body);
  res.status(201).json(insumo);
});

// RF10 - ajuste manual de inventário (entrada, saída ou correção)
const movimentar = asyncHandler(async (req, res) => {
  const { tipo, quantidade, motivo } = req.body;

  const insumo = await Insumo.findById(req.params.insumoId);
  const delta = tipo === 'saida' ? -Math.abs(quantidade) : Math.abs(quantidade);

  insumo.saldoAtual = Math.max(0, insumo.saldoAtual + delta);
  await insumo.save();

  await MovimentacaoEstoque.create({
    insumo: insumo._id,
    tipo,
    quantidade,
    motivo,
    responsavel: req.funcionario._id,
  });

  // RF22 - Alerta de Ruptura em Tempo Real: zera o insumo -> desativa os
  // produtos que dependem dele, em todos os dispositivos simultaneamente.
  if (insumo.saldoAtual === 0) {
    const produtosAfetados = await Produto.find({ 'insumosNecessarios.insumo': insumo._id });
    await Produto.updateMany(
      { 'insumosNecessarios.insumo': insumo._id },
      { disponivel: false }
    );
    produtosAfetados.forEach((p) => req.io?.emit('produto:atualizado', { ...p.toObject(), disponivel: false }));
  }

  res.json(insumo);
});

module.exports = { listarInsumos, cadastrarInsumo, movimentar };
