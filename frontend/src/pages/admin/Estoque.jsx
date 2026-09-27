import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axiosClient';

const UNIDADES = ['un', 'kg', 'g', 'l', 'ml'];

// Aceita "5" e "5,5" (o jeito natural de digitar no Brasil).
const lerNumero = (texto) => Number(String(texto).trim().replace(',', '.'));

// RF10 - Gestão e Entrada de Estoque
export default function Estoque() {
  const [insumos, setInsumos] = useState([]);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [erroLista, setErroLista] = useState('');

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/estoque', {
        params: { ativo: mostrarInativos ? 'todos' : 'true' },
      });
      setInsumos(data);
      setErroLista('');
    } catch (err) {
      setErroLista(err.response?.data?.erro || 'Não foi possível carregar o estoque.');
    }
  }, [mostrarInativos]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ---------- cadastrar ----------
  const cadastrarInsumo = async () => {
    const nome = window.prompt('Nome do insumo:');
    if (!nome?.trim()) return;

    const unidade = window.prompt(`Unidade (${UNIDADES.join(', ')}):`, 'un');
    if (unidade === null) return;
    if (!UNIDADES.includes(unidade.trim())) {
      window.alert(`Unidade inválida. Use uma de: ${UNIDADES.join(', ')}.`);
      return;
    }

    const saldoStr = window.prompt('Saldo inicial:', '0');
    if (saldoStr === null) return;
    const saldoAtual = lerNumero(saldoStr);
    if (Number.isNaN(saldoAtual) || saldoAtual < 0) {
      window.alert('Saldo inválido.');
      return;
    }

    const minimoStr = window.prompt('Saldo mínimo (dispara alerta abaixo dele):', '0');
    if (minimoStr === null) return;
    const saldoMinimo = lerNumero(minimoStr);
    if (Number.isNaN(saldoMinimo) || saldoMinimo < 0) {
      window.alert('Saldo mínimo inválido.');
      return;
    }

    try {
      await api.post('/estoque', {
        nome: nome.trim(),
        unidade: unidade.trim(),
        saldoAtual,
        saldoMinimo,
      });
      carregar();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao cadastrar insumo.');
    }
  };

  const editarInsumo = async (i) => {
    const nome = window.prompt('Nome do insumo:', i.nome);
    if (nome === null) return;
    if (!nome.trim()) {
      window.alert('O nome não pode ficar vazio.');
      return;
    }

    const minimoStr = window.prompt('Saldo mínimo:', String(i.saldoMinimo ?? 0));
    if (minimoStr === null) return;
    const saldoMinimo = lerNumero(minimoStr);
    if (Number.isNaN(saldoMinimo) || saldoMinimo < 0) {
      window.alert('Saldo mínimo inválido.');
      return;
    }

    try {
      await api.put(`/estoque/${i._id}`, { nome: nome.trim(), saldoMinimo });
      carregar();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao editar insumo.');
    }
  };

  // RNF11 - inativa em vez de apagar; o histórico de movimentações é mantido.
  const removerInsumo = async (i) => {
    if (!window.confirm(`Remover "${i.nome}" do estoque?`)) return;
    try {
      await api.delete(`/estoque/${i._id}`);
      carregar();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao remover insumo.');
    }
  };

  const reativarInsumo = async (i) => {
    try {
      await api.patch(`/estoque/${i._id}/reativar`);
      carregar();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao reativar insumo.');
    }
  };

  // ---------- movimentar ----------
  const movimentar = async (i, tipo) => {
    const rotulos = { entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste' };
    const quantidadeStr = window.prompt(
      `${rotulos[tipo]} de ${i.nome} — quantidade (${i.unidade}):`
    );
    if (quantidadeStr === null) return;
    const quantidade = lerNumero(quantidadeStr);
    if (Number.isNaN(quantidade) || quantidade <= 0) {
      window.alert('Quantidade inválida.');
      return;
    }

    let motivo;
    if (tipo === 'ajuste') {
      motivo = window.prompt('Motivo do ajuste (obrigatório):');
      if (motivo === null) return;
      if (!motivo.trim() || motivo.trim().length < 3) {
        window.alert('Informe um motivo com ao menos 3 caracteres.');
        return;
      }
    }

    try {
      await api.post(`/estoque/${i._id}/movimentar`, { tipo, quantidade, motivo: motivo?.trim() });
      carregar();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao movimentar estoque.');
    }
  };

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Estoque</h1>
          <p className="text-sm text-neutral-500">
            Controle o saldo de insumos e registre entradas, saídas e ajustes
          </p>
        </div>
        <button
          onClick={cadastrarInsumo}
          className="rounded-md bg-primary px-4 py-2 text-sm text-white"
        >
          + Adicionar insumo
        </button>
      </div>

      <label className="mb-3 flex items-center gap-2 text-sm text-neutral-600">
        <input
          type="checkbox"
          checked={mostrarInativos}
          onChange={(e) => setMostrarInativos(e.target.checked)}
        />
        Mostrar removidos
      </label>

      {erroLista && <p className="mb-3 text-sm text-red-600">{erroLista}</p>}

      <table className="w-full text-left text-sm">
        <thead className="border-b text-neutral-500">
          <tr>
            <th className="py-2">Insumo</th>
            <th>Saldo atual</th>
            <th>Saldo mínimo</th>
            <th>Opções</th>
          </tr>
        </thead>
        <tbody>
          {insumos.map((i) => {
            // RF22 - mesmo alerta visual (cor) usado no resto do sistema:
            // vermelho zerado, amarelo abaixo do mínimo, verde OK.
            const zerado = i.saldoAtual === 0;
            const abaixoDoMinimo = !zerado && i.saldoAtual < (i.saldoMinimo ?? 0);

            return (
              <tr key={i._id} className={`border-b ${i.ativo ? '' : 'text-neutral-400'}`}>
                <td className="py-2">
                  {i.nome}
                  {!i.ativo && (
                    <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-xs">
                      removido
                    </span>
                  )}
                </td>
                <td>
                  <span
                    className={
                      zerado
                        ? 'font-semibold text-red-600'
                        : abaixoDoMinimo
                          ? 'font-semibold text-yellow-600'
                          : ''
                    }
                  >
                    {i.saldoAtual} {i.unidade}
                  </span>
                </td>
                <td>
                  {i.saldoMinimo} {i.unidade}
                </td>
                <td className="space-x-2 py-2">
                  {i.ativo ? (
                    <>
                      <button
                        onClick={() => movimentar(i, 'entrada')}
                        className="rounded border px-2 py-1"
                      >
                        Entrada
                      </button>
                      <button
                        onClick={() => movimentar(i, 'saida')}
                        className="rounded border px-2 py-1"
                      >
                        Saída
                      </button>
                      <button
                        onClick={() => movimentar(i, 'ajuste')}
                        className="rounded border px-2 py-1"
                      >
                        Ajuste
                      </button>
                      <button onClick={() => editarInsumo(i)} className="rounded border px-2 py-1">
                        Editar
                      </button>
                      <button
                        onClick={() => removerInsumo(i)}
                        className="rounded bg-neutral-900 px-2 py-1 text-white"
                      >
                        Remover
                      </button>
                    </>
                  ) : (
                    <button onClick={() => reativarInsumo(i)} className="rounded border px-2 py-1">
                      Reativar
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {!insumos.length && !erroLista && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-neutral-500">
                Nenhum insumo cadastrado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </AdminLayout>
  );
}
