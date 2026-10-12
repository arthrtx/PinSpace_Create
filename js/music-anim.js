/* Secção da música: liga as animações de entrada quando a secção aparece
   no ecrã (os estilos estão em css/music-anim.css). */
(function () {
    'use strict';
    const sec = document.getElementById('musica');
    if (!sec) return;
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        sec.classList.add('mu-in');
        return;
    }
    const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { sec.classList.add('mu-in'); io.disconnect(); }
    }, { threshold: 0.18 });
    io.observe(sec);
})();
