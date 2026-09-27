const { z } = require('zod');

/**
 * RF10 - Gestão e Entrada de Estoque
 * Unidades fechadas para não deixar "kilo", "Kg", "unidades" etc. se
 * espalharem pelo banco — todo lugar que exibir a unidade sabe o que esperar.
 */
const UNIDADES = ['un', 'kg', 'g', 'l', 'ml'];

const nome = z
  .string({ required_error: 'Nome é obrigatório.', invalid_type_error: 'Nome inválido.' })
  .trim()
  .min(2, 'O nome deve ter ao menos 2 caracteres.')
  .max(60, 'O nome deve ter no máximo 60 caracteres.');

const unidade = z.enum(UNIDADES, {
  errorMap: () => ({ message: `Unidade inválida. Use uma de: ${UNIDADES.join(', ')}.` }),
});

const quantidadeNaoNegativa = (rotulo) =>
  z
    .number({
      required_error: `${rotulo} é obrigatório.`,
      invalid_type_error: `${rotulo} deve ser um número.`,
    })
    .min(0, `${rotulo} não pode ser negativo.`)
    .max(999999, `${rotulo} muito alto.`);

const criarInsumoSchema = z.object({
  nome,
  unidade,
  saldoAtual: quantidadeNaoNegativa('Saldo inicial').default(0),
  saldoMinimo: quantidadeNaoNegativa('Saldo mínimo').default(0),
});

const atualizarInsumoSchema = z
  .object({
    nome: nome.optional(),
    unidade: unidade.optional(),
    saldoMinimo: quantidadeNaoNegativa('Saldo mínimo').optional(),
    // saldoAtual NÃO entra aqui de propósito: toda mudança de saldo passa
    // por /movimentar, que sempre grava o histórico (MovimentacaoEstoque).
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Envie ao menos um campo para atualizar.',
  });

/**
 * RF10 - ajuste manual de inventário.
 * "entrada"/"saida" são o dia a dia (reposição, quebra) e não exigem motivo;
 * "ajuste" é a correção de contagem e exige, para alimentar a auditoria.
 */
const movimentarEstoqueSchema = z
  .object({
    tipo: z.enum(['entrada', 'saida', 'ajuste'], {
      errorMap: () => ({ message: 'Tipo deve ser "entrada", "saida" ou "ajuste".' }),
    }),
    quantidade: z
      .number({
        required_error: 'Quantidade é obrigatória.',
        invalid_type_error: 'Quantidade deve ser um número.',
      })
      .positive('Quantidade deve ser maior que zero.')
      .max(999999, 'Quantidade muito alta.'),
    motivo: z.string().trim().max(200, 'Motivo muito longo (máx. 200).').optional(),
  })
  .refine((d) => d.tipo !== 'ajuste' || (d.motivo && d.motivo.length >= 3), {
    message: 'Informe o motivo do ajuste manual de estoque (mínimo 3 caracteres).',
    path: ['motivo'],
  });

const listarInsumosQuery = z.object({
  ativo: z.enum(['true', 'false', 'todos']).default('true'),
});

module.exports = {
  UNIDADES,
  criarInsumoSchema,
  atualizarInsumoSchema,
  movimentarEstoqueSchema,
  listarInsumosQuery,
};
