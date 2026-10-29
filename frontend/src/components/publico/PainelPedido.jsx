import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosClient';
import { agruparItens } from '../../utils/agruparItens';

const CHAVE_PEDIDOS = 'pc_pedidos'; // ids dos pedidos deste celular (localStorage)
const CHAVE_MESA = 'pc_mesa'; // última mesa escolhida (sessionStorage)
const CHAVE_NOME = 'pc_nome'; // último nome digitado (sessionStorage)
const INTERVALO_ATIVO_MS = 5000; // enquanto algo está mudando (pedido novo, cozinha preparando)
const INTERVALO_CALMO_MS = 15000; // tudo entregue: só espera o pagamento para limpar a tela
const VALIDADE_MS = 12 * 60 * 60 * 1000; // pedidos antigos saem da lista depois de 12 h
const MAX_ACOMPANHADOS = 10; // o servidor aceita até 10 ids por consulta

// O armazenamento do navegador pode estar bloqueado (aba anônima, por exemplo).
// Nesses casos o painel funciona igual, só não "lembra" depois de recarregar.
function ler(armazenamento, chave) {
  try {
    return window[armazenamento].getItem(chave) ?? '';
  } catch {
    return '';
  }
}
function gravar(armazenamento, chave, valor) {
  try {
    if (valor) window[armazenamento].setItem(chave, valor);
    else window[armazenamento].removeItem(chave);
  } catch {
    /* sem armazenamento: segue sem lembrar */
  }
}
function carregarAcompanhados() {
  try {
    const lista = JSON.parse(ler('localStorage', CHAVE_PEDIDOS)) || [];
    return lista
      .filter((p) => p?.id && Date.now() - p.criadoEm < VALIDADE_MS)
      .slice(-MAX_ACOMPANHADOS);
  } catch {
    return [];
  }
}

const dinheiro = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
const SITUACOES_EM_ANDAMENTO = ['na_fila', 'preparando', 'pronto'];

const ROTULO_SITUACAO = {
  aguardando: { texto: 'Aguardando garçom', classe: 'bg-orange-100 text-orange-700' },
  na_fila: { texto: 'Na fila', classe: 'bg-neutral-100 text-neutral-600' },
  preparando: { texto: 'Preparando', classe: 'bg-blue-100 text-blue-700' },
  pronto: { texto: 'Pronto', classe: 'bg-green-100 text-green-700' },
  entregue: { texto: 'Entregue', classe: 'bg-green-600 text-white' },
  cancelado: { texto: 'Cancelado', classe: 'bg-red-100 text-red-700' },
  recusado: { texto: 'Recusado', classe: 'bg-red-100 text-red-700' },
};

/**
 * Autoatendimento (cliente): carrinho + escolha da mesa + envio + acompanhamento.
 *
 * O pedido NÃO vai direto para a cozinha: fica "aguardando garçom" até ele
 * conferir no salão e aceitar (ou recusar, com motivo). Depois de aceito, o
 * cliente passa a ver a COMANDA DA MESA (a mesma para todos que dividem a mesa),
 * com o andamento de cada item, o total da mesa e o que ele próprio pediu.
 * Quando o caixa recebe o pagamento, a comanda some da tela dele sozinha.
 *
 * `itens` é a lista do carrinho ([{ produto, quantidade, observacao }]);
 * quem guarda o carrinho é a página do cardápio.
 */
export default function PainelPedido({
  itens,
  onAlterarQuantidade,
  onObservacao,
  onPedidoEnviado,
}) {
  const [aberto, setAberto] = useState(false);
  const [acompanhados, setAcompanhados] = useState(carregarAcompanhados); // [{ id, criadoEm }]
  const [dados, setDados] = useState({}); // id do pedido -> visão devolvida pelo servidor
  const [contas, setContas] = useState([]); // comandas das mesas em que o cliente tem pedido aceito
  const [contaEncerrada, setContaEncerrada] = useState(false);
  const [mesas, setMesas] = useState([]);
  const [mesaId, setMesaId] = useState(() => ler('sessionStorage', CHAVE_MESA));
  const [nomeCliente, setNomeCliente] = useState(() => ler('sessionStorage', CHAVE_NOME));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const qtdTotal = useMemo(() => itens.reduce((s, i) => s + i.quantidade, 0), [itens]);
  const valorCarrinho = useMemo(
    () => itens.reduce((s, i) => s + i.quantidade * (i.produto.preco ?? 0), 0),
    [itens]
  );

  // guarda a lista de pedidos para sobreviver a um F5 ou a fechar o navegador
  useEffect(() => {
    gravar('localStorage', CHAVE_PEDIDOS, acompanhados.length ? JSON.stringify(acompanhados) : '');
  }, [acompanhados]);

  const idsConsulta = acompanhados.map((p) => p.id).join(',');

  const atualizar = useCallback(async () => {
    if (!idsConsulta) return;
    try {
      const { data } = await api.get('/publico/acompanhamento', { params: { ids: idsConsulta } });
      setDados((atual) => ({ ...atual, ...Object.fromEntries(data.pedidos.map((p) => [p._id, p])) }));
      setContas(data.mesas);

      // Sai da lista: pedido que o servidor não conhece mais (ex.: banco recriado) e
      // pedido ENCERRADO (a conta foi paga no caixa). Só considera os ids que foram
      // consultados, para não apagar um pedido enviado enquanto esta resposta vinha.
      const consultados = new Set(idsConsulta.split(','));
      const devolvidos = new Set(data.pedidos.map((p) => p._id));
      const encerrados = new Set(data.pedidos.filter((p) => p.encerrado).map((p) => p._id));
      setAcompanhados((atual) => {
        const filtrada = atual.filter(
          (p) => !consultados.has(p.id) || (devolvidos.has(p.id) && !encerrados.has(p.id))
        );
        return filtrada.length === atual.length ? atual : filtrada;
      });
      if (encerrados.size) setContaEncerrada(true);
    } catch {
      /* sem rede agora: mantém o que já está na tela e tenta de novo depois */
    }
  }, [idsConsulta]);

  // consulta ao abrir a página e sempre que a lista de pedidos muda
  useEffect(() => {
    atualizar();
  }, [atualizar]);

  const haAlgoAtivo = acompanhados.some((p) => dados[p.id]?.status !== 'recusado');
  const algoMudando = useMemo(() => {
    const aguardando = acompanhados.some((p) => {
      const d = dados[p.id];
      return !d || d.status === 'pendente';
    });
    const naCozinha = contas.some((c) =>
      c.comandas.some((cm) => cm.itens.some((i) => SITUACOES_EM_ANDAMENTO.includes(i.situacao)))
    );
    return aguardando || naCozinha;
  }, [acompanhados, dados, contas]);

  // consulta de tempos em tempos: rápido enquanto algo muda; mais devagar depois (só
  // para perceber o pagamento e limpar a tela)
  useEffect(() => {
    if (!haAlgoAtivo) return;
    const id = setInterval(atualizar, algoMudando ? INTERVALO_ATIVO_MS : INTERVALO_CALMO_MS);
    return () => clearInterval(id);
  }, [haAlgoAtivo, algoMudando, atualizar]);

  // lista de mesas: carrega quando o painel abre com itens no carrinho
  useEffect(() => {
    if (!aberto || !itens.length) return;
    api
      .get('/publico/mesas')
      .then((r) => setMesas(r.data))
      .catch(() => setErro('Não foi possível carregar as mesas. Tente novamente.'));
  }, [aberto, itens.length]);

  // pedidos que ainda precisam de atenção: aguardando o garçom ou recusados
  // (os aceitos viram a comanda da mesa, mais abaixo)
  const pedidosEmAberto = useMemo(
    () =>
      acompanhados
        .map((p) => dados[p.id])
        .filter((d) => d && d.status !== 'aceito')
        .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)),
    [acompanhados, dados]
  );
  const haPendente = pedidosEmAberto.some((p) => p.status === 'pendente');
  const conta = contas[0] ?? null; // normalmente o cliente está em uma mesa só

  const escolherMesa = (id) => {
    setMesaId(id);
    gravar('sessionStorage', CHAVE_MESA, id);
  };

  const enviar = async () => {
    if (!mesaId) {
      setErro('Escolha a sua mesa antes de enviar.');
      return;
    }
    setEnviando(true);
    setErro('');
    try {
      const { data } = await api.post('/publico/pedidos', {
        mesaId,
        nomeCliente: nomeCliente.trim() || undefined,
        itens: itens.map((i) => ({
          produtoId: i.produto._id,
          quantidade: i.quantidade,
          observacao: i.observacao?.trim() || undefined,
        })),
      });
      gravar('sessionStorage', CHAVE_NOME, nomeCliente.trim());
      setContaEncerrada(false);
      setAcompanhados((atual) =>
        [...atual, { id: data._id, criadoEm: Date.now() }].slice(-MAX_ACOMPANHADOS)
      );
      onPedidoEnviado();
    } catch (e) {
      const resposta = e.response?.data;
      const primeiroDetalhe = resposta?.detalhes && Object.values(resposta.detalhes).flat()[0];
      setErro(primeiroDetalhe || resposta?.erro || 'Não foi possível enviar o pedido. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  // ao abrir o painel, atualiza na hora (sem esperar o próximo ciclo)
  const abrirPainel = () => {
    setAberto(true);
    atualizar();
  };

  const removerDaLista = (id) => setAcompanhados((atual) => atual.filter((p) => p.id !== id));

  const temBarra = qtdTotal > 0 || acompanhados.length > 0;
  const mostrarAvisoConta = contaEncerrada && qtdTotal === 0 && !aberto; // aberto: o aviso aparece dentro do painel

  return (
    <>
      {(temBarra || mostrarAvisoConta) && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white p-3 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
          {mostrarAvisoConta && (
            <div className="mx-auto mb-2 flex w-full max-w-5xl items-center justify-between gap-3 rounded-md bg-green-50 px-4 py-2 text-sm text-green-800">
              <span>Conta encerrada. Obrigado pela visita!</span>
              <button onClick={() => setContaEncerrada(false)} className="font-medium underline">
                Ok
              </button>
            </div>
          )}
          {temBarra && (
            <button
              onClick={abrirPainel}
              className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-md bg-primary px-4 py-3 text-left text-white"
            >
              <span className="font-medium">
                {qtdTotal > 0
                  ? `Ver pedido (${qtdTotal} ${qtdTotal === 1 ? 'item' : 'itens'})`
                  : conta
                    ? `Comanda da mesa ${String(conta.mesaNumero).padStart(2, '0')}`
                    : 'Meus pedidos'}
              </span>
              <span className="text-sm">
                {qtdTotal > 0
                  ? dinheiro(valorCarrinho)
                  : haPendente
                    ? 'Aguardando confirmação'
                    : conta
                      ? `Total ${dinheiro(conta.total)}`
                      : 'Ver detalhes'}
              </span>
            </button>
          )}
        </div>
      )}

      {aberto && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-black/40"
          onClick={() => setAberto(false)}
        >
          <div
            className="mx-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {itens.length > 0 ? 'Seu pedido' : 'Acompanhar pedido'}
              </h2>
              <button onClick={() => setAberto(false)} className="text-sm text-neutral-500">
                Fechar
              </button>
            </div>

            {itens.length > 0 && (
              <>
                <ul className="mb-4 divide-y">
                  {itens.map((i) => (
                    <li key={i.produto._id} className="py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{i.produto.nome}</p>
                          <p className="text-sm text-neutral-500">
                            {dinheiro(i.produto.preco * i.quantidade)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <button
                            onClick={() => onAlterarQuantidade(i.produto, -1)}
                            aria-label={`Diminuir ${i.produto.nome}`}
                            className="h-8 w-8 rounded-full border text-lg leading-none"
                          >
                            −
                          </button>
                          <span className="w-5 text-center">{i.quantidade}</span>
                          <button
                            onClick={() => onAlterarQuantidade(i.produto, 1)}
                            aria-label={`Aumentar ${i.produto.nome}`}
                            className="h-8 w-8 rounded-full bg-primary text-lg leading-none text-white"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <input
                        value={i.observacao}
                        onChange={(e) => onObservacao(i.produto._id, e.target.value)}
                        maxLength={140}
                        placeholder="Observação (ex.: sem cebola)"
                        className="mt-2 w-full rounded-md border px-3 py-1.5 text-sm"
                      />
                    </li>
                  ))}
                </ul>

                <p className="mb-2 text-sm font-medium">Qual é a sua mesa?</p>
                <div className="mb-1 grid grid-cols-4 gap-2">
                  {mesas.map((m) => (
                    <button
                      key={m._id}
                      disabled={!m.aceitaPedido}
                      onClick={() => escolherMesa(m._id)}
                      className={`rounded-md border py-2 text-sm ${
                        mesaId === m._id ? 'border-primary bg-primary text-white' : ''
                      } ${!m.aceitaPedido ? 'cursor-not-allowed opacity-40' : ''}`}
                    >
                      {String(m.numero).padStart(2, '0')}
                    </button>
                  ))}
                </div>
                {!mesas.length && !erro && (
                  <p className="text-sm text-neutral-500">Carregando mesas...</p>
                )}
                <p className="mb-3 text-xs text-neutral-500">
                  Confira o número da sua mesa. O garçom confirma o pedido antes de ele ir para a
                  cozinha.
                </p>

                <input
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  maxLength={40}
                  placeholder="Seu nome (opcional)"
                  className="mb-3 w-full rounded-md border px-3 py-2 text-sm"
                />

                {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}

                <button
                  onClick={enviar}
                  disabled={enviando}
                  className="mb-2 w-full rounded-md bg-primary py-3 font-medium text-white disabled:opacity-60"
                >
                  {enviando ? 'Enviando...' : `Enviar pedido · ${dinheiro(valorCarrinho)}`}
                </button>
              </>
            )}

            {pedidosEmAberto.length > 0 && (
              <section className={itens.length > 0 ? 'mt-6 border-t pt-4' : 'mb-4'}>
                {itens.length > 0 && <h3 className="mb-3 font-semibold">Pedidos enviados</h3>}
                <div className="space-y-3">
                  {pedidosEmAberto.map((p) => (
                    <CartaoPedido key={p._id} pedido={p} onRemover={() => removerDaLista(p._id)} />
                  ))}
                </div>
              </section>
            )}

            {contas.map((c) => (
              <ComandaDaMesa key={c.mesaId} conta={c} separar={itens.length > 0 || pedidosEmAberto.length > 0} />
            ))}

            {!itens.length && !pedidosEmAberto.length && !contas.length && (
              contaEncerrada ? (
                <div className="my-4 rounded-lg bg-green-50 p-4 text-center text-green-800">
                  <p className="font-medium">Conta encerrada. Obrigado pela visita!</p>
                  <button
                    onClick={() => {
                      setContaEncerrada(false);
                      setAberto(false);
                    }}
                    className="mt-2 text-sm underline"
                  >
                    Ok
                  </button>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-neutral-500">
                  {acompanhados.length
                    ? 'Carregando seus pedidos...'
                    : 'Seu pedido está vazio. Toque em “Adicionar ao pedido” nos itens do cardápio.'}
                </p>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Comanda COMPARTILHADA da mesa: todos que dividem a mesa veem a mesma conta.
// Itens iguais aparecem empilhados (2× Hamburguer), mesmo que tenham sido pedidos
// por pessoas diferentes.
function ComandaDaMesa({ conta, separar }) {
  const varias = conta.comandas.length > 1;

  return (
    <section className={separar ? 'mt-6 border-t pt-4' : ''}>
      <h3 className="mb-3 font-semibold">
        Comanda da mesa {String(conta.mesaNumero).padStart(2, '0')}
      </h3>

      <div className="space-y-4">
        {conta.comandas.map((comanda) => (
          <div key={comanda.numero}>
            {varias && (
              <p className="mb-1 text-xs font-medium text-neutral-500">Comanda #{comanda.numero}</p>
            )}
            <ul className="space-y-2 text-sm">
              {agruparItens(comanda.itens, (i) => i.situacao).map((grupo) => {
                const cancelado = grupo.situacao === 'cancelado';
                const rotulo = ROTULO_SITUACAO[grupo.situacao] ?? ROTULO_SITUACAO.na_fila;
                const meus = grupo.itens.filter((i) => i.meu).reduce((s, i) => s + i.quantidade, 0);
                const origem =
                  meus === 0
                    ? 'Pedido de outra pessoa da mesa'
                    : meus < grupo.quantidade
                      ? `Você pediu ${meus}`
                      : null;

                return (
                  <li key={grupo.chave} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cancelado ? 'text-neutral-400 line-through' : ''}>
                        {grupo.quantidade}× {grupo.nomeProduto}
                      </p>
                      {grupo.observacao && (
                        <p className="text-xs text-neutral-500">{grupo.observacao}</p>
                      )}
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${rotulo.classe}`}
                      >
                        {rotulo.texto}
                      </span>
                      {origem && <span className="ml-2 text-xs text-neutral-400">{origem}</span>}
                    </div>
                    <span className={`shrink-0 ${cancelado ? 'text-neutral-400 line-through' : ''}`}>
                      {dinheiro(grupo.quantidade * grupo.precoUnitario)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-neutral-50 p-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">Total da comanda</span>
          <span className="text-lg font-semibold">{dinheiro(conta.total)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm text-neutral-600">
          <span>O que você pediu</span>
          <span>{dinheiro(conta.meuTotal)}</span>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          É a mesma comanda para todos da mesa. Os valores não incluem taxa de serviço; a conta
          final é fechada no caixa.
        </p>
      </div>
    </section>
  );
}

// Pedido que ainda não virou comanda: aguardando o garçom ou recusado.
function CartaoPedido({ pedido, onRemover }) {
  const hora = new Date(pedido.criadoEm).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const mesa = pedido.mesaNumero ? `Mesa ${String(pedido.mesaNumero).padStart(2, '0')}` : 'Mesa';
  const pendente = pedido.status === 'pendente';

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {mesa} <span className="font-normal text-neutral-400">· {hora}</span>
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            pendente ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {pendente ? 'Aguardando garçom' : 'Não confirmado'}
        </span>
      </div>

      {pendente ? (
        <p className="mb-2 text-xs text-neutral-500">
          O garçom vai conferir o pedido. Esta tela atualiza sozinha.
        </p>
      ) : (
        <p className="mb-2 text-sm text-red-700">
          {pedido.motivoRecusa ? `Motivo: ${pedido.motivoRecusa}. ` : ''}
          Fale com um garçom para ajustar o pedido.
        </p>
      )}

      <ul className="space-y-1 text-sm">
        {pedido.itens.map((i, idx) => (
          <li key={idx} className="flex items-start justify-between gap-2">
            <span className={pendente ? '' : 'text-neutral-400 line-through'}>
              {i.quantidade}× {i.nomeProduto}
              {i.observacao && <span className="block text-xs text-neutral-500">{i.observacao}</span>}
            </span>
            <span className={`shrink-0 ${pendente ? '' : 'text-neutral-400 line-through'}`}>
              {dinheiro(i.quantidade * i.precoUnitario)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t pt-2">
        {pendente ? (
          <>
            <span className="text-xs text-neutral-500">Valor previsto</span>
            <span className="font-medium">{dinheiro(pedido.total)}</span>
          </>
        ) : (
          <button onClick={onRemover} className="text-xs text-neutral-500 underline">
            Remover da lista
          </button>
        )}
      </div>
    </div>
  );
}
