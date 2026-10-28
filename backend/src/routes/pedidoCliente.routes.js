const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { validarId } = require('../middlewares/validate.middleware');
const ctrl = require('../controllers/pedidoCliente.controller');
const { recusarPedidoSchema } = require('../schemas/pedidoCliente.schema');

const router = Router();

// Quem confere o pedido no salão: garçom (ou caixa/admin).
router.use(autenticar, permitir('garcom', 'caixa', 'administrador'));

router.get('/', ctrl.listarPendentes);
router.post('/:id/aceitar', validarId(), ctrl.aceitar);
router.post('/:id/recusar', validarId(), validate(recusarPedidoSchema), ctrl.recusar);

module.exports = router;
