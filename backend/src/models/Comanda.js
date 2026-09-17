const { Schema, model } = require('mongoose');

/**
 * RF05/RF06 - Fluxo Operacional KDS + SLA (semáforo)
 * RF07/RF08 - Estorno detalhado de itens + justificativa obrigatória
 * RF09      - Concessões financeiras (desconto/acréscimo) restritas ao Admin
 * RF11      - Processamento de pagamento
 * RF23      - Espelho de consumo no mobile
 * RF24      - Divisão de conta (calculada só no frontend, não persiste aqui)
 * RF25      - Transferência/Junção de mesas-comandas
 *
 * Uma Mesa pode ter várias Comandas abertas ao mesmo tempo (visto no design:
 * "Comanda #001", "Comanda #002" dentro da mesma mesa) — por isso os itens
 * ficam aninhados na Comanda, e não direto na Mesa.
 *
 * Os itens são embutidos (subdocumentos) em vez de coleção separada porque
 * são sempre lidos/escritos junto com a comanda (KDS, fechamento, espelho de
 * consumo) e o volume por comanda é pequeno — evita joins/populate no
 * caminho mais quente do sistema (RNF09: resposta < 1s).
 */

const STATUS_ITEM_KDS = ['pendente', 'em_preparo', 'pronto', 'entregue'];

const itemComandaSchema = new Schema(
  {
    produto: { type: Schema.Types.ObjectId, ref: 'Produto', required: true },

    // snapshot no momento do lançamento: preço/nome não devem mudar
    // retroativamente se o produto for editado depois (auditoria/histórico).
    nomeProduto: { type: String, required: true },
    precoUnitario: { type: Number, required: true, min: 0 },

    quantidade: { type: Number, required: true, min: 1, default: 1 },
    observacao: { type: String, trim: true }, // ex: "Sem cebola", "Ao ponto"

    setorPreparo: { type: String, enum: ['cozinha', 'bar'], default: 'cozinha' },
    statusKDS: { type: String, enum: STATUS_ITEM_KDS, default: 'pendente' },

    lancadoEm: { type: Date, default: Date.now }, // horário exato do lançamento (RF07)
    lancadoPor: { type: Schema.Types.ObjectId, ref: 'Funcionario' },

    // ciclo de vida no KDS, usado pelo semáforo (RF06) no frontend
    emPreparoEm: { type: Date, default: null },
    prontoEm: { type: Date, default: null },
    entregueEm: { type: Date, default: null },

    // RF07/RF08 - estorno
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

    // RF09 - restrito ao perfil "administrador" na camada de autorização
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
