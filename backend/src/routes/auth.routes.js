const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { loginSchema } = require('../schemas/auth.schema');
const { login, logout, me } = require('../controllers/auth.controller');

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', autenticar, me);

module.exports = router;
