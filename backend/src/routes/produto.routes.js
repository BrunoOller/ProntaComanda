const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { validarId } = require('../middlewares/validate.middleware');
const ctrl = require('../controllers/produto.controller');
const {
  criarProdutoSchema,
  atualizarProdutoSchema,
  disponibilidadeSchema,
  listarProdutosQuery,
} = require('../schemas/produto.schema');

const router = Router();

// Leitura liberada para qualquer perfil autenticado; escrita só do Administrador.
router.get('/', autenticar, validate(listarProdutosQuery, 'query'), ctrl.listar);
router.get('/:id', autenticar, validarId(), ctrl.obter);

const admin = [autenticar, permitir('administrador')];
router.post('/', ...admin, validate(criarProdutoSchema), ctrl.criar);
router.put('/:id', ...admin, validarId(), validate(atualizarProdutoSchema), ctrl.atualizar);
router.patch(
  '/:id/disponibilidade',
  ...admin,
  validarId(),
  validate(disponibilidadeSchema),
  ctrl.alterarDisponibilidade
);
router.patch('/:id/reativar', ...admin, validarId(), ctrl.reativar);
router.delete('/:id', ...admin, validarId(), ctrl.inativar);

module.exports = router;
