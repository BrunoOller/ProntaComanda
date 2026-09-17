const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const ctrl = require('../controllers/categoria.controller');

const router = Router();

// Leitura liberada para qualquer perfil autenticado (cardápio precisa disso
// no mobile e no admin); escrita restrita ao Administrador.
router.get('/', autenticar, ctrl.listar);
router.post('/', autenticar, permitir('administrador'), ctrl.criar);
router.put('/:id', autenticar, permitir('administrador'), ctrl.atualizar);
router.delete('/:id', autenticar, permitir('administrador'), ctrl.inativar);

module.exports = router;
