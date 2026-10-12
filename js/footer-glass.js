/* =====================================================================
   Rodapé: tecla de espaço de vidro "PinSpace Create."
   Fica parada; só "carrega" ao clicar (ou com espaço/Enter quando está
   focada). O rodapé aparece suavemente ao chegar lá.
   ===================================================================== */
(function () {
    'use strict';
    const fg = document.getElementById('fg');
    if (!fg) return;
    const key = document.getElementById('fg-key');

    fg.querySelector('[data-fg-new]')?.addEventListener('click', () => document.getElementById('btn-novo-projeto')?.click());

    let timer = 0;
    function press() {
        key.classList.add('is-pressed');
        clearTimeout(timer);
        timer = setTimeout(() => key.classList.remove('is-pressed'), 160);
    }
    key.addEventListener('pointerdown', press);
    key.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); } });

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => { if (e.isIntersecting) fg.classList.add('is-in'); }, { threshold: 0.12 }).observe(fg);
    } else fg.classList.add('is-in');
})();
