import { z } from 'zod';

// RF03 - validação do formulário de produto no cardápio
export const produtoSchema = z.object({
  nome: z.string().min(2, 'Informe o nome do produto'),
  descricao: z.string().optional(),
  preco: z.coerce.number().positive('Preço deve ser maior que zero'),
  categoria: z.string().min(1, 'Selecione uma categoria'),
  ingredientes: z.array(z.string()).optional(),
  disponivel: z.boolean().default(true),
});
