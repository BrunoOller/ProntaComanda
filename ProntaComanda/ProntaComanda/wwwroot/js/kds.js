/**
 * kds.js — Kitchen Display System
 */

document.addEventListener('DOMContentLoaded', () => {
    // Inicialização
    setInterval(sincronizarDados, 10000); // Polling a cada 10s
    setInterval(atualizarCronometros, 1000); // Atualiza tempos a cada 1s
    sincronizarDados();

    // Delegação de eventos para botões de ação
    // Delegação de eventos para botões de ação
    document.addEventListener('click', async (e) => {
        // Encontra o botão clicado, mesmo se o usuário clicar no texto dentro dele
        const btn = e.target.closest('.ready');
        if (!btn) return; // Se não clicou no botão .ready, ignora

        e.preventDefault(); // Evita recarregamento de página
        console.log('✅ Botão clicado!', btn);

        const card = btn.closest('[class^="card-"]');
        if (!card) {
            console.error('❌ Card pai não encontrado.');
            return;
        }

        const pedidoId = card.dataset.id;
        const statusAtual = card.dataset.status;
        console.log(`📌 ID do Pedido: ${pedidoId} | Status Atual: ${statusAtual}`);

        let novoStatus;
        if (statusAtual === 'Pendente') novoStatus = 'EmPreparo';
        else if (statusAtual === 'EmPreparo') novoStatus = 'Pronto';
        else if (statusAtual === 'Pronto') novoStatus = 'Entregue';

        console.log(`🚀 Enviando novo status: ${novoStatus}`);

        const textoOriginal = btn.innerText;
        btn.disabled = true;
        btn.innerText = 'Processando...';

        const sucesso = await enviarAtualizacao(pedidoId, novoStatus, card);

        if (!sucesso) {
            btn.disabled = false;
            btn.innerText = textoOriginal;
        }
    });
});

/* ============================================================
   1. POLLING E SINCRONIZAÇÃO
   ============================================================ */
async function sincronizarDados() {
    try {
        const response = await fetch('/Pedidos/Ativos');
        if (!response.ok) throw new Error('Falha na rede');
        const pedidos = await response.json();

        processarPedidos(pedidos);
        atualizarSidebar(pedidos);
    } catch (err) {
        console.error('Falha na sincronização:', err);
    }
}

function processarPedidos(pedidos) {
    pedidos.forEach(pedido => {
        let card = document.querySelector(`[data-id="${pedido.id}"]`);

        if (!card) {
            renderizarNovoPedido(pedido);
        } else if (card.dataset.status !== pedido.status) {
            // Se o status mudou (alguém mudou de outro terminal), recria o card no local certo
            animarSaida(card, () => {
                card.remove();
                renderizarNovoPedido(pedido);
            });
        }
    });

    // Remover cards que não existem mais no servidor
    const idsServidor = pedidos.map(p => p.id);
    document.querySelectorAll('[data-id]').forEach(card => {
        if (!idsServidor.includes(card.dataset.id)) {
            animarSaida(card, () => card.remove());
        }
    });
}

/* ============================================================
   2. ATUALIZAÇÃO VIA SERVIDOR
   ============================================================ */
async function enviarAtualizacao(id, novoStatus, card) {
    const formData = new FormData();
    formData.append('id', id);
    formData.append('novoStatus', novoStatus);

    // Captura o token caso decida usar [ValidateAntiForgeryToken] no futuro
    const tokenEl = document.querySelector('input[name="__RequestVerificationToken"]');
    if (tokenEl) formData.append('__RequestVerificationToken', tokenEl.value);

    try {
        const response = await fetch('/Pedidos/AtualizarStatus', { method: 'POST', body: formData });
        if (response.ok) {
            const result = await response.json();

            if (result.success) {
                sincronizarDados(); // Força atualização imediata
                return true;
            } else {
                alert('Atenção: ' + result.message);
                return false;
            }
        }
    } catch (err) {
        alert('Erro ao comunicar com o servidor.');
        return false;
    }
}

/* ============================================================
   3. RENDERIZAÇÃO E MÉTRICAS
   ============================================================ */
function renderizarNovoPedido(pedido) {
    const colunas = {
        'Pendente': '#col-em-preparo',
        'EmPreparo': '#col-em-preparo',
        'Pronto': '#col-pronto',
        'Entregue': '#col-entregue'
    };

    const targetCol = document.querySelector(colunas[pedido.status] || '#col-em-preparo');
    if (!targetCol) return;

    // Define qual texto do botão mostrar dependendo do status atual
    let textoBotao = '';
    if (pedido.status === 'Pendente') textoBotao = 'Iniciar Preparo';
    else if (pedido.status === 'EmPreparo') textoBotao = 'Marcar como Pronto';
    else if (pedido.status === 'Pronto') textoBotao = 'Marcar como Entregue';

    const div = document.createElement('div');
    div.className = `card-${pedido.status === 'Pronto' ? 'Done' : (pedido.status === 'Entregue' ? 'Delivered' : 'onGoing')}`;
    div.dataset.id = pedido.id;
    div.dataset.status = pedido.status;

    // Processa os itens e observações
    const itensHtml = pedido.itens.map(i => {
        let obsHtml = '';
        if (i.observacoes && i.observacoes.length > 0) {
            obsHtml = `<div class="item-extras">` +
                i.observacoes.map(o => `<div class="extra">*${o}</div>`).join('') +
                `</div>`;
        }
        return `<div class="item-quantity-name">${i.quantidade} x ${i.nomeProduto}</div>${obsHtml}`;
    }).join('');

    div.innerHTML = `
        <div class="${div.className}-infos-top">
            <div class="left-infos">
                <div class="tableNum">Mesa #${pedido.numeroMesa}</div>
                <div class="comandaNum">Comanda ${pedido.numeroComanda}</div>
            </div>
            <div class="right-infos">
                <div class="LancadoAs">Lançado às:<br>${new Date(pedido.lancadoEm).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                ${pedido.status === 'Entregue'
            ? `<div class="TempoEspera">Entregue em:<br>${pedido.entregueEm ? new Date(pedido.entregueEm).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>`
            : `<div class="TempoEspera" data-lancado="${pedido.lancadoEm}">Tempo de espera:<br>00:00</div>`
        }
            </div>
        </div>
        <div class="horizontal-line"></div>
        <div class="${div.className}-infos-center">
            ${itensHtml}
        </div>
        ${pedido.status !== 'Entregue' ? `<div class="${div.className}-Button"><button class="ready">${textoBotao}</button></div>` : ''}
    `;

    // Remove as mensagens de "Nenhum pedido" se a coluna estiver recebendo o primeiro item
    const emptyMsg = targetCol.querySelector('.kds-empty-col');
    if (emptyMsg) emptyMsg.remove();

    targetCol.prepend(div);
    animarEntrada(div);
}

function atualizarSidebar(pedidos) {
    const pendentes = pedidos.filter(p => p.status !== 'Entregue' && p.status !== 'Cancelado').length;
    document.querySelector('.kitchen-OrdersQueue .number').textContent = pendentes;

    const resumoLista = document.getElementById('producao-lista');
    if (resumoLista) {
        const contagem = {};
        pedidos.filter(p => p.status === 'Pendente' || p.status === 'EmPreparo' || p.status === 'Pronto').forEach(p => {
            if (p.itens) {
                p.itens.forEach(i => {
                    contagem[i.nomeProduto] = (contagem[i.nomeProduto] || 0) + i.quantidade;
                });
            }
        });

        const arrContagem = Object.entries(contagem).sort((a, b) => b[1] - a[1]);

        if (arrContagem.length > 0) {
            resumoLista.innerHTML = arrContagem.map(([nome, total]) => `
                <div class="production-item">
                    <span class="production-item__name">${nome}</span>
                    <span class="production-item__qty">${total}</span>
                </div>`).join('');
        } else {
            resumoLista.innerHTML = `<div class="production-item"><span class="production-item__name" style="color:var(--grey);">Nenhum item pendente</span></div>`;
        }
    }
}

function atualizarCronometros() {
    document.querySelectorAll('.TempoEspera[data-lancado]').forEach(el => {
        const diff = Math.floor((Date.now() - new Date(el.dataset.lancado).getTime()) / 1000);
        if (diff > 0) {
            el.innerHTML = `Tempo de espera:<br>${Math.floor(diff / 60).toString().padStart(2, '0')}:${(diff % 60).toString().padStart(2, '0')}`;
        }
    });
}

function animarSaida(card, cb) {
    card.style.transition = 'opacity 0.25s';
    card.style.opacity = '0';
    setTimeout(cb, 260);
}

function animarEntrada(card) {
    card.style.opacity = '0';
    requestAnimationFrame(() => {
        card.style.transition = 'opacity 0.3s';
        card.style.opacity = '1';
    });
}