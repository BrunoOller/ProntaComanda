const { z } = require('zod');
const { PERFIS } = require('../models/Funcionario');
const { normalizarCpf, validarCpf } = require('../utils/cpf');

/**
 * RF02 - Gestão de Colaboradores.
 * Validação de entrada com Zod. Campos desconhecidos são descartados pelo
 * Zod, o que também protege contra mass assignment (ex.: alguém enviar
 * `ativo`, `senhaHash` ou `desligadoEm` no body).
 */

// "" (campo vazio de formulário) é tratado como "não informado".
const vazioParaUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const texto = (rotulo, max) =>
  z
    .string({ invalid_type_error: `${rotulo} inválido.` })
    .trim()
    .max(max, `${rotulo} muito longo.`);

const nome = texto('Nome', 100).min(2, 'Informe o nome completo.');

const cpf = z
  .string({ required_error: 'CPF é obrigatório.', invalid_type_error: 'CPF inválido.' })
  .transform(normalizarCpf)
  .refine(validarCpf, 'CPF inválido.');

const email = z.string().trim().toLowerCase().email('E-mail inválido.').max(120);

const telefone = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length === 10 || v.length === 11, 'Telefone deve ter DDD + 8 ou 9 dígitos.');

const senha = z
  .string({ required_error: 'Senha é obrigatória.', invalid_type_error: 'Senha inválida.' })
  .min(6, 'A senha deve ter ao menos 6 caracteres.')
  .max(128, 'A senha deve ter no máximo 128 caracteres.');

const perfil = z.enum(PERFIS, {
  errorMap: () => ({ message: `Perfil inválido. Use: ${PERFIS.join(', ')}.` }),
});

const especialidade = texto('Especialidade', 60);

// ---------- Criar ----------
const criarFuncionarioSchema = z.object({
  nome,
  cpf,
  senha,
  perfil,
  email: z.preprocess(vazioParaUndefined, email.optional()),
  telefone: z.preprocess(vazioParaUndefined, telefone.optional()),
  especialidade: z.preprocess(vazioParaUndefined, especialidade.optional()),
});

// ---------- Atualizar (parcial) ----------
// email/telefone/especialidade aceitam null ou "" para LIMPAR o campo.
const limpavel = (schema) =>
  z.preprocess((v) => (v === '' ? null : v), schema.nullable().optional());

const atualizarFuncionarioSchema = z
  .object({
    nome: nome.optional(),
    cpf: cpf.optional(),
    senha: senha.optional(),
    perfil: perfil.optional(),
    email: limpavel(email),
    telefone: limpavel(telefone),
    especialidade: limpavel(especialidade),
  })
  .refine((dados) => Object.values(dados).some((v) => v !== undefined), {
    message: 'Envie ao menos um campo para atualizar.',
  });

// ---------- Listagem (query string) ----------
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const listarFuncionariosQuery = z.object({
  ativo: z.enum(['true', 'false', 'todos']).default('true'),
  perfil: perfil.optional(),
  busca: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v ? escapar(v) : undefined)),
});

module.exports = {
  criarFuncionarioSchema,
  atualizarFuncionarioSchema,
  listarFuncionariosQuery,
};
