/**
 * dashboard.js
 * Gráficos Chart.js + filtro de período
 * TODO: trocar dados mockados por chamadas à API C# quando back-end estiver pronto
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ============================================================
       PALETA — alinhada com color.css do projeto
       ============================================================ */
    const COR = {
        indigo: '#292B3B',
        red: '#D90429',
        redLight: 'rgba(217, 4, 41, 0.15)',
        platinum: '#EDF2F4',
        grey: '#A6A9AE',
        green: '#27ae60',
        orange: '#f39c12',
        gridLine: 'rgba(0,0,0,0.06)',
    };

    /* ============================================================
       LABELS DOS MESES
       ============================================================ */
    const LABELS_MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

    /* ============================================================
       BUSCA DADOS REAIS DO SERVIDOR
       Endpoint: GET /Relatorios/Dados?periodo={periodo}
       Retorna: RelatorioVendas serializado como JSON
       ============================================================ */
    async function buscarDados(periodo) {
        try {
            const res = await fetch(`/Relatorios/Dados?periodo=${periodo}`);
            if (!res.ok) throw new Error('Falha na requisição');
            return await res.json();
        } catch (err) {
            console.error('[Dashboard] Erro ao buscar dados:', err);
            return null;
        }
    }

    function formatBRL(valor) {
        return (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    /* ============================================================
       GRÁFICO DE BARRAS — Faturamento por Mês
       ============================================================ */
    const ctxBar = document.getElementById('chart-faturamento');
    if (!ctxBar) return;

    const chartBar = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: DADOS.month.labels,
            datasets: [{
                label: 'Faturamento (R$ mil)',
                data: DADOS.month.faturamento,
                backgroundColor: DADOS.month.faturamento.map((_, i) =>
                    i === 11 ? COR.red : 'rgba(41,43,59,0.18)'
                ),
                borderRadius: 6,
                borderSkipped: false,
                hoverBackgroundColor: COR.red,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.4,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: COR.indigo,
                    titleColor: COR.platinum,
                    bodyColor: COR.platinum,
                    padding: 10,
                    callbacks: {
                        label: ctx => ` R$ ${ctx.parsed.y}k`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Archivo', size: 11, weight: '700' },
                        color: COR.grey,
                    }
                },
                y: {
                    grid: { color: COR.gridLine },
                    border: { dash: [4, 4] },
                    ticks: {
                        font: { family: 'Rubik', size: 11 },
                        color: COR.grey,
                        callback: v => `${v}k`
                    }
                }
            }
        }
    });

    /* ============================================================
       GRÁFICO DONUT — Taxa de Conversão
       ============================================================ */
    const ctxDonut = document.getElementById('chart-conversao');
    if (!ctxDonut) return;

    const chartDonut = new Chart(ctxDonut, {
        type: 'doughnut',
        data: {
            labels: ['Concluídos', 'Cancelados'],
            datasets: [{
                data: [91.7, 8.3],
                backgroundColor: [COR.indigo, COR.red],
                borderWidth: 0,
                hoverOffset: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { family: 'Archivo', size: 11, weight: '600' },
                        color: COR.indigo,
                        padding: 12,
                        usePointStyle: true,
                        pointStyleWidth: 8,
                    }
                },
                tooltip: {
                    backgroundColor: COR.indigo,
                    titleColor: COR.platinum,
                    bodyColor: COR.platinum,
                    padding: 10,
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.toFixed(1)}%`
                    }
                }
            }
        }
    });

    /* ============================================================
       FILTRO DE PERÍODO
       ============================================================ */
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('period-btn--active'));
            this.classList.add('period-btn--active');
            this.textContent = 'Carregando...';

            const dados = await buscarDados(this.dataset.period);
            this.textContent = this.dataset.period === 'today' ? 'Hoje'
                : this.dataset.period === 'week' ? 'Esta semana'
                    : 'Este mês';

            if (!dados) return;
            atualizarDashboard(dados);
        });
    });

    /**
     * Atualiza gráficos e cards com dados vindos do servidor.
     * @param {Object} dados — RelatorioVendas desserializado
     */
    function atualizarDashboard(dados) {
        // Gráfico de barras
        const fat = dados.faturamentoPorMes ?? new Array(12).fill(0);
        chartBar.data.datasets[0].data = fat;
        chartBar.data.datasets[0].backgroundColor = fat.map((_, i) =>
            i === 11 ? COR.red : 'rgba(41,43,59,0.18)'
        );
        chartBar.update('active');

        // Gráfico donut
        const concluidos = dados.totalPedidos ?? 0;
        const cancelados = dados.totalCancelados ?? 0;
        chartDonut.data.datasets[0].data = [concluidos, cancelados];
        chartDonut.update('active');

        // Cards de métrica
        const elGanhos = document.getElementById('metric-ganhos');
        const elPedidos = document.getElementById('metric-pedidos');
        const elTicket = document.getElementById('metric-ticket');
        const elCancelados = document.getElementById('metric-cancelados');
        const elConversao = document.getElementById('metric-conversao');
        if (elGanhos) elGanhos.textContent = formatBRL(dados.ganhosTotais);
        if (elPedidos) elPedidos.textContent = dados.totalPedidos ?? 0;
        if (elTicket) elTicket.textContent = formatBRL(dados.ticketMedio);
        if (elCancelados) elCancelados.textContent = dados.totalCancelados ?? 0;
        if (elConversao) elConversao.textContent = `${(dados.taxaConversao ?? 0).toFixed(1)}%`;
    }

    /* ============================================================
       ANIMAÇÃO DE ENTRADA DAS BARRAS DE PROGRESSO
       ============================================================ */
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.width = entry.target.dataset.targetWidth || '0%';
                observer.unobserve(entry.target); // anima só uma vez
            }
        });
    }, { threshold: 0.2 });

    document.querySelectorAll('.progress-bar').forEach(bar => {
        // Guarda o valor alvo definido no style inline (--w)
        const targetWidth = bar.style.width || getComputedStyle(bar).getPropertyValue('--w').trim();
        bar.dataset.targetWidth = targetWidth;
        bar.style.width = '0%';
        setTimeout(() => observer.observe(bar), 100);
    });

});