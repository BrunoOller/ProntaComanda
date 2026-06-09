// ==========================================
// 1. ESTADO GLOBAL
// ==========================================
const state = {
    // MESAS_INICIAIS vem do Razor (na view)
    mesas: typeof MESAS_INICIAIS !== 'undefined' ? MESAS_INICIAIS : [],
    mesaSelecionadaId: null
};

// ==========================================
// 2. COMUNICAÇÃO COM O C# (API)
// ==========================================
// Função centralizada para fazer os POSTs sem repetir código
async function postData(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // O ASP.NET Core procura o token de segurança por padrão neste header
                'RequestVerificationToken': ANTIFORGERY_TOKEN
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.mensagem || "Erro inesperado na operação.");
        }

        return result;
    } catch (error) {
        alert(error.message);
        throw error; // Repassa o erro para parar a execução da função que chamou
    }
}

// ==========================================
// 3. AÇÕES DA TELA (Conectando botões com a API)
// ==========================================

async function confirmarAdicionarMesa() {
    const inputNum = document.getElementById('input-num-mesa');
    const numero = parseInt(inputNum.value);

    if (isNaN(numero) || numero <= 0) {
        alert("Digite um número de mesa válido.");
        return;
    }

    // Chama o Controller
    await postData(MESA_API.criar, { numero: numero });

    // Como criamos uma mesa nova, a forma mais segura de garantir 
    // que o Razor re-renderize os cards vazios é dar um reload suave.
    window.location.reload();
}

async function adicionarComanda() {
    if (!state.mesaSelecionadaId) return;

    const result = await postData(MESA_API.comanda, { mesaId: state.mesaSelecionadaId });

    if (result.success) {
        alert(`Comanda número ${result.numeroComanda} aberta com sucesso!`);
        window.location.reload(); // Recarrega para atualizar subtotal e badges
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

    // O back-end usa JsonStringEnumConverter — envia a string, não o int
    await postData(MESA_API.desconto, {
        mesaId: state.mesaSelecionadaId,
        desconto: valor,
        tipoDesconto: tipo  // "Percentual", "Valor" ou "Cortesia"
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
        alert(result.mensagem); // "Mesa finalizada e venda registrada com sucesso!"
        window.location.reload(); // Limpa a mesa da tela
    }
}

// ==========================================
// 4. INTERFACE E MODAIS
// ==========================================

function selecionarMesa(elementoCard) {
    // Remove a classe de seleção de todas as mesas
    document.querySelectorAll('.mesa-card').forEach(c => c.classList.remove('selected'));

    // Adiciona na clicada
    elementoCard.classList.add('selected');

    // Pega o ID que deixamos escondido no HTML (data-id)
    const id = elementoCard.getAttribute('data-id');
    state.mesaSelecionadaId = id;

    // Acha os dados completos da mesa no state global
    const mesaData = state.mesas.find(m => m.id === id);
    if (!mesaData) return;

    atualizarSidebar(mesaData);
}

function atualizarSidebar(mesa) {
    document.getElementById('sidebar-empty').style.display = 'none';
    const sidebarInfo = document.getElementById('sidebar-mesa-info');
    sidebarInfo.style.display = 'flex';

    // Atualiza cabeçalho da sidebar
    document.getElementById('sidebar-mesa-titulo').innerText = `Mesa ${mesa.numero}`;

    // Formata totais
    const formatBRL = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    document.getElementById('footer-subtotal').innerText = formatBRL(mesa.subtotal);
    document.getElementById('footer-desconto').innerText = formatBRL(mesa.desconto);
    document.getElementById('footer-total').innerText = formatBRL(mesa.total);

    // Atualiza a lista de comandas no meio da sidebar
    const containerConteudo = document.getElementById('sidebar-content');
    containerConteudo.innerHTML = ''; // Limpa o anterior

    if (mesa.comandas && mesa.comandas.length > 0) {
        mesa.comandas.forEach(c => {
            containerConteudo.innerHTML += `
                <div class="comanda-item" style="border-bottom: 1px solid #eee; padding: 10px 0;">
                    <strong>Comanda #${c.numero}</strong> <br/>
                    <small>Subtotal: ${formatBRL(c.subtotal)}</small>
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
    document.querySelectorAll('.mesa-card').forEach(c => c.classList.remove('selected'));
}

// Funções utilitárias de Modal
function abrirModalAdicionarMesa() { document.getElementById('modal-adicionar-mesa').style.display = 'flex'; }
function abrirModalMoverMesa() { document.getElementById('modal-mover-mesa').style.display = 'flex'; }
function abrirModalDesconto() { document.getElementById('modal-desconto').style.display = 'flex'; }

function fecharModal(idModal) {
    document.getElementById(idModal).style.display = 'none';
}

/**
 * Incrementa ou decrementa a quantidade de um item na comanda.
 * @param {int} comandaNumero - O número da comanda dentro da mesa.
 * @param {string} produtoId - O ID do produto.
 * @param {int} delta - 1 para adicionar, -1 para remover.
 */
async function alterarItem(comandaNumero, produtoId, delta) {
    if (!state.mesaSelecionadaId) return;

    try {
        await postData(MESA_API.alterarItem, {
            mesaId: state.mesaSelecionadaId,
            comandaNumero: comandaNumero,
            produtoId: produtoId,
            quantidade: delta
        });

        // Recarrega os dados para atualizar a sidebar com os novos valores calculados
        window.location.reload();
    } catch (error) {
        console.error("Erro ao alterar item:", error);
    }
}
// ==========================================
// 5. STUBS — funções referenciadas na view, implementação pendente
// ==========================================

function acaoBotao(acao) {
    // TODO: implementar modal de adicionar/remover item
    alert(`Ação "${acao}" em desenvolvimento.`);
}

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
                html += `&nbsp;&nbsp;${i.quantidade}x ${i.nomeProduto} — ${formatBRL(i.totalItem)}<br>`;
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

function imprimirPrevia() {
    window.print();
}

function abrirModalTaxaServico() {
    document.getElementById('modal-taxa').style.display = 'flex';
}

function confirmarTaxa() {
    // TODO: implementar taxa de serviço no back-end
    alert('Taxa de serviço será implementada em breve.');
    fecharModal('modal-taxa');
}

function abrirSeletorComanda() {
    // TODO: implementar seletor de comanda ativa
    alert('Seletor de comanda em desenvolvimento.');
}