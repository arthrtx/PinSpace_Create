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

/* ---------------------------------------------------------------------
   Barra de scroll pequena (lado direito) para quem não tem roda no rato.
   Aparece na página inicial e na comunidade; escondida no editor.
   Arrastar a bolinha = percorre a página; clicar na calha = salta para lá.
   --------------------------------------------------------------------- */
(() => {
    'use strict';
    const box = document.createElement('div');
    box.className = 'ps-scrollbar';
    box.setAttribute('role', 'scrollbar');
    box.setAttribute('aria-orientation', 'vertical');
    box.setAttribute('aria-label', 'Percorrer a página');
    box.tabIndex = 0;
    box.innerHTML = '<div class="ps-scrollbar-track"><div class="ps-scrollbar-thumb"></div></div>';
    document.body.appendChild(box);
    const track = box.firstElementChild;
    const thumb = track.firstElementChild;

    // Qual é o elemento que faz scroll na vista atual (ou nenhum, no editor).
    const alvo = () => {
        if (document.getElementById('editor-view')?.classList.contains('active')) return null;
        if (document.getElementById('social-view')?.classList.contains('active')) return document.getElementById('ps-scroll');
        if (document.getElementById('home-view')?.classList.contains('active')) return document.querySelector('.home-container');
        return null;
    };

    const atualizar = () => {
        const el = alvo();
        const max = el ? el.scrollHeight - el.clientHeight : 0;
        box.hidden = !el || max < 40 || !!document.querySelector('dialog[open]');
        if (box.hidden) return;
        const th = track.clientHeight;
        const h = Math.max(16, Math.min(th, th * el.clientHeight / el.scrollHeight));
        thumb.style.height = h + 'px';
        thumb.style.transform = `translateY(${(th - h) * (el.scrollTop / max)}px)`;
        box.setAttribute('aria-valuenow', String(Math.round(100 * el.scrollTop / max)));
    };

    // Converte uma posição na calha em scrollTop.
    const irPara = (clientY, suave) => {
        const el = alvo();
        if (!el) return;
        const r = track.getBoundingClientRect();
        const h = thumb.offsetHeight;
        const p = Math.min(1, Math.max(0, (clientY - r.top - h / 2) / Math.max(1, r.height - h)));
        el.scrollTo({ top: p * (el.scrollHeight - el.clientHeight), behavior: suave ? 'smooth' : 'auto' });
    };

    let arrastar = false, offset = 0;
    track.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (e.target === thumb) {
            arrastar = true;
            offset = e.clientY - thumb.getBoundingClientRect().top - thumb.offsetHeight / 2;
            track.setPointerCapture(e.pointerId);
            box.classList.add('is-drag');
        } else {
            irPara(e.clientY, true);
        }
    });
    track.addEventListener('pointermove', (e) => { if (arrastar) irPara(e.clientY - offset, false); });
    const soltar = () => { arrastar = false; box.classList.remove('is-drag'); };
    track.addEventListener('pointerup', soltar);
    track.addEventListener('pointercancel', soltar);

    // Roda por cima da barra e teclado (setas / Page Up / Page Down).
    box.addEventListener('wheel', (e) => { const el = alvo(); if (el) { e.preventDefault(); el.scrollBy({ top: e.deltaY }); } }, { passive: false });
    box.addEventListener('keydown', (e) => {
        const el = alvo();
        if (!el) return;
        const passo = { ArrowDown: 80, ArrowUp: -80, PageDown: el.clientHeight * 0.8, PageUp: -el.clientHeight * 0.8 }[e.key];
        if (!passo) return;
        e.preventDefault();
        el.scrollBy({ top: passo, behavior: 'smooth' });
    });

    // Mantém o estado certo: scroll em qualquer contentor, mudança de vista, redimensionar.
    document.addEventListener('scroll', () => requestAnimationFrame(atualizar), { capture: true, passive: true });
    window.addEventListener('resize', atualizar);
    window.addEventListener('hashchange', () => setTimeout(atualizar, 300));
    new MutationObserver(() => requestAnimationFrame(atualizar))
        .observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'open'] });
    atualizar();
})();
