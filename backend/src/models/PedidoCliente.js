const { Schema, model } = require('mongoose');

const STATUS_PEDIDO_CLIENTE = ['pendente', 'aceito', 'recusado'];

/**
 * Autoatendimento - pedido feito pelo próprio cliente (QR code -> cardápio).
 *
 * Ele NÃO é uma comanda: fica "pendente" até um funcionário conferir no
 * salão e aceitar. Só no aceite a mesa passa a ocupada, a comanda é aberta
 * (ou reaproveitada) e os itens seguem para o KDS. Recusar não lança nada.
 * Assim um pedido na mesa errada (ou de brincadeira) nunca vira prato feito
 * nem entra na conta de outra pessoa.
 */
const itemPedidoClienteSchema = new Schema(
  {
    produto: { type: Schema.Types.ObjectId, ref: 'Produto', required: true },

    // snapshot só para exibir ao garçom; no aceite o preço/setor valem de
    // novo a partir do cadastro atual do produto
    nomeProduto: { type: String, required: true },
    precoUnitario: { type: Number, required: true, min: 0 },

    quantidade: { type: Number, required: true, min: 1, max: 20 },
    observacao: { type: String, trim: true, maxlength: 140 },
  },
  { _id: false }
);

const pedidoClienteSchema = new Schema(
  {
    mesa: { type: Schema.Types.ObjectId, ref: 'Mesa', required: true },
    nomeCliente: { type: String, trim: true, maxlength: 40 }, // opcional, ajuda o garçom a achar o cliente
    itens: { type: [itemPedidoClienteSchema], validate: (v) => v.length > 0 },

    status: { type: String, enum: STATUS_PEDIDO_CLIENTE, default: 'pendente' },

    resolvidoPor: { type: Schema.Types.ObjectId, ref: 'Funcionario', default: null },
    resolvidoEm: { type: Date, default: null },
    motivoRecusa: { type: String, trim: true, maxlength: 140 },

    // preenchida no aceite: em qual comanda os itens foram lançados
    comanda: { type: Schema.Types.ObjectId, ref: 'Comanda', default: null },
    // ids dos itens criados na comanda por este pedido: é por eles que o cliente
    // acompanha o andamento (na fila, preparando, pronto...) e o que consumiu
    itensLancados: [{ type: Schema.Types.ObjectId }],
  },
  { timestamps: true }
);

pedidoClienteSchema.index({ status: 1, createdAt: 1 }); // fila de pendentes do garçom
pedidoClienteSchema.index({ mesa: 1, status: 1 }); // limite de pendentes por mesa

module.exports = {
  PedidoCliente: model('PedidoCliente', pedidoClienteSchema),
  STATUS_PEDIDO_CLIENTE,
};
