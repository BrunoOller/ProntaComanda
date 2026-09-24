const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const escaparRegex = require('../utils/escaparRegex');
const { Categoria, Produto } = require('../models');

/**
 * RF03 - Gestão de Cardápio: categorias (Entrada, Principais, Sobremesa...)
 * RNF11 - Soft delete: categoria é inativada, nunca apagada.
 */

const eAdmin = (req) => req.funcionario?.perfil === 'administrador';

async function buscarOu404(id) {
  const categoria = await Categoria.findById(id);
  if (!categoria) throw new AppError('Categoria não encontrada.', 404);
  return categoria;
}

/** Nome único entre as categorias ATIVAS, sem diferenciar maiúsculas/minúsculas. */
async function garantirNomeLivre(nome, ignorarId) {
  const filtro = {
    ativo: true,
    nome: { $regex: `^${escaparRegex(nome.trim())}$`, $options: 'i' },
  };
  if (ignorarId) filtro._id = { $ne: ignorarId };

  if ((await Categoria.countDocuments(filtro)) > 0) {
    throw new AppError('Já existe uma categoria com este nome.', 409);
  }
}

// GET /categorias?ativo=true|false|todos  (só o administrador enxerga inativas)
const listar = asyncHandler(async (req, res) => {
  const ativo = eAdmin(req) ? req.query.ativo : 'true';
  const filtro = ativo === 'todos' ? {} : { ativo: ativo === 'true' };

  res.json(await Categoria.find(filtro).sort({ ordem: 1, nome: 1 }));
});

// GET /categorias/:id
const obter = asyncHandler(async (req, res) => {
  const categoria = await buscarOu404(req.params.id);
  if (!categoria.ativo && !eAdmin(req)) throw new AppError('Categoria não encontrada.', 404);
  res.json(categoria);
});

// POST /categorias
const criar = asyncHandler(async (req, res) => {
  const { nome } = req.body;
  let { ordem } = req.body;

  await garantirNomeLivre(nome);

  if (ordem === undefined) {
    const ultima = await Categoria.findOne().sort({ ordem: -1 });
    ordem = ultima ? ultima.ordem + 1 : 0;
  }

  res.status(201).json(await Categoria.create({ nome, ordem }));
});

// PUT /categorias/:id
const atualizar = asyncHandler(async (req, res) => {
  const alvo = await buscarOu404(req.params.id);

  // Inativa pode ser renomeada; o conflito de nome só importa entre ativas
  // (e é checado de novo ao reativar).
  if (req.body.nome !== undefined && alvo.ativo) {
    await garantirNomeLivre(req.body.nome, alvo._id);
  }

  const atualizada = await Categoria.findByIdAndUpdate(alvo._id, req.body, {
    new: true,
    runValidators: true,
  });
  res.json(atualizada);
});

// DELETE /categorias/:id  -> RNF11: inativação lógica
const inativar = asyncHandler(async (req, res) => {
  const alvo = await buscarOu404(req.params.id);
  if (!alvo.ativo) return res.status(204).send(); // já inativa: idempotente

  const qtd = await Produto.countDocuments({ categoria: alvo._id, ativo: true });
  if (qtd > 0) {
    const plural = qtd > 1;
    throw new AppError(
      `Esta categoria ainda tem ${qtd} produto${plural ? 's' : ''} ativo${plural ? 's' : ''}. ` +
        'Mova ou inative os produtos antes de inativar a categoria.',
      409
    );
  }

  await Categoria.findByIdAndUpdate(alvo._id, { ativo: false });
  res.status(204).send();
});

// PATCH /categorias/:id/reativar
const reativar = asyncHandler(async (req, res) => {
  const alvo = await buscarOu404(req.params.id);
  if (alvo.ativo) return res.json(alvo);

  await garantirNomeLivre(alvo.nome, alvo._id);

  res.json(await Categoria.findByIdAndUpdate(alvo._id, { ativo: true }, { new: true }));
});

module.exports = { listar, obter, criar, atualizar, inativar, reativar };
