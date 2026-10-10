(() => {
    'use strict';

    const scroller = document.querySelector('.home-container');
    if (!scroller) return;

    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tactil = window.matchMedia('(pointer: coarse)').matches;

    let alvo = scroller.scrollTop;
    let aplicado = scroller.scrollTop;
    let quadro = 0;

    const maximo = () => Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const limitar = (v) => Math.min(maximo(), Math.max(0, v));

    const passo = () => {
        const agora = scroller.scrollTop;
        if (Math.abs(agora - aplicado) > 1.5) {
            alvo = agora;
        }
        const dif = alvo - agora;
        if (Math.abs(dif) < 0.5) {
            scroller.scrollTop = alvo;
            aplicado = alvo;
            quadro = 0;
            return;
        }
        aplicado = scroller.scrollTop = agora + dif * 0.13;
        quadro = requestAnimationFrame(passo);
    };

    const deslizar = () => {
        if (!quadro) quadro = requestAnimationFrame(passo);
    };

    const irPara = (v) => {
        alvo = limitar(v);
        if (reduzido) {
            scroller.scrollTop = alvo;
            aplicado = alvo;
            return;
        }
        deslizar();
    };

    scroller.addEventListener('scroll', () => {
        if (!quadro) {
            alvo = aplicado = scroller.scrollTop;
        }
    }, { passive: true });

    if (!reduzido && !tactil) {
        scroller.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.defaultPrevented) return;
            e.preventDefault();
            const unidade = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? scroller.clientHeight : 1;
            irPara(alvo + e.deltaY * unidade);
        }, { passive: false });
    }

    const passos = { ArrowDown: 110, ArrowUp: -110, PageDown: 0.9, PageUp: -0.9, ' ': 0.9, Home: -1e9, End: 1e9 };

    window.addEventListener('keydown', (e) => {
        if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
        if (!(e.key in passos)) return;
        const destino = e.target;
        if (destino && destino.closest && destino.closest('input, textarea, select, [contenteditable="true"]')) return;
        if (document.querySelector('dialog[open]')) return;
        const home = document.getElementById('home-view');
        if (!home || !home.classList.contains('active')) return;
        e.preventDefault();
        let salto = passos[e.key];
        if (Math.abs(salto) <= 1) salto *= scroller.clientHeight;
        irPara(scroller.scrollTop + salto);
    });

    document.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const id = a.getAttribute('href').slice(1);
        if (!id) return;
        const destino = document.getElementById(id);
        if (!destino) return;
        const home = document.getElementById('home-view');
        if (!home || !home.classList.contains('active')) return;
        e.preventDefault();
        const t = getComputedStyle(destino).transform;
        let ty = 0;
        if (t && t !== 'none') {
            const m = t.match(/matrix\(([^)]+)\)/);
            if (m) ty = parseFloat(m[1].split(',')[5]) || 0;
        }
        const topo = destino.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - ty - 20;
        irPara(topo);
    });

    // Para outros scripts (ex.: botão "Início" da doca) usarem o mesmo deslize
    window.psScrollTo = (v) => irPara(v);

    window.addEventListener('resize', () => {
        alvo = limitar(alvo);
    }, { passive: true });
})();
