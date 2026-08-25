/**
 * funcionarios.js — MVC + fetch JSON
 */

document.addEventListener('DOMContentLoaded', () => {

    // ── TOKEN ANTIFORGERY ─────────────────────────────────────────────────
    const TOKEN = () =>
        document.querySelector('input[name="__RequestVerificationToken"]')?.value ?? '';

    // ── MAPS ──────────────────────────────────────────────────────────────
    const BADGE_MAP = {
        Garcom: 'func-badge--garcom',
        Cozinheiro: 'func-badge--cozinheiro',
        Administrador: 'func-badge--admin',
        Gerente: 'func-badge--gerente',
        Desenvolvedor: 'func-badge--dev',
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

    async function postJSON(url, body) {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': TOKEN()
            },
            body: JSON.stringify(body)
        });
        return res;
    }

    function destacarErro(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.borderColor = 'var(--flag-red)';
        el.style.boxShadow = '0 0 0 2px rgba(217,9,41,0.2)';
        el.focus();
        setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 2000);
    }

    // ── ESPECIALIDADE ─────────────────────────────────────────────────────
    window.atualizarEspecialidade = function (selectFuncao, idEspecialidade) {
        const isCozinha = selectFuncao.value === 'Cozinheiro';
        const espSelect = document.getElementById(idEspecialidade);
        const wrapper = espSelect?.closest('.func-modal__select-wrapper');
        espSelect.disabled = !isCozinha;
        if (!isCozinha) espSelect.value = 'NA';
        wrapper?.classList.toggle('func-modal__select-wrapper--disabled', !isCozinha);
    };

    // ── MODAL ADICIONAR ───────────────────────────────────────────────────
    window.abrirModalAdicionar = function () {
        document.getElementById('add-nome').value = '';
        document.getElementById('add-senha').value = '';
        document.getElementById('add-funcao').value = 'Garcom';
        const espAdd = document.getElementById('add-especialidade');
        espAdd.value = 'NA';
        espAdd.disabled = true;
        document.getElementById('wrapper-add-esp')
            .classList.add('func-modal__select-wrapper--disabled');
        abrirOverlay('modal-adicionar');
    };

    window.confirmarAdicionar = async function () {
        const nome = document.getElementById('add-nome').value.trim();
        const senha = document.getElementById('add-senha').value;
        if (!nome) { destacarErro('add-nome'); return; }
        if (!senha) { destacarErro('add-senha'); return; }

        const res = await postJSON('/Funcionarios/Criar', {
            nome,
            funcao: document.getElementById('add-funcao').value,
            especialidade: document.getElementById('add-especialidade').value,
            senhaHash: senha
        });

        if (res.ok) {
            fecharOverlay('modal-adicionar');
            location.reload();
        } else {
            alert('Erro ao cadastrar funcionário. Tente novamente.');
        }
    };

    // ── MODAL EDITAR ──────────────────────────────────────────────────────
    let linhaEmEdicao = null;

    window.abrirModalEditar = function (btn) {
        linhaEmEdicao = btn.closest('tr');
        const d = linhaEmEdicao.dataset;

        document.getElementById('edit-nome').value = d.nome || '';
        document.getElementById('edit-senha').value = '';
        document.getElementById('edit-funcao').value = d.funcao || 'Garcom';

        const espSelect = document.getElementById('edit-especialidade');
        const isCozinha = d.funcao === 'Cozinheiro';
        espSelect.disabled = !isCozinha;
        espSelect.value = isCozinha ? (d.especialidade || 'NA') : 'NA';
        document.getElementById('wrapper-edit-esp')
            .classList.toggle('func-modal__select-wrapper--disabled', !isCozinha);

        abrirOverlay('modal-editar');
    };

    window.confirmarEditar = async function () {
        if (!linhaEmEdicao) return;
        const nome = document.getElementById('edit-nome').value.trim();
        if (!nome) { destacarErro('edit-nome'); return; }

        const res = await postJSON('/Funcionarios/Editar', {
            funcionarioId: linhaEmEdicao.dataset.id,
            funcionario: {
                nome,
                funcao: document.getElementById('edit-funcao').value,
                especialidade: document.getElementById('edit-especialidade').value,
                senhaHash: document.getElementById('edit-senha').value
            }
        });

        if (res.ok) {
            fecharOverlay('modal-editar');
            location.reload();
        } else {
            alert('Erro ao editar funcionário. Tente novamente.');
        }
    };

    // ── DELEÇÃO INLINE ────────────────────────────────────────────────────
    window.iniciarDelecao = function (btn) {
        const acoes = btn.closest('.func-table__acoes');
        acoes.querySelector('.func-delete-confirm').style.display = 'flex';
        acoes.querySelector('.func-btn--excluir').style.display = 'none';
        acoes.querySelector('.func-btn--editar').style.display = 'none';
        const p = acoes.querySelector('.func-btn--pedidos');
        if (p) p.style.display = 'none';
    };

    window.cancelarDelecao = function (btn) {
        const acoes = btn.closest('.func-table__acoes');
        acoes.querySelector('.func-delete-confirm').style.display = 'none';
        acoes.querySelector('.func-btn--excluir').style.display = '';
        acoes.querySelector('.func-btn--editar').style.display = '';
        const p = acoes.querySelector('.func-btn--pedidos');
        if (p) p.style.display = '';
    };

    window.confirmarDelecao = async function (btn) {
        const tr = btn.closest('tr');
        tr.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        tr.style.opacity = '0';
        tr.style.transform = 'translateX(20px)';

        const res = await postJSON('/Funcionarios/Deletar', { id: tr.dataset.id });

        setTimeout(() => {
            if (res.ok) location.reload();
            else {
                tr.style.opacity = '1';
                tr.style.transform = '';
                alert('Erro ao excluir funcionário.');
            }
        }, 260);
    };

    // ── MODAL PEDIDOS DO DIA (mock — back-end futuramente) ────────────────
    window.abrirModalPedidos = function (btn) {
        const nome = btn.closest('tr').dataset.nome;
        document.getElementById('pedidos-nome-func').textContent = nome;
        document.getElementById('pedidos-tbody').innerHTML =
            '<tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--grey)">Sem pedidos registrados hoje.</td></tr>';
        document.getElementById('pedidos-total').textContent = 'R$ 0,00';
        abrirOverlay('modal-pedidos');
    };

});