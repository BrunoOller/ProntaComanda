const jwt = require('jsonwebtoken');
const { Funcionario } = require('../models');

/**
 * RF01 - Controle de Acesso por Perfis (RBAC)
 * RNF07 - Rotas da API protegidas por autenticação validada
 *
 * Lê o JWT do cookie httpOnly (preferido) ou do header Authorization,
 * valida e anexa o funcionário autenticado em req.funcionario. Toda rota
 * protegida passa por aqui ANTES do middleware de RBAC (rbac.middleware.js),
 * independente de a requisição vir do Desktop ou do Mobile.
 */
async function autenticar(req, res, next) {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return res.status(401).json({ erro: 'Não autenticado.' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const funcionario = await Funcionario.findById(payload.id).select('-senhaHash');
    if (!funcionario || !funcionario.ativo) {
      return res.status(401).json({ erro: 'Sessão inválida.' });
    }

    req.funcionario = funcionario;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

module.exports = autenticar;
