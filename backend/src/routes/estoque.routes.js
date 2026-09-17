const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const ctrl = require('../controllers/estoque.controller');

const router = Router();

// RF10 - restrito ao Administrador
router.use(autenticar, permitir('administrador'));

router.get('/', ctrl.listarInsumos);
router.post('/', ctrl.cadastrarInsumo);
router.post('/:insumoId/movimentar', ctrl.movimentar);

module.exports = router;
