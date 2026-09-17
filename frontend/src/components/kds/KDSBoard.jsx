import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axiosClient';
import { useSocket } from '../../hooks/useSocket';

const FILTROS = [
  { chave: 'todos', label: 'Todos' },
  { chave: 'pendente', label: 'Novos' },
  { chave: 'em_preparo', label: 'Em preparo' },
  { chave: 'pronto', label: 'Prontos' },
];

const LABEL_STATUS = { pendente: 'NOVO', em_preparo: 'EM PREPARO', pronto: 'PRONTO' };
const LABEL_BOTAO = {
  pendente: 'Iniciar preparo',
  em_preparo: 'Marcar como pronto',
  pronto: 'Marcar como entregue',
};

/**
 * RF05/RF06 - Fluxo Operacional KDS + SLA (semáforo)
 *
 * Recebe `setor` ('cozinha' | 'bar') de fora porque este mesmo quadro é
 * usado em dois lugares: dentro do admin (`pages/admin/Cozinha.jsx`, com
 * sidebar, setor fixo) e na tela standalone (`pages/kds/PainelKDS.jsx`,
 * sem sidebar, setor conforme o perfil logado).
 */
export default function KDSBoard({ setor }) {
  const [filtro, setFiltro] = useState('todos');
  const [pedidos, setPedidos] = useState([]);
  const socketRef = useSocket([setor]);

  const carregar = useCallback(() => {
    api.get('/comandas/kds', { params: { setor } }).then((r) => setPedidos(r.data));
  }, [setor]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.on('kds:novo-item', carregar);
    socket.on('kds:status-atualizado', carregar);
    return () => {
      socket.off('kds:novo-item', carregar);
      socket.off('kds:status-atualizado', carregar);
    };
  }, [socketRef, carregar]);

  const avancarStatus = async (comandaId) => {
    await api.patch(`/comandas/${comandaId}/avancar-status`, null, { params: { setor } });
    carregar();
  };

  const pedidosFiltrados =
    filtro === 'todos' ? pedidos : pedidos.filter((p) => p.statusGeral === filtro);

  const contagem = (chave) =>
    chave === 'todos' ? pedidos.length : pedidos.filter((p) => p.statusGeral === chave).length;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.chave}
            onClick={() => setFiltro(f.chave)}
            className={`rounded-full px-3 py-1 text-sm ${
              filtro === f.chave ? 'bg-primary text-white' : 'border'
            }`}
          >
            {f.label} {contagem(f.chave)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {pedidosFiltrados.map((pedido) => (
          <CardPedido key={pedido.comandaId} pedido={pedido} onAvancar={avancarStatus} />
        ))}
        {!pedidosFiltrados.length && (
          <p className="col-span-3 text-sm text-neutral-400">Nenhum pedido por aqui agora.</p>
        )}
      </div>
    </div>
  );
}

function CardPedido({ pedido, onAvancar }) {
  const [tempoDecorrido, setTempoDecorrido] = useState('');

  useEffect(() => {
    const calcular = () => {
      const minutos = Math.floor((Date.now() - new Date(pedido.lancadoEm)) / 60000);
      setTempoDecorrido(
        `Há ${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
      );
    };
    calcular();
    const id = setInterval(calcular, 30000);
    return () => clearInterval(id);
  }, [pedido.lancadoEm]);

  const minutosDecorridos = (Date.now() - new Date(pedido.lancadoEm)) / 60000;
  // Semáforo simples: verde até 10min, amarelo até 20min, vermelho depois (RF06)
  const corBadge =
    minutosDecorridos > 20
      ? 'text-red-600'
      : minutosDecorridos > 10
        ? 'text-yellow-600'
        : 'text-orange-600';

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold">#{pedido.numeroComanda}</p>
        <span className={`text-xs font-medium ${corBadge}`}>{tempoDecorrido}</span>
      </div>
      <p className="text-xs text-neutral-500">
        Mesa {String(pedido.mesa?.numero ?? '--').padStart(2, '0')}
      </p>

      <ul className="my-2 space-y-1 text-sm">
        {pedido.itens.map((item) => (
          <li key={item.itemId}>
            {item.quantidade}x {item.nomeProduto}
            {item.observacao && (
              <span className="block text-xs text-neutral-500">• {item.observacao}</span>
            )}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${corBadge}`}>
          {LABEL_STATUS[pedido.statusGeral]}
        </span>
        <button
          onClick={() => onAvancar(pedido.comandaId)}
          className="rounded-md bg-orange-500 px-3 py-1 text-sm text-white"
        >
          {LABEL_BOTAO[pedido.statusGeral]}
        </button>
      </div>
    </div>
  );
}
