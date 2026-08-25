const swiper = new Swiper('.swiper', {
    slidesPerView: 3,
    spaceBetween: 20,
    loop: false,
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
    },
    breakpoints: {
        320: {
            slidesPerView: 1,
            spaceBetween: 15,
        },
        640: {
            slidesPerView: 1.5,
            spaceBetween: 15,
        },
        900: {
            slidesPerView: 2,
            spaceBetween: 20,
        },
        1200: {
            slidesPerView: 3,
            spaceBetween: 20,
        },
    },
    on: {
        slideChange: function () {
            const prevBtn = document.querySelector('.swiper-button-prev');
            const nextBtn = document.querySelector('.swiper-button-next');
            const totalSlides = this.slides.length;
            const currentIndex = this.activeIndex;
            const slidesPerView = this.params.slidesPerView;

            // Desabilitar botão anterior no início
            if (currentIndex === 0) {
                prevBtn.style.opacity = '0.4';
                prevBtn.style.pointerEvents = 'none';
            } else {
                prevBtn.style.opacity = '1';
                prevBtn.style.pointerEvents = 'auto';
            }

            // No final, próximo volta ao início
            if (currentIndex + slidesPerView >= totalSlides) {
                nextBtn.style.cursor = 'pointer';
                nextBtn.onclick = () => swiper.slideTo(0);
            } else {
                nextBtn.onclick = null;
            }
        }
    }
});

// Inicializar estado dos botões
const prevBtn = document.querySelector('.swiper-button-prev');
const nextBtn = document.querySelector('.swiper-button-next');
prevBtn.style.opacity = '0.4';
prevBtn.style.pointerEvents = 'none';

nextBtn.addEventListener('click', function (e) {
    const totalSlides = swiper.slides.length;
    const currentIndex = swiper.activeIndex;
    const slidesPerView = swiper.params.slidesPerView;

    if (currentIndex + slidesPerView >= totalSlides) {
        e.stopPropagation();
        swiper.slideTo(0);
    }
});

// Funcionalidade dos filtros
document.querySelectorAll('.filter').forEach(button => {
    button.addEventListener('click', function () {
        document.querySelectorAll('.filter').forEach(btn => btn.classList.remove('selecionado'));
        this.classList.add('selecionado');
    });
});

// Funcionalidade da busca
const searchInput = document.getElementById('search');
searchInput.addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase();
    document.querySelectorAll('.card').forEach(card => {
        const cardName = card.querySelector('h2').textContent.toLowerCase();
        const cardDesc = card.querySelector('p').textContent.toLowerCase();

        if (cardName.includes(searchTerm) || cardDesc.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
});

/**
 * modal-cardapio.js
 * Comportamento do modal multi-aba: Dados Gerais | Acréssimos/Extras | Happy Hour
 * Depende de: modal-cardapio.css, cardapio.css
 */

/* ============================================================
   UTILITÁRIOS
   ============================================================ */

/**
 * Abre o modal pelo ID do overlay.
 * @param {string} overlayId
 * @param {string} [mode='add'] - 'add' | 'edit'
 * @param {Object} [data] - dados do item para pré-preencher em modo edição
 */
function abrirModal(overlayId, mode = 'add', data = null) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;

    // Atualiza título do modal
    const titulo = overlay.querySelector('.modal__title');
    if (titulo) {
        titulo.textContent = mode === 'edit'
            ? 'Editando Item do Menu'
            : 'Adicionando Item ao Menu';
    }

    // Atualiza texto do botão de submit
    const submitBtn = overlay.querySelector('.modal-form__submit-btn');
    if (submitBtn) {
        submitBtn.textContent = mode === 'edit' ? 'Salvar Alterações' : 'Adicionar';
        // Guarda o modo no botão para o listener saber o que fazer
        submitBtn.dataset.mode = mode;
    }

    // Em modo edição, pré-preenche formulário
    if (mode === 'edit' && data) {
        preencherFormulario(overlay, data);
    } else {
        limparFormulario(overlay);
    }

    // Ativa sempre na primeira aba
    ativarAba(overlay, 0);

    overlay.classList.add('modal-overlay--active');
    document.body.style.overflow = 'hidden';
}

/**
 * Fecha o modal pelo ID do overlay.
 * @param {string} overlayId
 */
function fecharModal(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;
    overlay.classList.remove('modal-overlay--active');
    document.body.style.overflow = '';
}

/* ============================================================
   ABAS
   ============================================================ */

/**
 * Ativa uma aba pelo índice.
 * @param {HTMLElement} modalOverlay
 * @param {number} index
 */
function ativarAba(modalOverlay, index) {
    const tabs = modalOverlay.querySelectorAll('.modal__tab-btn');
    const panels = modalOverlay.querySelectorAll('.modal__panel');

    tabs.forEach((tab, i) => {
        tab.classList.toggle('modal__tab-btn--active', i === index);
        tab.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });

    panels.forEach((panel, i) => {
        panel.classList.toggle('modal__panel--active', i === index);
    });
}

/**
 * Inicializa os botões de abas de um modal.
 * @param {HTMLElement} modalOverlay
 */
function inicializarAbas(modalOverlay) {
    const tabs = modalOverlay.querySelectorAll('.modal__tab-btn');
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => ativarAba(modalOverlay, index));
    });
}

/* ============================================================
   PREVIEW DE IMAGEM
   ============================================================ */

/**
 * Inicializa o upload e preview de imagem.
 * @param {HTMLElement} modalOverlay
 */
function inicializarImagemPreview(modalOverlay) {
    const fileInput = modalOverlay.querySelector('.image-upload__file-input');
    const filenameEl = modalOverlay.querySelector('.image-upload__filename');
    const previewImg = modalOverlay.querySelector('.image-preview__box img');
    const placeholder = modalOverlay.querySelector('.image-preview__placeholder');

    if (!fileInput) return;

    fileInput.addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;

        // Atualiza nome do arquivo
        if (filenameEl) filenameEl.textContent = file.name;

        // Gera preview
        if (previewImg && placeholder) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                placeholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });
}

/* ============================================================
   DIAS DA SEMANA (Happy Hour)
   ============================================================ */

/**
 * Inicializa os botões de dias da semana (toggle ativo/inativo).
 * @param {HTMLElement} modalOverlay
 */
function inicializarDiasSemana(modalOverlay) {
    const dayBtns = modalOverlay.querySelectorAll('.happyhour__day-btn');

    dayBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const isActive = this.classList.contains('happyhour__day-btn--active');
            this.classList.toggle('happyhour__day-btn--active', !isActive);
            this.setAttribute('aria-pressed', !isActive ? 'true' : 'false');

            // Atualiza a tabela de horários automaticamente
            atualizarTabelaHorarios(modalOverlay);
        });
    });
}

/**
 * Atualiza as linhas da tabela de horários com base nos dias ativos.
 * @param {HTMLElement} modalOverlay
 */
function atualizarTabelaHorarios(modalOverlay) {
    const diasAtivos = modalOverlay.querySelectorAll('.happyhour__day-btn--active');
    const tbody = modalOverlay.querySelector('.happyhour__schedule-tbody');
    if (!tbody) return;

    // Mapa de índice para nome completo
    const nomesDias = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];
    const indices = Array.from(diasAtivos).map(btn => btn.dataset.dayIndex);

    // Preserva horários existentes
    const horariosExistentes = {};
    tbody.querySelectorAll('tr').forEach(row => {
        const diaIdx = row.dataset.dayIndex;
        if (diaIdx) {
            horariosExistentes[diaIdx] = {
                inicio: row.querySelector('.select-inicio')?.value || '18:00',
                fim: row.querySelector('.select-fim')?.value || '20:00'
            };
        }
    });

    tbody.innerHTML = '';

    if (indices.length === 0) return;

    const horariosOpcoes = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'];

    indices.forEach(idx => {
        const saved = horariosExistentes[idx] || { inicio: '18:00', fim: '20:00' };
        const tr = document.createElement('tr');
        tr.dataset.dayIndex = idx;

        tr.innerHTML = `
            <td>${nomesDias[idx] || '—'}</td>
            <td>
                <div class="modal-form__select-wrapper">
                    <select class="modal-form__select select-inicio">
                        ${horariosOpcoes.map(h => `<option value="${h}" ${h === saved.inicio ? 'selected' : ''}>[${h}]</option>`).join('')}
                    </select>
                    <span class="modal-form__select-arrow"><i class="fa-solid fa-chevron-down"></i></span>
                </div>
            </td>
            <td>
                <div class="modal-form__select-wrapper">
                    <select class="modal-form__select select-fim">
                        ${horariosOpcoes.map(h => `<option value="${h}" ${h === saved.fim ? 'selected' : ''}>[${h}]</option>`).join('')}
                    </select>
                    <span class="modal-form__select-arrow"><i class="fa-solid fa-chevron-down"></i></span>
                </div>
            </td>
            <td style="text-align:center;">
                <button class="modal-table__delete-btn" onclick="removerLinhaHorario(this)" title="Remover dia" type="button">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Remove uma linha da tabela de horários e desmarca o botão do dia.
 * @param {HTMLElement} btn
 */
function removerLinhaHorario(btn) {
    const row = btn.closest('tr');
    const idx = row?.dataset.dayIndex;
    const modalOverlay = btn.closest('.modal-overlay');

    if (idx && modalOverlay) {
        const dayBtn = modalOverlay.querySelector(`.happyhour__day-btn[data-day-index="${idx}"]`);
        if (dayBtn) {
            dayBtn.classList.remove('happyhour__day-btn--active');
            dayBtn.setAttribute('aria-pressed', 'false');
        }
    }

    row?.remove();
}

/* ============================================================
   TOGGLES (Happy Hour)
   ============================================================ */

/**
 * Inicializa os toggles de happy hour.
 * @param {HTMLElement} modalOverlay
 */
function inicializarToggles(modalOverlay) {
    const toggleInputs = modalOverlay.querySelectorAll('.toggle-switch__input');

    toggleInputs.forEach(input => {
        input.addEventListener('change', function () {
            const wrapper = this.closest('.toggle-switch');
            if (!wrapper) return;
            atualizarEstadoToggle(wrapper, this.checked);
        });

        // Estado inicial
        atualizarEstadoToggle(input.closest('.toggle-switch'), input.checked);
    });
}

/**
 * Atualiza visualmente o estado do toggle.
 * @param {HTMLElement} wrapper
 * @param {boolean} checked
 */
function atualizarEstadoToggle(wrapper, checked) {
    if (!wrapper) return;
    wrapper.classList.toggle('toggle-switch--on', checked);
    wrapper.classList.toggle('toggle-switch--off', !checked);
}

/* ============================================================
   TABELA DE ACRÉSSIMOS — Vincular item
   ============================================================ */

/**
 * Vincula um novo acréssimo à tabela.
 * @param {HTMLElement} modalOverlay
 */
function vincularAcrescimo(modalOverlay) {
    const nomeInput = modalOverlay.querySelector('.extras__nome-input');
    const precoInput = modalOverlay.querySelector('.extras__preco-input');
    const tbody = modalOverlay.querySelector('.extras__tbody');

    if (!nomeInput || !precoInput || !tbody) return;

    const nome = nomeInput.value.trim();
    const preco = precoInput.value.trim();

    if (!nome) {
        nomeInput.focus();
        nomeInput.style.borderColor = 'var(--flag-red)';
        setTimeout(() => nomeInput.style.borderColor = '', 1500);
        return;
    }

    const precoFormatado = preco ? `R$:${parseFloat(preco).toFixed(2)}` : 'R$:0,00';

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${nome}</td>
        <td>${precoFormatado}</td>
        <td>
            <input type="text" class="modal-table__price-input" placeholder="[R$: 0,00]" value="">
        </td>
        <td style="text-align:center;">
            <button class="modal-table__delete-btn" type="button" title="Remover" onclick="this.closest('tr').remove()">
                <i class="fa-solid fa-trash"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);

    // Limpa campos
    nomeInput.value = '';
    precoInput.value = '';
    nomeInput.focus();
}

/* ============================================================
   LIMPAR / PREENCHER FORMULÁRIO
   ============================================================ */

function limparFormulario(modalOverlay) {
    modalOverlay.querySelectorAll('input:not([type="file"]), textarea').forEach(el => el.value = '');
    modalOverlay.querySelectorAll('select').forEach(el => el.selectedIndex = 0);

    // Limpa preview de imagem
    const filenameEl = modalOverlay.querySelector('.image-upload__filename');
    const previewImg = modalOverlay.querySelector('.image-preview__box img');
    const placeholder = modalOverlay.querySelector('.image-preview__placeholder');
    if (filenameEl) filenameEl.textContent = 'Nenhum arquivo';
    if (previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }
    if (placeholder) placeholder.style.display = 'flex';

    // Limpa tabelas
    modalOverlay.querySelectorAll('.extras__tbody, .happyhour__schedule-tbody').forEach(tb => tb.innerHTML = '');

    // Reseta dias selecionados
    modalOverlay.querySelectorAll('.happyhour__day-btn').forEach(btn => {
        btn.classList.remove('happyhour__day-btn--active');
        btn.setAttribute('aria-pressed', 'false');
    });

    // Reseta toggles
    modalOverlay.querySelectorAll('.toggle-switch__input').forEach(input => {
        input.checked = false;
        atualizarEstadoToggle(input.closest('.toggle-switch'), false);
    });
}

function preencherFormulario(modalOverlay, data) {
    limparFormulario(modalOverlay);

    if (data.nome) {
        const nomeEl = modalOverlay.querySelector('[name="nome"]');
        if (nomeEl) nomeEl.value = data.nome;
    }
    if (data.nomeCurto) {
        const nomeCurtoEl = modalOverlay.querySelector('[name="nomeCurto"]');
        if (nomeCurtoEl) nomeCurtoEl.value = data.nomeCurto;
    }
    if (data.preco) {
        const precoEl = modalOverlay.querySelector('[name="preco"]');
        if (precoEl) precoEl.value = data.preco;
    }
    if (data.estoque) {
        const estoqueEl = modalOverlay.querySelector('[name="estoque"]');
        if (estoqueEl) estoqueEl.value = data.estoque;
    }
    if (data.legenda) {
        const legendaEl = modalOverlay.querySelector('[name="legenda"]');
        if (legendaEl) legendaEl.value = data.legenda;
    }
    if (data.categoria) {
        const catEl = modalOverlay.querySelector('[name="categoria"]');
        if (catEl) catEl.value = data.categoria;
    }
    if (data.subcategoria) {
        const subEl = modalOverlay.querySelector('[name="subcategoria"]');
        if (subEl) subEl.value = data.subcategoria;
    }
    if (data.disponibilidade) {
        const dispEl = modalOverlay.querySelector('[name="disponibilidade"]');
        if (dispEl) dispEl.value = data.disponibilidade;
    }
    if (data.imagemNome) {
        const filenameEl = modalOverlay.querySelector('.image-upload__filename');
        if (filenameEl) filenameEl.textContent = data.imagemNome;
    }
    if (data.imagemSrc) {
        const previewImg = modalOverlay.querySelector('.image-preview__box img');
        const placeholder = modalOverlay.querySelector('.image-preview__placeholder');
        if (previewImg) { previewImg.src = data.imagemSrc; previewImg.style.display = 'block'; }
        if (placeholder) placeholder.style.display = 'none';
    }
}

/* ============================================================
   FECHAR AO CLICAR FORA DO MODAL
   ============================================================ */

document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('modal-overlay--active');
        document.body.style.overflow = '';
    }
});

/* ============================================================
   FECHAR COM ESC
   ============================================================ */

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay--active').forEach(overlay => {
            overlay.classList.remove('modal-overlay--active');
        });
        document.body.style.overflow = '';
    }
});

/* ============================================================
   INICIALIZAÇÃO — aguarda DOM pronto
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

    // Inicializa cada modal na página
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        inicializarAbas(overlay);
        inicializarImagemPreview(overlay);
        inicializarDiasSemana(overlay);
        inicializarToggles(overlay);
    });

    // Botão "Adicionar Item" → abre modal em modo adição
    document.querySelectorAll('[data-open-modal]').forEach(btn => {
        btn.addEventListener('click', function () {
            const targetId = this.dataset.openModal;
            const mode = this.dataset.modalMode || 'add';
            abrirModal(targetId, mode);
        });
    });

    // Botão fechar dentro do modal
    document.querySelectorAll('.modal__close-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const overlay = this.closest('.modal-overlay');
            if (overlay) {
                overlay.classList.remove('modal-overlay--active');
                document.body.style.overflow = '';
            }
        });
    });

    // Botão "[+] Vincular ao Item"
    document.querySelectorAll('.extras__vincular-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const overlay = this.closest('.modal-overlay');
            if (overlay) vincularAcrescimo(overlay);
        });
    });

    // Botão "Adicionar / Salvar Alterações" (submit da aba Dados Gerais)
    document.querySelectorAll('.modal-form__submit-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const overlay = this.closest('.modal-overlay');
            const mode = this.dataset.mode || 'add';

            // Coleta dados do formulário para exibir feedback
            const nome = overlay.querySelector('[name="nome"]')?.value?.trim();
            if (!nome) {
                const nomeInput = overlay.querySelector('[name="nome"]');
                nomeInput?.focus();
                nomeInput.style.borderColor = 'var(--flag-red)';
                nomeInput.style.boxShadow = '0 0 0 2px rgba(217,9,41,0.25)';
                setTimeout(() => {
                    nomeInput.style.borderColor = '';
                    nomeInput.style.boxShadow = '';
                }, 2000);
                return;
            }

            // Feedback visual de sucesso (front-end only — back-end vem depois)
            const originalText = this.textContent;
            this.textContent = mode === 'edit' ? '✓ Salvo!' : '✓ Adicionado!';
            this.style.backgroundColor = '#27ae60';
            this.style.color = 'white';
            this.style.borderColor = '#27ae60';

            setTimeout(() => {
                this.textContent = originalText;
                this.style.backgroundColor = '';
                this.style.color = '';
                this.style.borderColor = '';
                // Fecha o modal após o feedback
                overlay.classList.remove('modal-overlay--active');
                document.body.style.overflow = '';
            }, 900);

            // TODO: aqui entrará a chamada ao back-end (C# API) quando implementado
            console.log(`[ProntaComanda] ${mode === 'edit' ? 'Editando' : 'Adicionando'} item:`, nome);
        });
    });

    // Botões "Editar" nos cards do cardápio
    document.querySelectorAll('.card-edit-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            // Impede o Swiper de interceptar o clique
            e.stopPropagation();

            const card = this.closest('.card');
            const data = {
                nome: card.querySelector('h2')?.textContent || '',
                legenda: card.querySelector('p')?.textContent || '',
                preco: card.querySelector('.card-price h3')?.textContent?.replace(/[^0-9,]/g, '') || '',
                imagemSrc: card.querySelector('.card-image')?.src || '',
                imagemNome: card.querySelector('.card-image')?.src?.split('/').pop() || '',
            };
            abrirModal('modal-cardapio', 'edit', data);
        });
    });

    // Botão "Adicionar Item" no header — coberto pelo querySelectorAll acima
});