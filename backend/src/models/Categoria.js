const { Schema, model } = require('mongoose');

/**
 * RF03 - Gestão de Cardápio (CRUD)
 * Categorias vistas no design: Entrada, Principais, Sobremesa, Bebidas.
 * Mantidas como coleção própria (em vez de enum fixo) para permitir que o
 * Admin crie/reordene categorias sem alterar código.
 */
const categoriaSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    ordem: { type: Number, default: 0 }, // ordem de exibição nas abas do cardápio
    ativo: { type: Boolean, default: true }, // soft delete (RNF11)
  },
  { timestamps: true }
);

module.exports = { Categoria: model('Categoria', categoriaSchema) };
