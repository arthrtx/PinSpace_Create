/* PinSpace Create — motor de animações de scroll (reveal, máscaras, letras, parallax, progresso, magnético) */
(() => {
    'use strict';
    const root = document.documentElement;
    root.classList.add('js');

    /* Abre sempre no topo (evita restauro de scroll que "salta" para o fim) */
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    const scroller = document.querySelector('.home-container');
    if (scroller) { scroller.scrollTop = 0; } else { window.scrollTo(0, 0); }
    window.addEventListener('load', () => {
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

    /* ---------- Revelação simples (fade + subida) ---------- */
    const revealIO = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (e.isIntersecting) {
                e.target.classList.add('in-view');
                revealIO.unobserve(e.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

    document.querySelectorAll('[data-reveal]').forEach((el) => {
        applyDelay(el);
        revealIO.observe(el);
    });

    /* ---------- Revelação em máscara (texto sobe de dentro de um clipe) ---------- */
    const maskIO = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (e.isIntersecting) {
                e.target.classList.add('in-view');
                maskIO.unobserve(e.target);
            }
        });
    }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });

    document.querySelectorAll('[data-reveal-mask]').forEach((el) => {
        applyDelay(el);
        maskIO.observe(el);
    });

    /* ---------- Ciclo: textos aparecem E desaparecem com o scroll ---------- */
    const cycleIO = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            e.target.classList.toggle('in-view', e.isIntersecting);
        });
    }, { threshold: 0.22, rootMargin: '0px 0px -4% 0px' });

    document.querySelectorAll('[data-reveal-cycle]').forEach((el) => cycleIO.observe(el));

    /* ---------- Texto letra a letra ---------- */
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

    const textIO = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (e.isIntersecting) {
                e.target.classList.add('in-view');
                textIO.unobserve(e.target);
            }
        });
    }, { threshold: 0.4, rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('[data-scroll-text],[data-pin-text]').forEach((el) => {
        applyDelay(el);
        splitText(el);
        if (!el.hasAttribute('data-pin-text')) textIO.observe(el);
    });

    /* ---------- Faixa presa: o título surge quando fica mesmo preso no ecrã ---------- */
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

    /* ---------- Parallax controlado pelo scroll do container ---------- */
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
            if (!ticking) {
                requestAnimationFrame(applyPar);
                ticking = true;
            }
        });
        applyPar();
    }

    /* ---------- Barra de progresso do scroll ---------- */
    const prog = document.getElementById('scroll-progress');
    if (prog && scroller) {
        const update = () => {
            const max = scroller.scrollHeight - scroller.clientHeight;
            prog.style.transform = `scaleX(${max > 0 ? scroller.scrollTop / max : 0})`;
        };
        scroller.addEventListener('scroll', () => requestAnimationFrame(update));
        window.addEventListener('resize', update);
        window.addEventListener('load', update);
        update();
    }

    /* ---------- Efeito magnético no CTA ---------- */
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

/*
 * Parede de collage — usa os quadros públicos como fundo da secção presa
 */
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

/*
 * Vídeos de fundo
 */
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

/*
 * Intro de abertura, tilt/brilho nos painéis e coordenadas ao vivo
 */
(() => {
    'use strict';

    /* ---------- Intro de abertura ---------- */
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

    /* ---------- Coordenadas ao vivo ---------- */
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