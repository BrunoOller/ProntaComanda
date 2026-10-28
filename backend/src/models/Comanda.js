const { Schema, model } = require('mongoose');

const STATUS_ITEM_KDS = ['pendente', 'em_preparo', 'pronto', 'entregue'];

const itemComandaSchema = new Schema(
  {
    produto: { type: Schema.Types.ObjectId, ref: 'Produto', required: true },

    nomeProduto: { type: String, required: true },
    precoUnitario: { type: Number, required: true, min: 0 },
    tempoPreparoMinutos: { type: Number, default: null },

    quantidade: { type: Number, required: true, min: 1, default: 1 },
    observacao: { type: String, trim: true }, // ex: "Sem cebola", "Ao ponto"

    setorPreparo: { type: String, enum: ['cozinha', 'bar'], default: 'cozinha' },
    statusKDS: { type: String, enum: STATUS_ITEM_KDS, default: 'pendente' },

    lancadoEm: { type: Date, default: Date.now }, // horário exato do lançamento (RF07)
    lancadoPor: { type: Schema.Types.ObjectId, ref: 'Funcionario' },
    // 'cliente' = pedido feito pelo QR code (autoatendimento) e aceito por
    // um funcionário, que consta em lancadoPor. Itens antigos valem 'funcionario'.
    origem: { type: String, enum: ['funcionario', 'cliente'], default: 'funcionario' },

    // ciclo de vida no KDS, usado pelo semáforo no frontend
    emPreparoEm: { type: Date, default: null },
    prontoEm: { type: Date, default: null },
    entregueEm: { type: Date, default: null },

    // estorno
    estornado: { type: Boolean, default: false },
    motivoEstorno: { type: String, trim: true }, // obrigatório quando estornado = true
    estornadoPor: { type: Schema.Types.ObjectId, ref: 'Funcionario', default: null },
    estornadoEm: { type: Date, default: null },
  },
  { _id: true, timestamps: false }
);

const comandaSchema = new Schema(
  {
    mesa: { type: Schema.Types.ObjectId, ref: 'Mesa', required: true },
    numero: { type: Number, required: true }, // "#001", "#002" — sequencial por mesa

    status: { type: String, enum: ['aberta', 'fechada'], default: 'aberta' },

    abertaEm: { type: Date, default: Date.now },
    abertaPor: { type: Schema.Types.ObjectId, ref: 'Funcionario' },
    fechadaEm: { type: Date, default: null },
    fechadaPor: { type: Schema.Types.ObjectId, ref: 'Funcionario', default: null },

    itens: [itemComandaSchema],

    // restrito ao perfil "administrador" na camada de autorização
    desconto: {
      tipo: { type: String, enum: ['percentual', 'valor'], default: 'percentual' },
      valor: { type: Number, default: 0, min: 0 },
      observacao: { type: String, trim: true }, // ex: "Cliente VIP, aniversário"
      aplicadoPor: { type: Schema.Types.ObjectId, ref: 'Funcionario', default: null },
    },
    taxaServico: {
      percentual: { type: Number, default: 0, min: 0 },
      valor: { type: Number, default: 0, min: 0 }, // calculado no fechamento
    },

    // Totais persistidos no fechamento (evita recalcular histórico depois
    // que os produtos mudarem de preço).
    subtotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    // RF25 - rastro de transferência/junção
    origemTransferencia: {
      comanda: { type: Schema.Types.ObjectId, ref: 'Comanda', default: null },
      mesa: { type: Schema.Types.ObjectId, ref: 'Mesa', default: null },
    },
  },
  { timestamps: true }
);

comandaSchema.index({ mesa: 1, status: 1 });
comandaSchema.index({ 'itens.statusKDS': 1 }); // consultas do KDS (Novos/Em preparo/Prontos)

module.exports = {
  Comanda: model('Comanda', comandaSchema),
  STATUS_ITEM_KDS,
};
