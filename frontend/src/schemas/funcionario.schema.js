import { z } from 'zod';

export const PERFIS = [
  { valor: 'administrador', rotulo: 'Administrador' },
  { valor: 'caixa', rotulo: 'Caixa' },
  { valor: 'cozinha', rotulo: 'Cozinha' },
  { valor: 'bar', rotulo: 'Bar' },
  { valor: 'garcom', rotulo: 'Garçom / Salão' },
];

const soDigitos = (v) => (v ?? '').replace(/\D/g, '');

/**
 * RF02 - validação do formulário de funcionário (react-hook-form + zod).
 * A validação "de verdade" (dígito verificador do CPF, duplicidade etc.)
 * é do backend; aqui é só para dar retorno rápido ao usuário.
 *
 * modo 'criar'  => senha obrigatória
 * modo 'editar' => senha opcional (vazia = mantém a atual)
 */
export const funcionarioSchema = (modo) =>
  z.object({
    nome: z.string().trim().min(2, 'Informe o nome completo'),
    cpf: z.string().refine((v) => soDigitos(v).length === 11, 'CPF deve ter 11 dígitos'),
    perfil: z.enum(
      PERFIS.map((p) => p.valor),
      { errorMap: () => ({ message: 'Selecione o cargo' }) }
    ),
    especialidade: z.string().trim().max(60, 'Máximo de 60 caracteres').optional(),
    telefone: z
      .string()
      .optional()
      .refine((v) => !v || [10, 11].includes(soDigitos(v).length), 'Informe DDD + número'),
    email: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), 'E-mail inválido'),
    senha:
      modo === 'criar'
        ? z.string().min(6, 'A senha deve ter ao menos 6 caracteres')
        : z
            .string()
            .optional()
            .refine((v) => !v || v.length >= 6, 'A senha deve ter ao menos 6 caracteres'),
  });
