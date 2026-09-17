const asyncHandler = require('../utils/asyncHandler');
const { Produto } = require('../models');

// RF03 - Gestão de Cardápio (CRUD)
const listar = asyncHandler(async (req, res) => {
  const { categoria, busca } = req.query;
  const filtro = { ativo: true };

  if (categoria) filtro.categoria = categoria;
  if (busca) filtro.$text = { $search: busca };

  const produtos = await Produto.find(filtro).populate('categoria', 'nome');
  res.json(produtos);
});

const criar = asyncHandler(async (req, res) => {
  const produto = await Produto.create(req.body);
  res.status(201).json(produto);
});

const atualizar = asyncHandler(async (req, res) => {
  const produto = await Produto.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(produto);

  // RF22 - propaga em tempo real qualquer mudança de disponibilidade
  req.io?.emit('produto:atualizado', produto);
});

// RNF11 - soft delete: "inativar", nunca remover fisicamente (RF03).
const inativar = asyncHandler(async (req, res) => {
  const produto = await Produto.findByIdAndUpdate(
    req.params.id,
    { ativo: false, disponivel: false },
    { new: true }
  );
  req.io?.emit('produto:atualizado', produto);
  res.status(204).send();
});

module.exports = { listar, criar, atualizar, inativar };
