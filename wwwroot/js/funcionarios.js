/**
 * funcionarios.js
 * Lógica: modais, deleção inline, especialidade dinâmica,
 *         agrupamento por seção, cálculo de total do dia
 * TODO: substituir dados mockados por chamadas à API C#
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ============================================================
       MAPEAMENTO: função → seção da tabela
    ============================================================ */
    const SECAO_MAP = {
        garcom:    'atendimento',
        cozinheiro:'cozinha',
        admin:     'gestao',
        gerente:   'gestao',
        dev:       'gestao',
    };

    const LABEL_MAP = {
        garcom:    'Garçom',
        cozinheiro:'Cozinheiro',
        admin:     'Administrador',
        gerente:   'Gerente',
        dev:       'Desenvolvedor',
    };

    const BADGE_MAP = {
        garcom:    'func-badge--garcom',
        cozinheiro:'func-badge--cozinheiro',
        admin:     'func-badge--admin',
        gerente:   'func-badge--gerente',
        dev:       'func-badge--dev',
    };

    /* ============================================================
       DADOS MOCKADOS DE PEDIDOS
       TODO: buscar de /api/pedidos?funcionario={id}&data={hoje}
    ============================================================ */
    const PEDIDOS_MOCK = [
        { id: 50, nome: 'Pizza de Calabresa', qtd: 10, preco: 894.104, total: 8941.04 },
        { id: 50, nome: 'Pizza de Calabresa', qtd: 10, preco: 894.104, total: 8941.04 },
        { id: 50, nome: 'Pizza de Calabresa', qtd: 10, preco: 894.104, total: 8941.04 },
        { id: 50, nome: 'Pizza de Calabresa', qtd: 10, preco: 894.104, total: 8941.04 },
        { id: 50, nome: 'Pizza de Calabresa', qtd: 10, preco: 894.104, total: 8941.04 },
        { id: 50, nome: 'Pizza de Calabresa', qtd: 10, preco: 894.104, total: 8941.04 },
    ];

    /* ============================================================
       UTILITÁRIOS
    ============================================================ */
    function formatBRL(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function abrirOverlay(id) {
        document.getElementById(id)?.classList.add('modal-overlay--active');
        document.body.style.overflow = 'hidden';
    }

    function fecharOverlay(id) {
        document.getElementById(id)?.classList.remove('modal-overlay--active');
        document.body.style.overflow = '';
    }

    // Expõe para onclick inline no HTML
    window.fecharModal = fecharOverlay;

    /* ============================================================
       FECHAR AO CLICAR FORA / ESC
    ============================================================ */
    document.addEventListener('click', e => {
        if (e.target.classList.contains('modal-overlay')) fecharOverlay(e.target.id);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape')
            document.querySelectorAll('.modal-overlay--active')
                    .forEach(o => fecharOverlay(o.id));
    });

    /* ============================================================
       ESPECIALIDADE — habilita/desabilita conforme função
    ============================================================ */
    window.atualizarEspecialidade = function(selectFuncao, idEspecialidade) {
        const isCozinha = selectFuncao.value === 'cozinheiro';
        const espSelect = document.getElementById(idEspecialidade);
        const wrapper = espSelect?.closest('.func-modal__select-wrapper');

        espSelect.disabled = !isCozinha;
        if (!isCozinha) espSelect.value = 'n/a';

        wrapper?.classList.toggle('func-modal__select-wrapper--disabled', !isCozinha);
    };

    /* ============================================================
       MODAL ADICIONAR
    ============================================================ */
    window.abrirModalAdicionar = function() {
        // Limpa campos
        document.getElementById('add-nome').value = '';
        document.getElementById('add-senha').value = '';
        document.getElementById('add-funcao').value = 'garcom';
        const espAdd = document.getElementById('add-especialidade');
        espAdd.value = 'n/a';
        espAdd.disabled = true;
        document.getElementById('wrapper-add-esp').classList.add('func-modal__select-wrapper--disabled');

        abrirOverlay('modal-adicionar');
    };

    window.confirmarAdicionar = function() {
        const nome = document.getElementById('add-nome').value.trim();
        const funcao = document.getElementById('add-funcao').value;
        const especialidade = document.getElementById('add-especialidade').value;
        const senha = document.getElementById('add-senha').value;

        if (!nome) {
            destacarErro('add-nome');
            return;
        }
        if (!senha) {
            destacarErro('add-senha');
            return;
        }

        const novoId = Date.now(); // ID temporário — back-end vai gerar o real
        const secao = SECAO_MAP[funcao] || 'gestao';
        const tbody = document.getElementById(`tbody-${secao}`);
        const labelFuncao = funcao === 'cozinheiro' && especialidade !== 'n/a'
            ? `${LABEL_MAP[funcao]} / ${capitalizar(especialidade)}`
            : LABEL_MAP[funcao];

        const temPedidos = funcao === 'garcom';

        const tr = document.createElement('tr');
        tr.dataset.id = novoId;
        tr.dataset.nome = nome;
        tr.dataset.funcao = funcao;
        tr.dataset.especialidade = especialidade;
        tr.dataset.senha = senha;

        tr.innerHTML = `
            <td class="func-table__nome">${nome}</td>
            <td><span class="func-badge ${BADGE_MAP[funcao]}">${labelFuncao}</span></td>
            ${temPedidos ? '<td class="func-table__faturamento">R$ 0,00</td>' : ''}
            <td class="func-table__acoes">
                <button class="func-btn func-btn--editar" onclick="abrirModalEditar(this)">Editar</button>
                ${temPedidos ? '<button class="func-btn func-btn--pedidos" onclick="abrirModalPedidos(this)">Pedidos Dia</button>' : ''}
                <span class="func-delete-confirm" style="display:none;">
                    <button class="func-btn func-btn--confirmar-del" onclick="confirmarDelecao(this)">Confirmar</button>
                    <button class="func-btn func-btn--cancelar-del" onclick="cancelarDelecao(this)">Cancelar</button>
                </span>
                <button class="func-btn func-btn--excluir" onclick="iniciarDelecao(this)">Excluir</button>
            </td>`;

        tbody.appendChild(tr);
        fecharOverlay('modal-adicionar');

        // TODO: POST /api/funcionarios { nome, funcao, especialidade, senha }
    };

    /* ============================================================
       MODAL EDITAR
    ============================================================ */
    let linhaEmEdicao = null;

    window.abrirModalEditar = function(btn) {
        linhaEmEdicao = btn.closest('tr');
        const d = linhaEmEdicao.dataset;

        // Lê data attributes; se ausentes, tenta extrair das células visíveis
        const nome       = d.nome       || linhaEmEdicao.querySelector('.func-table__nome')?.textContent.trim() || '';
        const senha      = d.senha      || '';
        const funcao     = d.funcao     || inferirFuncaoPorBadge(linhaEmEdicao) || 'garcom';
        const especialidade = d.especialidade || 'n/a';

        // Garante data attributes atualizados para edições futuras
        linhaEmEdicao.dataset.nome        = nome;
        linhaEmEdicao.dataset.funcao      = funcao;
        linhaEmEdicao.dataset.especialidade = especialidade;
        if (!d.senha) linhaEmEdicao.dataset.senha = '';

        document.getElementById('edit-nome').value  = nome;
        document.getElementById('edit-senha').value = senha;

        const funcaoSelect = document.getElementById('edit-funcao');
        funcaoSelect.value = funcao;

        const espSelect  = document.getElementById('edit-especialidade');
        const isCozinha  = funcao === 'cozinheiro';
        espSelect.disabled = !isCozinha;
        espSelect.value  = isCozinha ? especialidade : 'n/a';

        const wrapper = document.getElementById('wrapper-edit-esp');
        wrapper.classList.toggle('func-modal__select-wrapper--disabled', !isCozinha);

        abrirOverlay('modal-editar');
    };

    /* Infere a função olhando a classe do badge na linha */
    function inferirFuncaoPorBadge(tr) {
        const badge = tr.querySelector('.func-badge');
        if (!badge) return 'garcom';
        if (badge.classList.contains('func-badge--garcom'))      return 'garcom';
        if (badge.classList.contains('func-badge--cozinheiro'))  return 'cozinheiro';
        if (badge.classList.contains('func-badge--gerente'))     return 'gerente';
        if (badge.classList.contains('func-badge--dev'))         return 'dev';
        if (badge.classList.contains('func-badge--admin'))       return 'admin';
        return 'garcom';
    }

    window.confirmarEditar = function() {
        if (!linhaEmEdicao) return;

        const nome = document.getElementById('edit-nome').value.trim();
        const funcao = document.getElementById('edit-funcao').value;
        const especialidade = document.getElementById('edit-especialidade').value;
        const senha = document.getElementById('edit-senha').value;

        if (!nome) { destacarErro('edit-nome'); return; }

        const secaoAtual = linhaEmEdicao.closest('tbody').id.replace('tbody-', '');
        const secaoNova  = SECAO_MAP[funcao] || 'gestao';

        const labelFuncao = funcao === 'cozinheiro' && especialidade !== 'n/a'
            ? `${LABEL_MAP[funcao]} / ${capitalizar(especialidade)}`
            : LABEL_MAP[funcao];

        // Atualiza data attributes
        linhaEmEdicao.dataset.nome = nome;
        linhaEmEdicao.dataset.funcao = funcao;
        linhaEmEdicao.dataset.especialidade = especialidade;
        linhaEmEdicao.dataset.senha = senha;

        // Atualiza células visíveis
        linhaEmEdicao.querySelector('.func-table__nome').textContent = nome;
        const badge = linhaEmEdicao.querySelector('.func-badge');
        badge.textContent = labelFuncao;
        badge.className = `func-badge ${BADGE_MAP[funcao]}`;

        // Move de seção se função mudou
        if (secaoAtual !== secaoNova) {
            const tbodyNovo = document.getElementById(`tbody-${secaoNova}`);
            tbodyNovo.appendChild(linhaEmEdicao);
        }

        fecharOverlay('modal-editar');
        linhaEmEdicao = null;

        // TODO: PUT /api/funcionarios/{id} { nome, funcao, especialidade, senha }
    };

    /* ============================================================
       DELEÇÃO INLINE
    ============================================================ */
    window.iniciarDelecao = function(btn) {
        const acoes = btn.closest('.func-table__acoes');
        acoes.querySelector('.func-delete-confirm').style.display = 'flex';
        acoes.querySelector('.func-btn--excluir').style.display = 'none';
        acoes.querySelector('.func-btn--editar').style.display = 'none';
        const pedidosBtn = acoes.querySelector('.func-btn--pedidos');
        if (pedidosBtn) pedidosBtn.style.display = 'none';
    };

    window.cancelarDelecao = function(btn) {
        const acoes = btn.closest('.func-table__acoes');
        acoes.querySelector('.func-delete-confirm').style.display = 'none';
        acoes.querySelector('.func-btn--excluir').style.display = '';
        acoes.querySelector('.func-btn--editar').style.display = '';
        const pedidosBtn = acoes.querySelector('.func-btn--pedidos');
        if (pedidosBtn) pedidosBtn.style.display = '';
    };

    window.confirmarDelecao = function(btn) {
        const tr = btn.closest('tr');
        tr.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        tr.style.opacity = '0';
        tr.style.transform = 'translateX(20px)';
        setTimeout(() => tr.remove(), 260);

        // TODO: DELETE /api/funcionarios/{tr.dataset.id}
    };

    /* ============================================================
       MODAL PEDIDOS DO DIA
    ============================================================ */
    window.abrirModalPedidos = function(btn) {
        const tr = btn.closest('tr');
        const nome = tr.dataset.nome;

        document.getElementById('pedidos-nome-func').textContent = nome;

        const tbody = document.getElementById('pedidos-tbody');
        tbody.innerHTML = '';

        let totalDia = 0;

        // TODO: GET /api/pedidos?funcionario={tr.dataset.id}&data={hoje}
        PEDIDOS_MOCK.forEach(p => {
            totalDia += p.total;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${p.id}</td>
                <td>${p.nome}</td>
                <td>${p.qtd}</td>
                <td class="col-preco">${formatBRL(p.preco)}</td>
                <td class="col-total">${formatBRL(p.total)}</td>`;
            tbody.appendChild(row);
        });

        document.getElementById('pedidos-total').textContent = formatBRL(totalDia);

        abrirOverlay('modal-pedidos');
    };

    /* ============================================================
       HELPERS
    ============================================================ */
    function destacarErro(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.borderColor = 'var(--flag-red)';
        el.style.boxShadow = '0 0 0 2px rgba(217,9,41,0.2)';
        el.focus();
        setTimeout(() => {
            el.style.borderColor = '';
            el.style.boxShadow = '';
        }, 2000);
    }

    function capitalizar(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

});