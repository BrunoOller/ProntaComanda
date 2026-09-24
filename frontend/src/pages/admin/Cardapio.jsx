import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axiosClient';

// "Todos" é uma aba virtual da tela (não existe no banco): mostra o cardápio
// inteiro agrupado por categoria, via GET /cardapio.
const TODOS = 'todos';

// Aceita "25.90" e "25,90" (o jeito natural de digitar no Brasil).
const lerPreco = (texto) => Number(String(texto).trim().replace(',', '.'));

// "cozinha" | "bar" (ignora maiúsculas/espaços); null se for inválido.
const lerSetor = (texto) => {
  const t = String(texto).trim().toLowerCase();
  return t === 'cozinha' || t === 'bar' ? t : null;
};

// Vazio = sem tempo definido (null). Senão, inteiro de 1 a 240; NaN se for inválido.
const lerTempo = (texto) => {
  const t = String(texto).trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 1 && n <= 240 ? n : NaN;
};

// RF03 - Gestão de Cardápio (CRUD)
export default function Cardapio() {
  const [categorias, setCategorias] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState(TODOS);
  const [produtos, setProdutos] = useState([]); // aba de uma categoria
  const [grupos, setGrupos] = useState([]); // aba "Todos": [{ nome, produtos }]

  const carregarCategorias = useCallback(() => {
    api.get('/categorias').then((r) => setCategorias(r.data));
  }, []);

  const carregarProdutos = useCallback(() => {
    if (categoriaAtiva === TODOS) {
      api.get('/cardapio').then((r) => setGrupos(r.data));
    } else {
      api
        .get('/produtos', { params: { categoria: categoriaAtiva } })
        .then((r) => setProdutos(r.data));
    }
  }, [categoriaAtiva]);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  const categoriaSelecionada = categorias.find((c) => c._id === categoriaAtiva);

  // ---------- categorias ----------
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

  const editarCategoria = async () => {
    if (!categoriaSelecionada) return;

    const nome = window.prompt('Novo nome da categoria:', categoriaSelecionada.nome);
    if (nome === null || !nome.trim() || nome.trim() === categoriaSelecionada.nome) return;

    try {
      await api.put(`/categorias/${categoriaSelecionada._id}`, { nome: nome.trim() });
      carregarCategorias();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao editar categoria.');
    }
  };

  // RNF11 - "remover" é inativar: a categoria sai do cardápio, mas não é apagada do banco.
  // O backend recusa se ainda houver produtos ativos nela e explica o motivo.
  const removerCategoria = async () => {
    if (!categoriaSelecionada) return;
    if (!window.confirm(`Remover a categoria "${categoriaSelecionada.nome}"?`)) return;

    try {
      await api.delete(`/categorias/${categoriaSelecionada._id}`);
      setCategoriaAtiva(TODOS);
      carregarCategorias();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao remover categoria.');
    }
  };

  // ---------- produtos ----------
  const criarProduto = async () => {
    if (!categorias.length) {
      window.alert('Crie uma categoria antes de adicionar produtos.');
      return;
    }
    if (categoriaAtiva === TODOS) {
      window.alert('Selecione uma categoria para adicionar o produto.');
      return;
    }

    const nome = window.prompt('Nome do produto:');
    if (!nome?.trim()) return;

    const precoStr = window.prompt('Preço (ex: 25,90):');
    if (precoStr === null) return;
    const preco = lerPreco(precoStr);
    if (!precoStr.trim() || Number.isNaN(preco) || preco <= 0) {
      window.alert('Preço inválido.');
      return;
    }

    const descricao = window.prompt('Descrição (opcional):') || '';

    // RF05 - define para qual tela o item vai (cozinha ou bar)
    const setorStr = window.prompt('Setor de preparo (cozinha ou bar):', 'cozinha');
    if (setorStr === null) return;
    const setor = lerSetor(setorStr);
    if (!setor) {
      window.alert('Setor inválido. Digite "cozinha" ou "bar".');
      return;
    }

    // RF06 - tempo esperado de preparo (base do semáforo do KDS)
    const tempoStr = window.prompt('Tempo de preparo em minutos (opcional):', '');
    if (tempoStr === null) return;
    const tempo = lerTempo(tempoStr);
    if (Number.isNaN(tempo)) {
      window.alert('Tempo inválido. Use um número inteiro de 1 a 240 minutos.');
      return;
    }

    try {
      await api.post('/produtos', {
        nome: nome.trim(),
        preco,
        descricao: descricao.trim(),
        categoria: categoriaAtiva,
        setor,
        ...(tempo !== null && { tempoPreparoMinutos: tempo }),
      });
      carregarProdutos();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao criar produto.');
    }
  };

  // Cancelar em qualquer pergunta aborta a edição sem alterar nada.
  const editarProduto = async (p) => {
    const nome = window.prompt('Nome do produto:', p.nome);
    if (nome === null) return;
    if (!nome.trim()) {
      window.alert('O nome não pode ficar vazio.');
      return;
    }

    const precoStr = window.prompt('Preço (ex: 25,90):', String(p.preco).replace('.', ','));
    if (precoStr === null) return;
    const preco = lerPreco(precoStr);
    if (!precoStr.trim() || Number.isNaN(preco) || preco <= 0) {
      window.alert('Preço inválido.');
      return;
    }

    const descricao = window.prompt('Descrição (deixe vazio para apagar):', p.descricao ?? '');
    if (descricao === null) return;

    const setorStr = window.prompt('Setor de preparo (cozinha ou bar):', p.setor ?? 'cozinha');
    if (setorStr === null) return;
    const setor = lerSetor(setorStr);
    if (!setor) {
      window.alert('Setor inválido. Digite "cozinha" ou "bar".');
      return;
    }

    const tempoStr = window.prompt(
      'Tempo de preparo em minutos (deixe vazio para remover):',
      p.tempoPreparoMinutos ?? ''
    );
    if (tempoStr === null) return;
    const tempo = lerTempo(tempoStr);
    if (Number.isNaN(tempo)) {
      window.alert('Tempo inválido. Use um número inteiro de 1 a 240 minutos.');
      return;
    }

    try {
      await api.put(`/produtos/${p._id}`, {
        nome: nome.trim(),
        preco,
        descricao: descricao.trim(),
        setor,
        tempoPreparoMinutos: tempo, // null limpa o campo no backend
      });
      carregarProdutos();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao editar produto.');
    }
  };

  // RNF11 - inativa em vez de apagar; o histórico de vendas continua intacto.
  const removerProduto = async (p) => {
    if (!window.confirm(`Remover "${p.nome}" do cardápio?\nO histórico de vendas é mantido.`))
      return;

    try {
      await api.delete(`/produtos/${p._id}`);
      carregarProdutos();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao remover produto.');
    }
  };

  // RF03 - disponibilidade manual (RF22 continua valendo para o estoque, no futuro).
  const alternarDisponibilidade = async (p) => {
    try {
      await api.patch(`/produtos/${p._id}/disponibilidade`, { disponivel: p.disponivel === false });
      carregarProdutos();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao alterar disponibilidade.');
    }
  };

  const acoes = {
    onEditar: editarProduto,
    onRemover: removerProduto,
    onDisponibilidade: alternarDisponibilidade,
  };

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Cardápio</h1>
          <p className="text-sm text-neutral-500">
            Gerencie os produtos e categorias do seu cardápio
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setCategoriaAtiva(TODOS)}
          className={`rounded-md px-3 py-1 text-sm ${
            categoriaAtiva === TODOS ? 'bg-primary text-white' : 'border'
          }`}
        >
          Todos
        </button>
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

      {categoriaSelecionada && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="text-neutral-500">Categoria "{categoriaSelecionada.nome}":</span>
          <button onClick={editarCategoria} className="rounded border px-2 py-1">
            Editar categoria
          </button>
          <button
            onClick={removerCategoria}
            className="rounded border border-red-200 px-2 py-1 text-red-600"
          >
            Remover categoria
          </button>
        </div>
      )}

      <div className="mb-3">
        <button
          onClick={criarProduto}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          + Adicionar Produto
        </button>
      </div>

      {categoriaAtiva === TODOS ? (
        <>
          {grupos.map((g) => (
            <section key={g._id} className="mb-6">
              <h2 className="mb-2 text-sm font-semibold text-neutral-500">{g.nome}</h2>
              <div className="grid grid-cols-3 gap-4">
                {g.produtos.map((p) => (
                  <CartaoProduto key={p._id} produto={p} {...acoes} />
                ))}
                {!g.produtos.length && (
                  <p className="col-span-3 text-sm text-neutral-400">
                    Nenhum produto nesta categoria ainda.
                  </p>
                )}
              </div>
            </section>
          ))}
          {!grupos.length && (
            <p className="text-sm text-neutral-400">Nenhuma categoria cadastrada ainda.</p>
          )}
        </>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {produtos.map((p) => (
            <CartaoProduto key={p._id} produto={p} {...acoes} />
          ))}
          {!produtos.length && (
            <p className="col-span-3 text-sm text-neutral-400">
              Nenhum produto nesta categoria ainda.
            </p>
          )}
        </div>
      )}
    </AdminLayout>
  );
}

// RF22 - produto esgotado aparece esmaecido, com selo, em vez de sumir.
// Só o texto é esmaecido; os botões continuam com aparência normal.
function CartaoProduto({ produto: p, onEditar, onRemover, onDisponibilidade }) {
  const indisponivel = p.disponivel === false;

  return (
    <div className="rounded-lg border p-3">
      <div className={indisponivel ? 'opacity-50' : ''}>
        <p className="font-medium">
          {p.nome}
          {indisponivel && (
            <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-xs font-normal">
              indisponível
            </span>
          )}
        </p>
        <p className="text-sm text-neutral-500">{p.descricao}</p>
        <p className="mt-2 font-semibold">R$ {p.preco?.toFixed(2)}</p>
        <p className="mt-1 text-xs text-neutral-500">
          {p.setor === 'bar' ? 'Bar' : 'Cozinha'}
          {p.tempoPreparoMinutos ? ` · ${p.tempoPreparoMinutos} min` : ''}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <button onClick={() => onEditar(p)} className="rounded border px-2 py-1">
          Editar
        </button>
        <button onClick={() => onDisponibilidade(p)} className="rounded border px-2 py-1">
          {indisponivel ? 'Marcar disponível' : 'Marcar indisponível'}
        </button>
        <button
          onClick={() => onRemover(p)}
          className="rounded border border-red-200 px-2 py-1 text-red-600"
        >
          Remover
        </button>
      </div>
    </div>
  );
}
