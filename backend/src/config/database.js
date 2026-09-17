const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * RNF06 - Escalabilidade de Infraestrutura: conexão desacoplada via
 * MONGO_URI, funciona tanto local (mongodb://localhost) quanto apontando
 * para um cluster gerenciado (Atlas) sem mudar código.
 */
async function connectDatabase() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI não definida no .env');
  }

  mongoose.connection.on('connected', () => {
    logger.info(`MongoDB conectado: ${mongoose.connection.name}`);
  });

  mongoose.connection.on('error', (err) => {
    logger.error('Erro de conexão com o MongoDB', { error: err.message });
  });

  await mongoose.connect(uri);
}

module.exports = connectDatabase;
