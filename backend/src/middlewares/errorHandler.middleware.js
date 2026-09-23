const logger = require('../utils/logger');
const { LogAuditoria } = require('../models');

/**
 * Converte erros conhecidos (Mongo/Mongoose/body-parser) em respostas
 * HTTP amigáveis, em vez de deixá-los virar "500 erro inesperado".
 */
function traduzirErro(err) {
  // Violação de índice único (ex.: CPF ou e-mail já cadastrado)
  if (err.code === 11000) {
    const campo = Object.keys(err.keyPattern || err.keyValue || {})[0];
    const rotulos = { cpf: 'CPF', email: 'E-mail' };
    const rotulo = rotulos[campo] || 'Registro';
    return { status: 409, mensagem: `${rotulo} já cadastrado.`, campo };
  }

  // Validação do schema Mongoose
  if (err.name === 'ValidationError' && err.errors) {
    const detalhes = Object.fromEntries(
      Object.entries(err.errors).map(([campo, e]) => [campo, [e.message]])
    );
    return { status: 400, mensagem: 'Dados inválidos.', detalhes };
  }

  // ObjectId malformado etc.
  if (err.name === 'CastError') {
    return { status: 400, mensagem: 'Identificador ou valor inválido.' };
  }

  // JSON quebrado no body
  if (err.type === 'entity.parse.failed') {
    return { status: 400, mensagem: 'JSON inválido no corpo da requisição.' };
  }

  if (err.type === 'entity.too.large') {
    return { status: 413, mensagem: 'Requisição grande demais.' };
  }

  return null;
}

/**
 * RNF10 - Tratamento Global de Falhas
 * Captura qualquer erro não tratado (síncrono ou de Promise, via
 * asyncHandler), loga estruturado e devolve mensagem amigável ao cliente
 * -- nunca o stack trace cru.
 *
 * Erros do cliente (4xx) são logados como `warn` e NÃO poluem a coleção de
 * auditoria; só falhas reais (5xx) viram `erro_sistema`.
 */
// eslint-disable-next-line no-unused-vars
async function errorHandler(err, req, res, next) {
  const traduzido = traduzirErro(err);
  const status = traduzido?.status || err.statusCode || 500;
  const contexto = {
    path: req.originalUrl,
    method: req.method,
    funcionario: req.funcionario?._id,
  };

  if (status >= 500) {
    logger.error(err.message, { stack: err.stack, ...contexto });

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
  } else {
    logger.warn(err.message, { status, ...contexto });
  }

  if (res.headersSent) return;

  const mensagem =
    status >= 500
      ? 'Ocorreu um erro inesperado. Tente novamente em instantes.'
      : traduzido?.mensagem || err.message;

  res.status(status).json({
    erro: mensagem,
    ...(traduzido?.detalhes ? { detalhes: traduzido.detalhes } : {}),
    ...(traduzido?.campo ? { campo: traduzido.campo } : {}),
  });
}

module.exports = errorHandler;
