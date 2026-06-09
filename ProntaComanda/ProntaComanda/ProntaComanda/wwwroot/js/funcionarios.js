/**
 * funcionarios.js — ADAPTADO PARA MVC
 *
 * O que mudou em relação ao original:
 * - confirmarAdicionar() e confirmarEditar() agora submetem
 *   formulários ocultos que estão na View (.cshtml)
 * - confirmarDelecao() agora submete um form oculto de DELETE
 * - Todo o restante (modais, animações, especialidade) ficou igual
 */

document.addEventListener('DOMContentLoaded', () => {

    // ── MAPS ──────────────────────────────────────────────────────────────
    const SECAO_MAP = {
        Garcom: 'atendimento', garcom: 'atendimento',
        Cozinheiro: 'cozinha', cozinheiro: 'cozinha',
        Administrador: 'gestao', admin: 'gestao',
        Gerente: 'gestao', gerente: 'gestao',
        Desenvolvedor: 'gestao', dev: 'gestao',
    };

    const BADGE_MAP = {
        Garcom: 'func-badge--garcom',       garcom: 'func-badge--garcom',
        Cozinheiro: 'func-badge--cozinheiro', cozinheiro: 'func-badge--cozinheiro',
        Administrador: 'func-badge--admin', admin: 'func-badge--admin',
        Gerente: 'func-badge--gerente',     gerente: 'func-badge--gerente',
        Desenvolvedor: 'func-badge--dev',   dev: 'func-badge--dev',
    };

    // ── UTILITÁRIOS ───────────────────────────────────────────────────────
    function abrirOverlay(id) {
        document.getElementById(id)?.classList.add('modal-overlay--active');
        document.body.style.overflow = 'hidden';
    }
    function fecharOverlay(id) {
        document.getElementById(id)?.classList.remove('modal-overlay--active');
        document.body.style.overflow = '';
    }
    window.fecharModal = fecharOverlay;

    document.addEventListener('click', e => {
        if (e.target.classList.contains('modal-overlay')) fecharOverlay(e.target.id);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape')
            document.querySelectorAll('.modal-overlay--active')
                    .forEach(o => fecharOverlay(o.id));
    });

    // ── ESPECIALIDADE ─────────────────────────────────────────────────────
    window.atualizarEspecialidade = function(selectFuncao, idEspecialidade) {
        const isCozinha = selectFuncao.value === 'Cozinheiro' || selectFuncao.value === 'cozinheiro';
        const espSelect = document.getElementById(idEspecialidade);
        const wrapper   = espSelect?.closest('.func-modal__select-wrapper');
        espSelect.disabled = !isCozinha;
        if (!isCozinha) espSelect.value = 'NA';
        wrapper?.classList.toggle('func-modal__select-wrapper--disabled', !isCozinha);
    };

    // ── MODAL ADICIONAR ───────────────────────────────────────────────────
    window.abrirModalAdicionar = function() {
        document.getElementById('add-nome').value  = '';
        document.getElementById('add-senha').value = '';
        document.getElementById('add-funcao').value = 'Garcom';
        const espAdd = document.getElementById('add-especialidade');
        espAdd.value = 'NA';
        espAdd.disabled = true;
        document.getElementById('wrapper-add-esp').classList.add('func-modal__select-wrapper--disabled');
        abrirOverlay('modal-adicionar');
    };

    // ── CONFIRMAR ADICIONAR → submete o form oculto da View ──────────────
    window.confirmarAdicionar = function() {
        const nome  = document.getElementById('add-nome').value.trim();
        const senha = document.getElementById('add-senha').value;

        if (!nome)  { destacarErro('add-nome');  return; }
        if (!senha) { destacarErro('add-senha'); return; }

        // Preenche o formulário oculto que está no .cshtml
        document.getElementById('f-func-nome').value   = nome;
        document.getElementById('f-func-funcao').value = document.getElementById('add-funcao').value;
        document.getElementById('f-func-esp').value    = document.getElementById('add-especialidade').value;
        document.getElementById('f-func-senha').value  = senha;

        // Submete → vai para FuncionariosController.Criar()
        document.getElementById('form-criar-func').submit();
    };

    // ── MODAL EDITAR ──────────────────────────────────────────────────────
    let linhaEmEdicao = null;

    window.abrirModalEditar = function(btn) {
        linhaEmEdicao = btn.closest('tr');
        const d = linhaEmEdicao.dataset;

        document.getElementById('edit-nome').value  = d.nome  || '';
        document.getElementById('edit-senha').value = '';     // nunca mostra a senha atual

        const funcaoSelect = document.getElementById('edit-funcao');
        funcaoSelect.value = d.funcao || 'Garcom';

        const espSelect = document.getElementById('edit-especialidade');
        const isCozinha = (d.funcao === 'Cozinheiro' || d.funcao === 'cozinheiro');
        espSelect.disabled = !isCozinha;
        espSelect.value    = isCozinha ? (d.especialidade || 'NA') : 'NA';

        document.getElementById('wrapper-edit-esp')
                .classList.toggle('func-modal__select-wrapper--disabled', !isCozinha);

        abrirOverlay('modal-editar');
    };

    // ── CONFIRMAR EDITAR → submete o form oculto da View ─────────────────
    window.confirmarEditar = function() {
        if (!linhaEmEdicao) return;

        const nome = document.getElementById('edit-nome').value.trim();
        if (!nome) { destacarErro('edit-nome'); return; }

        const id    = linhaEmEdicao.dataset.id;
        const funcao = document.getElementById('edit-funcao').value;
        const esp    = document.getElementById('edit-especialidade').value;
        const senha  = document.getElementById('edit-senha').value;

        // Preenche o formulário oculto que está no .cshtml
        document.getElementById('fe-func-id').value     = id;
        document.getElementById('fe-func-nome').value   = nome;
        document.getElementById('fe-func-funcao').value = funcao;
        document.getElementById('fe-func-esp').value    = esp;
        document.getElementById('fe-func-senha').value  = senha;

        // Submete → vai para FuncionariosController.Editar()
        document.getElementById('form-editar-func').submit();
    };

    // ── DELEÇÃO INLINE ────────────────────────────────────────────────────
    window.iniciarDelecao = function(btn) {
        const acoes = btn.closest('.func-table__acoes');
        acoes.querySelector('.func-delete-confirm').style.display = 'flex';
        acoes.querySelector('.func-btn--excluir').style.display   = 'none';
        acoes.querySelector('.func-btn--editar').style.display    = 'none';
        acoes.querySelector('.func-btn--pedidos')?.style && (acoes.querySelector('.func-btn--pedidos').style.display = 'none');
    };

    window.cancelarDelecao = function(btn) {
        const acoes = btn.closest('.func-table__acoes');
        acoes.querySelector('.func-delete-confirm').style.display = 'none';
        acoes.querySelector('.func-btn--excluir').style.display   = '';
        acoes.querySelector('.func-btn--editar').style.display    = '';
        acoes.querySelector('.func-btn--pedidos')?.style && (acoes.querySelector('.func-btn--pedidos').style.display = '');
    };

    // ── CONFIRMAR DELEÇÃO → submete o form oculto da View ────────────────
    window.confirmarDelecao = function(btn) {
        const tr = btn.closest('tr');
        const id = tr.dataset.id;

        // Preenche o formulário oculto que está no .cshtml
        document.getElementById('fd-func-id').value = id;

        // Animação visual antes de submeter
        tr.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        tr.style.opacity    = '0';
        tr.style.transform  = 'translateX(20px)';

        setTimeout(() => {
            // Submete → vai para FuncionariosController.Deletar()
            document.getElementById('form-deletar-func').submit();
        }, 260);
    };

    // ── MODAL PEDIDOS DO DIA (ainda mock — back-end futuramente) ──────────
    window.abrirModalPedidos = function(btn) {
        const tr   = btn.closest('tr');
        const nome = tr.dataset.nome;
        document.getElementById('pedidos-nome-func').textContent = nome;
        document.getElementById('pedidos-tbody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--grey)">Sem pedidos registrados hoje.</td></tr>';
        document.getElementById('pedidos-total').textContent = 'R$ 0,00';
        abrirOverlay('modal-pedidos');
    };

    // ── HELPERS ───────────────────────────────────────────────────────────
    function destacarErro(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.borderColor = 'var(--flag-red)';
        el.style.boxShadow   = '0 0 0 2px rgba(217,9,41,0.2)';
        el.focus();
        setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 2000);
    }

});
