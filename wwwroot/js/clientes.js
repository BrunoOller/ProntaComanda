// ============================================================
//  ProntaComanda — clientes.js
//  Cardápio público (Home/Clientes) — Front-End Only
// ============================================================

// ---- FILTROS ----
document.querySelectorAll('.filter').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter').forEach(b => b.classList.remove('selecionado'));
        btn.classList.add('selecionado');
        // Integração com back-end: filtrar cards pela categoria
    });
});

// ---- BUSCA ----
const searchInput = document.querySelector('.search-block input');
if (searchInput) {
    searchInput.addEventListener('input', () => {
        const termo = searchInput.value.trim().toLowerCase();
        document.querySelectorAll('.product-card').forEach(card => {
            const nome = card.querySelector('h2')?.textContent.toLowerCase() ?? '';
            card.style.display = nome.includes(termo) || termo === '' ? '' : 'none';
        });
    });
}
