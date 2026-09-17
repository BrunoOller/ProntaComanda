const logger = require('../utils/logger');
const { LogAuditoria } = require('../models');

/**
 * RNF10 - Tratamento Global de Falhas
 * Captura qualquer erro não tratado (síncrono ou de Promise, via
 * asyncHandler), loga estruturado e devolve mensagem amigável ao cliente
 * -- nunca o stack trace cru.
 */
// eslint-disable-next-line no-unused-vars
async function errorHandler(err, req, res, next) {
  logger.error(err.message, {
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    funcionario: req.funcionario?._id,
  });

  try {
    await LogAuditoria.create({
      tipo: 'erro_sistema',
      funcionario: req.funcionario?._id || null,
      entidade: req.originalUrl,
      detalhes: { mensagem: err.message, metodo: req.method },
    });
  } catch (_e) {
    // se o próprio log de auditoria falhar, não deixamos isso derrubar a resposta
  }

  const status = err.statusCode || 500;
  const mensagemPublica =
    status === 500 ? 'Ocorreu um erro inesperado. Tente novamente em instantes.' : err.message;

  res.status(status).json({ erro: mensagemPublica });
}

module.exports = errorHandler;
