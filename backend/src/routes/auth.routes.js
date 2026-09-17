const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const { login, logout, me } = require('../controllers/auth.controller');

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', autenticar, me);

module.exports = router;
