const { Schema, model } = require('mongoose');

/**
 * RF03 - Gestão de Cardápio (CRUD)
 * RF22 - Alerta de Ruptura em Tempo Real
 *
 * Reflete o card de produto visto no cardápio digital: nome, descrição,
 * "tags" de ingredientes (Pão, Carne, Queijo...), preço e foto.
 */
const produtoSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    descricao: { type: String, trim: true }, // ex: "Hambúrguer Simples"
    preco: { type: Number, required: true, min: 0 },
    imagemUrl: { type: String, trim: true },

    categoria: { type: Schema.Types.ObjectId, ref: 'Categoria', required: true },

    // Tags exibidas no card (Pão, Carne, Queijo, Alface, Tomate, Maionese...)
    ingredientes: [{ type: String, trim: true }],

    // RF22 - controla se o item some/desativa nos botões em tempo real
    // quando o insumo vinculado zera (ver Insumo.js / MovimentacaoEstoque.js).
    disponivel: { type: Boolean, default: true },
    insumosNecessarios: [
      {
        insumo: { type: Schema.Types.ObjectId, ref: 'Insumo' },
        quantidade: { type: Number, min: 0 }, // consumo do insumo por unidade vendida
      },
    ],

    ativo: { type: Boolean, default: true }, // soft delete (RNF11) - produto "inativado"
  },
  { timestamps: true }
);

produtoSchema.index({ categoria: 1, ativo: 1 });
produtoSchema.index({ nome: 'text' }); // suporta a busca (ícone de lupa no cardápio)

module.exports = { Produto: model('Produto', produtoSchema) };
