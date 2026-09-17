/**
 * RF01 - Controle de Acesso por Perfis (RBAC)
 *
 * Uso: router.post('/produtos', autenticar, permitir('administrador'), ...)
 * Deve ser usado SEMPRE depois do middleware de autenticação, que preenche
 * req.funcionario.perfil.
 */
function permitir(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.funcionario) {
      return res.status(401).json({ erro: 'Não autenticado.' });
    }

    if (!perfisPermitidos.includes(req.funcionario.perfil)) {
      return res.status(403).json({ erro: 'Você não tem permissão para esta ação.' });
    }

    next();
  };
}

module.exports = permitir;
