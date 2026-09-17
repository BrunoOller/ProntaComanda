import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axiosClient';

// RF17 - Dashboard de Gestão (BI)
export default function Dashboard() {
  const [visaoGeral, setVisaoGeral] = useState(null);
  const [topProdutos, setTopProdutos] = useState([]);

  useEffect(() => {
    api.get('/dashboard/visao-geral').then((r) => setVisaoGeral(r.data));
    api.get('/dashboard/top-produtos').then((r) => setTopProdutos(r.data));
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-lg font-semibold">Dashboard</h1>
      <p className="text-sm text-neutral-500">Visão geral do seu negócio em tempo real</p>

      <div className="mt-6 grid grid-cols-4 gap-4">
        <Cartao titulo="Ganho Total" valor={visaoGeral?.ganhoTotal} prefixo="R$ " />
        <Cartao titulo="Total de Pedidos" valor={visaoGeral?.totalPedidos} />
        <Cartao titulo="Pedidos Cancelados" valor={visaoGeral?.pedidosCancelados} />
        <Cartao titulo="Taxa de Conversão" valor={visaoGeral?.taxaConversao} sufixo="%" />
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-sm font-semibold">Top 5 produtos</h2>
        <ol className="space-y-1 text-sm">
          {topProdutos.map((p, i) => (
            <li key={p._id}>
              {i + 1}. {p._id} — {p.quantidade}x
            </li>
          ))}
        </ol>
      </div>
    </AdminLayout>
  );
}

function Cartao({ titulo, valor, prefixo = '', sufixo = '' }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-neutral-500">{titulo}</p>
      <p className="text-xl font-semibold">
        {valor != null ? `${prefixo}${valor}${sufixo}` : '—'}
      </p>
    </div>
  );
}
