const asyncHandler = require('../utils/asyncHandler');
const { Produto, Categoria } = require('../models');

/**
 * RF03/RF20 - Cardápio completo em uma chamada só: categorias ativas (na
 * ordem das abas) já com seus produtos ativos dentro. Serve à aba "Todos"
 * do admin e à tela do garçom no mobile.
 *
 * Produtos esgotados (`disponivel: false`) vêm na lista de propósito: o
 * front os exibe desativados (RF22) em vez de escondê-los.
 */
const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });

// GET /cardapio?busca=
const cardapio = asyncHandler(async (req, res) => {
  const { busca } = req.query;

  const filtroProdutos = { ativo: true };
  if (busca) filtroProdutos.nome = { $regex: busca, $options: 'i' };

  const [categorias, produtos] = await Promise.all([
    Categoria.find({ ativo: true }).sort({ ordem: 1, nome: 1 }).lean(),
    Produto.find(filtroProdutos).lean(),
  ]);

  const porCategoria = new Map();
  for (const produto of produtos.sort(porNome)) {
    const chave = String(produto.categoria);
    if (!porCategoria.has(chave)) porCategoria.set(chave, []);
    porCategoria.get(chave).push(produto);
  }

  const resultado = categorias.map((c) => ({
    ...c,
    produtos: porCategoria.get(String(c._id)) ?? [],
  }));

  // Com busca, só mostra as categorias que tiveram resultado.
  res.json(busca ? resultado.filter((c) => c.produtos.length) : resultado);
});

module.exports = { cardapio };
