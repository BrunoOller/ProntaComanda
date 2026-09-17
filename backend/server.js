require('dotenv').config();
const http = require('http');

const criarApp = require('./src/app');
const connectDatabase = require('./src/config/database');
const configurarSockets = require('./src/sockets');
const { agendarRollupMensal } = require('./src/jobs/rollupMensal.job');
const logger = require('./src/utils/logger');

async function iniciar() {
  await connectDatabase();

  const app = criarApp();
  const httpServer = http.createServer(app);

  const io = configurarSockets(httpServer);
  app.set('io', io); // ver src/app.js - middleware lê daqui em cada requisição

  agendarRollupMensal(); // RF14/RF15/RF16

  const PORT = process.env.PORT || 3333;
  httpServer.listen(PORT, () => {
    logger.info(`Pronta Comanda API rodando na porta ${PORT}`);
  });
}

iniciar().catch((err) => {
  console.error('Falha ao iniciar o servidor:', err);
  process.exit(1);
});
