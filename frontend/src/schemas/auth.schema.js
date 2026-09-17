import { z } from 'zod';

// RF02 - validação do formulário de login (react-hook-form + zod)
export const loginSchema = z.object({
  cpf: z.string().min(11, 'CPF inválido'),
  senha: z.string().min(1, 'Senha deve ter ao menos 1 caracteres'),
});
