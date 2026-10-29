import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axiosClient';
import { useSocket } from '../../hooks/useSocket';
import { agruparItens } from '../../utils/agruparItens';

const ROTULO_STATUS_ITEM = {
  pendente: { texto: 'Pendente', cor: 'bg-neutral-300' },
  em_preparo: { texto: 'Em preparo', cor: 'bg-yellow-400' },
  pronto: { texto: 'Pronto', cor: 'bg-green-500' },
  entregue: { texto: 'Entregue', cor: 'bg-neutral-400' },
};

const moeda = (v) => `R$ ${(v ?? 0).toFixed(2)}`;

// RF20/RF21/RF23/RF25/RF26 - Tela da mesa (mobile): cardápio, lançamento com
// carrinho, espelho de consumo da comanda selecionada, e solicitar fechamento.
export default function Mesa() {
  const { mesaId } = useParams();
  const navigate = useNavigate();

  const [mesa, setMesa] = useState(null);
  const [grupos, setGrupos] = useState([]); // cardápio: [{ _id, nome, produtos }]
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos');
  const [comandas, setComandas] = useState([]);
  const [comandaSelecionadaId, setComandaSelecionadaId] = useState(null);
  const [carrinho, setCarrinho] = useState([]); // [{ chave, produto, quantidade, observacao }]
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const carregarMesa = useCallback(async () => {
    const { data } = await api.get('/mesas');
    setMesa(data.find((m) => m._id === mesaId) ?? null);
  }, [mesaId]);

  const carregarComandas = useCallback(async () => {
    const { data } = await api.get(`/comandas/mesa/${mesaId}`);
    const abertas = data.filter((c) => c.status === 'aberta');
    setComandas(abertas);
    // mantém a seleção se ela ainda existir; senão, cai na primeira aberta
    setComandaSelecionadaId((atual) =>
      abertas.some((c) => c._id === atual) ? atual : (abertas[0]?._id ?? null)
    );
  }, [mesaId]);

  useEffect(() => {
    carregarMesa();
    carregarComandas();
    api.get('/cardapio').then((r) => setGrupos(r.data));
  }, [carregarMesa, carregarComandas]);

  // RF22/RF23 - tempo real: disponibilidade de produto e status do KDS.
  const socketRef = useSocket([]);
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const aoAtualizarProduto = (produtoAtualizado) => {
      setGrupos((atual) =>
        atual.map((g) => ({
          ...g,
          produtos: g.produtos.map((p) =>
            p._id === produtoAtualizado._id ? produtoAtualizado : p
          ),
        }))
      );
    };
    const aoAtualizarKDS = (evento) => {
      if (comandas.some((c) => c._id === evento.comandaId)) carregarComandas();
    };

    socket.on('produto:atualizado', aoAtualizarProduto);
    socket.on('kds:status-atualizado', aoAtualizarKDS);
    return () => {
      socket.off('produto:atualizado', aoAtualizarProduto);
      socket.off('kds:status-atualizado', aoAtualizarKDS);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketRef, comandas, carregarComandas]);

  const comandaSelecionada = comandas.find((c) => c._id === comandaSelecionadaId) ?? null;

  const subtotalSelecionada = useMemo(() => {
    if (!comandaSelecionada) return 0;
    return comandaSelecionada.itens
      .filter((i) => !i.estornado)
      .reduce((soma, i) => soma + i.precoUnitario * i.quantidade, 0);
  }, [comandaSelecionada]);

  // ---------- comandas ----------
  const abrirNovaComanda = async () => {
    try {
      const { data } = await api.post('/comandas/abrir', { mesaId });
      await carregarComandas();
      setComandaSelecionadaId(data.comanda._id);
      setErro('');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao abrir comanda.');
    }
  };

  // ---------- carrinho ----------
  const chaveCarrinho = (produtoId, observacao) => `${produtoId}::${observacao || ''}`;

  const adicionarAoCarrinho = (produto, observacao = '') => {
    const chave = chaveCarrinho(produto._id, observacao);
    setCarrinho((atual) => {
      const existente = atual.find((l) => l.chave === chave);
      if (existente) {
        return atual.map((l) => (l.chave === chave ? { ...l, quantidade: l.quantidade + 1 } : l));
      }
      return [...atual, { chave, produto, quantidade: 1, observacao }];
    });
  };

  const alterarQuantidade = (chave, delta) => {
    setCarrinho(
      (atual) =>
        atual
          .map((l) => (l.chave === chave ? { ...l, quantidade: l.quantidade + delta } : l))
          .filter((l) => l.quantidade > 0) // chegou a 0: remove a linha
    );
  };

  const removerDoCarrinho = (chave) =>
    setCarrinho((atual) => atual.filter((l) => l.chave !== chave));

  const totalCarrinho = carrinho.reduce((n, l) => n + l.quantidade, 0);

  const enviarCarrinho = async () => {
    if (!comandaSelecionada || !carrinho.length) return;
    setEnviando(true);
    setErro('');
    try {
      for (const linha of carrinho) {
        // eslint-disable-next-line no-await-in-loop -- precisa manter a ordem do pedido
        await api.post(`/comandas/${comandaSelecionada._id}/itens`, {
          produtoId: linha.produto._id,
          quantidade: linha.quantidade,
          observacao: linha.observacao || undefined,
        });
      }
      setCarrinho([]);
      await carregarComandas();
    } catch (err) {
      setErro(
        err.response?.data?.erro || 'Erro ao enviar o pedido. Confira o carrinho e tente de novo.'
      );
    } finally {
      setEnviando(false);
    }
  };

  // ---------- fechamento ----------
  const solicitarFechamento = async () => {
    if (!window.confirm('Solicitar o fechamento desta mesa? O caixa será avisado.')) return;
    try {
      await api.patch(`/mesas/${mesaId}/solicitar-fechamento`);
      navigate('/funcionarios');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao solicitar fechamento.');
    }
  };

  const mesaAguardandoFechamento = mesa?.status === 'aguardando_fechamento';

  const produtosExibidos =
    categoriaAtiva === 'todos'
      ? grupos.flatMap((g) => g.produtos)
      : (grupos.find((g) => g._id === categoriaAtiva)?.produtos ?? []);

  // celular: tela cheia. No computador: coluna centralizada (largura máxima).
  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl pb-32 md:border-x">
      <header className="sticky top-0 z-10 border-b bg-white p-3">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/funcionarios')} className="text-sm text-neutral-500">
            ← Mapa de mesas
          </button>
          <p className="text-lg font-bold">Mesa {String(mesa?.numero ?? '').padStart(2, '0')}</p>
        </div>
      </header>

      {erro && <p className="m-3 rounded bg-red-50 p-2 text-sm text-red-600">{erro}</p>}

      {mesaAguardandoFechamento && (
        <p className="m-3 rounded bg-yellow-50 p-2 text-sm text-yellow-700">
          Esta mesa está aguardando o fechamento pelo caixa. Novos pedidos ficam bloqueados até lá.
        </p>
      )}

      {/* RF25/RF23 - seleção de comanda; "+ Nova" nunca deixa a mesa sem
          destino pro carrinho, mesmo que todas as comandas tenham sido
          fechadas por engano enquanto o garçom estava na tela. */}
      <div className="flex items-center gap-2 overflow-x-auto p-3">
        {comandas.map((c) => (
          <button
            key={c._id}
            onClick={() => setComandaSelecionadaId(c._id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
              c._id === comandaSelecionadaId ? 'bg-primary text-white' : 'border text-neutral-600'
            }`}
          >
            Comanda #{c.numero}
          </button>
        ))}
        {!mesaAguardandoFechamento && (
          <button
            onClick={abrirNovaComanda}
            className="shrink-0 rounded-full border border-dashed px-3 py-1.5 text-sm text-neutral-600"
          >
            + Nova comanda
          </button>
        )}
      </div>

      {/* RF23 - espelho de consumo: itens já lançados, com status colorido */}
      {comandaSelecionada && (
        <div className="mx-3 mb-3 rounded-lg border p-3">
          <p className="mb-2 text-sm font-semibold text-neutral-600">
            Comanda #{comandaSelecionada.numero}
          </p>
          <ul className="space-y-1.5 text-sm">
            {/* itens iguais (mesmo produto/observação/status) aparecem empilhados: 2x Hamburguer */}
            {agruparItens(comandaSelecionada.itens, (i) =>
              i.estornado ? 'estornado' : i.statusKDS
            ).map((item) => (
              <li key={item.chave} className="flex items-center justify-between">
                <span className={item.estornado ? 'text-neutral-400 line-through' : ''}>
                  {item.quantidade}x {item.nomeProduto}
                  {item.observacao && (
                    <span className="text-neutral-400"> ({item.observacao})</span>
                  )}
                </span>
                {item.estornado ? (
                  <span className="text-xs text-red-500">Estornado</span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <span
                      className={`h-2 w-2 rounded-full ${ROTULO_STATUS_ITEM[item.statusKDS]?.cor}`}
                    />
                    {ROTULO_STATUS_ITEM[item.statusKDS]?.texto ?? item.statusKDS}
                  </span>
                )}
              </li>
            ))}
            {!comandaSelecionada.itens.length && (
              <li className="text-neutral-400">Nenhum item lançado ainda.</li>
            )}
          </ul>
          <p className="mt-2 border-t pt-2 text-right text-sm font-semibold">
            Subtotal: {moeda(subtotalSelecionada)}
          </p>
        </div>
      )}

      {!comandas.length && (
        <p className="mx-3 mb-3 rounded-lg border border-dashed p-4 text-center text-sm text-neutral-400">
          Nenhuma comanda aberta nesta mesa. Toque em "+ Nova comanda" para começar.
        </p>
      )}

      {/* cardápio */}
      <div className="flex gap-2 overflow-x-auto px-3 pb-2">
        <button
          onClick={() => setCategoriaAtiva('todos')}
          className={`shrink-0 rounded-full px-3 py-1 text-sm ${
            categoriaAtiva === 'todos' ? 'bg-primary text-white' : 'border text-neutral-600'
          }`}
        >
          Todos
        </button>
        {grupos.map((g) => (
          <button
            key={g._id}
            onClick={() => setCategoriaAtiva(g._id)}
            className={`shrink-0 rounded-full px-3 py-1 text-sm ${
              categoriaAtiva === g._id ? 'bg-primary text-white' : 'border text-neutral-600'
            }`}
          >
            {g.nome}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-3">
        {produtosExibidos.map((produto) => (
          <CartaoProdutoGarcom
            key={produto._id}
            produto={produto}
            desabilitado={!comandaSelecionada || mesaAguardandoFechamento}
            onAdicionar={(observacao) => adicionarAoCarrinho(produto, observacao)}
          />
        ))}
        {!produtosExibidos.length && (
          <p className="col-span-2 py-6 text-center text-sm text-neutral-400">
            Nenhum produto nesta categoria.
          </p>
        )}
      </div>

      {/* RF20 - carrinho fixo embaixo, sempre à mão no celular */}
      {carrinho.length > 0 && (
        <div className="fixed bottom-0 left-1/2 max-h-[55vh] w-full max-w-3xl -translate-x-1/2 overflow-y-auto border-t bg-white p-3 shadow-lg md:border-x">
          <p className="mb-2 text-sm font-semibold">
            Pedido para a comanda #{comandaSelecionada?.numero} ({totalCarrinho}{' '}
            {totalCarrinho === 1 ? 'item' : 'itens'})
          </p>
          <ul className="space-y-2">
            {carrinho.map((linha) => (
              <li key={linha.chave} className="flex items-center gap-2 text-sm">
                <div className="flex-1">
                  <p>{linha.produto.nome}</p>
                  {linha.observacao && (
                    <p className="text-xs text-neutral-400">{linha.observacao}</p>
                  )}
                </div>
                <button
                  onClick={() => alterarQuantidade(linha.chave, -1)}
                  className="h-7 w-7 rounded border text-neutral-600"
                >
                  −
                </button>
                <span className="w-5 text-center">{linha.quantidade}</span>
                <button
                  onClick={() => alterarQuantidade(linha.chave, 1)}
                  className="h-7 w-7 rounded border text-neutral-600"
                >
                  +
                </button>
                <button
                  onClick={() => removerDoCarrinho(linha.chave)}
                  className="ml-1 text-red-500"
                  aria-label="Remover"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={enviarCarrinho}
            disabled={enviando}
            className="mt-3 w-full rounded-md bg-primary py-2.5 text-center font-medium text-white disabled:opacity-50"
          >
            {enviando ? 'Enviando...' : 'Enviar pedido'}
          </button>
        </div>
      )}

      {!carrinho.length && comandaSelecionada && !mesaAguardandoFechamento && (
        <div className="fixed bottom-0 left-1/2 w-full max-w-3xl -translate-x-1/2 border-t bg-white p-3 md:border-x">
          <button
            onClick={solicitarFechamento}
            className="w-full rounded-md border border-red-200 py-2.5 text-center text-sm font-medium text-red-600"
          >
            Solicitar fechamento da mesa
          </button>
        </div>
      )}
    </div>
  );
}

// RF20/RF21 - card do produto com "+1" rápido e sugestões de observação com
// um toque (RF21); busca as sugestões só na primeira vez que o garçom pede
// pra ver, pra não disparar uma chamada por produto visível na tela toda.
function CartaoProdutoGarcom({ produto, desabilitado, onAdicionar }) {
  const [mostrarObs, setMostrarObs] = useState(false);
  const [sugestoes, setSugestoes] = useState(null);
  const indisponivel = produto.disponivel === false;

  const abrirSugestoes = async () => {
    setMostrarObs((v) => !v);
    if (sugestoes === null) {
      try {
        const { data } = await api.get(`/comandas/produtos/${produto._id}/sugestoes`);
        setSugestoes(data);
      } catch {
        setSugestoes([]);
      }
    }
  };

  const observacaoLivre = () => {
    const texto = window.prompt('Observação (opcional):');
    if (texto === null) return;
    onAdicionar(texto.trim());
    setMostrarObs(false);
  };

  return (
    <div className={`rounded-lg border p-3 ${indisponivel ? 'opacity-50' : ''}`}>
      <p className="text-sm font-medium">{produto.nome}</p>
      <p className="text-sm font-semibold">{moeda(produto.preco)}</p>

      {indisponivel ? (
        <p className="mt-2 text-xs text-neutral-400">Indisponível</p>
      ) : (
        <>
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={() => onAdicionar('')}
              disabled={desabilitado}
              className="flex-1 rounded-md bg-primary py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              + Adicionar
            </button>
            <button
              onClick={abrirSugestoes}
              disabled={desabilitado}
              className="rounded-md border px-2 text-xs text-neutral-600 disabled:opacity-40"
            >
              Obs.
            </button>
          </div>

          {mostrarObs && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sugestoes === null && (
                <span className="text-xs text-neutral-400">Carregando...</span>
              )}
              {sugestoes?.map((texto) => (
                <button
                  key={texto}
                  onClick={() => {
                    onAdicionar(texto);
                    setMostrarObs(false);
                  }}
                  className="rounded-full border px-2 py-1 text-xs text-neutral-600"
                >
                  {texto}
                </button>
              ))}
              <button
                onClick={observacaoLivre}
                className="rounded-full border px-2 py-1 text-xs text-primary"
              >
                Outra...
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
