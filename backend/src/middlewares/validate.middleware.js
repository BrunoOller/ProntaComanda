const AppError = require('../utils/AppError');

/**
 * Middleware genérico de validação com Zod. Uso:
 *   router.post('/produtos', validate(produtoSchema), controller.criar)
 *   router.get('/produtos', validate(querySchema, 'query'), controller.listar)
 *
 * `origem` pode ser 'body' (padrão), 'query' ou 'params'. Os dados já
 * validados/normalizados substituem o original em req[origem].
 */
function validate(schema, origem = 'body') {
  return (req, res, next) => {
    const resultado = schema.safeParse(req[origem]);

    if (!resultado.success) {
      const { fieldErrors, formErrors } = resultado.error.flatten();
      return res.status(400).json({
        erro: 'Dados inválidos.',
        detalhes: fieldErrors,
        ...(formErrors.length ? { mensagens: formErrors } : {}),
      });
    }

    req[origem] = resultado.data;
    next();
  };
}

/** Garante que o parâmetro de rota é um ObjectId válido (24 hex) antes de ir ao banco. */
function validarId(param = 'id') {
  return (req, res, next) => {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params[param] || '')) {
      return next(new AppError('Identificador inválido.', 400));
    }
    next();
  };
}

module.exports = validate;
module.exports.validarId = validarId;
