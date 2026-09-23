const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const ctrl = require('../controllers/pagamento.controller');

const router = Router();

// RF11 - restrito ao Caixa/Administrador
router.post(
  '/mesa/:mesaId/fechar',
  autenticar,
  permitir('caixa', 'administrador'),
  ctrl.fecharMesa
);

// NOVO - RF11/RF24: fecha/paga uma comanda específica (divisão de conta)
router.post(
  '/comanda/:comandaId/fechar',
  autenticar,
  permitir('caixa', 'administrador'),
  ctrl.fecharComanda
);

module.exports = router;