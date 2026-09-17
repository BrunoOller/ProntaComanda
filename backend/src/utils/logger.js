const winston = require('winston');

/**
 * RNF10 - Tratamento Global de Falhas: logs de erro estruturados.
 * Em desenvolvimento também imprime no console; em produção, só JSON
 * (para agregadores de log consumirem).
 */
const isProd = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'pronta-comanda-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/erros.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combinado.log' }),
  ],
});

if (!isProd) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    })
  );
}

module.exports = logger;
