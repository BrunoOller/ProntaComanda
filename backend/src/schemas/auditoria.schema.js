const { z } = require('zod');
const { TIPOS_AUDITORIA } = require('../models/LogAuditoria');

/**
 * RF17 - Relatórios de auditoria: filtros da listagem.
 * `de` e `ate` são datas de calendário (AAAA-MM-DD) no fuso do
 * estabelecimento; o `ate` é inclusivo (vai até o fim daquele dia).
 */
const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

// Recusa datas que não existem (ex.: 2026-02-30), que o JS "corrige" em silêncio.
const dataExiste = (v) => {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

const data = z
  .string()
  .regex(FORMATO_DATA, 'Use o formato AAAA-MM-DD.')
  // No Zod o refine roda mesmo quando o regex falhou; só checa se o formato bate
  // para não estourar em texto qualquer (e não repetir mensagem de erro).
  .refine((v) => !FORMATO_DATA.test(v) || dataExiste(v), 'Data inválida.');

const listarAuditoriaQuery = z
  .object({
    tipo: z
      .enum(TIPOS_AUDITORIA, { errorMap: () => ({ message: 'Tipo de ação inválido.' }) })
      .optional(),
    funcionario: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Funcionário inválido.')
      .optional(),
    de: data.optional(),
    ate: data.optional(),
    pagina: z.coerce.number().int().min(1, 'A página começa em 1.').default(1),
    porPagina: z.coerce
      .number()
      .int()
      .min(1, 'Mínimo de 1 registro por página.')
      .max(100, 'Máximo de 100 registros por página.')
      .default(25),
  })
  .refine((q) => !q.de || !q.ate || q.de <= q.ate, {
    message: 'A data inicial não pode ser depois da final.',
    path: ['de'],
  });

module.exports = { listarAuditoriaQuery };
