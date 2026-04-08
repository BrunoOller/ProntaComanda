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
