const asyncHandler = require('../utils/asyncHandler');
const { Categoria } = require('../models');

const listar = asyncHandler(async (req, res) => {
  const categorias = await Categoria.find({ ativo: true }).sort({ ordem: 1 });
  res.json(categorias);
});

const criar = asyncHandler(async (req, res) => {
  const categoria = await Categoria.create(req.body);
  res.status(201).json(categoria);
});

const atualizar = asyncHandler(async (req, res) => {
  const categoria = await Categoria.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(categoria);
});

const inativar = asyncHandler(async (req, res) => {
  await Categoria.findByIdAndUpdate(req.params.id, { ativo: false });
  res.status(204).send();
});

module.exports = { listar, criar, atualizar, inativar };
