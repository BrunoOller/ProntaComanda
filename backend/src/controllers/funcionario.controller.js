const argon2 = require('argon2');
const asyncHandler = require('../utils/asyncHandler');
const { Funcionario } = require('../models');

// RF02 - Gestão de Colaboradores
const listar = asyncHandler(async (req, res) => {
  const funcionarios = await Funcionario.find({ ativo: true }).sort({ nome: 1 });
  res.json(funcionarios);
});

const criar = asyncHandler(async (req, res) => {
  const { nome, cpf, email, senha, perfil, especialidade, telefone } = req.body;

  const senhaHash = await argon2.hash(senha);
  const funcionario = await Funcionario.create({
    nome,
    cpf,
    email,
    senhaHash,
    perfil,
    especialidade,
    telefone,
  });

  res.status(201).json({ ...funcionario.toObject(), senhaHash: undefined });
});

const atualizar = asyncHandler(async (req, res) => {
  const { senha, ...dados } = req.body;

  if (senha) {
    dados.senhaHash = await argon2.hash(senha);
  }

  const funcionario = await Funcionario.findByIdAndUpdate(req.params.id, dados, {
    new: true,
  });
  res.json(funcionario);
});

// RNF11 - Soft delete: desliga o funcionário em vez de remover o documento.
const desligar = asyncHandler(async (req, res) => {
  await Funcionario.findByIdAndUpdate(req.params.id, {
    ativo: false,
    desligadoEm: new Date(),
  });
  res.status(204).send();
});

module.exports = { listar, criar, atualizar, desligar };
