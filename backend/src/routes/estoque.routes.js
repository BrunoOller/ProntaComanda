const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { validarId } = require('../middlewares/validate.middleware');
const ctrl = require('../controllers/estoque.controller');
const {
  criarInsumoSchema,
  atualizarInsumoSchema,
  movimentarEstoqueSchema,
  listarInsumosQuery,
} = require('../schemas/estoque.schema');

const router = Router();

// RF10 - restrito ao Administrador
router.use(autenticar, permitir('administrador'));

router.get('/', validate(listarInsumosQuery, 'query'), ctrl.listarInsumos);
router.get('/:id', validarId(), ctrl.obterInsumo);
router.get('/:id/movimentacoes', validarId(), ctrl.listarMovimentacoes);
router.post('/', validate(criarInsumoSchema), ctrl.cadastrarInsumo);
router.put('/:id', validarId(), validate(atualizarInsumoSchema), ctrl.atualizarInsumo);
router.patch('/:id/reativar', validarId(), ctrl.reativarInsumo);
router.delete('/:id', validarId(), ctrl.inativarInsumo);
router.post('/:id/movimentar', validarId(), validate(movimentarEstoqueSchema), ctrl.movimentar);

module.exports = router;
