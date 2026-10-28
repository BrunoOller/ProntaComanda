import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axiosClient';
import { useSocket } from '../../hooks/useSocket';

const dinheiro = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;

function haQuantoTempo(iso, agora) {
  const min = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000));
  return min < 1 ? 'agora há pouco' : `há ${min} min`;
}

/**
 * Autoatendimento (garçom): fila de pedidos que clientes fizeram pelo QR code.
 * Chega em tempo real (socket 'pedidos-cliente'). O garçom confere no salão e
 * toca em Aceitar (mesa ocupada + itens vão para cozinha/bar) ou Recusar.
 */
export default function PedidosClientePendentes() {
  const [pedidos, setPedidos] = useState([]);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(null); // id do pedido em andamento
  const [recusando, setRecusando] = useState(null); // id do pedido com o campo de motivo aberto
  const [motivo, setMotivo] = useState('');
  const [agora, setAgora] = useState(Date.now());

  const socketRef = useSocket(['pedidos-cliente']);

  const carregar = useCallback(() => {
    api
      .get('/pedidos-cliente')
      .then((r) => setPedidos(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // "há 3 min" se mantém correto sem recarregar a lista
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const aoChegar = (pedido) => {
      setPedidos((atual) => (atual.some((p) => p._id === pedido._id) ? atual : [...atual, pedido]));
      navigator.vibrate?.(200);
    };
    const aoResolver = ({ _id }) => setPedidos((atual) => atual.filter((p) => p._id !== _id));

    socket.on('pedido-cliente:novo', aoChegar);
    socket.on('pedido-cliente:resolvido', aoResolver);
    // se a conexão caiu e voltou, busca de novo o que pode ter sido perdido
    socket.on('connect', carregar);

    return () => {
      socket.off('pedido-cliente:novo', aoChegar);
      socket.off('pedido-cliente:resolvido', aoResolver);
      socket.off('connect', carregar);
    };
  }, [socketRef, carregar]);

  const tratar = async (id, acao, corpo) => {
    setOcupado(id);
    setErro('');
    try {
      await api.post(`/pedidos-cliente/${id}/${acao}`, corpo);
      setPedidos((atual) => atual.filter((p) => p._id !== id));
      setRecusando(null);
      setMotivo('');
    } catch (e) {
      setErro(e.response?.data?.erro || 'Não foi possível concluir. Tente de novo.');
      // 409 = outro funcionário já tratou ou algo mudou: atualiza a fila
      if (e.response?.status === 409 || e.response?.status === 404) carregar();
    } finally {
      setOcupado(null);
    }
  };

  if (!pedidos.length && !erro) return null;

  return (
    <section className="mb-4 rounded-lg border-2 border-primary bg-orange-50 p-3">
      <h2 className="mb-2 text-sm font-semibold text-primary-dark">
        {pedidos.length === 1
          ? '1 pedido de cliente aguardando confirmação'
          : `${pedidos.length} pedidos de clientes aguardando confirmação`}
      </h2>

      {erro && <p className="mb-2 text-sm text-red-600">{erro}</p>}

      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {pedidos.map((p) => {
          const total = p.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
          return (
            <li key={p._id} className="flex flex-col rounded-md border bg-white p-3">
              <div className="flex items-baseline justify-between">
                <p className="font-semibold">
                  Mesa {String(p.mesa?.numero ?? '?').padStart(2, '0')}
                  {p.nomeCliente && (
                    <span className="ml-2 text-sm font-normal text-neutral-500">
                      {p.nomeCliente}
                    </span>
                  )}
                </p>
                <span className="text-xs text-neutral-400">{haQuantoTempo(p.createdAt, agora)}</span>
              </div>

              <ul className="my-2 text-sm">
                {p.itens.map((i, idx) => (
                  <li key={idx}>
                    {i.quantidade}× {i.nomeProduto}
                    {i.observacao && <span className="text-neutral-500"> — {i.observacao}</span>}
                  </li>
                ))}
              </ul>
              <p className="mb-3 text-xs text-neutral-500">Total: {dinheiro(total)}</p>

              {recusando === p._id ? (
                <div className="mt-auto space-y-2">
                  <input
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    maxLength={140}
                    placeholder="Motivo (opcional, o cliente vê)"
                    className="w-full rounded-md border px-3 py-1.5 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={ocupado === p._id}
                      onClick={() => tratar(p._id, 'recusar', { motivo: motivo.trim() || undefined })}
                      className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      Confirmar recusa
                    </button>
                    <button
                      onClick={() => {
                        setRecusando(null);
                        setMotivo('');
                      }}
                      className="rounded-md border px-3 py-2 text-sm"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-auto flex gap-2">
                  <button
                    disabled={ocupado === p._id}
                    onClick={() => tratar(p._id, 'aceitar')}
                    className="flex-1 rounded-md bg-green-600 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {ocupado === p._id ? 'Aguarde...' : 'Aceitar'}
                  </button>
                  <button
                    disabled={ocupado === p._id}
                    onClick={() => setRecusando(p._id)}
                    className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600"
                  >
                    Recusar
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
