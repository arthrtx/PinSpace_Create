(() => {
    'use strict';
    const root = document.documentElement;
    root.classList.add('js');

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    // A home rola dentro de .home-container. Este script corre antes de o DOM
    // estar completo, por isso procuramos aqui e voltamos a procurar no load.
    const acharScroller = () => document.querySelector('.home-container');
    let scroller = acharScroller();
    if (scroller) { scroller.scrollTop = 0; } else { window.scrollTo(0, 0); }
    window.addEventListener('load', () => {
        if (!scroller) scroller = acharScroller();
        if (scroller) scroller.scrollTop = 0;
    });

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const applyDelay = (el) => {
        const d = Number(el.dataset.revealDelay || 0);
        if (d) el.style.setProperty('--reveal-delay', (d * 0.14).toFixed(2) + 's');
    };

    const revealAll = () => {
        document.querySelectorAll('[data-reveal],[data-reveal-mask],[data-reveal-cycle],[data-scroll-text],[data-pin-text]')
            .forEach((el) => el.classList.add('in-view'));
    };

    if (reduced || !('IntersectionObserver' in window)) {
        revealAll();
        return;
    }

    // A home rola dentro de .home-container, e nao na janela do browser. O
    // IntersectionObserver dava problemas aqui (a galeria ficava em
    // opacity 0 e nao aparecia), por isso revelamos a mao no scroll: e
    // simples e funciona sempre.
    const revealTargets = () => [...document.querySelectorAll(
        '[data-reveal],[data-reveal-mask],[data-reveal-cycle],[data-scroll-text],[data-pin-text]'
    )];

    const seen = new WeakSet();
    // Lista guardada: antes era refeita (querySelectorAll) a cada frame de scroll.
    let targets = revealTargets();
    const refreshTargets = () => { targets = revealTargets(); };
    const pending = () => targets.filter((el) => !seen.has(el));

    const checkReveal = () => {
        // Procuramos de novo: o container pode ter acabado de aparecer.
        if (!scroller || !document.body.contains(scroller)) scroller = acharScroller();
        const box = scroller
            ? scroller.getBoundingClientRect()
            : { top: 0, bottom: window.innerHeight };

        // Se a home ainda nao esta a ser mostrada, nao vale a pena revelar
        // nada: as posicoes nao sao as finais e mostrariam tudo de uma vez.
        const home = document.getElementById('home-view');
        if (home && !home.classList.contains('active')) return;

        const left = pending();
        if (!left.length) return;
        left.forEach((el) => {
            const r = el.getBoundingClientRect();
            // Basta a ponta de cima entrar na vista para revelar.
            if (r.top < box.bottom - 8 && r.bottom > box.top + 8) {
                seen.add(el);
                el.classList.add('in-view');
            }
        });
    };

    // Só aplicamos os atrasos. NÃO marcamos estes elementos como vistos:
    // checkReveal() é que decide quem entra na vista e nesse momento marca.
    revealTargets().forEach((el) => applyDelay(el));

    // Scroll faseado no document: apanha o scroll do .home-container e de
    // qualquer outro elemento, mesmo que so aparecam mais tarde. Se nos
    // prendessemos a um elemento neste momento, podiamos ficar a ouvir o
    // sitio errado e a galeria nunca aparecia.
    let revealTick = false;
    const onRevealScroll = () => {
        if (revealTick) return;
        revealTick = true;
        requestAnimationFrame(() => { checkReveal(); revealTick = false; });
    };

    document.addEventListener('scroll', onRevealScroll, { capture: true, passive: true });
    window.addEventListener('resize', onRevealScroll, { passive: true });
    window.addEventListener('load', () => { refreshTargets(); checkReveal(); });
    setTimeout(checkReveal, 60);
    checkReveal();

    const splitText = (el) => {
        const words = el.textContent.trim().split(/\s+/);
        el.setAttribute('aria-label', words.join(' '));
        el.textContent = '';
        let ci = 0;
        words.forEach((word, wi) => {
            const w = document.createElement('span');
            w.className = 'tw';
            w.style.setProperty('--wi', wi);
            [...word].forEach((ch) => {
                const s = document.createElement('span');
                s.className = 'twc';
                s.style.setProperty('--ci', ci++);
                s.textContent = ch;
                w.appendChild(s);
            });
            el.appendChild(w);
            if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
        });
    };

    // O texto segue o mesmo caminho do resto. O data-pin-text e o unico que
    // precisa de ficar a oscilar, por isso nao entra aqui.
    document.querySelectorAll('[data-scroll-text]').forEach((el) => {
        applyDelay(el);
        splitText(el);
    });

    // A galeria publica e preenchida depois deste script correr, por isso
    // nao estava a ser observada e os quadros nunca apareciam. Vigiamo-la
    // para a revelar assim que os cartoes existam.
    const galeria = document.getElementById('lista-publicos');
    if (galeria) {
        new MutationObserver(() => { refreshTargets(); checkReveal(); }).observe(galeria, { childList: true });
    }

    const pinTexts = [...document.querySelectorAll('[data-pin-text]')];
    if (pinTexts.length) {
        const vh = scroller ? scroller.clientHeight : window.innerHeight;
        const firePin = () => {
            pinTexts.forEach((el) => {
                const r = el.getBoundingClientRect();
                el.classList.toggle('in-view', r.top < vh * 0.55 && r.bottom > 0);
            });
        };
        let tick = false;
        const onScroll = () => {
            if (tick) return;
            tick = true;
            requestAnimationFrame(() => { firePin(); tick = false; });
        };
        if (scroller) {
            scroller.addEventListener('scroll', onScroll, { passive: true });
        } else {
            window.addEventListener('scroll', onScroll, { passive: true });
        }
        window.addEventListener('resize', () => { tick = true; requestAnimationFrame(() => { firePin(); tick = false; }); });
        firePin();
    }

    if (scroller) {
        const par = [...document.querySelectorAll('[data-parallax]')].map((el) => ({
            el,
            speed: Number(el.dataset.parallax || 0.2),
        }));

        let ticking = false;
        const applyPar = () => {
            const mid = scroller.clientHeight / 2;
            par.forEach(({ el, speed }) => {
                const r = el.getBoundingClientRect();
                const off = mid - (r.top + r.height / 2);
                el.style.setProperty('--par-ty', (off * speed).toFixed(1) + 'px');
            });
            ticking = false;
        };
        scroller.addEventListener('scroll', () => {
            // Parallax só interessa enquanto o hero está visível.
            if (scroller.scrollTop > scroller.clientHeight * 1.2) return;
            if (!ticking) {
                requestAnimationFrame(applyPar);
                ticking = true;
            }
        }, { passive: true });
        applyPar();
    }

    const prog = document.getElementById('scroll-progress');
    if (prog && scroller) {
        const update = () => {
            const max = scroller.scrollHeight - scroller.clientHeight;
            prog.style.transform = `scaleX(${max > 0 ? scroller.scrollTop / max : 0})`;
        };
        let progTick = false;
        scroller.addEventListener('scroll', () => {
            if (progTick) return;
            progTick = true;
            requestAnimationFrame(() => { update(); progTick = false; });
        }, { passive: true });
        window.addEventListener('resize', update);
        window.addEventListener('load', update);
        update();
    }

    document.querySelectorAll('.ms-magnetic').forEach((btn) => {
        btn.addEventListener('pointermove', (e) => {
            const r = btn.getBoundingClientRect();
            const x = e.clientX - (r.left + r.width / 2);
            const y = e.clientY - (r.top + r.height / 2);
            btn.style.transform = `translate(${(x * 0.22).toFixed(1)}px, ${(y * 0.3).toFixed(1)}px)`;
        });
        btn.addEventListener('pointerleave', () => {
            btn.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
            btn.style.transform = '';
            setTimeout(() => { btn.style.transition = ''; }, 600);
        });
    });
})();

(function () {
    const wall = document.querySelector('.ms-pin-wall');
    if (!wall) return;
    const SLOTS = [
        { l: -5,  t: -8,  w: 34, h: 26, r: -4 },
        { l: 22,  t: -10, w: 26, h: 20, r: 2 },
        { l: 48,  t: -4,  w: 30, h: 24, r: -2 },
        { l: 74,  t: -9,  w: 28, h: 22, r: 3 },
        { l: -6,  t: 30,  w: 30, h: 24, r: 2 },
        { l: 30,  t: 26,  w: 34, h: 26, r: -3 },
        { l: 64,  t: 28,  w: 28, h: 20, r: 2 },
        { l: 88,  t: 30,  w: 20, h: 26, r: -2 },
        { l: -4,  t: 66,  w: 32, h: 26, r: 3 },
        { l: 24,  t: 62,  w: 26, h: 22, r: -2 },
        { l: 55,  t: 66,  w: 34, h: 28, r: 2 },
        { l: 86,  t: 60,  w: 24, h: 30, r: -3 },
        { l: 12,  t: 84,  w: 36, h: 24, r: 2 },
        { l: 62,  t: 88,  w: 30, h: 24, r: -2 }
    ];
    let raf = 0;
    function build() {
        const srcs = [];
        document.querySelectorAll('#lista-publicos .project-card-thumb').forEach((c) => {
            const img = c.querySelector('img');
            if (img && img.src && !srcs.includes(img.src)) srcs.push(img.src);
        });
        wall.innerHTML = '';
        if (!srcs.length) return;
        const frag = document.createDocumentFragment();
        srcs.slice(0, 14).forEach((src, i) => {
            const slot = SLOTS[i % SLOTS.length];
            const el = document.createElement('img');
            el.src = src;
            el.alt = '';
            el.loading = 'lazy';
            el.style.left = slot.l + '%';
            el.style.top = slot.t + '%';
            el.style.width = slot.w + 'vw';
            el.style.height = slot.h + 'vh';
            el.style.setProperty('--wall-rot', slot.r + 'deg');
            el.style.animationDelay = (i % 5) * -2.4 + 's';
            frag.appendChild(el);
        });
        wall.appendChild(frag);
    }
    build();
    const list = document.getElementById('lista-publicos');
    if (list) {
        const mo = new MutationObserver(() => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(build);
        });
        mo.observe(list, { childList: true, subtree: true });
    }
    window.addEventListener('load', build);
})();

(function () {
    const vids = document.querySelectorAll('video.ms-vid');
    if (!vids.length) return;
    const play = (v) => { v.play().catch(() => { v.muted = true; v.play().catch(() => {}); }); };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        vids.forEach((v) => v.pause());
        return;
    }
    vids.forEach((v) => play(v));
})();

(() => {
    'use strict';

    const intro = document.getElementById('ms-intro');
    if (intro) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            intro.remove();
        } else {
            requestAnimationFrame(() => requestAnimationFrame(() => intro.classList.add('is-in')));
            setTimeout(() => intro.classList.add('done'), 1500);
            setTimeout(() => intro.remove(), 1500 + 950);
        }
    }

    const coords = document.querySelector('.ms-coords');
    if (coords && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        coords.classList.add('is-on');
        const pad = (n) => String(Math.max(0, Math.round(n))).padStart(4, '0');
        let ticking = false;
        window.addEventListener('pointermove', (e) => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                coords.textContent = pad(e.clientX) + ' X · ' + pad(e.clientY) + ' Y';
                ticking = false;
            });
        }, { passive: true });
    }
})();