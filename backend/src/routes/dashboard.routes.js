const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const ctrl = require('../controllers/dashboard.controller');

const router = Router();

// RF17 - restrito ao Administrador
router.use(autenticar, permitir('administrador'));

router.get('/visao-geral', ctrl.visaoGeral);
router.get('/top-produtos', ctrl.topProdutos);

module.exports = router;
