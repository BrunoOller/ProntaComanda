const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const escaparRegex = require('../utils/escaparRegex');
const logger = require('../utils/logger');
const { Produto, Categoria, LogAuditoria } = require('../models');

/**
 * RF03 - Gestão de Cardápio (CRUD) - produtos
 * RF22 - Alerta de ruptura em tempo real (evento `produto:atualizado`)
 * RNF11 - Soft delete: produto é inativado, nunca apagado (as comandas
 *         guardam nome/preço próprios, então nada quebra ao inativar).
 */

const eAdmin = (req) => req.funcionario?.perfil === 'administrador';
const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });

// RF22 - avisa todos os dispositivos, sempre DEPOIS de a operação dar certo.
const avisar = (req, produto) => req.io?.emit('produto:atualizado', produto);

async function auditar(req, tipo, produto, detalhes = {}) {
  try {
    await LogAuditoria.create({
      tipo,
      funcionario: req.funcionario._id,
      entidade: 'Produto',
      entidadeId: produto._id,
      detalhes: { produto: produto.nome, ...detalhes },
    });
  } catch (err) {
    logger.error('Falha ao gravar auditoria de produto', { error: err.message });
  }
}

async function buscarOu404(id) {
  const produto = await Produto.findById(id);
  if (!produto) throw new AppError('Produto não encontrado.', 404);
  return produto;
}

async function exigirCategoriaAtiva(id) {
  const categoria = await Categoria.findById(id);
  if (!categoria || !categoria.ativo) throw new AppError('Categoria inválida ou inativa.', 400);
}

/** Nome único dentro da mesma categoria (entre produtos ativos), sem diferenciar maiúsculas. */
async function garantirNomeLivre(nome, categoria, ignorarId) {
  const filtro = {
    ativo: true,
    categoria,
    nome: { $regex: `^${escaparRegex(nome.trim())}$`, $options: 'i' },
  };
  if (ignorarId) filtro._id = { $ne: ignorarId };

  if ((await Produto.countDocuments(filtro)) > 0) {
    throw new AppError('Já existe um produto com este nome nesta categoria.', 409);
  }
}

// GET /produtos?categoria=&busca=&disponivel=&ativo=  (só o admin enxerga inativos)
const listar = asyncHandler(async (req, res) => {
  const { categoria, busca, disponivel, ativo } = req.query;
  const filtro = {};

  const situacao = eAdmin(req) ? ativo : 'true';
  if (situacao !== 'todos') filtro.ativo = situacao === 'true';
  if (categoria) filtro.categoria = categoria;
  if (disponivel) filtro.disponivel = disponivel === 'true';
  if (busca) filtro.nome = { $regex: busca, $options: 'i' }; // acha por trecho: "burg" => "X-Burger"

  const produtos = await Produto.find(filtro).populate('categoria', 'nome');
  res.json(produtos.sort(porNome));
});

// GET /produtos/:id
const obter = asyncHandler(async (req, res) => {
  const produto = await Produto.findById(req.params.id).populate('categoria', 'nome');
  if (!produto || (!produto.ativo && !eAdmin(req))) {
    throw new AppError('Produto não encontrado.', 404);
  }
  res.json(produto);
});

// POST /produtos
const criar = asyncHandler(async (req, res) => {
  await exigirCategoriaAtiva(req.body.categoria);
  await garantirNomeLivre(req.body.nome, req.body.categoria);

  const produto = await Produto.create(req.body);
  avisar(req, produto);
  res.status(201).json(produto);
});

// PUT /produtos/:id  (parcial)
const atualizar = asyncHandler(async (req, res) => {
  const alvo = await buscarOu404(req.params.id);
  const dados = req.body;

  const categoriaFinal = dados.categoria ?? alvo.categoria;
  if (dados.categoria && String(dados.categoria) !== String(alvo.categoria)) {
    await exigirCategoriaAtiva(dados.categoria);
  }
  if (alvo.ativo && (dados.nome !== undefined || dados.categoria !== undefined)) {
    await garantirNomeLivre(dados.nome ?? alvo.nome, categoriaFinal, alvo._id);
  }

  // null => limpa o campo (remove do documento)
  const set = { ...dados };
  const unset = {};
  for (const campo of ['descricao', 'imagemUrl', 'tempoPreparoMinutos']) {
    if (set[campo] === null) {
      delete set[campo];
      unset[campo] = 1;
    }
  }
  const update = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;

  const atualizado = await Produto.findByIdAndUpdate(alvo._id, update, {
    new: true,
    runValidators: true,
  });

  if (dados.preco !== undefined && dados.preco !== alvo.preco) {
    await auditar(req, 'produto_preco_alterado', alvo, { de: alvo.preco, para: dados.preco });
  }

  avisar(req, atualizado);
  res.json(atualizado);
});

// PATCH /produtos/:id/disponibilidade  { disponivel: true|false }
const alterarDisponibilidade = asyncHandler(async (req, res) => {
  const alvo = await buscarOu404(req.params.id);
  const { disponivel } = req.body;

  if (disponivel && !alvo.ativo) {
    throw new AppError(
      'Este produto está inativo. Reative-o antes de marcá-lo como disponível.',
      409
    );
  }

  const atualizado = await Produto.findByIdAndUpdate(alvo._id, { disponivel }, { new: true });
  avisar(req, atualizado);
  res.json(atualizado);
});

// DELETE /produtos/:id  -> RNF11: inativação lógica
const inativar = asyncHandler(async (req, res) => {
  const alvo = await buscarOu404(req.params.id);
  if (!alvo.ativo) return res.status(204).send(); // já inativo: idempotente

  const atualizado = await Produto.findByIdAndUpdate(
    alvo._id,
    { ativo: false, disponivel: false },
    { new: true }
  );
  await auditar(req, 'produto_inativado', alvo);

  avisar(req, atualizado);
  res.status(204).send();
});

// PATCH /produtos/:id/reativar
const reativar = asyncHandler(async (req, res) => {
  const alvo = await buscarOu404(req.params.id);
  if (alvo.ativo) return res.json(alvo);

  const categoria = await Categoria.findById(alvo.categoria);
  if (!categoria || !categoria.ativo) {
    throw new AppError('A categoria deste produto está inativa. Reative a categoria antes.', 409);
  }
  await garantirNomeLivre(alvo.nome, alvo.categoria, alvo._id);

  const atualizado = await Produto.findByIdAndUpdate(
    alvo._id,
    { ativo: true, disponivel: true },
    { new: true }
  );
  await auditar(req, 'produto_reativado', alvo);

  avisar(req, atualizado);
  res.json(atualizado);
});

module.exports = { listar, obter, criar, atualizar, alterarDisponibilidade, inativar, reativar };
