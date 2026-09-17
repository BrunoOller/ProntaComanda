import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axiosClient';

// RF03 - Gestão de Cardápio (CRUD)
export default function Cardapio() {
  const [categorias, setCategorias] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState(null);
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    api.get('/categorias').then((r) => {
      setCategorias(r.data);
      setCategoriaAtiva(r.data[0]?._id);
    });
  }, []);

  useEffect(() => {
    if (!categoriaAtiva) return;
    api.get('/produtos', { params: { categoria: categoriaAtiva } }).then((r) => setProdutos(r.data));
  }, [categoriaAtiva]);

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Cardápio</h1>
          <p className="text-sm text-neutral-500">Gerencie os produtos e categorias do seu cardápio</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {categorias.map((c) => (
          <button
            key={c._id}
            onClick={() => setCategoriaAtiva(c._id)}
            className={`rounded-md px-3 py-1 text-sm ${
              categoriaAtiva === c._id ? 'bg-primary text-white' : 'border'
            }`}
          >
            {c.nome}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {produtos.map((p) => (
          <div key={p._id} className="rounded-lg border p-3">
            <p className="font-medium">{p.nome}</p>
            <p className="text-sm text-neutral-500">{p.descricao}</p>
            <p className="mt-2 font-semibold">R$ {p.preco?.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
