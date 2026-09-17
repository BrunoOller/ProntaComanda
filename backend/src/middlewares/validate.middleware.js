/**
 * Middleware genérico de validação com Zod. Uso:
 * router.post('/produtos', validate(produtoSchema), controller.criar)
 */
function validate(schema) {
  return (req, res, next) => {
    const resultado = schema.safeParse(req.body);

    if (!resultado.success) {
      return res.status(400).json({
        erro: 'Dados inválidos.',
        detalhes: resultado.error.flatten().fieldErrors,
      });
    }

    req.body = resultado.data;
    next();
  };
}

module.exports = validate;
