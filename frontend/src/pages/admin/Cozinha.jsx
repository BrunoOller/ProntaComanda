import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axiosClient';
import { useSocket } from '../../hooks/useSocket';

// RF05/RF06 - Fluxo Operacional KDS + SLA (semáforo)
export default function Cozinha() {
  const [filtro, setFiltro] = useState('todos');
  const [comandas, setComandas] = useState([]);
  const socketRef = useSocket(['cozinha']);

  useEffect(() => {
    // endpoint de listagem de itens pendentes/em preparo ainda a implementar
    // (ex: GET /api/comandas/kds?setor=cozinha)
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.on('kds:novo-item', () => {
      // recarregar lista ou inserir item na tela otimisticamente
    });
  }, [socketRef]);

  const marcarComoPronto = async (comandaId, itemId) => {
    await api.patch(`/comandas/${comandaId}/itens/${itemId}/status`, { status: 'pronto' });
  };

  return (
    <AdminLayout>
      <h1 className="text-lg font-semibold">Cozinha</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Acompanhe e organize os pedidos em preparo em tempo real
      </p>

      <div className="mb-4 flex gap-2">
        {['todos', 'novos', 'em_preparo', 'prontos'].map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-full px-3 py-1 text-sm ${
              filtro === f ? 'bg-primary text-white' : 'border'
            }`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {comandas.map((c) => (
          <div key={c._id} className="rounded-lg border p-3">
            {/* RF06 - cor do card muda conforme o tempo decorrido (semáforo) */}
            <p className="font-semibold text-orange-600">#{c.numero}</p>
            <button
              onClick={() => marcarComoPronto(c.comandaId, c.itemId)}
              className="mt-2 w-full rounded-md bg-orange-500 py-1 text-sm text-white"
            >
              Marcar como pronto
            </button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
