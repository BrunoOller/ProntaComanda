const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { validarId } = require('../middlewares/validate.middleware');
const ctrl = require('../controllers/categoria.controller');
const {
  criarCategoriaSchema,
  atualizarCategoriaSchema,
  listarCategoriasQuery,
} = require('../schemas/categoria.schema');

const router = Router();

// Leitura liberada para qualquer perfil autenticado (o cardápio precisa
// disso no mobile e no admin); escrita restrita ao Administrador.
router.get('/', autenticar, validate(listarCategoriasQuery, 'query'), ctrl.listar);
router.get('/:id', autenticar, validarId(), ctrl.obter);

router.post('/', autenticar, permitir('administrador'), validate(criarCategoriaSchema), ctrl.criar);
router.put(
  '/:id',
  autenticar,
  permitir('administrador'),
  validarId(),
  validate(atualizarCategoriaSchema),
  ctrl.atualizar
);
router.patch('/:id/reativar', autenticar, permitir('administrador'), validarId(), ctrl.reativar);
router.delete('/:id', autenticar, permitir('administrador'), validarId(), ctrl.inativar);

module.exports = router;
