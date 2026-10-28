import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosClient';
import PainelPedido from '../../components/publico/PainelPedido';

const TODOS = 'todos';
const MAX_POR_ITEM = 20; // mesmo limite validado no servidor

// RF03 - Home pública: o cardápio é a primeira coisa que qualquer visitante
// vê, sem precisar logar (o acesso de funcionário fica no botão discreto
// "Entrar", no canto). Reaproveita o GET /cardapio, que já devolve só
// categorias e produtos ativos, agrupados.
export default function CardapioPublico() {
  const [grupos, setGrupos] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState(TODOS);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Autoatendimento: carrinho do cliente, { [produtoId]: { produto, quantidade, observacao } }.
  // O envio e o acompanhamento do pedido ficam no <PainelPedido />.
  const [carrinho, setCarrinho] = useState({});

  const alterarQuantidade = (produto, delta) => {
    setCarrinho((atual) => {
      const existente = atual[produto._id];
      const quantidade = Math.min(MAX_POR_ITEM, (existente?.quantidade ?? 0) + delta);
      if (quantidade <= 0) {
        const resto = { ...atual };
        delete resto[produto._id];
        return resto;
      }
      return {
        ...atual,
        [produto._id]: { produto, quantidade, observacao: existente?.observacao ?? '' },
      };
    });
  };

  const definirObservacao = (produtoId, observacao) => {
    setCarrinho((atual) =>
      atual[produtoId] ? { ...atual, [produtoId]: { ...atual[produtoId], observacao } } : atual
    );
  };

  useEffect(() => {
    api
      .get('/cardapio')
      .then((r) => {
        setGrupos(r.data);
        setErro('');
      })
      .catch(() => setErro('Não foi possível carregar o cardápio agora. Tente novamente.'))
      .finally(() => setCarregando(false));
  }, []);

  // Filtro é local: a busca no servidor existe (?busca=), mas filtrar aqui
  // dá resposta instantânea enquanto a pessoa digita, sem ida e volta à API.
  const gruposFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return grupos
      .filter((g) => categoriaAtiva === TODOS || g._id === categoriaAtiva)
      .map((g) => ({
        ...g,
        produtos: termo
          ? g.produtos.filter((p) => p.nome.toLowerCase().includes(termo))
          : g.produtos,
      }))
      .filter((g) => g.produtos.length > 0);
  }, [grupos, categoriaAtiva, busca]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold">Pronta Comanda</h1>
            <p className="text-sm text-neutral-500">Confira nosso cardápio</p>
          </div>
          {/* RF01 - acesso de funcionário fica aqui, discreto, sem ocupar
              o espaço principal da tela, que é do cliente */}
          <Link
            to="/login"
            className="rounded-md border px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            Entrar
          </Link>
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-4">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar no cardápio..."
            className="mb-3 w-full rounded-md border px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoriaAtiva(TODOS)}
              className={`rounded-full px-3 py-1 text-sm ${
                categoriaAtiva === TODOS ? 'bg-primary text-white' : 'border text-neutral-600'
              }`}
            >
              Todos
            </button>
            {grupos.map((g) => (
              <button
                key={g._id}
                onClick={() => setCategoriaAtiva(g._id)}
                className={`rounded-full px-3 py-1 text-sm ${
                  categoriaAtiva === g._id ? 'bg-primary text-white' : 'border text-neutral-600'
                }`}
              >
                {g.nome}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-28">
        {carregando && <p className="text-sm text-neutral-500">Carregando cardápio...</p>}
        {erro && <p className="text-sm text-red-600">{erro}</p>}

        {!carregando && !erro && !gruposFiltrados.length && (
          <p className="text-sm text-neutral-500">Nenhum produto encontrado.</p>
        )}

        {gruposFiltrados.map((g) => (
          <section key={g._id} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">{g.nome}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.produtos.map((p) => (
                <CartaoProdutoPublico
                  key={p._id}
                  produto={p}
                  quantidade={carrinho[p._id]?.quantidade ?? 0}
                  onAdicionar={() => alterarQuantidade(p, 1)}
                  onRemover={() => alterarQuantidade(p, -1)}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <PainelPedido
        itens={Object.values(carrinho)}
        onAlterarQuantidade={alterarQuantidade}
        onObservacao={definirObservacao}
        onPedidoEnviado={() => setCarrinho({})}
      />
    </div>
  );
}

// RF22 - produto esgotado aparece esmaecido, com selo, em vez de sumir.
function CartaoProdutoPublico({ produto: p, quantidade, onAdicionar, onRemover }) {
  const indisponivel = p.disponivel === false;

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-white ${indisponivel ? 'opacity-60' : ''}`}
    >
      <div className="aspect-[4/3] w-full bg-neutral-100">
        {p.imagemUrl ? (
          <img src={p.imagemUrl} alt={p.nome} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-neutral-400">
            Sem foto
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium">
          {p.nome}
          {indisponivel && (
            <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-xs font-normal">
              indisponível
            </span>
          )}
        </p>
        {p.descricao && <p className="mt-1 text-sm text-neutral-500">{p.descricao}</p>}
        <p className="mt-2 font-semibold">R$ {p.preco?.toFixed(2)}</p>

        {!indisponivel &&
          (quantidade > 0 ? (
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={onRemover}
                aria-label={`Diminuir ${p.nome}`}
                className="h-9 w-9 rounded-full border text-lg leading-none"
              >
                −
              </button>
              <span className="w-6 text-center font-medium">{quantidade}</span>
              <button
                onClick={onAdicionar}
                aria-label={`Aumentar ${p.nome}`}
                className="h-9 w-9 rounded-full bg-primary text-lg leading-none text-white"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={onAdicionar}
              className="mt-3 w-full rounded-md bg-primary py-2 text-sm font-medium text-white"
            >
              Adicionar ao pedido
            </button>
          ))}
      </div>
    </div>
  );
}
