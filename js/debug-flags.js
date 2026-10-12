/* Diagnóstico sem novo deploy: ?off=intro,footer,music,grain,glass,anim
   e, no telemóvel, ?on=anim para experimentar as animações leves
   esconde partes da página inicial para descobrir o que pesa num telemóvel.
   Sem o parâmetro não faz nada. */
(function () {
    try {
        for (const kind of ['off', 'on']) {
            const m = new RegExp('[?&]' + kind + '=([^&#]+)').exec(location.search);
            if (!m) continue;
            decodeURIComponent(m[1]).split(',').forEach(k => {
                if (/^[a-z]+$/.test(k)) document.documentElement.classList.add(kind + '-' + k);
            });
        }
    } catch (e) { /* ok */ }
})();
