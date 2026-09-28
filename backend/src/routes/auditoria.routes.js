const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const ctrl = require('../controllers/auditoria.controller');
const { listarAuditoriaQuery } = require('../schemas/auditoria.schema');

const router = Router();

// RF17 - relatórios de auditoria, restritos ao Administrador
router.use(autenticar, permitir('administrador'));

router.get('/', validate(listarAuditoriaQuery, 'query'), ctrl.listar);
router.get('/tipos', ctrl.listarTipos);

module.exports = router;
