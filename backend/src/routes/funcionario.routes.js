const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const ctrl = require('../controllers/funcionario.controller');

const router = Router();

// RF02 - restrito ao Administrador
router.use(autenticar, permitir('administrador'));

router.get('/', ctrl.listar);
router.post('/', ctrl.criar);
router.put('/:id', ctrl.atualizar);
router.delete('/:id', ctrl.desligar);

module.exports = router;
