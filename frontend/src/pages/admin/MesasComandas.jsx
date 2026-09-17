import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axiosClient';
import { useSocket } from '../../hooks/useSocket';

// RF04 - Mapa de Mesas Geral / painel "MESA 00" com comandas e fechamento
export default function MesasComandas() {
  const [mesas, setMesas] = useState([]);
  const [mesaSelecionada, setMesaSelecionada] = useState(null);
  const socketRef = useSocket(['mapa-mesas']);

  useEffect(() => {
    api.get('/mesas').then((r) => setMesas(r.data));
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.on('mesa:atualizada', (mesaAtualizada) => {
      setMesas((atual) =>
        atual.map((m) => (m._id === mesaAtualizada._id ? mesaAtualizada : m))
      );
    });
  }, [socketRef]);

  // RF04 - verde = livre, vermelho = ocupada/atenção (RNF03)
  const corBorda = (status) =>
    status === 'livre' ? 'border-green-500' : 'border-red-500';

  return (
    <AdminLayout>
      <h1 className="text-lg font-semibold">Mesas e Comandas</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Acompanhe suas mesas e gerencie os pedidos em atendimento
      </p>

      <div className="grid grid-cols-4 gap-4">
        {mesas.map((mesa) => (
          <button
            key={mesa._id}
            onClick={() => setMesaSelecionada(mesa)}
            className={`rounded-lg border-2 p-4 text-center ${corBorda(mesa.status)}`}
          >
            <p className="text-2xl font-bold">{String(mesa.numero).padStart(2, '0')}</p>
            <p className="text-sm">Mesa</p>
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">
          + Adicionar Mesa
        </button>
        <button className="rounded-md bg-red-600 px-4 py-2 text-sm text-white">Remover</button>
      </div>

      {/* Painel de detalhe da mesa selecionada — comandas, itens, desconto,
          total e fechamento (RF07-RF11) seguem a mesma lógica do design;
          extraído para um componente próprio quando a tela crescer. */}
      {mesaSelecionada && (
        <p className="mt-6 text-sm text-neutral-500">
          Detalhe da Mesa {mesaSelecionada.numero} — implementar painel de
          comandas (ver backend/src/controllers/comanda.controller.js).
        </p>
      )}
    </AdminLayout>
  );
}
