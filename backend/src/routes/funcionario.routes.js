const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { validarId } = require('../middlewares/validate.middleware');
const ctrl = require('../controllers/funcionario.controller');
const {
  criarFuncionarioSchema,
  atualizarFuncionarioSchema,
  listarFuncionariosQuery,
} = require('../schemas/funcionario.schema');

const router = Router();

// RF02 - restrito ao Administrador
router.use(autenticar, permitir('administrador'));

router.get('/', validate(listarFuncionariosQuery, 'query'), ctrl.listar);
router.get('/:id', validarId(), ctrl.obter);
router.post('/', validate(criarFuncionarioSchema), ctrl.criar);
router.put('/:id', validarId(), validate(atualizarFuncionarioSchema), ctrl.atualizar);
router.patch('/:id/reativar', validarId(), ctrl.reativar);
router.delete('/:id', validarId(), ctrl.desligar);

module.exports = router;
