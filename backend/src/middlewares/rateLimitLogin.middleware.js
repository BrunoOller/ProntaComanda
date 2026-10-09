const rateLimit = require('express-rate-limit');

/**
 * RNF07 - limita tentativas de login por IP, pra dificultar força bruta de
 * senha. Conta só tentativas que FALHAM (login certo não consome o limite),
 * então um funcionário com a senha certa nunca é bloqueado por isso.
 */
const limitarTentativasLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});

module.exports = limitarTentativasLogin;
