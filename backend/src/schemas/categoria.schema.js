const { z } = require('zod');

/**
 * RF03 - Gestão de Cardápio: categorias.
 * Campos não listados aqui (ex.: `ativo`) são descartados pelo Zod, então
 * ninguém consegue inativar/reativar por PUT; para isso existem rotas próprias.
 */
const nome = z
  .string({ required_error: 'Nome é obrigatório.', invalid_type_error: 'Nome inválido.' })
  .trim()
  .min(2, 'O nome deve ter ao menos 2 caracteres.')
  .max(40, 'O nome deve ter no máximo 40 caracteres.');

const ordem = z
  .number({ invalid_type_error: 'Ordem deve ser um número.' })
  .int('Ordem deve ser um número inteiro.')
  .min(0, 'Ordem não pode ser negativa.')
  .max(999, 'Ordem muito alta.');

const criarCategoriaSchema = z.object({
  nome,
  ordem: ordem.optional(), // sem ordem => vai para o fim da lista
});

const atualizarCategoriaSchema = z
  .object({ nome: nome.optional(), ordem: ordem.optional() })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Envie ao menos um campo para atualizar.',
  });

const listarCategoriasQuery = z.object({
  ativo: z.enum(['true', 'false', 'todos']).default('true'),
});

module.exports = { criarCategoriaSchema, atualizarCategoriaSchema, listarCategoriasQuery };
