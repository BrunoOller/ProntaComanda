const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { validarId } = require('../middlewares/validate.middleware');
const ctrl = require('../controllers/mesa.controller');
const { criarMesaSchema } = require('../schemas/mesa.schema');

const router = Router();

router.use(autenticar);

router.get('/', ctrl.listar);
router.post('/', permitir('administrador'), validate(criarMesaSchema), ctrl.criar);
router.delete('/:id', permitir('administrador'), validarId(), ctrl.remover);

router.post('/:id/abrir', permitir('garcom', 'caixa', 'administrador'), validarId(), ctrl.abrir);
router.patch(
  '/:id/solicitar-fechamento',
  permitir('garcom', 'caixa', 'administrador'),
  validarId(),
  ctrl.solicitarFechamento
);
router.patch('/:id/reabrir', permitir('administrador'), validarId(), ctrl.reabrir); // RF12

module.exports = router;
