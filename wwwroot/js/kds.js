/**
 * kds.js — Kitchen Display System
 * Lógica de: cronômetro por card, mover card entre colunas, contador de fila
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ============================================================
       1. CRONÔMETRO POR CARD
       Cada card tem data-start-time="2026-05-26T20:00:00"
       Atualiza a cada segundo, muda cor conforme urgência
       ============================================================ */
    function atualizarCronometros() {
        document.querySelectorAll('.kds-timer').forEach(timer => {
            const startAttr = timer.dataset.startTime;
            if (!startAttr) return;

            const diff = Math.max(0, Math.floor((Date.now() - new Date(startAttr).getTime()) / 1000));
            const min = Math.floor(diff / 60);
            const sec = diff % 60;
            timer.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

            // Verde → Laranja (10min) → Vermelho (15min)
            if (diff > 900) {
                timer.style.backgroundColor = 'var(--flag-red)';
            } else if (diff > 600) {
                timer.style.backgroundColor = '#f39c12';
            } else {
                timer.style.backgroundColor = '#27ae60';
            }
        });
    }

    setInterval(atualizarCronometros, 1000);
    atualizarCronometros(); // roda imediatamente

    /* ============================================================
       2. MOVER CARD ENTRE COLUNAS
       "Marcar como Pronto"    → remove de .onGoing-content    → clona em .Done-content    (troca botão)
       "Marcar como Entregue"  → remove de .Done-content       → clona em .Delivered-content (remove botão)
       ============================================================ */
    function animarSaida(card, callback) {
        card.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
        card.style.transform = 'scale(0.85)';
        card.style.opacity = '0';
        setTimeout(callback, 260);
    }

    function animarEntrada(card) {
        card.style.transition = 'none';
        card.style.transform = 'scale(0.9)';
        card.style.opacity = '0';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                card.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
                card.style.transform = 'scale(1)';
                card.style.opacity = '1';
            });
        });
    }

    // Delegação de eventos — funciona para cards adicionados dinamicamente
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.ready');
        if (!btn) return;

        const card = btn.closest('[class^="card-"]');
        if (!card) return;

        // ---- MARCAR COMO PRONTO (onGoing → Done) ----
        if (card.classList.contains('card-onGoing')) {
            animarSaida(card, () => {
                // Clona o card e adapta para coluna "Pronto"
                const clone = card.cloneNode(true);
                clone.classList.remove('card-onGoing');
                clone.classList.add('card-Done');
                clone.style.transform = '';
                clone.style.opacity = '';

                // Troca classes dos blocos internos
                clone.querySelector('.onGoing-infos-top')?.classList.replace('onGoing-infos-top', 'Done-infos-top');
                clone.querySelector('.onGoing-infos-center')?.classList.replace('onGoing-infos-center', 'Done-infos-center');
                clone.querySelector('.onGoing-Button')?.classList.replace('onGoing-Button', 'Done-Button');

                // Troca texto do botão
                const novoBtn = clone.querySelector('.ready');
                if (novoBtn) novoBtn.textContent = 'Marcar como Entregue';

                // Insere na coluna Done
                const doneContent = document.querySelector('.Done-content');
                if (doneContent) {
                    doneContent.prepend(clone);
                    animarEntrada(clone);
                }

                card.remove();
                atualizarContadores();
            });
        }

        // ---- MARCAR COMO ENTREGUE (Done → Delivered) ----
        else if (card.classList.contains('card-Done')) {
            animarSaida(card, () => {
                const clone = card.cloneNode(true);
                clone.classList.remove('card-Done');
                clone.classList.add('card-Delivered');
                clone.style.transform = '';
                clone.style.opacity = '';

                // Troca classes dos blocos internos
                clone.querySelector('.Done-infos-top')?.classList.replace('Done-infos-top', 'Delivered-infos-top');
                clone.querySelector('.Done-infos-center')?.classList.replace('Done-infos-center', 'Delivered-infos-center');

                // Remove o botão — entregue não tem ação
                clone.querySelector('.Done-Button')?.remove();

                const deliveredContent = document.querySelector('.Delivered-content');
                if (deliveredContent) {
                    deliveredContent.prepend(clone);
                    animarEntrada(clone);
                }

                card.remove();
                atualizarContadores();
            });
        }
    });

    /* ============================================================
       3. CONTADORES DA SIDEBAR DIREITA
       Pedidos em Fila = total de cards ainda ativos (onGoing + Done)
       ============================================================ */
    function atualizarContadores() {
        const totalAtivos =
            document.querySelectorAll('.card-onGoing').length +
            document.querySelectorAll('.card-Done').length;

        // Atualiza "Pedidos em Fila" de Cozinha e Bar
        document.querySelectorAll('.kitchen-OrdersQueue .number, .bar-OrdersQueue .number')
            .forEach(el => el.textContent = totalAtivos);
    }

    // Inicializa ao carregar
    atualizarContadores();

    /* ============================================================
       TODO: futuramente, cada ação chamará a API C# aqui:
       await fetch('/api/pedidos/{id}/status', { method: 'PATCH', body: JSON.stringify({ status }) })
       ============================================================ */
});