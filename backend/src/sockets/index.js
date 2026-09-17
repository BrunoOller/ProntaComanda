const { Server } = require('socket.io');

/**
 * RF05  - KDS recebe pedidos automaticamente (salas 'cozinha' / 'bar')
 * RF22  - Alerta de ruptura em tempo real (broadcast geral)
 * RF04  - Mapa de mesas atualizado ao vivo (sala 'mapa-mesas')
 * RF26  - Sinalização ao caixa quando mesa pede fechamento (sala 'caixa')
 */
function configurarSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true },
  });

  io.on('connection', (socket) => {
    // O cliente entra na(s) sala(s) relevante(s) ao seu perfil/tela.
    socket.on('entrar-sala', (sala) => socket.join(sala));
    socket.on('sair-sala', (sala) => socket.leave(sala));
  });

  return io;
}

module.exports = configurarSockets;
