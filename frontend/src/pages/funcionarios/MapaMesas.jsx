import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';

const ESTILO_STATUS = {
  livre: { borda: 'border-green-500', rotulo: 'Livre', badge: 'bg-green-100 text-green-700' },
  ocupada: {
    borda: 'border-orange-500',
    rotulo: 'Ocupada',
    badge: 'bg-orange-100 text-orange-700',
  },
  aguardando_fechamento: {
    borda: 'border-yellow-500',
    rotulo: 'Aguardando fechamento',
    badge: 'bg-yellow-100 text-yellow-700',
  },
};

// RF19/RF20 - Header contextual + seleção de mesa touch-friendly (mobile)
export default function MapaMesas() {
  const [mesas, setMesas] = useState([]);
  const { funcionario, logout } = useAuthStore();
  const navigate = useNavigate();

  // RF04 - mapa em tempo real: entra na sala 'mapa-mesas' e atualiza a mesa
  // específica quando o caixa fecha/reabre, ou outro garçom abre uma mesa.
  const socketRef = useSocket(['mapa-mesas']);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const aoConectar = () => setConectado(true);
    const aoDesconectar = () => setConectado(false);
    const aoAtualizarMesa = (mesaAtualizada) => {
      setMesas((atual) => atual.map((m) => (m._id === mesaAtualizada._id ? mesaAtualizada : m)));
    };

    socket.on('connect', aoConectar);
    socket.on('disconnect', aoDesconectar);
    socket.on('mesa:atualizada', aoAtualizarMesa);
    setConectado(socket.connected);

    return () => {
      socket.off('connect', aoConectar);
      socket.off('disconnect', aoDesconectar);
      socket.off('mesa:atualizada', aoAtualizarMesa);
    };
  }, [socketRef]);

  useEffect(() => {
    api.get('/mesas').then((r) => setMesas(r.data));
  }, []);

  const abrirMesa = async (mesa) => {
    if (mesa.status === 'livre') {
      await api.post(`/mesas/${mesa._id}/abrir`);
    }
    navigate(`/funcionarios/mesa/${mesa._id}`);
  };

  return (
    <div className="min-h-screen p-4">
      {/* RF19 - nome do funcionário, status da conexão e logout */}
      <header className="mb-4 flex items-center justify-between border-b pb-2">
        <span className="text-sm font-medium">{funcionario?.nome}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-neutral-500">
            <span
              className={`h-2 w-2 rounded-full ${conectado ? 'bg-green-500' : 'bg-neutral-400'}`}
            />
            {conectado ? 'Conectado' : 'Reconectando...'}
          </span>
          <button onClick={logout} className="text-sm text-red-600">
            Sair
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {mesas.map((mesa) => {
          const estilo = ESTILO_STATUS[mesa.status] ?? ESTILO_STATUS.ocupada;
          return (
            <button
              key={mesa._id}
              onClick={() => abrirMesa(mesa)}
              className={`rounded-lg border-2 p-6 text-center ${estilo.borda}`}
            >
              <p className="text-2xl font-bold">{String(mesa.numero).padStart(2, '0')}</p>
              <p className="text-sm text-neutral-500">Mesa</p>
              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${estilo.badge}`}
              >
                {estilo.rotulo}
              </span>
            </button>
          );
        })}
        {!mesas.length && (
          <p className="col-span-2 py-8 text-center text-sm text-neutral-400">
            Nenhuma mesa cadastrada ainda.
          </p>
        )}
      </div>
    </div>
  );
}
