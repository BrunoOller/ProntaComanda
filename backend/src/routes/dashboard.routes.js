const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const ctrl = require('../controllers/dashboard.controller');
const { periodoQuery } = require('../schemas/dashboard.schema');

const router = Router();

// RF17 - restrito ao Administrador
router.use(autenticar, permitir('administrador'));

router.get('/visao-geral', validate(periodoQuery, 'query'), ctrl.visaoGeral);
router.get('/faturamento-mensal', ctrl.faturamentoMensal);
router.get('/status-pedidos', validate(periodoQuery, 'query'), ctrl.statusPedidos);
router.get('/top-produtos', validate(periodoQuery, 'query'), ctrl.topProdutos);

module.exports = router;
