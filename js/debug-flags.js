/* Diagnóstico sem novo deploy: ?off=intro,footer,music,grain,glass,anim
   esconde partes da página inicial para descobrir o que pesa num telemóvel.
   Sem o parâmetro não faz nada. */
(function () {
    try {
        const m = /[?&]off=([^&#]+)/.exec(location.search);
        if (!m) return;
        decodeURIComponent(m[1]).split(',').forEach(k => {
            if (/^[a-z]+$/.test(k)) document.documentElement.classList.add('off-' + k);
        });
    } catch (e) { /* ok */ }
})();
