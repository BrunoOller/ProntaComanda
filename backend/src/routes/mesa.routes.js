const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const ctrl = require('../controllers/mesa.controller');

const router = Router();

router.use(autenticar);

router.get('/', ctrl.listar);
router.post('/', permitir('administrador'), ctrl.criar);
router.delete('/:id', permitir('administrador'), ctrl.remover);

router.post('/:id/abrir', permitir('garcom', 'caixa', 'administrador'), ctrl.abrir);
router.patch(
  '/:id/solicitar-fechamento',
  permitir('garcom', 'caixa', 'administrador'),
  ctrl.solicitarFechamento
);
router.patch('/:id/reabrir', permitir('administrador'), ctrl.reabrir); // RF12

module.exports = router;
