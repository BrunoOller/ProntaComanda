const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler.middleware');

function criarApp() {
  const app = express();

  // RNF07 - segurança básica de headers. crossOriginResourcePolicy liberado
  // porque as fotos de produto (/uploads) precisam carregar no frontend,
  // que roda em outra origem (porta do Vite).
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Fotos de produto: pasta pública, servida como arquivo estático.
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
  app.use(
    cors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // Disponibiliza o socket.io (anexado via app.set('io', io) em server.js,
  // depois que o httpServer existe) para os controllers emitirem eventos
  // (RF05, RF22, RF04, RF26) sem precisar importar o módulo diretamente.
  app.use((req, res, next) => {
    req.io = app.get('io');
    next();
  });

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api', routes);

  // RNF10 - Tratamento Global de Falhas: sempre por último.
  app.use(errorHandler);

  return app;
}

module.exports = criarApp;
