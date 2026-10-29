const { Router } = require('express');
const validate = require('../middlewares/validate.middleware');
const { validarId } = require('../middlewares/validate.middleware');
const {
  limitarEnvioPedidos,
  limitarLeituraPublica,
} = require('../middlewares/rateLimitPublico.middleware');
const ctrl = require('../controllers/publico.controller');
const {
  criarPedidoClienteSchema,
  consultarPedidosSchema,
} = require('../schemas/pedidoCliente.schema');

const router = Router();

// PÚBLICO (sem login): autoatendimento do cliente. Fica de propósito num
// arquivo à parte das rotas autenticadas, com limite de requisições por IP.
router.get('/mesas', limitarLeituraPublica, ctrl.listarMesas);
router.post('/pedidos', limitarEnvioPedidos, validate(criarPedidoClienteSchema), ctrl.criarPedido);
router.get(
  '/pedidos',
  limitarLeituraPublica,
  validate(consultarPedidosSchema, 'query'),
  ctrl.consultarPedidos
);
router.get(
  '/acompanhamento',
  limitarLeituraPublica,
  validate(consultarPedidosSchema, 'query'),
  ctrl.consultarAcompanhamento
);
router.get('/pedidos/:id', limitarLeituraPublica, validarId(), ctrl.consultarPedido);

module.exports = router;
