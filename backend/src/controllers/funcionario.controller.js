const argon2 = require('argon2');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { Funcionario, LogAuditoria } = require('../models');

/**
 * RF02 - Gestão de Colaboradores e Autenticação
 * RF01 - Somente o perfil Administrador chega aqui (ver funcionario.routes.js)
 * RNF07 - Senha sempre com hash argon2; o hash nunca é devolvido
 * RNF11 - Soft delete: funcionário desligado continua no banco
 */

// ---------- helpers ----------

/** Registra a ação na trilha de auditoria. Nunca inclui senha/hash no payload. */
async function auditar(req, tipo, alvo, detalhes = {}) {
  try {
    await LogAuditoria.create({
      tipo,
      funcionario: req.funcionario._id,
      entidade: 'Funcionario',
      entidadeId: alvo._id,
      detalhes: { alvo: alvo.nome, ...detalhes },
    });
  } catch (err) {
    // A auditoria falhar não deve desfazer uma ação que já aconteceu.
    logger.error('Falha ao gravar auditoria de funcionário', { error: err.message });
  }
}

async function buscarOu404(id) {
  const funcionario = await Funcionario.findById(id);
  if (!funcionario) throw new AppError('Funcionário não encontrado.', 404);
  return funcionario;
}

/** O sistema nunca pode ficar sem um Administrador ativo (senão ninguém mais entra). */
async function garantirOutroAdmin(alvo, mensagem) {
  if (alvo.perfil !== 'administrador' || !alvo.ativo) return;

  const outros = await Funcionario.countDocuments({
    _id: { $ne: alvo._id },
    perfil: 'administrador',
    ativo: true,
  });

  if (outros === 0) throw new AppError(mensagem, 409);
}

// ---------- handlers ----------

// GET /funcionarios?ativo=true|false|todos&perfil=garcom&busca=maria
const listar = asyncHandler(async (req, res) => {
  const { ativo, perfil, busca } = req.query;
  const filtro = {};

  if (ativo !== 'todos') filtro.ativo = ativo === 'true';
  if (perfil) filtro.perfil = perfil;
  if (busca) {
    const regex = { $regex: busca, $options: 'i' };
    filtro.$or = [{ nome: regex }, { cpf: regex }, { especialidade: regex }];
  }

  const funcionarios = await Funcionario.find(filtro).sort({ nome: 1 });
  res.json(funcionarios);
});

// GET /funcionarios/:id
const obter = asyncHandler(async (req, res) => {
  res.json(await buscarOu404(req.params.id));
});

// POST /funcionarios
const criar = asyncHandler(async (req, res) => {
  const { senha, ...dados } = req.body;

  const senhaHash = await argon2.hash(senha);
  const funcionario = await Funcionario.create({ ...dados, senhaHash });

  await auditar(req, 'funcionario_criado', funcionario, { perfil: funcionario.perfil });

  // CPF/e-mail duplicados viram 409 no errorHandler (índice único do Mongo).
  res.status(201).json(funcionario);
});

// PUT /funcionarios/:id  (parcial)
const atualizar = asyncHandler(async (req, res) => {
  const alvo = await buscarOu404(req.params.id);
  const { senha, ...dados } = req.body;

  if (dados.perfil && dados.perfil !== alvo.perfil) {
    await garantirOutroAdmin(
      alvo,
      'Não é possível alterar o perfil do único Administrador ativo do sistema.'
    );
  }

  const set = { ...dados };
  const unset = {};

  // null => limpa o campo (remove do documento em vez de gravar null)
  for (const campo of ['email', 'telefone', 'especialidade']) {
    if (set[campo] === null) {
      delete set[campo];
      unset[campo] = 1;
    }
  }

  if (senha) set.senhaHash = await argon2.hash(senha);

  const update = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;

  const atualizado = await Funcionario.findByIdAndUpdate(alvo._id, update, {
    new: true,
    runValidators: true,
  });

  await auditar(req, 'funcionario_atualizado', alvo, {
    campos: [...Object.keys(dados), ...(senha ? ['senha'] : [])],
  });

  res.json(atualizado);
});

// DELETE /funcionarios/:id  -> RNF11: desligamento lógico
const desligar = asyncHandler(async (req, res) => {
  const alvo = await buscarOu404(req.params.id);

  if (String(alvo._id) === String(req.funcionario._id)) {
    throw new AppError('Você não pode desligar a sua própria conta.', 400);
  }

  if (!alvo.ativo) return res.status(204).send(); // já desligado: idempotente

  await garantirOutroAdmin(alvo, 'Não é possível desligar o único Administrador ativo.');

  await Funcionario.findByIdAndUpdate(alvo._id, { ativo: false, desligadoEm: new Date() });
  await auditar(req, 'funcionario_desligado', alvo);

  res.status(204).send();
});

// PATCH /funcionarios/:id/reativar
const reativar = asyncHandler(async (req, res) => {
  const alvo = await buscarOu404(req.params.id);

  const reativado = await Funcionario.findByIdAndUpdate(
    alvo._id,
    { ativo: true, desligadoEm: null },
    { new: true }
  );
  if (alvo.ativo === false) await auditar(req, 'funcionario_reativado', alvo);

  res.json(reativado);
});

module.exports = { listar, obter, criar, atualizar, desligar, reativar };
