const { z } = require('zod');

// RF17 - o mesmo filtro (Hoje / Esta semana / Este mês) do topo do design
// vale pra visão geral, status dos pedidos e top produtos.
const periodoQuery = z.object({
  periodo: z
    .enum(['hoje', 'semana', 'mes'], {
      errorMap: () => ({ message: 'Período inválido. Use "hoje", "semana" ou "mes".' }),
    })
    .default('mes'),
});

module.exports = { periodoQuery };
