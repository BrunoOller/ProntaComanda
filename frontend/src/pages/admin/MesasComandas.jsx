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
    });
  }, [socketRef]);

  // RF04 - verde = livre, vermelho = ocupada/atenção (RNF03)
  const corBorda = (status) => (status === 'livre' ? 'border-green-500' : 'border-red-500');

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
            <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">
              + Adicionar Mesa
            </button>
            <button className="rounded-md bg-red-600 px-4 py-2 text-sm text-white">Remover</button>
          </div>
        </div>

        {mesaSelecionada ? (
          <PainelMesa
            mesa={mesaSelecionada}
            onMesaFechada={() => {
              setMesaSelecionada(null);
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
function PainelMesa({ mesa, onMesaFechada }) {
  const [comandas, setComandas] = useState([]);
  const funcionario = useAuthStore((s) => s.funcionario);
  const podeAplicarDesconto = funcionario?.perfil === 'administrador';

  const carregarComandas = useCallback(() => {
    api.get(`/comandas/mesa/${mesa._id}`).then((r) => setComandas(r.data));
  }, [mesa._id]);

  useEffect(() => {
    carregarComandas();
  }, [carregarComandas]);

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

  const totalMesa = comandas.reduce((soma, c) => soma + calcularTotal(c), 0);

  const fecharMesa = async () => {
    const valorStr = window.prompt(`Total da mesa: R$ ${totalMesa.toFixed(2)}\nValor recebido em dinheiro:`, totalMesa.toFixed(2));
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

      {!comandas.length && <p className="text-sm text-neutral-400">Nenhuma comanda aberta.</p>}

      {comandas.map((comanda) => (
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
                        <span className="block text-xs text-neutral-500">
                          {item.observacao}
                        </span>
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

          {/* RF09 - Concessões Financeiras: restrito ao Administrador */}
          {podeAplicarDesconto && (
            <button
              onClick={() => aplicarDesconto(comanda._id, comanda.desconto?.valor)}
              className="mt-2 text-xs text-primary underline"
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

      {!!comandas.length && (
        <>
          <div className="mb-3 flex justify-between border-t pt-3 text-base font-bold">
            <span>TOTAL DA MESA</span>
            <span>R$ {totalMesa.toFixed(2)}</span>
          </div>
          <button
            onClick={fecharMesa}
            className="w-full rounded-md bg-primary py-2 text-sm font-medium text-white"
          >
            ✓ Fechar Mesa
          </button>
        </>
      )}
    </div>
  );
}

// Espelha o mesmo cálculo do backend (pagamento.controller.js) só para
// exibição em tempo real antes do fechamento — o valor "oficial" que fica
// salvo é sempre recalculado no servidor no momento de fechar a mesa.
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
