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
        indigo:     '#292B3B',
        red:        '#D90429',
        redLight:   'rgba(217, 4, 41, 0.15)',
        platinum:   '#EDF2F4',
        grey:       '#A6A9AE',
        green:      '#27ae60',
        orange:     '#f39c12',
        gridLine:   'rgba(0,0,0,0.06)',
    };

    /* ============================================================
       DADOS MOCKADOS POR PERÍODO
       ============================================================ */
    const DADOS = {
        today: {
            faturamento: [0,0,0,0,0,0,0,0,0,0,0,3.2],
            labels: ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'],
            conversao: { concluidos: 94, cancelados: 6 },
            ganhos: 'R$ 3.240,00', pedidos: '189', ticket: 'R$ 171,43',
        },
        week: {
            faturamento: [0,0,0,0,0,0,0,0,0,0,0,18.5],
            labels: ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'],
            conversao: { concluidos: 92, cancelados: 8 },
            ganhos: 'R$ 8.120,00', pedidos: '521', ticket: 'R$ 155,85',
        },
        month: {
            faturamento: [60,45,78,29,20,68,40,80,8,45,35,74],
            labels: ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'],
            conversao: { concluidos: 91.7, cancelados: 8.3 },
            ganhos: 'R$ 15.754,00', pedidos: '5.834', ticket: 'R$ 193,58',
        },
    };

    let periodoAtivo = 'month';

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
                    border: { dash: [4,4] },
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
        btn.addEventListener('click', function () {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('period-btn--active'));
            this.classList.add('period-btn--active');

            periodoAtivo = this.dataset.period;
            const d = DADOS[periodoAtivo];

            // Atualiza gráfico de barras
            chartBar.data.datasets[0].data = d.faturamento;
            chartBar.data.datasets[0].backgroundColor = d.faturamento.map((_, i) =>
                i === 11 ? COR.red : 'rgba(41,43,59,0.18)'
            );
            chartBar.update('active');

            // Atualiza donut
            chartDonut.data.datasets[0].data = [d.conversao.concluidos, d.conversao.cancelados];
            chartDonut.update('active');

            // Atualiza cards de métrica
            // TODO: quando back-end estiver pronto, esses valores virão da API
            atualizarCards(d);
        });
    });

    /**
     * Atualiza os valores visíveis nos cards de métrica.
     * @param {Object} d — dados do período
     */
    function atualizarCards(d) {
        const ganhos = document.querySelector('.metric-card--ganhos .metric-card__value');
        const pedidos = document.querySelector('.metric-card--pedidos .metric-card__value');
        const ticket  = document.querySelector('.metric-card--ticket .metric-card__value');
        if (ganhos) ganhos.textContent = d.ganhos;
        if (pedidos) pedidos.textContent = d.pedidos;
        if (ticket) ticket.textContent = d.ticket;
    }

    /* ============================================================
       ANIMAÇÃO DE ENTRADA DAS BARRAS DE PROGRESSO
       ============================================================ */
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.width = entry.target.style.getPropertyValue('--w') ||
                    getComputedStyle(entry.target).getPropertyValue('--w');
            }
        });
    }, { threshold: 0.2 });

    document.querySelectorAll('.progress-bar').forEach(bar => {
        // Começa em 0 e anima ao entrar na viewport
        const target = bar.style.cssText;
        bar.style.width = '0%';
        setTimeout(() => observer.observe(bar), 100);
    });

});