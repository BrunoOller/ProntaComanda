/**
 * Erro de negócio com status HTTP. O errorHandler global (RNF10) já lê
 * `statusCode` e devolve `message` ao cliente quando o status não é 500.
 *
 * Uso: throw new AppError('Funcionário não encontrado.', 404);
 */
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
