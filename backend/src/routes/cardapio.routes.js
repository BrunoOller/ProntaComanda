const { Router } = require('express');
const validate = require('../middlewares/validate.middleware');
const ctrl = require('../controllers/cardapio.controller');
const { cardapioQuery } = require('../schemas/produto.schema');

const router = Router();

// Público: é o cardápio que o cliente vê na home, sem precisar logar.
// Só devolve categorias/produtos ativos (ver cardapio.controller.js), então
// nada sensível escapa por aqui.
router.get('/', validate(cardapioQuery, 'query'), ctrl.cardapio);

module.exports = router;
