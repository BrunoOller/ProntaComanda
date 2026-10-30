/**
 * RF17 / RF13 - Relatório de gestão em PDF, gerado no navegador a partir dos
 * MESMOS dados que o Dashboard já carregou (nada de rota nova no backend).
 *
 * O PDF é desenhado direto com o jsPDF (cartões, gráfico de barras e tabelas),
 * então sai nítido e não depende de "tirar foto" da tela. O jsPDF só é baixado
 * quando o administrador clica em "Exportar PDF" (import dinâmico), para não
 * pesar o carregamento das outras telas.
 *
 * Só usamos a fonte padrão do PDF (Helvetica), que cobre acentos e "R$". Por
 * isso evitamos símbolos como setas ou travessões longos.
 */

const LARGURA = 210; // A4, em mm
const ALTURA = 297;
const MARGEM = 15;
const LARGURA_UTIL = LARGURA - 2 * MARGEM;
const LIMITE_INFERIOR = ALTURA - 20; // deixa espaço para o rodapé

const COR = {
  laranja: [234, 88, 12], // mesma cor de destaque do sistema
  laranjaClaro: [253, 186, 116],
  texto: [23, 23, 23],
  cinza: [115, 115, 115],
  cinzaClaro: [212, 212, 212],
  fundo: [250, 250, 250],
  borda: [229, 229, 229],
  verde: [22, 163, 74],
  vermelho: [220, 38, 38],
  vermelhoClaro: [248, 113, 113],
  branco: [255, 255, 255],
};

// O servidor devolve o mês abreviado em inglês ("Dec", "Apr"...). No relatório
// em português traduzimos; rótulos que já vierem em português passam direto.
const MESES_EN_PT = {
  jan: 'jan',
  feb: 'fev',
  mar: 'mar',
  apr: 'abr',
  may: 'mai',
  jun: 'jun',
  jul: 'jul',
  aug: 'ago',
  sep: 'set',
  oct: 'out',
  nov: 'nov',
  dec: 'dez',
};
export const rotuloDoMes = (rotulo) =>
  MESES_EN_PT[
    String(rotulo ?? '')
      .trim()
      .toLowerCase()
  ] ?? String(rotulo ?? '');

// O Intl usa um espaço "sem quebra" depois de "R$"; trocamos por espaço comum
// para a fonte do PDF nunca mostrar um caractere estranho.
const semEspacoEspecial = (texto) => texto.replace(/[\u00a0\u202f]/g, ' ');

export const moeda = (valor) =>
  semEspacoEspecial(
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0)
  );
const inteiro = (valor) => new Intl.NumberFormat('pt-BR').format(valor ?? 0);
const decimal = (valor, casas = 1) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas }).format(
    valor ?? 0
  );

// valores do eixo do gráfico: 1.200 vira "1,2 mil"
const compacto = (valor) =>
  valor >= 1000 ? `${decimal(valor / 1000, 1)} mil` : decimal(valor, valor % 1 ? 2 : 0);

function dataHora(data) {
  return semEspacoEspecial(
    new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(data)
  );
}

// Escolhe um teto "redondo" para o eixo (1, 2, 2.5, 5, 10 x potência de 10).
function escalaDoEixo(maximo) {
  if (!(maximo > 0)) return 1;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  const fracao = maximo / potencia;
  const bonito = [1, 2, 2.5, 5, 10].find((n) => fracao <= n) ?? 10;
  return bonito * potencia;
}

function cortarTexto(doc, texto, larguraMax) {
  if (doc.getTextWidth(texto) <= larguraMax) return texto;
  let cortado = texto;
  while (cortado.length > 1 && doc.getTextWidth(`${cortado}...`) > larguraMax) {
    cortado = cortado.slice(0, -1);
  }
  return `${cortado.trimEnd()}...`;
}

const cor = (doc, [r, g, b], tipo = 'text') => {
  if (tipo === 'text') doc.setTextColor(r, g, b);
  else if (tipo === 'fill') doc.setFillColor(r, g, b);
  else doc.setDrawColor(r, g, b);
};

// ---------------------------------------------------------------------------
// Blocos do relatório
// ---------------------------------------------------------------------------

function cabecalho(doc, { estabelecimento, periodoRotulo, geradoEm, geradoPor }) {
  cor(doc, COR.laranja, 'fill');
  doc.rect(0, 0, LARGURA, 30, 'F');

  cor(doc, COR.branco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(estabelecimento, MARGEM, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Relatório de gestão', MARGEM, 22);

  doc.setFontSize(9);
  doc.text(`Período: ${periodoRotulo}`, LARGURA - MARGEM, 13, { align: 'right' });
  doc.text(`Gerado em ${dataHora(geradoEm)}`, LARGURA - MARGEM, 18.5, { align: 'right' });
  if (geradoPor) doc.text(`Por ${geradoPor}`, LARGURA - MARGEM, 24, { align: 'right' });

  return 40;
}

function tituloSecao(doc, texto, y) {
  cor(doc, COR.texto);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(texto, MARGEM, y);
  cor(doc, COR.laranja, 'draw');
  doc.setLineWidth(0.6);
  doc.line(MARGEM, y + 2, MARGEM + 14, y + 2);
  return y + 8;
}

// Se a seção não cabe no resto da página, começa uma nova.
function garantirEspaco(doc, y, altura) {
  if (y + altura <= LIMITE_INFERIOR) return y;
  doc.addPage();
  return 20;
}

function textoVariacao(item) {
  const v = item?.variacao;
  if (v === null || v === undefined)
    return { texto: 'sem período anterior para comparar', cor: COR.cinza };
  const sinal = v > 0 ? '+' : '';
  return {
    texto: `${sinal}${decimal(v, 1)}% vs. período anterior`,
    positivo: v > 0,
    negativo: v < 0,
  };
}

function cartoes(doc, y, visaoGeral) {
  const validos =
    (visaoGeral?.totalPedidos?.valor ?? 0) - (visaoGeral?.pedidosCancelados?.valor ?? 0);

  const lista = [
    {
      titulo: 'Ganhos totais',
      valor: moeda(visaoGeral?.ganhoTotal?.valor),
      item: visaoGeral?.ganhoTotal,
    },
    {
      titulo: 'Total de pedidos',
      valor: inteiro(visaoGeral?.totalPedidos?.valor),
      item: visaoGeral?.totalPedidos,
    },
    {
      titulo: 'Ticket médio',
      valor: moeda(visaoGeral?.ticketMedio?.valor),
      item: visaoGeral?.ticketMedio,
    },
    {
      titulo: 'Pedidos cancelados',
      valor: inteiro(visaoGeral?.pedidosCancelados?.valor),
      item: visaoGeral?.pedidosCancelados,
      invertido: true, // aumentar cancelamentos é ruim
    },
    {
      titulo: 'Taxa de conversão',
      valor: `${decimal(visaoGeral?.taxaConversao?.valor, 1)}%`,
      item: visaoGeral?.taxaConversao,
    },
    {
      titulo: 'Pedidos válidos',
      valor: inteiro(validos),
      item: null,
      nota: 'total menos cancelados',
    },
  ];

  const colunas = 3;
  const folga = 3;
  const largura = (LARGURA_UTIL - folga * (colunas - 1)) / colunas;
  const altura = 22;

  lista.forEach((c, i) => {
    const x = MARGEM + (i % colunas) * (largura + folga);
    const topo = y + Math.floor(i / colunas) * (altura + folga);

    cor(doc, COR.fundo, 'fill');
    cor(doc, COR.borda, 'draw');
    doc.setLineWidth(0.3);
    doc.roundedRect(x, topo, largura, altura, 2, 2, 'FD');

    cor(doc, COR.cinza);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(c.titulo, x + 4, topo + 6);

    cor(doc, COR.texto);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(c.valor, x + 4, topo + 13.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    if (c.nota) {
      cor(doc, COR.cinza);
      doc.text(c.nota, x + 4, topo + 18.5);
    } else if (c.item) {
      const v = textoVariacao(c.item);
      const bom = c.invertido ? v.negativo : v.positivo;
      const ruim = c.invertido ? v.positivo : v.negativo;
      cor(doc, v.cor ?? (bom ? COR.verde : ruim ? COR.vermelho : COR.cinza));
      doc.text(v.texto, x + 4, topo + 18.5);
    } else {
      cor(doc, COR.cinza);
      doc.text('-', x + 4, topo + 18.5);
    }
  });

  return y + 2 * altura + folga + 8;
}

function graficoFaturamento(doc, y, faturamentoMensal) {
  const altura = 50;
  y = garantirEspaco(doc, y, 8 + altura + 5);
  y = tituloSecao(doc, 'Faturamento por mês (últimos 12 meses)', y);

  const dados = faturamentoMensal ?? [];
  if (!dados.length || dados.every((d) => !d.faturamento)) {
    cor(doc, COR.cinza);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Sem faturamento registrado nos últimos 12 meses.', MARGEM, y + 4);
    return y + 14;
  }

  const eixoEsq = 16; // espaço para os valores do eixo Y
  const areaX = MARGEM + eixoEsq;
  const areaLargura = LARGURA_UTIL - eixoEsq;
  const areaAltura = altura - 18; // sobra espaço embaixo para os meses
  const topo = y + 4;
  const base = topo + areaAltura;
  const maximo = escalaDoEixo(Math.max(...dados.map((d) => d.faturamento ?? 0)));

  // linhas de grade e valores do eixo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  for (let i = 0; i <= 4; i++) {
    const ly = base - (areaAltura * i) / 4;
    cor(doc, COR.borda, 'draw');
    doc.setLineWidth(0.2);
    doc.line(areaX, ly, areaX + areaLargura, ly);
    cor(doc, COR.cinza);
    doc.text(compacto((maximo * i) / 4), areaX - 2, ly + 1, { align: 'right' });
  }

  // barras (o mês atual em laranja, como no Dashboard)
  const faixa = areaLargura / dados.length;
  const larguraBarra = faixa * 0.6;
  dados.forEach((d, i) => {
    const valor = d.faturamento ?? 0;
    const h = (valor / maximo) * areaAltura;
    const bx = areaX + faixa * i + (faixa - larguraBarra) / 2;
    cor(doc, d.mesAtual ? COR.laranja : COR.cinzaClaro, 'fill');
    if (h > 0) doc.rect(bx, base - h, larguraBarra, h, 'F');

    const centro = bx + larguraBarra / 2;
    cor(doc, COR.cinza);
    doc.setFontSize(6.5);
    doc.text(rotuloDoMes(d.rotulo), centro, base + 4.5, { align: 'center' });
    if (valor > 0) {
      cor(doc, COR.texto);
      doc.setFontSize(6);
      doc.text(compacto(valor), centro, base - h - 1.2, { align: 'center' });
    }
  });

  return y + altura + 5;
}

function tabelaTopProdutos(doc, y, topProdutos) {
  const lista = topProdutos ?? [];
  const alturaLinha = 6.8;
  y = garantirEspaco(doc, y, 8 + 8 + Math.max(lista.length, 1) * alturaLinha + 6);
  y = tituloSecao(doc, 'Top 5 produtos mais vendidos', y);

  if (!lista.length) {
    cor(doc, COR.cinza);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Nenhuma venda registrada no período.', MARGEM, y + 4);
    return y + 14;
  }

  const colProduto = MARGEM + 8;
  const colQtd = MARGEM + 92;
  const colValor = MARGEM + 125;
  const colBarra = MARGEM + 130;
  const barraMax = LARGURA_UTIL - 130;
  const maiorValor = Math.max(...lista.map((p) => p.valorTotal ?? 0), 1);

  cor(doc, COR.cinza);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('#', MARGEM + 1, y + 3);
  doc.text('Produto', colProduto, y + 3);
  doc.text('Qtd.', colQtd, y + 3, { align: 'right' });
  doc.text('Faturamento', colValor, y + 3, { align: 'right' });
  cor(doc, COR.borda, 'draw');
  doc.setLineWidth(0.3);
  doc.line(MARGEM, y + 5, MARGEM + LARGURA_UTIL, y + 5);
  y += 6;

  lista.forEach((p, i) => {
    const topo = y + i * alturaLinha;
    if (i % 2 === 0) {
      cor(doc, COR.fundo, 'fill');
      doc.rect(MARGEM, topo, LARGURA_UTIL, alturaLinha, 'F');
    }
    const texto = topo + 4.7;
    cor(doc, COR.cinza);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(String(i + 1), MARGEM + 1, texto);

    cor(doc, COR.texto);
    doc.text(cortarTexto(doc, p.nomeProduto ?? '', colQtd - colProduto - 14), colProduto, texto);
    doc.text(inteiro(p.quantidade), colQtd, texto, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(moeda(p.valorTotal), colValor, texto, { align: 'right' });

    const comprimento = Math.max(((p.valorTotal ?? 0) / maiorValor) * barraMax, 0.8);
    cor(doc, COR.laranjaClaro, 'fill');
    doc.rect(colBarra, topo + 1.9, comprimento, 3, 'F');
  });

  return y + lista.length * alturaLinha + 6;
}

function tabelaStatus(doc, y, statusPedidos) {
  const lista = statusPedidos ?? [];
  const alturaLinha = 6.8;
  y = garantirEspaco(doc, y, 8 + 8 + Math.max(lista.length, 1) * alturaLinha + 6);
  y = tituloSecao(doc, 'Status dos pedidos', y);

  if (!lista.length) {
    cor(doc, COR.cinza);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Nenhum pedido registrado no período.', MARGEM, y + 4);
    return y + 14;
  }

  const colStatus = MARGEM + 2;
  const colQtd = MARGEM + 70;
  const colPct = MARGEM + 95;
  const colBarra = MARGEM + 102;
  const barraMax = LARGURA_UTIL - 102;

  cor(doc, COR.cinza);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Status', colStatus, y + 3);
  doc.text('Qtd.', colQtd, y + 3, { align: 'right' });
  doc.text('%', colPct, y + 3, { align: 'right' });
  cor(doc, COR.borda, 'draw');
  doc.setLineWidth(0.3);
  doc.line(MARGEM, y + 5, MARGEM + LARGURA_UTIL, y + 5);
  y += 6;

  lista.forEach((s, i) => {
    const topo = y + i * alturaLinha;
    if (i % 2 === 0) {
      cor(doc, COR.fundo, 'fill');
      doc.rect(MARGEM, topo, LARGURA_UTIL, alturaLinha, 'F');
    }
    const texto = topo + 4.7;
    cor(doc, COR.texto);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(s.rotulo ?? String(s.status ?? ''), colStatus, texto);
    doc.text(inteiro(s.quantidade), colQtd, texto, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`${decimal(s.percentual, 1)}%`, colPct, texto, { align: 'right' });

    const comprimento = Math.max(((s.percentual ?? 0) / 100) * barraMax, s.quantidade ? 0.8 : 0);
    cor(doc, s.status === 'cancelado' ? COR.vermelhoClaro : COR.laranjaClaro, 'fill');
    if (comprimento > 0) doc.rect(colBarra, topo + 1.9, comprimento, 3, 'F');
  });

  return y + lista.length * alturaLinha + 8;
}

function rodapes(doc, estabelecimento) {
  const total = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= total; pagina++) {
    doc.setPage(pagina);
    cor(doc, COR.borda, 'draw');
    doc.setLineWidth(0.3);
    doc.line(MARGEM, ALTURA - 14, LARGURA - MARGEM, ALTURA - 14);
    cor(doc, COR.cinza);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${estabelecimento} - Relatório de gestão`, MARGEM, ALTURA - 9);
    doc.text(`Página ${pagina} de ${total}`, LARGURA - MARGEM, ALTURA - 9, { align: 'right' });
  }
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Monta o documento (sem baixar). Separado de `gerarRelatorioPdf` para dar para
 * testar sem navegador.
 *
 * @param {object} dados
 * @param {string} dados.periodoRotulo   "Hoje", "Esta semana" ou "Este mês"
 * @param {object} dados.visaoGeral      resposta de /dashboard/visao-geral
 * @param {Array}  dados.faturamentoMensal resposta de /dashboard/faturamento-mensal
 * @param {Array}  dados.statusPedidos   /dashboard/status-pedidos, já com `rotulo` por item
 * @param {Array}  dados.topProdutos     resposta de /dashboard/top-produtos
 */
export async function montarRelatorioPdf({
  periodoRotulo,
  visaoGeral,
  faturamentoMensal,
  statusPedidos,
  topProdutos,
  geradoPor,
  geradoEm = new Date(),
  estabelecimento = 'Pronta Comanda',
}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  doc.setProperties({
    title: `Relatório de gestão - ${periodoRotulo}`,
    subject: 'Indicadores do Dashboard',
    creator: estabelecimento,
  });

  let y = cabecalho(doc, { estabelecimento, periodoRotulo, geradoEm, geradoPor });
  y = tituloSecao(doc, `Indicadores - ${periodoRotulo.toLowerCase()}`, y);
  y = cartoes(doc, y, visaoGeral);
  y = graficoFaturamento(doc, y, faturamentoMensal);
  y = tabelaTopProdutos(doc, y, topProdutos);
  tabelaStatus(doc, y, statusPedidos);
  rodapes(doc, estabelecimento);

  return doc;
}

const dataParaArquivo = (data) =>
  [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, '0'),
    String(data.getDate()).padStart(2, '0'),
  ].join('-');

/** Monta o PDF e dispara o download no navegador. */
export async function gerarRelatorioPdf({ periodo, ...dados }) {
  const geradoEm = new Date();
  const doc = await montarRelatorioPdf({ ...dados, geradoEm });
  doc.save(`relatorio-pronta-comanda-${periodo}-${dataParaArquivo(geradoEm)}.pdf`);
}
