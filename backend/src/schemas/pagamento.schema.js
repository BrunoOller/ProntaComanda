const { z } = require('zod');

/**
 * RF11 - Processamento de Pagamento (Caixa)
 * O total a bater é calculado no backend a partir da(s) comanda(s), então
 * aqui só validamos o formato de cada método; a checagem de "recebeu o
 * suficiente" fica no controller, onde o total já está disponível.
 */
const valor = z
  .number({
    required_error: 'Valor é obrigatório.',
    invalid_type_error: 'Valor deve ser um número.',
  })
  .positive('Valor deve ser maior que zero.')
  .max(999999, 'Valor muito alto.')
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Use no máximo 2 casas decimais.');

const metodoSchema = z.object({
  tipo: z.enum(['pix', 'cartao', 'dinheiro'], {
    errorMap: () => ({
      message: 'Método de pagamento inválido. Use "pix", "cartao" ou "dinheiro".',
    }),
  }),
  valor,
});

const fecharPagamentoSchema = z.object({
  metodos: z
    .array(metodoSchema)
    .min(1, 'Informe ao menos um método de pagamento.')
    .max(5, 'Máximo de 5 métodos por pagamento.'),
});

module.exports = { fecharPagamentoSchema };
