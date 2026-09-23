const { z } = require('zod');
const { normalizarCpf } = require('../utils/cpf');

// Login aceita CPF com ou sem máscara. Não checa dígito verificador aqui
// de propósito: quem não existe simplesmente recebe "CPF ou senha inválidos".
const loginSchema = z.object({
  cpf: z
    .string({ required_error: 'CPF é obrigatório.', invalid_type_error: 'CPF inválido.' })
    .transform(normalizarCpf)
    .refine((v) => v.length === 11, 'CPF inválido.'),
  senha: z
    .string({ required_error: 'Senha é obrigatória.', invalid_type_error: 'Senha inválida.' })
    .min(1, 'Senha é obrigatória.')
    .max(128, 'Senha inválida.'),
});

module.exports = { loginSchema };
