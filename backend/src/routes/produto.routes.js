const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const ctrl = require('../controllers/produto.controller');

const router = Router();

router.get('/', autenticar, ctrl.listar);
router.post('/', autenticar, permitir('administrador'), ctrl.criar);
router.put('/:id', autenticar, permitir('administrador'), ctrl.atualizar);
router.delete('/:id', autenticar, permitir('administrador'), ctrl.inativar);

module.exports = router;
