const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const ctrl = require('../controllers/cardapio.controller');
const { cardapioQuery } = require('../schemas/produto.schema');

const router = Router();

// Qualquer perfil autenticado pode ver o cardápio.
router.get('/', autenticar, validate(cardapioQuery, 'query'), ctrl.cardapio);

module.exports = router;
