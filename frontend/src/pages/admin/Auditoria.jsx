import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axiosClient';

// Nome legível de cada tipo gravado em LogAuditoria. Tipo novo que ainda não
// estiver aqui aparece com o nome cru, então nada some da tela.
const ROTULOS = {
  erro_sistema: 'Erro do sistema',
  estorno_item: 'Estorno de item',
  desconto_aplicado: 'Desconto aplicado',
  reabertura_comanda: 'Reabertura de comanda',
  reabertura_mesa: 'Reabertura de mesa',
  ajuste_estoque: 'Ajuste de estoque',
  funcionario_criado: 'Funcionário cadastrado',
  funcionario_atualizado: 'Funcionário atualizado',
  funcionario_desligado: 'Funcionário desligado',
  funcionario_reativado: 'Funcionário reativado',
  produto_preco_alterado: 'Preço alterado',
  produto_inativado: 'Produto removido',
  produto_reativado: 'Produto reativado',
};
const rotulo = (tipo) => ROTULOS[tipo] ?? tipo;

const moeda = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const eId = (v) => typeof v === 'string' && /^[0-9a-f]{24}$/i.test(v);

// Uma frase por registro, a partir do que cada módulo grava em `detalhes`.
function resumir(tipo, d) {
  if (!d || !Object.keys(d).length) return '—'; // registro sem detalhes
  switch (tipo) {
    case 'estorno_item':
      return `Comanda #${d.numero}: ${d.item} (${moeda(d.valor)}). Motivo: ${d.motivo}`;
    case 'desconto_aplicado': {
      const desconto = d.tipo === 'percentual' ? `${d.valor}%` : moeda(d.valor);
      return `Comanda #${d.numero}: desconto de ${desconto}${d.observacao ? ` (${d.observacao})` : ''}`;
    }
    case 'reabertura_mesa':
      return `Mesa ${d.numero}: pagamento de ${moeda(d.valorEstornado)} estornado, ${
        d.comandasReabertas?.length ?? 0
      } comanda(s) reaberta(s)`;
    case 'ajuste_estoque':
      return `${d.insumo}: de ${d.de} para ${d.para}. Motivo: ${d.motivo}`;
    case 'produto_preco_alterado':
      return `${d.produto}: de ${moeda(d.de)} para ${moeda(d.para)}`;
    case 'produto_inativado':
    case 'produto_reativado':
      return d.produto;
    case 'funcionario_criado':
      return `${d.alvo} (${d.perfil})`;
    case 'funcionario_atualizado':
      return `${d.alvo}. Campos: ${(d.campos ?? []).join(', ')}`;
    case 'funcionario_desligado':
    case 'funcionario_reativado':
      return d.alvo;
    case 'erro_sistema':
      return d.mensagem;
    default:
      // tipo sem resumo próprio: mostra chave: valor, sem os ids que não ajudam a ler
      return Object.entries(d)
        .filter(([, v]) => !eId(v) && !Array.isArray(v))
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');
  }
}

// Mostra o primeiro erro de campo devolvido pelo backend (400) ou a mensagem geral.
function mensagemErro(err, padrao) {
  const detalhes = err.response?.data?.detalhes;
  const primeiro = detalhes && Object.values(detalhes)[0]?.[0];
  return primeiro || err.response?.data?.erro || padrao;
}

const FILTROS_VAZIOS = { tipo: '', funcionario: '', de: '', ate: '' };

// RF17 - relatórios de auditoria (somente leitura)
export default function Auditoria() {
  const [tipos, setTipos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState({ itens: [], total: 0, totalPaginas: 1 });
  const [erro, setErro] = useState('');

  // opções dos filtros: carregadas uma vez
  useEffect(() => {
    api.get('/auditoria/tipos').then((r) => setTipos(r.data));
    api.get('/funcionarios', { params: { ativo: 'todos' } }).then((r) => setFuncionarios(r.data));
  }, []);

  const carregar = useCallback(async () => {
    // só manda o que foi preenchido (o backend recusa string vazia em data/id)
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
    try {
      const { data } = await api.get('/auditoria', { params: { ...params, pagina } });
      setDados(data);
      setErro('');
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível carregar a auditoria.'));
    }
  }, [filtros, pagina]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const alterarFiltro = (campo, valor) => {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
    setPagina(1); // filtro novo sempre volta para a primeira página
  };

  const campo = 'rounded-md border px-3 py-2 text-sm';

  return (
    <AdminLayout>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Auditoria</h1>
        <p className="text-sm text-neutral-500">
          Registro das ações sensíveis feitas no sistema: estornos, descontos, reaberturas, ajustes
          de estoque e mudanças de equipe e de preços
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Ação
          <select
            value={filtros.tipo}
            onChange={(e) => alterarFiltro('tipo', e.target.value)}
            className={`${campo} mt-1 block`}
          >
            <option value="">Todas</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {rotulo(t)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Funcionário
          <select
            value={filtros.funcionario}
            onChange={(e) => alterarFiltro('funcionario', e.target.value)}
            className={`${campo} mt-1 block`}
          >
            <option value="">Todos</option>
            {funcionarios.map((f) => (
              <option key={f._id} value={f._id}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          De
          <input
            type="date"
            value={filtros.de}
            onChange={(e) => alterarFiltro('de', e.target.value)}
            className={`${campo} mt-1 block`}
          />
        </label>

        <label className="text-sm">
          Até
          <input
            type="date"
            value={filtros.ate}
            onChange={(e) => alterarFiltro('ate', e.target.value)}
            className={`${campo} mt-1 block`}
          />
        </label>

        <button
          onClick={() => {
            setFiltros(FILTROS_VAZIOS);
            setPagina(1);
          }}
          className="rounded-md border px-3 py-2 text-sm"
        >
          Limpar filtros
        </button>
      </div>

      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}

      <table className="w-full text-left text-sm">
        <thead className="border-b text-neutral-500">
          <tr>
            <th className="py-2">Data e hora</th>
            <th>Quem</th>
            <th>Ação</th>
            <th>Detalhes</th>
          </tr>
        </thead>
        <tbody>
          {dados.itens.map((registro) => (
            <tr key={registro._id} className="border-b align-top">
              <td className="whitespace-nowrap py-2 pr-3">
                {new Date(registro.createdAt).toLocaleString('pt-BR')}
              </td>
              <td className="pr-3">{registro.funcionario?.nome ?? 'Sistema'}</td>
              <td className="pr-3">
                <span
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    registro.tipo === 'erro_sistema'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  {rotulo(registro.tipo)}
                </span>
              </td>
              <td className="py-2">{resumir(registro.tipo, registro.detalhes)}</td>
            </tr>
          ))}
          {!dados.itens.length && !erro && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-neutral-500">
                Nenhum registro encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
        <span>
          {dados.total} registro(s) · página {pagina} de {dados.totalPaginas}
        </span>
        <div className="space-x-2">
          <button
            onClick={() => setPagina((p) => p - 1)}
            disabled={pagina <= 1}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            onClick={() => setPagina((p) => p + 1)}
            disabled={pagina >= dados.totalPaginas}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
