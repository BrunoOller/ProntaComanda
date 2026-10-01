const cron = require('node-cron');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));

const logger = require('../utils/logger');
const { Comanda, Pagamento, ResumoMensal } = require('../models');

/**
 * RF14 - Consolidação Mensal de Dados (Data Rollup)
 * RF15 - Expurgamento Automatizado
 * RF16 - Automação Oculta de Virada de Mês (sem botão na UI)
 *
 * Regras:
 *  - Só consolida/expurga MESES JÁ ENCERRADOS e só comandas FECHADAS.
 *    Comanda ainda aberta na virada do mês nunca é apagada: ela entra no
 *    resumo do mês em que for fechada.
 *  - A comanda pertence ao mês em que foi FECHADA (`fechadaEm`), o mesmo
 *    critério do faturamento (pagamento).
 *  - Fronteiras de mês calculadas no fuso do estabelecimento, não no do
 *    servidor (importante ao migrar para nuvem, onde o servidor costuma
 *    estar em UTC). Configurável em TZ_ESTABELECIMENTO.
 *  - Roda todo dia 1 às 00:05 E na inicialização do servidor. Se o
 *    computador estava desligado na virada do mês, o próximo start
 *    recupera os meses pendentes ("catch-up").
 *  - Idempotente: só depois de o resumo estar salvo é que os registros
 *    individuais são apagados; se o expurgo falhar no meio, a próxima
 *    execução retoma só o expurgo.
 */
const TIMEZONE = process.env.TZ_ESTABELECIMENTO || 'America/Sao_Paulo';

const agoraNoFuso = () => dayjs().tz(TIMEZONE);
// Somas em ponto flutuante geram dízimas; valores em reais saem com 2 casas.
const arredondar = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;

async function consolidarMes(ano, mes) {
  const referencia = dayjs.tz(`${ano}-${String(mes).padStart(2, '0')}-01`, TIMEZONE);
  const inicio = referencia.startOf('month').toDate();
  const fim = referencia.endOf('month').toDate();

  const filtroComandas = { status: 'fechada', fechadaEm: { $gte: inicio, $lte: fim } };
  const filtroPagamentos = { createdAt: { $gte: inicio, $lte: fim } };

  let resumo = await ResumoMensal.findOne({ ano, mes });
  if (resumo?.expurgado) return false; // mês já concluído

  // ---- Passo 1: consolidar (pula se um run anterior já salvou o resumo) ----
  if (!resumo) {
    const comandas = await Comanda.find(filtroComandas).lean();
    const pagamentos = await Pagamento.find({ ...filtroPagamentos, estornado: false }).lean();

    const porProduto = new Map();
    const motivosEstorno = new Map();

    for (const comanda of comandas) {
      for (const item of comanda.itens) {
        const valorItem = item.precoUnitario * item.quantidade;

        if (item.estornado) {
          const motivo = item.motivoEstorno || 'Não informado';
          const atual = motivosEstorno.get(motivo) || { ocorrencias: 0, valorPerdido: 0 };
          atual.ocorrencias += 1;
          atual.valorPerdido += valorItem;
          motivosEstorno.set(motivo, atual);
          continue;
        }

        const atual = porProduto.get(item.nomeProduto) || {
          produto: item.produto,
          quantidadeVendida: 0,
          valorTotal: 0,
        };
        atual.quantidadeVendida += item.quantidade;
        atual.valorTotal += valorItem;
        porProduto.set(item.nomeProduto, atual);
      }
    }

    try {
      resumo = await ResumoMensal.create({
        ano,
        mes,
        faturamentoTotal: arredondar(pagamentos.reduce((soma, p) => soma + p.valorTotal, 0)),
        totalPedidos: comandas.length,
        totalCancelamentos: [...motivosEstorno.values()].reduce((s, m) => s + m.ocorrencias, 0),
        totalPorProduto: [...porProduto.entries()].map(([nomeProduto, v]) => ({
          nomeProduto,
          ...v,
          valorTotal: arredondar(v.valorTotal),
        })),
        motivosEstorno: [...motivosEstorno.entries()].map(([motivo, v]) => ({
          motivo,
          ...v,
          valorPerdido: arredondar(v.valorPerdido),
        })),
      });
    } catch (err) {
      if (err.code === 11000) return false; // outro processo consolidou este mês primeiro
      throw err;
    }
  }

  // ---- Passo 2 (RF15): expurgar, só com o resumo já confirmado no banco ----
  await Comanda.deleteMany(filtroComandas);
  await Pagamento.deleteMany(filtroPagamentos);

  resumo.expurgado = true;
  resumo.expurgadoEm = new Date();
  await resumo.save();

  logger.info(`Rollup mensal concluído: ${String(mes).padStart(2, '0')}/${ano}`);
  return true;
}

/**
 * Consolida todos os meses encerrados que ainda não foram processados, do
 * mês da comanda fechada mais antiga até o mês passado. O mês corrente
 * nunca é tocado. `agora` existe para permitir testes.
 */
async function executarRollup(agora = agoraNoFuso()) {
  const inicioMesAtual = agora.startOf('month');

  const maisAntiga = await Comanda.findOne({
    status: 'fechada',
    fechadaEm: { $lt: inicioMesAtual.toDate() },
  })
    .sort({ fechadaEm: 1 })
    .lean();
  if (!maisAntiga) return;

  let mes = dayjs(maisAntiga.fechadaEm).tz(TIMEZONE).startOf('month');
  while (mes.isBefore(inicioMesAtual)) {
    await consolidarMes(mes.year(), mes.month() + 1);
    mes = mes.add(1, 'month');
  }
}

// RF16 - agendamento oculto, sem qualquer botão na interface
function agendarRollupMensal() {
  const rodar = () =>
    executarRollup().catch((err) => logger.error('Falha no rollup mensal', { error: err.message }));

  cron.schedule('5 0 1 * *', rodar, { timezone: TIMEZONE });
  rodar(); // catch-up: recupera meses pendentes se o servidor ficou desligado na virada
}

module.exports = { agendarRollupMensal, executarRollup, consolidarMes };
