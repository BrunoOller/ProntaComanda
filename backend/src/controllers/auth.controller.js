const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { Funcionario } = require('../models');

/**
 * RF01/RF02 - Autenticação de colaboradores.
 * RNF07 - Senha com hash (argon2), sessão via cookie httpOnly.
 */
const login = asyncHandler(async (req, res) => {
  const { cpf, senha } = req.body;

  const funcionario = await Funcionario.findOne({ cpf, ativo: true }).select('+senhaHash');
  if (!funcionario) {
    return res.status(401).json({ erro: 'CPF ou senha inválidos.' });
  }

  const senhaValida = await argon2.verify(funcionario.senhaHash, senha);
  if (!senhaValida) {
    return res.status(401).json({ erro: 'CPF ou senha inválidos.' });
  }

  const token = jwt.sign(
    { id: funcionario._id, perfil: funcionario.perfil },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  // RF18 - Sessão contínua no mobile: cookie httpOnly sobrevive a reload/fechar navegador.
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  });

  res.json({
    funcionario: {
      id: funcionario._id,
      nome: funcionario.nome,
      perfil: funcionario.perfil,
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.status(204).send();
});

const me = asyncHandler(async (req, res) => {
  res.json({ funcionario: req.funcionario });
});

module.exports = { login, logout, me };
