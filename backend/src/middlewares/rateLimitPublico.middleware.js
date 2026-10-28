const rateLimit = require('express-rate-limit');

/**
 * Autoatendimento - limites das rotas PÚBLICAS (sem login), por IP.
 *
 * Os números são generosos de propósito: num restaurante com Wi-Fi do
 * próprio local todos os celulares podem sair com o mesmo IP. A proteção
 * principal contra pedido em excesso é o limite de pendentes por mesa
 * (publico.controller.js); estes limites só seguram automação/abuso.
 */
const limitarEnvioPedidos = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitos pedidos em pouco tempo. Aguarde alguns minutos ou chame um garçom.' },
});

const limitarLeituraPublica = rateLimit({
  windowMs: 60 * 1000, // 1 minuto (o cliente consulta o status do pedido a cada poucos segundos)
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas requisições. Tente novamente em instantes.' },
});

module.exports = { limitarEnvioPedidos, limitarLeituraPublica };
