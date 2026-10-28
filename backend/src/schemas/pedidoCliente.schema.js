const { z } = require('zod');

/**
 * Autoatendimento - validação do que o cliente envia (rota PÚBLICA, então
 * tudo aqui é desconfiado: tamanhos máximos, quantidades limitadas, e preço
 * NUNCA vem do cliente; é lido do cadastro do produto no servidor).
 */
const objectId = (mensagem) =>
  z.string({ required_error: mensagem }).regex(/^[0-9a-fA-F]{24}$/, mensagem);

// texto opcional: vazio vira "não enviado"
const textoOpcional = (max, mensagem) =>
  z
    .string({ invalid_type_error: mensagem })
    .trim()
    .max(max, mensagem)
    .optional()
    .transform((v) => v || undefined);

const itemPedido = z.object({
  produtoId: objectId('Produto inválido.'),
  quantidade: z
    .number({ required_error: 'Informe a quantidade.', invalid_type_error: 'Quantidade inválida.' })
    .int('Quantidade inválida.')
    .min(1, 'A quantidade mínima é 1.')
    .max(20, 'A quantidade máxima por item é 20.'),
  observacao: textoOpcional(140, 'A observação pode ter no máximo 140 caracteres.'),
});

const criarPedidoClienteSchema = z.object({
  mesaId: objectId('Escolha a sua mesa.'),
  nomeCliente: textoOpcional(40, 'O nome pode ter no máximo 40 caracteres.'),
  itens: z
    .array(itemPedido, { required_error: 'O pedido está vazio.' })
    .min(1, 'O pedido está vazio.')
    .max(30, 'O pedido tem itens demais. Envie em duas partes.'),
});

const recusarPedidoSchema = z.object({
  motivo: textoOpcional(140, 'O motivo pode ter no máximo 140 caracteres.'),
});

// GET /publico/pedidos?ids=a,b,c : o celular do cliente consulta de uma vez
// todos os pedidos que ele fez (no máximo 10), em vez de uma chamada por pedido.
const consultarPedidosSchema = z.object({
  ids: z
    .string({ required_error: 'Informe os pedidos.' })
    .transform((v) => v.split(',').map((x) => x.trim()).filter(Boolean))
    .pipe(
      z
        .array(objectId('Pedido inválido.'))
        .min(1, 'Informe os pedidos.')
        .max(10, 'Consulte no máximo 10 pedidos por vez.')
    ),
});

module.exports = { criarPedidoClienteSchema, recusarPedidoSchema, consultarPedidosSchema };
