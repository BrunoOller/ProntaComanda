import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * RF04/RF05/RF22/RF26 - conecta ao servidor de tempo real e entra na(s)
 * sala(s) relevante(s) para a tela atual (ex: 'cozinha', 'mapa-mesas').
 */
export function useSocket(salas = []) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io('/', { withCredentials: true });
    socketRef.current = socket;

    salas.forEach((sala) => socket.emit('entrar-sala', sala));

    return () => {
      salas.forEach((sala) => socket.emit('sair-sala', sala));
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salas.join(',')]);

  return socketRef;
}
