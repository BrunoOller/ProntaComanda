// ============================================================
//  ProntaComanda — mesa.js
//  Gerenciamento de Mesas (Front-End Only)
// ============================================================

// ---- ESTADO DA APLICAÇÃO ----
const state = {
    mesaSelecionada: null,
    taxaServico: 10, // %
    mesas: [
        { num: 1,  ocupada: false, permanencia: 0, comandas: [] },
        { num: 2,  ocupada: true,  permanencia: 5625, comandas: [
            { id: 1, itens: [
                { quant: 1, nome: "Pão",    preco: 100.00 },
                { quant: 2, nome: "Água",   preco: 50.00  },
                { quant: 2, nome: "Salame", preco: 25.00  },
                { quant: 1, nome: "Suco",   preco: 0.00   },
            ]},
            { id: 2, itens: [
                { quant: 1, nome: "Pão",    preco: 100.00 },
                { quant: 2, nome: "Água",   preco: 50.00  },
                { quant: 2, nome: "Salame", preco: 25.00  },
                { quant: 1, nome: "Suco",   preco: 0.00   },
            ]},
        ]},
        { num: 3,  ocupada: false, permanencia: 0,    comandas: [] },
        { num: 4,  ocupada: true,  permanencia: 1230, comandas: [
            { id: 1, itens: [
                { quant: 2, nome: "Refrigerante", preco: 5.00  },
                { quant: 1, nome: "Hambúrguer",   preco: 28.00 },
                { quant: 3, nome: "Batata Frita", preco: 12.00 },
            ]}
        ]},
        { num: 5,  ocupada: false, permanencia: 0,    comandas: [] },
        { num: 6,  ocupada: true,  permanencia: 2700, comandas: [
            { id: 1, itens: [
                { quant: 1, nome: "Pizza",   preco: 45.00 },
                { quant: 2, nome: "Cerveja", preco: 8.00  },
            ]}
        ]},
        { num: 7,  ocupada: false, permanencia: 0,    comandas: [] },
        { num: 8,  ocupada: true,  permanencia: 480,  comandas: [] },
        { num: 9,  ocupada: false, permanencia: 0,    comandas: [] },
        { num: 10, ocupada: true,  permanencia: 900,  comandas: [] },
        { num: 11, ocupada: false, permanencia: 0,    comandas: [] },
        { num: 12, ocupada: true,  permanencia: 3600, comandas: [] },
        { num: 13, ocupada: false, permanencia: 0,    comandas: [] },
        { num: 14, ocupada: true,  permanencia: 720,  comandas: [] },
        { num: 15, ocupada: false, permanencia: 0,    comandas: [] },
        { num: 16, ocupada: true,  permanencia: 1800, comandas: [] },
        { num: 17, ocupada: false, permanencia: 0,    comandas: [] },
        { num: 18, ocupada: true,  permanencia: 2100, comandas: [] },
        { num: 19, ocupada: false, permanencia: 0,    comandas: [] },
        { num: 20, ocupada: true,  permanencia: 300,  comandas: [] },
        { num: 21, ocupada: false, permanencia: 0,    comandas: [] },
        { num: 22, ocupada: true,  permanencia: 600,  comandas: [] },
        { num: 23, ocupada: false, permanencia: 0,    comandas: [] },
        { num: 24, ocupada: true,  permanencia: 9405, comandas: [] },
    ]
};

// ---- UTILITÁRIOS ----
function pad(n) { return String(n).padStart(2, '0'); }

function formatarTempo(seg) {
    const h = Math.floor(seg / 3600);
    const m = Math.floor((seg % 3600) / 60);
    const s = seg % 60;
    return `${h}:${pad(m)}:${pad(s)}`;
}

function formatarMoeda(v) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcularSubtotal(mesa) {
    return mesa.comandas.reduce((acc, c) =>
        acc + c.itens.reduce((a, i) => a + i.quant * i.preco, 0), 0);
}

function getMesa(num) { return state.mesas.find(m => m.num === num); }

// ---- RELÓGIO DAS MESAS ----
setInterval(() => {
    state.mesas.forEach(m => { if (m.ocupada) m.permanencia++; });
    if (state.mesaSelecionada) {
        const m = getMesa(state.mesaSelecionada);
        if (m && m.ocupada) {
            const el = document.getElementById('sidebar-mesa-permanencia');
            if (el) el.textContent = `Permanência: ${formatarTempo(m.permanencia)}`;
        }
    }
}, 1000);

// ---- RENDERIZAR GRID ----
function renderizarGrid() {
    const grid = document.getElementById('mesa-grid');
    grid.innerHTML = '';
    state.mesas.forEach(m => {
        const numStr = pad(m.num);
        const card = document.createElement('article');
        card.className = `card ${m.ocupada ? 'ocupada' : 'disponivel'}`;
        if (state.mesaSelecionada === m.num) card.classList.add('selected');
        card.setAttribute('data-mesa', m.num);
        card.innerHTML = `
            <div class="mesa-label">Mesa</div>
            <div class="mesa-number">${numStr}</div>
            <div class="mesa-status-bar">${m.ocupada ? 'Ocupada' : 'Disponível'}</div>
        `;
        card.addEventListener('click', () => selecionarMesa(m.num));
        grid.appendChild(card);
    });
}

// ---- SELECIONAR MESA ----
function selecionarMesa(num) {
    const anterior = state.mesaSelecionada;
    state.mesaSelecionada = num;

    // Atualiza seleção visual nos cards
    document.querySelectorAll('.card').forEach(c => {
        c.classList.toggle('selected', parseInt(c.dataset.mesa) === num);
    });

    const mesa = getMesa(num);
    document.getElementById('sidebar-empty').style.display = 'none';
    const info = document.getElementById('sidebar-mesa-info');
    info.style.display = 'flex';

    document.getElementById('sidebar-mesa-titulo').textContent = `Mesa ${pad(num)}`;
    document.getElementById('sidebar-mesa-permanencia').textContent =
        mesa.ocupada ? `Permanência: ${formatarTempo(mesa.permanencia)}` : 'Disponível';

    renderizarComandas(mesa);
    atualizarFooter(mesa);
}

// ---- FECHAR SIDEBAR ----
function fecharSidebar() {
    state.mesaSelecionada = null;
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    document.getElementById('sidebar-empty').style.display = 'flex';
    document.getElementById('sidebar-mesa-info').style.display = 'none';
}

// ---- RENDERIZAR COMANDAS ----
function renderizarComandas(mesa) {
    const container = document.getElementById('sidebar-content');
    container.innerHTML = '';

    if (!mesa.ocupada || mesa.comandas.length === 0) {
        container.innerHTML = `<p style="color:var(--grey);font-size:0.88rem;text-align:center;margin-top:1rem;">Nenhuma comanda registrada.</p>`;
        return;
    }

    mesa.comandas.forEach(c => {
        const block = document.createElement('div');
        block.className = 'comanda-block';

        const subtotalComanda = c.itens.reduce((a, i) => a + i.quant * i.preco, 0);
        const rows = c.itens.map(i => `
            <tr>
                <td>${i.quant}</td>
                <td>${i.nome}</td>
                <td>R$ ${formatarMoeda(i.preco)}</td>
                <td>R$ ${formatarMoeda(i.quant * i.preco)}</td>
            </tr>
        `).join('');

        block.innerHTML = `
            <div class="comanda-block-header">Comanda ${c.id}</div>
            <table class="orders-table">
                <thead>
                    <tr>
                        <th>QUANT.</th>
                        <th>Nome do Item</th>
                        <th>Preço</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
        container.appendChild(block);
    });
}

// ---- ATUALIZAR FOOTER ----
function atualizarFooter(mesa) {
    const subtotal = calcularSubtotal(mesa);
    const taxa = subtotal * (state.taxaServico / 100);
    const desconto = mesa.desconto || 0;
    const total = subtotal + taxa - desconto;

    document.getElementById('footer-subtotal').textContent = `R$ ${formatarMoeda(subtotal)}`;
    document.getElementById('footer-taxa').textContent = `R$ ${formatarMoeda(taxa)} (${state.taxaServico}%)`;
    document.getElementById('footer-desconto').textContent = desconto > 0 ? `R$ ${formatarMoeda(desconto)}` : 'Null';
    document.getElementById('footer-total').textContent = `${formatarMoeda(total)}`;
}

// ---- MODAIS ----
function abrirModal(id) { document.getElementById(id).style.display = 'flex'; }
function fecharModal(id) { document.getElementById(id).style.display = 'none'; }

// Fecha modal ao clicar fora
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.style.display = 'none';
    });
});

// ---- ADICIONAR MESA ----
function abrirModalAdicionarMesa() { abrirModal('modal-adicionar-mesa'); }

function confirmarAdicionarMesa() {
    const val = parseInt(document.getElementById('input-num-mesa').value);
    if (!val || val < 1) { alert('Informe um número de mesa válido.'); return; }
    if (getMesa(val)) { alert(`A Mesa ${val} já existe.`); return; }
    state.mesas.push({ num: val, ocupada: false, permanencia: 0, comandas: [] });
    state.mesas.sort((a, b) => a.num - b.num);
    renderizarGrid();
    fecharModal('modal-adicionar-mesa');
    document.getElementById('input-num-mesa').value = '';
}

// ---- MOVER MESA ----
function abrirModalMoverMesa() {
    if (!state.mesaSelecionada) return;
    const select = document.getElementById('select-mover-mesa');
    select.innerHTML = state.mesas
        .filter(m => m.num !== state.mesaSelecionada && !m.ocupada)
        .map(m => `<option value="${m.num}">Mesa ${pad(m.num)} — Disponível</option>`)
        .join('');
    if (!select.options.length) {
        alert('Não há mesas disponíveis para mover.'); return;
    }
    abrirModal('modal-mover-mesa');
}

function confirmarMoverMesa() {
    const destino = parseInt(document.getElementById('select-mover-mesa').value);
    const origem = getMesa(state.mesaSelecionada);
    const dest   = getMesa(destino);
    if (!origem || !dest) return;

    // Transfere dados
    dest.ocupada     = origem.ocupada;
    dest.permanencia = origem.permanencia;
    dest.comandas    = origem.comandas;
    dest.desconto    = origem.desconto;

    // Libera origem
    origem.ocupada     = false;
    origem.permanencia = 0;
    origem.comandas    = [];
    delete origem.desconto;

    fecharModal('modal-mover-mesa');
    renderizarGrid();
    selecionarMesa(destino);
}

// ---- DESCONTO ----
function abrirModalDesconto() {
    if (!state.mesaSelecionada) return;
    abrirModal('modal-desconto');
}

function confirmarDesconto() {
    const mesa = getMesa(state.mesaSelecionada);
    if (!mesa) return;
    const tipo  = document.getElementById('select-tipo-desconto').value;
    const valor = parseFloat(document.getElementById('input-desconto').value) || 0;
    const subtotal = calcularSubtotal(mesa);

    if (tipo === 'cortesia') {
        mesa.desconto = subtotal;
    } else if (tipo === 'percentual') {
        mesa.desconto = subtotal * (valor / 100);
    } else {
        mesa.desconto = valor;
    }

    fecharModal('modal-desconto');
    atualizarFooter(mesa);
}

// ---- TAXA DE SERVIÇO ----
function abrirModalTaxaServico() {
    document.getElementById('input-taxa').value = state.taxaServico;
    abrirModal('modal-taxa');
}

function confirmarTaxa() {
    const val = parseFloat(document.getElementById('input-taxa').value);
    state.taxaServico = isNaN(val) ? 10 : Math.max(0, Math.min(100, val));
    fecharModal('modal-taxa');
    if (state.mesaSelecionada) atualizarFooter(getMesa(state.mesaSelecionada));
}

// ---- PRÉVIA FISCAL ----
function abrirPreviaFiscal() {
    if (!state.mesaSelecionada) return;
    const mesa = getMesa(state.mesaSelecionada);
    const subtotal = calcularSubtotal(mesa);
    const taxa     = subtotal * (state.taxaServico / 100);
    const desconto = mesa.desconto || 0;
    const total    = subtotal + taxa - desconto;
    const agora    = new Date().toLocaleString('pt-BR');

    let linhas = '';
    mesa.comandas.forEach(c => {
        linhas += `<tr><td colspan="4" style="font-weight:700;padding-top:0.5rem;">Comanda ${c.id}</td></tr>`;
        c.itens.forEach(i => {
            linhas += `<tr>
                <td>${i.quant}x</td>
                <td>${i.nome}</td>
                <td>R$ ${formatarMoeda(i.preco)}</td>
                <td>R$ ${formatarMoeda(i.quant * i.preco)}</td>
            </tr>`;
        });
    });

    document.getElementById('modal-previa-body').innerHTML = `
        <div class="previa-fiscal">
            <div class="previa-title">ProntaComanda</div>
            <div class="previa-sub">Prévia Fiscal — Mesa ${pad(mesa.num)}<br>${agora}</div>
            <hr>
            <table class="orders-table" style="margin-bottom:0.5rem;">
                <thead><tr><th>Qtd</th><th>Item</th><th>Unit.</th><th>Total</th></tr></thead>
                <tbody>${linhas || '<tr><td colspan="4" style="text-align:center;color:var(--grey)">Sem itens</td></tr>'}</tbody>
            </table>
            <hr>
            <div class="previa-totais">
                <span><b>Sub-Total</b><b>R$ ${formatarMoeda(subtotal)}</b></span>
                <span><b>Taxa de Serviço (${state.taxaServico}%)</b><b>R$ ${formatarMoeda(taxa)}</b></span>
                <span><b>Desconto</b><b>${desconto > 0 ? 'R$ ' + formatarMoeda(desconto) : 'Null'}</b></span>
                <hr style="border-top:2px solid var(--space-indigo);margin:0.4rem 0;">
                <span style="font-size:1.1rem;"><b>TOTAL</b><b>R$ ${formatarMoeda(total)}</b></span>
            </div>
        </div>
    `;
    abrirModal('modal-previa');
}

function imprimirPrevia() { window.print(); }

// ---- ADICIONAR COMANDA ----
function adicionarComanda() {
    if (!state.mesaSelecionada) return;
    const mesa = getMesa(state.mesaSelecionada);
    if (!mesa.ocupada) {
        mesa.ocupada = true;
        // Atualiza visual do card
        const card = document.querySelector(`[data-mesa="${mesa.num}"]`);
        if (card) {
            card.classList.remove('disponivel');
            card.classList.add('ocupada');
            card.querySelector('.mesa-status-bar').textContent = 'Ocupada';
        }
    }
    const nextId = mesa.comandas.length + 1;
    mesa.comandas.push({ id: nextId, itens: [] });
    renderizarComandas(mesa);
    atualizarFooter(mesa);
}

// ---- SELETOR DE COMANDA ----
function abrirSeletorComanda() {
    if (!state.mesaSelecionada) return;
    const mesa = getMesa(state.mesaSelecionada);
    if (!mesa.comandas.length) { alert('Nenhuma comanda nesta mesa.'); return; }
    const opc = mesa.comandas.map(c => `Comanda ${c.id}`).join('\n');
    alert(`Comandas disponíveis:\n${opc}\n\n(Integração com Back-End futura)`);
}

// ---- AÇÃO GENÉRICA FRONT-END ----
function acaoBotao(nome) {
    alert(`"${nome}" — funcionalidade conectada ao Back-End em breve.`);
}

// ---- FINALIZAR COMPRA ----
function finalizarCompra() {
    if (!state.mesaSelecionada) return;
    if (!confirm(`Confirmar fechamento da Mesa ${pad(state.mesaSelecionada)}?`)) return;
    const mesa = getMesa(state.mesaSelecionada);
    mesa.ocupada     = false;
    mesa.permanencia = 0;
    mesa.comandas    = [];
    delete mesa.desconto;
    fecharSidebar();
    renderizarGrid();
}

// ---- INIT ----
renderizarGrid();
