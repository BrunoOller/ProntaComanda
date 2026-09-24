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

    // RF05 - para qual tela o item vai ao ser lançado. É o cadastro do produto
    // (e não o app do garçom) que decide isso. Produtos antigos, sem o campo, são "cozinha".
    setor: { type: String, enum: ['cozinha', 'bar'], default: 'cozinha' },

    // RF06 - tempo esperado de preparo, base do semáforo do KDS (opcional).
    tempoPreparoMinutos: { type: Number, min: 1, max: 240 },

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
