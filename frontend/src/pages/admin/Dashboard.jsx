import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axiosClient';

const formatarMoeda = (valor) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);

const PERIODOS = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: 'semana', rotulo: 'Esta semana' },
  { valor: 'mes', rotulo: 'Este mês' },
];

const ROTULO_STATUS = {
  pendente: 'Pendente',
  em_preparo: 'Em preparo',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

// cores do tema (mesma paleta usada no resto do admin: laranja = destaque)
const LARANJA = '#ea580c';
const CINZA = '#d4d4d4';
const VERDE = '#16a34a';
const VERMELHO = '#f87171';

// RF17 - Dashboard de Gestão (BI)
export default function Dashboard() {
  const [periodo, setPeriodo] = useState('mes');
  const [visaoGeral, setVisaoGeral] = useState(null);
  const [faturamentoMensal, setFaturamentoMensal] = useState([]);
  const [statusPedidos, setStatusPedidos] = useState([]);
  const [topProdutos, setTopProdutos] = useState([]);
  const [erro, setErro] = useState('');

  // O gráfico "Faturamento por Mês" é sempre os últimos 12 meses — não muda
  // com o filtro de período, então carrega uma vez só.
  useEffect(() => {
    api
      .get('/dashboard/faturamento-mensal')
      .then((r) => setFaturamentoMensal(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setErro('');
    Promise.all([
      api.get('/dashboard/visao-geral', { params: { periodo } }),
      api.get('/dashboard/status-pedidos', { params: { periodo } }),
      api.get('/dashboard/top-produtos', { params: { periodo } }),
    ])
      .then(([geral, status, produtos]) => {
        setVisaoGeral(geral.data);
        setStatusPedidos(status.data);
        setTopProdutos(produtos.data);
      })
      .catch(() => setErro('Não foi possível carregar o dashboard agora.'));
  }, [periodo]);

  return (
    <AdminLayout>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-sm text-neutral-500">Visão geral do seu negócio em tempo real</p>
        </div>
        <div className="flex rounded-md border p-1 text-sm">
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              onClick={() => setPeriodo(p.valor)}
              className={`rounded px-3 py-1 ${
                periodo === p.valor ? 'bg-primary text-white' : 'text-neutral-600'
              }`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      </div>

      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Cartao titulo="Ganhos Totais" item={visaoGeral?.ganhoTotal} formato={formatarMoeda} />
        <Cartao titulo="Total de Pedidos" item={visaoGeral?.totalPedidos} />
        <Cartao titulo="Ticket Médio" item={visaoGeral?.ticketMedio} formato={formatarMoeda} />
        <Cartao
          titulo="Pedidos Cancelados"
          item={visaoGeral?.pedidosCancelados}
          corVariacaoInvertida
        />
        <Cartao titulo="Taxa de Conversão" item={visaoGeral?.taxaConversao} sufixo="%" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-neutral-600">Faturamento por mês</h2>
          <GraficoFaturamento dados={faturamentoMensal} />
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-600">Taxa de conversão</h2>
          <GraficoConversao percentual={visaoGeral?.taxaConversao?.valor ?? 0} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-600">Top 5 produtos</h2>
          <ListaComBarras
            vazio="Nenhum produto vendido neste período."
            itens={topProdutos.map((p, i) => ({
              chave: p.nomeProduto,
              rotulo: `${i + 1}. ${p.nomeProduto}`,
              valor: p.valorTotal,
              proporcao: topProdutos[0] ? p.valorTotal / topProdutos[0].valorTotal : 0,
              extra: formatarMoeda(p.valorTotal),
            }))}
          />
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-600">Status dos pedidos</h2>
          <ListaComBarras
            vazio="Nenhum pedido neste período."
            itens={statusPedidos
              .filter((s) => s.quantidade > 0)
              .map((s) => ({
                chave: s.status,
                rotulo: ROTULO_STATUS[s.status] ?? s.status,
                valor: s.quantidade,
                proporcao: s.percentual / 100,
                extra: `${s.quantidade} (${s.percentual}%)`,
              }))}
          />
        </div>
      </div>
    </AdminLayout>
  );
}

function Cartao({ titulo, item, formato, sufixo = '', corVariacaoInvertida = false }) {
  const valor = item?.valor;
  const variacao = item?.variacao;
  // Para "Pedidos Cancelados", subir é ruim: inverte a cor (verde/vermelho).
  const subiuEhBom = !corVariacaoInvertida;
  const corVariacao =
    variacao == null
      ? 'text-neutral-400'
      : variacao >= 0 === subiuEhBom
        ? 'text-green-600'
        : 'text-red-600';

  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-neutral-500">{titulo}</p>
      <p className="mt-1 text-xl font-semibold">
        {valor != null ? `${formato ? formato(valor) : valor}${sufixo}` : '—'}
      </p>
      <p className={`mt-1 text-xs ${corVariacao}`}>
        {variacao == null
          ? 'sem comparação'
          : `${variacao >= 0 ? '▲' : '▼'} ${Math.abs(variacao)}% vs período anterior`}
      </p>
    </div>
  );
}

// Faturamento por Mês (ApexCharts: barras) — o mês atual sai destacado em
// laranja, os outros 11 em cinza, igual ao protótipo do Figma.
function GraficoFaturamento({ dados }) {
  if (!dados.length) return <p className="text-sm text-neutral-400">Sem dados ainda.</p>;

  const opcoes = {
    chart: { toolbar: { show: false }, fontFamily: 'inherit' },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%', distributed: true } },
    dataLabels: { enabled: false },
    legend: { show: false },
    colors: dados.map((d) => (d.mesAtual ? LARANJA : CINZA)),
    xaxis: {
      categories: dados.map((d) => d.rotulo),
      labels: { style: { fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v),
        style: { fontSize: '11px' },
      },
    },
    grid: { borderColor: '#f1f1f1' },
    tooltip: { y: { formatter: formatarMoeda } },
  };
  const series = [{ name: 'Faturamento', data: dados.map((d) => d.faturamento) }];

  return <Chart options={opcoes} series={series} type="bar" height={260} />;
}

// Taxa de Conversão (ApexCharts: donut) — concluídos vs. cancelados, com o
// percentual escrito no centro, igual ao protótipo.
function GraficoConversao({ percentual }) {
  const cancelados = Number((100 - percentual).toFixed(1));

  const opcoes = {
    chart: { fontFamily: 'inherit' },
    labels: ['Concluídos', 'Cancelados'],
    colors: [VERDE, VERMELHO],
    dataLabels: { enabled: false },
    legend: { position: 'bottom', fontSize: '12px', markers: { size: 6 } },
    stroke: { width: 0 },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            value: { fontSize: '22px', fontWeight: 600, formatter: (v) => `${v}%` },
            total: {
              show: true,
              label: 'Concluídos',
              fontSize: '11px',
              color: '#737373',
              formatter: () => `${percentual}%`,
            },
          },
        },
      },
    },
    tooltip: { y: { formatter: (v) => `${v}%` } },
  };
  const series = [percentual, cancelados];

  return <Chart options={opcoes} series={series} type="donut" height={240} />;
}

// Lista com barra de proporção — usada tanto pelo Top 5 Produtos quanto
// pelo Status dos Pedidos, só muda o que cada barra representa.
function ListaComBarras({ itens, vazio }) {
  if (!itens.length) return <p className="text-sm text-neutral-400">{vazio}</p>;

  return (
    <ul className="space-y-3 text-sm">
      {itens.map((it) => (
        <li key={it.chave}>
          <div className="mb-1 flex items-center justify-between">
            <span>{it.rotulo}</span>
            <span className="text-neutral-500">{it.extra}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-neutral-100">
            <div
              className="h-1.5 rounded-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, it.proporcao * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
