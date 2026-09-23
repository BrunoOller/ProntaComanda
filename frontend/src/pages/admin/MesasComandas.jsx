import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';

// RF04 - Mapa de Mesas Geral
export default function MesasComandas() {
  const [mesas, setMesas] = useState([]);
  const [mesaSelecionada, setMesaSelecionada] = useState(null);
  const socketRef = useSocket(['mapa-mesas']);

  const carregarMesas = useCallback(() => {
    api.get('/mesas').then((r) => setMesas(r.data));
  }, []);

  useEffect(() => {
    carregarMesas();
  }, [carregarMesas]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.on('mesa:atualizada', (mesaAtualizada) => {
      setMesas((atual) => atual.map((m) => (m._id === mesaAtualizada._id ? mesaAtualizada : m)));
      setMesaSelecionada((atual) =>
        atual?._id === mesaAtualizada._id ? mesaAtualizada : atual
      );
    });
    return () => {
      socket.off('mesa:atualizada');
    };
  }, [socketRef]);

  const corBorda = (status) => (status === 'livre' ? 'border-green-500' : 'border-red-500');

  const adicionarMesa = async () => {
    const proximoNumero = mesas.length ? Math.max(...mesas.map((m) => m.numero)) + 1 : 1;
    const numeroStr = window.prompt('Número da nova mesa:', proximoNumero);
    if (numeroStr == null) return;

    const numero = Number(numeroStr);
    if (!numero || numero <= 0) {
      window.alert('Número de mesa inválido.');
      return;
    }

    try {
      await api.post('/mesas', { numero });
      carregarMesas();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao adicionar mesa.');
    }
  };

  const removerMesa = async () => {
    if (!mesaSelecionada) {
      window.alert('Selecione uma mesa para remover.');
      return;
    }
    if (mesaSelecionada.status !== 'livre') {
      window.alert('Só é possível remover mesas livres.');
      return;
    }
    const confirmar = window.confirm(
      `Remover a Mesa ${String(mesaSelecionada.numero).padStart(2, '0')}?`
    );
    if (!confirmar) return;

    try {
      await api.delete(`/mesas/${mesaSelecionada._id}`);
      setMesaSelecionada(null);
      carregarMesas();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao remover mesa.');
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-lg font-semibold">Mesas e Comandas</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Acompanhe suas mesas e gerencie os pedidos em atendimento
      </p>

      <div className="grid grid-cols-[1fr_380px] gap-6">
        <div>
          <div className="grid grid-cols-4 gap-4">
            {mesas.map((mesa) => (
              <button
                key={mesa._id}
                onClick={() => setMesaSelecionada(mesa)}
                className={`rounded-lg border-2 p-4 text-center ${corBorda(mesa.status)} ${
                  mesaSelecionada?._id === mesa._id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <p className="text-2xl font-bold">{String(mesa.numero).padStart(2, '0')}</p>
                <p className="text-sm">Mesa</p>
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={adicionarMesa}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
            >
              + Adicionar Mesa
            </button>
            <button
              onClick={removerMesa}
              className="rounded-md bg-red-600 px-4 py-2 text-sm text-white"
            >
              Remover
            </button>
          </div>
        </div>

        {mesaSelecionada ? (
          <PainelMesa
            mesa={mesaSelecionada}
            onMesaFechada={() => {
              setMesaSelecionada(null);
              carregarMesas();
            }}
            onMesaAtualizada={(mesaAtualizada) => {
              setMesaSelecionada(mesaAtualizada);
              carregarMesas();
            }}
          />
        ) : (
          <p className="text-sm text-neutral-400">Selecione uma mesa para ver a comanda.</p>
        )}
      </div>
    </AdminLayout>
  );
}

// Painel "MESA 00" do design: comandas, itens, desconto, total e fechamento
function PainelMesa({ mesa, onMesaFechada, onMesaAtualizada }) {
  const [comandas, setComandas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const funcionario = useAuthStore((s) => s.funcionario);
  const podeAplicarDesconto = funcionario?.perfil === 'administrador';

  const carregarComandas = useCallback(() => {
    api.get(`/comandas/mesa/${mesa._id}`).then((r) => setComandas(r.data));
  }, [mesa._id]);

  useEffect(() => {
    carregarComandas();
  }, [carregarComandas]);

  useEffect(() => {
    api.get('/produtos', { params: { disponivel: true } }).then((r) => setProdutos(r.data));
  }, []);

  // só as comandas em aberto contam para exibição e para o total pendente
  const comandasAbertas = comandas.filter((c) => c.status === 'aberta');

  // NOVO - abre uma comanda (primeira ou adicional, independente do status atual da mesa)
  const abrirNovaComanda = async () => {
    try {
      const { data } = await api.post('/comandas/abrir', { mesaId: mesa._id });
      onMesaAtualizada(data.mesa);
      carregarComandas();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao abrir comanda.');
    }
  };

  const adicionarItem = async (comandaId) => {
    if (!produtos.length) {
      window.alert('Nenhum produto cadastrado no cardápio ainda.');
      return;
    }

    const listaProdutos = produtos
      .map((p, i) => `${i + 1}. ${p.nome} - R$ ${p.preco.toFixed(2)}`)
      .join('\n');
    const escolha = window.prompt(`Escolha o produto (digite o número):\n${listaProdutos}`);
    const indice = Number(escolha) - 1;
    const produtoEscolhido = produtos[indice];
    if (!produtoEscolhido) return;

    const quantidadeStr = window.prompt('Quantidade:', '1');
    const quantidade = Number(quantidadeStr) || 1;

    const observacao = window.prompt('Observação (opcional):') || '';

    try {
      await api.post(`/comandas/${comandaId}/itens`, {
        produtoId: produtoEscolhido._id,
        quantidade,
        observacao: observacao.trim(),
      });
      carregarComandas();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao adicionar item.');
    }
  };

  const estornarItem = async (comandaId, itemId) => {
    const motivo = window.prompt('Motivo do estorno (obrigatório):'); // RF08
    if (!motivo?.trim()) return;
    await api.patch(`/comandas/${comandaId}/itens/${itemId}/estornar`, { motivo });
    carregarComandas();
  };

  const aplicarDesconto = async (comandaId, valorAtual) => {
    const valor = window.prompt('Desconto em % sobre o subtotal:', valorAtual || 0);
    if (valor == null) return;
    await api.patch(`/comandas/${comandaId}/desconto`, {
      tipo: 'percentual',
      valor: Number(valor) || 0,
    });
    carregarComandas();
  };

  // NOVO - fecha e paga uma comanda específica (divisão de conta)
  const fecharComandaIndividual = async (comanda) => {
    const total = calcularTotal(comanda);
    const valorStr = window.prompt(
      `Total da Comanda #${comanda.numero}: R$ ${total.toFixed(2)}\nValor recebido em dinheiro:`,
      total.toFixed(2)
    );
    if (valorStr == null) return;

    try {
      await api.post(`/pagamentos/comanda/${comanda._id}/fechar`, {
        metodos: [{ tipo: 'dinheiro', valor: Number(valorStr) || 0 }],
      });
      carregarComandas();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao fechar comanda.');
    }
  };

  const totalMesa = comandasAbertas.reduce((soma, c) => soma + calcularTotal(c), 0);

  // fecha e paga TODAS as comandas abertas da mesa de uma vez
  const fecharMesa = async () => {
    const valorStr = window.prompt(
      `Total da mesa: R$ ${totalMesa.toFixed(2)}\nValor recebido em dinheiro:`,
      totalMesa.toFixed(2)
    );
    if (valorStr == null) return;
    await api.post(`/pagamentos/mesa/${mesa._id}/fechar`, {
      metodos: [{ tipo: 'dinheiro', valor: Number(valorStr) || 0 }],
    });
    onMesaFechada();
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500">MESA</p>
          <p className="text-2xl font-bold">{String(mesa.numero).padStart(2, '0')}</p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs ${
            mesa.status === 'livre' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {mesa.status === 'livre' ? 'Livre' : 'Aberta'}
        </span>
      </div>

      {/* agora sempre visível (exceto aguardando fechamento) — permite abrir
          quantas comandas forem necessárias na mesma mesa */}
      {mesa.status !== 'aguardando_fechamento' && (
        <button
          onClick={abrirNovaComanda}
          className="mb-4 w-full rounded-md border border-primary py-2 text-sm font-medium text-primary"
        >
          + Nova Comanda
        </button>
      )}

      {!comandasAbertas.length && (
        <p className="text-sm text-neutral-400">Nenhuma comanda aberta.</p>
      )}

      {comandasAbertas.map((comanda) => (
        <div key={comanda._id} className="mb-4 rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Comanda #{comanda.numero}</p>
            <span className="text-xs text-neutral-500">{comanda.status}</span>
          </div>

          <table className="w-full text-sm">
            <thead className="text-left text-xs text-neutral-500">
              <tr>
                <th className="pb-1">Item</th>
                <th>Qtd</th>
                <th className="text-right">Valor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {comanda.itens
                .filter((i) => !i.estornado)
                .map((item) => (
                  <tr key={item._id} className="border-t">
                    <td className="py-1">
                      {item.nomeProduto}
                      {item.observacao && (
                        <span className="block text-xs text-neutral-500">{item.observacao}</span>
                      )}
                    </td>
                    <td>{item.quantidade}</td>
                    <td className="text-right">
                      R$ {(item.precoUnitario * item.quantidade).toFixed(2)}
                    </td>
                    <td className="pl-2 text-right">
                      <button
                        onClick={() => estornarItem(comanda._id, item._id)}
                        className="text-xs text-red-600"
                        title="Estornar item (RF07/RF08)"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={() => adicionarItem(comanda._id)}
              className="text-xs font-medium text-primary underline"
            >
              + Adicionar item
            </button>

            {/* NOVO - fecha só esta comanda (divisão de conta) */}
            <button
              onClick={() => fecharComandaIndividual(comanda)}
              className="text-xs font-medium text-green-700 underline"
            >
              Fechar comanda
            </button>
          </div>

          {podeAplicarDesconto && (
            <button
              onClick={() => aplicarDesconto(comanda._id, comanda.desconto?.valor)}
              className="mt-2 block text-xs text-primary underline"
            >
              {comanda.desconto?.valor ? `Desconto: ${comanda.desconto.valor}%` : 'Aplicar desconto'}
            </button>
          )}

          <div className="mt-2 flex justify-between border-t pt-2 text-sm font-semibold">
            <span>Total da comanda</span>
            <span>R$ {calcularTotal(comanda).toFixed(2)}</span>
          </div>
        </div>
      ))}

      {!!comandasAbertas.length && (
        <>
          <div className="mb-3 flex justify-between border-t pt-3 text-base font-bold">
            <span>TOTAL DA MESA</span>
            <span>R$ {totalMesa.toFixed(2)}</span>
          </div>
          <button
            onClick={fecharMesa}
            className="w-full rounded-md bg-primary py-2 text-sm font-medium text-white"
          >
            ✓ Fechar Mesa (todas as comandas)
          </button>
        </>
      )}
    </div>
  );
}

function calcularTotal(comanda) {
  const subtotal = comanda.itens
    .filter((i) => !i.estornado)
    .reduce((soma, i) => soma + i.precoUnitario * i.quantidade, 0);

  const valorDesconto =
    comanda.desconto?.tipo === 'percentual'
      ? subtotal * ((comanda.desconto.valor || 0) / 100)
      : comanda.desconto?.valor || 0;

  return subtotal - valorDesconto + (comanda.taxaServico?.valor || 0);
}