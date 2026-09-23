import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axiosClient';

// RF03 - Gestão de Cardápio (CRUD)
export default function Cardapio() {
  const [categorias, setCategorias] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState(null);
  const [produtos, setProdutos] = useState([]);

  const carregarCategorias = useCallback(() => {
    api.get('/categorias').then((r) => {
      setCategorias(r.data);
      setCategoriaAtiva((atual) => atual ?? r.data[0]?._id ?? null);
    });
  }, []);

  const carregarProdutos = useCallback(() => {
    if (!categoriaAtiva) return;
    api.get('/produtos', { params: { categoria: categoriaAtiva } }).then((r) => setProdutos(r.data));
  }, [categoriaAtiva]);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  // NOVO: criar categoria
  const criarCategoria = async () => {
    const nome = window.prompt('Nome da nova categoria:');
    if (!nome?.trim()) return;

    try {
      const { data: novaCategoria } = await api.post('/categorias', { nome: nome.trim() });
      carregarCategorias();
      setCategoriaAtiva(novaCategoria._id);
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao criar categoria.');
    }
  };

  // NOVO: criar produto (na categoria selecionada)
  const criarProduto = async () => {
    if (!categoriaAtiva) {
      window.alert('Crie uma categoria antes de adicionar produtos.');
      return;
    }

    const nome = window.prompt('Nome do produto:');
    if (!nome?.trim()) return;

    const precoStr = window.prompt('Preço (ex: 25.90):');
    const preco = Number(precoStr);
    if (!precoStr || Number.isNaN(preco) || preco < 0) {
      window.alert('Preço inválido.');
      return;
    }

    const descricao = window.prompt('Descrição (opcional):') || '';

    try {
      await api.post('/produtos', {
        nome: nome.trim(),
        preco,
        descricao: descricao.trim(),
        categoria: categoriaAtiva,
      });
      carregarProdutos();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao criar produto.');
    }
  };

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Cardápio</h1>
          <p className="text-sm text-neutral-500">Gerencie os produtos e categorias do seu cardápio</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
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
        <button
          onClick={criarCategoria}
          className="rounded-md border border-dashed px-3 py-1 text-sm text-neutral-600"
        >
          + Categoria
        </button>
      </div>

      <div className="mb-3">
        <button
          onClick={criarProduto}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          + Adicionar Produto
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {produtos.map((p) => (
          <div key={p._id} className="rounded-lg border p-3">
            <p className="font-medium">{p.nome}</p>
            <p className="text-sm text-neutral-500">{p.descricao}</p>
            <p className="mt-2 font-semibold">R$ {p.preco?.toFixed(2)}</p>
          </div>
        ))}
        {!produtos.length && categoriaAtiva && (
          <p className="col-span-3 text-sm text-neutral-400">
            Nenhum produto nesta categoria ainda.
          </p>
        )}
      </div>
    </AdminLayout>
  );
}