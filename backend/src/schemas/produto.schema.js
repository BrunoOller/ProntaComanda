const { z } = require('zod');
const escaparRegex = require('../utils/escaparRegex');

/**
 * RF03 - Gestão de Cardápio: produtos.
 * Campos não listados (ativo, insumosNecessarios, _id...) são descartados pelo
 * Zod: inativar/reativar têm rotas próprias e o vínculo com estoque será
 * tratado no módulo de estoque.
 */
const vazioParaUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const vazioParaNull = (v) => (v === '' ? null : v);

const idMongo = z
  .string({ required_error: 'Categoria é obrigatória.', invalid_type_error: 'Categoria inválida.' })
  .regex(/^[0-9a-fA-F]{24}$/, 'Categoria inválida.');

const nome = z
  .string({ required_error: 'Nome é obrigatório.', invalid_type_error: 'Nome inválido.' })
  .trim()
  .min(2, 'O nome deve ter ao menos 2 caracteres.')
  .max(80, 'O nome deve ter no máximo 80 caracteres.');

const preco = z
  .number({
    required_error: 'Preço é obrigatório.',
    invalid_type_error: 'Preço deve ser um número.',
  })
  .positive('Preço deve ser maior que zero.')
  .max(99999.99, 'Preço muito alto.')
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Use no máximo 2 casas decimais.');

const descricao = z
  .string({ invalid_type_error: 'Descrição inválida.' })
  .trim()
  .max(300, 'Descrição muito longa (máx. 300).');

const imagemUrl = z
  .string({ invalid_type_error: 'Imagem inválida.' })
  .trim()
  .max(500)
  .refine(
    (v) => /^https?:\/\/\S+$/i.test(v) || v.startsWith('/uploads/'),
    'Informe um link http(s) válido.'
  );

// Tags do card (Pão, Carne...). Remove repetidas sem diferenciar maiúsculas.
const ingredientes = z
  .array(z.string().trim().min(1, 'Ingrediente vazio.').max(30, 'Ingrediente muito longo.'))
  .max(20, 'Máximo de 20 ingredientes.')
  .transform((lista) =>
    lista.filter((v, i) => lista.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i)
  );

const setor = z.enum(['cozinha', 'bar'], {
  errorMap: () => ({ message: 'Setor inválido. Use "cozinha" ou "bar".' }),
});

const tempoPreparoMinutos = z
  .number({ invalid_type_error: 'Tempo de preparo deve ser um número.' })
  .int('Tempo de preparo deve ser um número inteiro de minutos.')
  .min(1, 'Tempo de preparo deve ser de pelo menos 1 minuto.')
  .max(240, 'Tempo de preparo deve ser de no máximo 240 minutos.');

const disponivel = z.boolean({
  invalid_type_error: 'Disponibilidade deve ser verdadeiro ou falso.',
});

// ---------- Criar ----------
const criarProdutoSchema = z.object({
  nome,
  categoria: idMongo,
  preco,
  descricao: z.preprocess(vazioParaUndefined, descricao.optional()),
  ingredientes: ingredientes.optional(),
  imagemUrl: z.preprocess(vazioParaUndefined, imagemUrl.optional()),
  setor: setor.optional(), // sem setor => "cozinha" (padrão do model)
  tempoPreparoMinutos: z.preprocess(vazioParaUndefined, tempoPreparoMinutos.optional()),
  disponivel: disponivel.optional(),
});

// ---------- Atualizar (parcial; descrição/imagem aceitam null ou "" para limpar) ----------
const atualizarProdutoSchema = z
  .object({
    nome: nome.optional(),
    categoria: idMongo.optional(),
    preco: preco.optional(),
    descricao: z.preprocess(vazioParaNull, descricao.nullable().optional()),
    ingredientes: ingredientes.optional(),
    imagemUrl: z.preprocess(vazioParaNull, imagemUrl.nullable().optional()),
    setor: setor.optional(),
    tempoPreparoMinutos: z.preprocess(vazioParaNull, tempoPreparoMinutos.nullable().optional()),
    disponivel: disponivel.optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Envie ao menos um campo para atualizar.',
  });

const disponibilidadeSchema = z.object({
  disponivel: z.boolean({
    required_error: 'Informe a disponibilidade.',
    invalid_type_error: 'Disponibilidade deve ser verdadeiro ou falso.',
  }),
});

// ---------- Query strings ----------
const busca = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((v) => (v ? escaparRegex(v) : undefined));

const listarProdutosQuery = z.object({
  categoria: idMongo.optional(),
  busca,
  disponivel: z.enum(['true', 'false']).optional(),
  ativo: z.enum(['true', 'false', 'todos']).default('true'),
});

const cardapioQuery = z.object({ busca });

module.exports = {
  criarProdutoSchema,
  atualizarProdutoSchema,
  disponibilidadeSchema,
  listarProdutosQuery,
  cardapioQuery,
};
