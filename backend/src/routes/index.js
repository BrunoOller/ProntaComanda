const { Router } = require('express');

const authRoutes = require('./auth.routes');
const funcionarioRoutes = require('./funcionario.routes');
const categoriaRoutes = require('./categoria.routes');
const produtoRoutes = require('./produto.routes');
const mesaRoutes = require('./mesa.routes');
const comandaRoutes = require('./comanda.routes');
const pagamentoRoutes = require('./pagamento.routes');
const estoqueRoutes = require('./estoque.routes');
const dashboardRoutes = require('./dashboard.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/funcionarios', funcionarioRoutes);
router.use('/categorias', categoriaRoutes);
router.use('/produtos', produtoRoutes);
router.use('/mesas', mesaRoutes);
router.use('/comandas', comandaRoutes);
router.use('/pagamentos', pagamentoRoutes);
router.use('/estoque', estoqueRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
