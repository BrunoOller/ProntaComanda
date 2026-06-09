// ==========================================
// 1. ESTADO GLOBAL UNIFICADO
// ==========================================
const state = {
    // MESAS_INICIAIS vem do Razor (na view)
    mesas: typeof MESAS_INICIAIS !== 'undefined' ? MESAS_INICIAIS : [],
    mesaSelecionadaId: null,
    comandaAtivaNumero: null // Controla em qual comanda os itens serão lançados
};

// ==========================================
// 2. COMUNICAÇÃO CENTRALIZADA COM A API (C#)
// ==========================================
async function postData(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': ANTIFORGERY_TOKEN
            },
            body: JSON.stringify(data)
        });

        const txt = await response.text();
        let result = {};

        try {
            result = JSON.parse(txt);
        } catch (e) {
            // Caso o servidor retorne um erro HTML (como erro 400 ou 500 estruturado)
            throw new Error(`Erro no servidor (${response.status}). Verifique o console.`);
        }

        if (!response.ok) {
            throw new Error(result.mensagem || "Erro inesperado na operação.");
        }

        return result;
    } catch (error) {
        alert(error.message);
        throw error;
    }
}

// ==========================================
// 3. AÇÕES DE GERENCIAMENTO (Mesa e Comanda)
// ==========================================
async function confirmarAdicionarMesa() {
    const inputNum = document.getElementById('input-num-mesa');
    const numero = parseInt(inputNum.value);

    if (isNaN(numero) || numero <= 0) {
        alert("Digite um número de mesa válido.");
        return;
    }

    await postData(MESA_API.criar, { numero: numero });
    window.location.reload();
}

async function adicionarComanda() {
    if (!state.mesaSelecionadaId) return;

    const result = await postData(MESA_API.comanda, { mesaId: state.mesaSelecionadaId });

    if (result.success) {
        alert(`Comanda número ${result.numeroComanda} aberta com sucesso!`);
        window.location.reload();
    }
}

async function confirmarMoverMesa() {
    if (!state.mesaSelecionadaId) return;

    const selectDestino = document.getElementById('select-mover-mesa');
    const mesaDestinoId = selectDestino.value;

    if (!mesaDestinoId) {
        alert("Selecione uma mesa de destino.");
        return;
    }

    await postData(MESA_API.mover, {
        mesaOrigemId: state.mesaSelecionadaId,
        mesaDestinoId: mesaDestinoId
    });

    alert("Mesa movida com sucesso!");
    window.location.reload();
}

async function confirmarDesconto() {
    if (!state.mesaSelecionadaId) return;

    const tipo = document.getElementById('select-tipo-desconto').value;
    const valor = parseFloat(document.getElementById('input-desconto').value || 0);

    await postData(MESA_API.desconto, {
        mesaId: state.mesaSelecionadaId,
        desconto: valor,
        tipoDesconto: tipo
    });

    fecharModal('modal-desconto');
    window.location.reload();
}

async function finalizarCompra() {
    if (!state.mesaSelecionadaId) return;

    const confirmar = confirm("Tem certeza que deseja finalizar a mesa e fechar a conta?");
    if (!confirmar) return;

    const result = await postData(MESA_API.fechar, { mesaId: state.mesaSelecionadaId });

    if (result.success) {
        alert(result.mensagem);
        window.location.reload();
    }
}

// ==========================================
// 4. CONTROLE DA INTERFACE E SIDEBAR
// ==========================================
function selecionarMesa(elementoCard) {
    // Remove a seleção visual de todos os cards de mesa
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));

    // Aplica a seleção na mesa clicada
    elementoCard.classList.add('selected');

    const id = elementoCard.getAttribute('data-id');
    state.mesaSelecionadaId = id;

    const mesaData = state.mesas.find(m => m.id === id);
    if (!mesaData) return;

    atualizarSidebar(mesaData);
}

function atualizarSidebar(mesa) {
    document.getElementById('sidebar-empty').style.display = 'none';
    const sidebarInfo = document.getElementById('sidebar-mesa-info');
    sidebarInfo.style.display = 'flex';

    document.getElementById('sidebar-mesa-titulo').innerText = `Mesa ${mesa.numero}`;

    const formatBRL = (valor) => (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    document.getElementById('footer-subtotal').innerText = formatBRL(mesa.subtotal);
    document.getElementById('footer-desconto').innerText = formatBRL(mesa.desconto);
    document.getElementById('footer-total').innerText = formatBRL(mesa.total);

    const containerConteudo = document.getElementById('sidebar-content');
    containerConteudo.innerHTML = '';

    if (mesa.comandas && mesa.comandas.length > 0) {
        mesa.comandas.forEach(c => {
            let itensHtml = '';
            if (c.itens && c.itens.length > 0) {
                c.itens.forEach(i => {
                    itensHtml += `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 5px; padding-left: 10px; font-size: 0.9rem;">
                            <span>${i.quantidade}x ${i.nomeProduto}</span>
                            <div style="display:flex; align-items:center; gap: 10px;">
                                <span style="color:var(--grey);">${formatBRL(i.precoUnitario * i.quantidade)}</span>
                                <button onclick="event.stopPropagation(); abrirModalEstorno(${c.numero}, '${i.produtoId}', '${i.nomeProduto}', ${i.precoUnitario})" 
                                        style="background:none; border:none; color:#d9534f; cursor:pointer;" title="Estornar Item">
                                    <i class="fa-solid fa-minus-circle"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
            } else {
                itensHtml = `<div style="padding-left: 10px; font-size: 0.85rem; color: #999;">Sem itens lançados.</div>`;
            }

            const isActive = state.comandaAtivaNumero === c.numero;
            const borderStyle = isActive ? '2px solid #007bff' : '1px solid #eee';
            const bgStyle = isActive ? '#f8fbff' : 'transparent';

            containerConteudo.innerHTML += `
                <div class="comanda-item" style="border-bottom: ${borderStyle}; background-color: ${bgStyle}; padding: 10px; margin-bottom: 5px; border-radius: 4px;">
                    <div style="display:flex; justify-content:space-between;">
                        <strong>Comanda #${c.numero} ${isActive ? '<span style="color:#007bff; font-size:0.8rem;">(Ativa)</span>' : ''}</strong> 
                        <small>${formatBRL(c.subtotal)}</small>
                    </div>
                    ${itensHtml}
                </div>
            `;
        });
    } else {
        containerConteudo.innerHTML = `<p style="text-align:center; color:#999; margin-top:20px;">Nenhuma comanda aberta nesta mesa.</p>`;
    }
}

function fecharSidebar() {
    document.getElementById('sidebar-empty').style.display = 'flex';
    document.getElementById('sidebar-mesa-info').style.display = 'none';
    state.mesaSelecionadaId = null;
    state.comandaAtivaNumero = null;
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
}

// CONTROLE DE EXIBIÇÃO DOS MODAIS INDIVIDUAIS
function abrirModalAdicionarMesa() { document.getElementById('modal-adicionar-mesa').style.display = 'flex'; }
// Correção do bug: mapeia o id correto que você usa no HTML do modal-mover-mesa
function abrirModalMoverMesa() { document.getElementById('modal-mover-mesa').style.display = 'flex'; }
function abrirModalDesconto() { document.getElementById('modal-desconto').style.display = 'flex'; }
function fecharModal(idModal) { document.getElementById(idModal).style.display = 'none'; }

// ==========================================
// 5. LÓGICA DE SELEÇÃO E ADIÇÃO DE PRODUTOS
// ==========================================
function abrirSeletorComanda() {
    if (!state.mesaSelecionadaId) {
        alert("Selecione uma mesa primeiro.");
        return;
    }
    const mesa = state.mesas.find(m => m.id === state.mesaSelecionadaId);

    if (!mesa || !mesa.comandas || mesa.comandas.length === 0) {
        alert("Esta mesa não possui comandas abertas. Adicione uma comanda primeiro.");
        return;
    }

    const select = document.getElementById('select-comanda-ativa');
    select.innerHTML = '';

    mesa.comandas.forEach(c => {
        const option = document.createElement('option');
        option.value = c.numero;
        option.text = `Comanda #${c.numero}`;
        if (state.comandaAtivaNumero === c.numero) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    document.getElementById('modal-selecionar-comanda').style.display = 'flex';
}

function confirmarSelecaoComanda() {
    const select = document.getElementById('select-comanda-ativa');
    if (!select.value) return;

    state.comandaAtivaNumero = parseInt(select.value);
    fecharModal('modal-selecionar-comanda');

    const mesa = state.mesas.find(m => m.id === state.mesaSelecionadaId);
    if (mesa) atualizarSidebar(mesa);
}

function acaoBotao(acao) {
    if (acao === 'Adicionar Item') {
        if (!state.comandaAtivaNumero) {
            alert("Por favor, selecione uma comanda para poder lançar os itens.");
            abrirSeletorComanda();
            return;
        }
        document.getElementById('label-comanda-ativa-add').innerText = `#${state.comandaAtivaNumero}`;
        document.getElementById('modal-adicionar-produto').style.display = 'flex';
    }
    else if (acao === 'Remover Item') {
        alert("Para remover, clique no botão de (-) vermelho ao lado do item específico na lista da comanda.");
    }
}

async function dispararAdicaoItemMock(produtoId, nome, preco) {
    if (!state.mesaSelecionadaId || !state.comandaAtivaNumero) return;

    try {
        await postData(MESA_API.alterarItem, {
            mesaId: state.mesaSelecionadaId,
            comandaNumero: state.comandaAtivaNumero,
            produtoId: produtoId,
            nomeProduto: nome,
            precoUnitario: preco,
            quantidade: 1
        });

        fecharModal('modal-adicionar-produto');
        window.location.reload();
    } catch (error) {
        console.error("Erro ao adicionar item:", error);
    }
}

// ==========================================
// 6. LÓGICA DE ESTORNO
// ==========================================
let estornoPendente = null;

function abrirModalEstorno(comandaNum, produtoId, nomeProduto, precoUnitario) {
    estornoPendente = {
        comandaNumero: comandaNum,
        produtoId: produtoId,
        nomeProduto: nomeProduto,
        precoUnitario: precoUnitario
    };

    document.getElementById('label-nome-estorno').innerText = nomeProduto;
    document.getElementById('modal-confirmar-estorno').style.display = 'flex';
}

async function confirmarEstornoItem() {
    if (!state.mesaSelecionadaId || !estornoPendente) return;

    try {
        await postData(MESA_API.alterarItem, {
            mesaId: state.mesaSelecionadaId,
            comandaNumero: estornoPendente.comandaNumero,
            produtoId: estornoPendente.produtoId,
            nomeProduto: estornoPendente.nomeProduto,
            precoUnitario: estornoPendente.precoUnitario,
            quantidade: -1 // Envia negativo para decrementar no banco
        });

        fecharModal('modal-confirmar-estorno');
        estornoPendente = null;
        window.location.reload();
    } catch (error) {
        console.error("Erro ao estornar item:", error);
    }
}

// ==========================================
// 7. STUBS AUXILIARES (Prévia/Taxas)
// ==========================================
function abrirPreviaFiscal() {
    if (!state.mesaSelecionadaId) return;
    const mesa = state.mesas.find(m => m.id === state.mesaSelecionadaId);
    if (!mesa) return;

    const formatBRL = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    let html = `<h4>Mesa ${mesa.numero}</h4><hr>`;

    if (mesa.comandas && mesa.comandas.length > 0) {
        mesa.comandas.forEach(c => {
            html += `<strong>Comanda #${c.numero}</strong><br>`;
            (c.itens || []).forEach(i => {
                html += `&nbsp;&nbsp;${i.quantidade}x ${i.nomeProduto} — ${formatBRL(i.precoUnitario * i.quantidade)}<br>`;
            });
            html += `<small>Subtotal: ${formatBRL(c.subtotal)}</small><br><br>`;
        });
    } else {
        html += '<p>Sem itens lançados.</p>';
    }

    html += `<hr><strong>Total: ${formatBRL(mesa.total)}</strong>`;
    document.getElementById('modal-previa-body').innerHTML = html;
    document.getElementById('modal-previa').style.display = 'flex';
}

function imprimirPrevia() { window.print(); }
if (typeof abrirModalTaxaServico !== 'function') {
    function abrirModalTaxaServico() { document.getElementById('modal-taxa').style.display = 'flex'; }
}
function confirmarTaxa() { alert('Taxa de serviço será implementada em breve.'); fecharModal('modal-taxa'); }