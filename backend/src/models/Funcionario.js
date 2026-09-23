const { Schema, model } = require('mongoose');

/**
 * RF01 - Controle de Acesso por Perfis (RBAC)
 * RF02 - Gestão de Colaboradores e Autenticação
 * RNF07 - Senhas com hash (argon2), rotas protegidas por JWT
 *
 * O campo `perfil` é a base do RBAC: todo middleware de autorização no
 * backend deve validar este campo em toda requisição, independente da
 * interface (Desktop ou Mobile) que originou a chamada.
 */
const PERFIS = ['administrador', 'caixa', 'cozinha', 'bar', 'garcom'];

const funcionarioSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    cpf: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true },

    // Hash gerado com argon2 - nunca armazenar em texto puro.
    senhaHash: { type: String, required: true, select: false },

    perfil: { type: String, enum: PERFIS, required: true },
    especialidade: { type: String, trim: true }, // ex: "Churrasqueiro", "Bartender"

    telefone: { type: String, trim: true },

    // RNF11 - Soft delete: funcionário desligado não é removido do banco,
    // pois comandas/pedidos antigos referenciam este documento.
    ativo: { type: Boolean, default: true },
    desligadoEm: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      // Defesa em profundidade: mesmo que algum controller esqueça, o hash
      // da senha e o __v nunca saem na resposta da API.
      transform: (_doc, ret) => {
        delete ret.senhaHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

funcionarioSchema.index({ perfil: 1, ativo: 1 });

// E-mail é opcional, mas quando informado não pode repetir entre funcionários.
funcionarioSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);

module.exports = {
  Funcionario: model('Funcionario', funcionarioSchema),
  PERFIS,
};
