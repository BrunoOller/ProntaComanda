import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axiosClient';

// RF21/RF23/RF24 - Cardápio digital, espelho de consumo e divisão de conta
export default function Mesa() {
  const { mesaId } = useParams();
  const [comandas, setComandas] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);

  useEffect(() => {
    api.get(`/comandas/mesa/${mesaId}`).then((r) => setComandas(r.data));
    api.get('/produtos').then((r) => setProdutos(r.data));
  }, [mesaId]);

  const adicionarAoCarrinho = (produto) => setCarrinho((c) => [...c, produto]);

  const lancarPedido = async (comandaId) => {
    for (const produto of carrinho) {
      await api.post(`/comandas/${comandaId}/itens`, { produtoId: produto._id });
    }
    setCarrinho([]);
  };

  // RF26 - Solicitação de Encerramento
  const solicitarFechamento = () => api.patch(`/mesas/${mesaId}/solicitar-fechamento`);

  return (
    <div className="min-h-screen p-4">
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {[...new Set(produtos.map((p) => p.categoria?.nome))].map((nome) => (
          <button
            key={nome}
            onClick={() => setCategoriaAtiva(nome)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
              categoriaAtiva === nome ? 'bg-primary text-white' : 'border'
            }`}
          >
            {nome}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {produtos
          .filter((p) => !categoriaAtiva || p.categoria?.nome === categoriaAtiva)
          .map((produto) => (
            <div key={produto._id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{produto.nome}</p>
                <p className="text-xs text-neutral-500">
                  {produto.ingredientes?.join(' ')}
                </p>
                <p className="mt-1 font-semibold">R$ {produto.preco?.toFixed(2)}</p>
              </div>
              <button
                onClick={() => adicionarAoCarrinho(produto)}
                disabled={!produto.disponivel}
                className="rounded-md bg-primary px-3 py-1 text-sm text-white disabled:opacity-40"
              >
                Adicionar
              </button>
            </div>
          ))}
      </div>

      {/* Espelho de consumo (RF23) */}
      <div className="mt-6 border-t pt-4">
        <h2 className="mb-2 text-sm font-semibold">Comandas da mesa</h2>
        {comandas.map((c) => (
          <div key={c._id} className="mb-2 rounded-lg border p-3 text-sm">
            <p className="font-medium">Comanda #{c.numero}</p>
            {c.itens.map((item) => (
              <p key={item._id}>
                {item.quantidade}x {item.nomeProduto} — {item.statusKDS}
              </p>
            ))}
            <button
              onClick={() => lancarPedido(c._id)}
              className="mt-2 w-full rounded-md bg-neutral-900 py-1 text-white"
            >
              Enviar carrinho para esta comanda ({carrinho.length})
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={solicitarFechamento}
        className="mt-4 w-full rounded-md bg-red-600 py-2 text-white"
      >
        Solicitar encerramento
      </button>
    </div>
  );
}
