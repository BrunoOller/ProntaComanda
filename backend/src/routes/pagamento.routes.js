const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { validarId } = require('../middlewares/validate.middleware');
const ctrl = require('../controllers/pagamento.controller');
const { fecharPagamentoSchema } = require('../schemas/pagamento.schema');

const router = Router();

// RF11 - restrito ao Caixa/Administrador
router.post(
  '/mesa/:mesaId/fechar',
  autenticar,
  permitir('caixa', 'administrador'),
  validarId('mesaId'),
  validate(fecharPagamentoSchema),
  ctrl.fecharMesa
);

// RF11/RF24: fecha/paga uma comanda específica (divisão de conta)
router.post(
  '/comanda/:comandaId/fechar',
  autenticar,
  permitir('caixa', 'administrador'),
  validarId('comandaId'),
  validate(fecharPagamentoSchema),
  ctrl.fecharComanda
);

module.exports = router;
