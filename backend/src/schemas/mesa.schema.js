const { z } = require('zod');

/**
 * RF04 - Mapa de Mesas Geral (cadastro do número de mesas do salão)
 */
const numero = z
  .number({
    required_error: 'Número da mesa é obrigatório.',
    invalid_type_error: 'Número da mesa deve ser um número.',
  })
  .int('Número da mesa deve ser um número inteiro.')
  .positive('Número da mesa deve ser maior que zero.')
  .max(999, 'Número de mesa muito alto.');

const criarMesaSchema = z.object({ numero });

module.exports = { criarMesaSchema };
