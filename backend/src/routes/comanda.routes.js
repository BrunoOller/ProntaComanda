const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const ctrl = require('../controllers/comanda.controller');

const router = Router();

router.use(autenticar);

router.get('/mesa/:mesaId', ctrl.listarPorMesa);
router.post('/abrir', permitir('garcom', 'caixa', 'administrador'), ctrl.abrirComanda);
router.get('/produtos/:produtoId/sugestoes', ctrl.sugerirObservacoes); // RF21

// RF05 - tela da Cozinha/Bar
router.get('/kds', permitir('cozinha', 'bar', 'administrador'), ctrl.listarKDS);
router.patch(
  '/:comandaId/avancar-status',
  permitir('cozinha', 'bar', 'administrador'),
  ctrl.avancarStatusPedido
);

router.post(
  '/:comandaId/itens',
  permitir('garcom', 'caixa', 'administrador'),
  ctrl.adicionarItem
);

router.patch(
  '/:comandaId/itens/:itemId/status',
  permitir('cozinha', 'bar', 'administrador'),
  ctrl.atualizarStatusItem
);

// RF07/RF08 - estorno é ação sensível, restrita a quem fecha caixa/administra
router.patch(
  '/:comandaId/itens/:itemId/estornar',
  permitir('caixa', 'administrador'),
  ctrl.estornarItem
);

// RF09 - concessões financeiras restritas ao Administrador
router.patch('/:comandaId/desconto', permitir('administrador'), ctrl.aplicarDesconto);

// RF25
router.post(
  '/:comandaId/transferir',
  permitir('garcom', 'caixa', 'administrador'),
  ctrl.transferirItens
);

module.exports = router;
