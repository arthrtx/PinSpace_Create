/* =====================================================================
   Página inicial: introdução animada (HTML/CSS, sem vídeo).
   Começa com o nome a cobrir o ecrã; logo a seguir revela a barra e o
   scroll e o resto da animação corre no topo do site. Quando acaba fica o último plano: ecrãs a passar ao fundo, o título
   a brilhar, atalho para o SoundCloud e uma seta para a conta.
   Tudo é desenhado por render(t), com tempos em "segundos de animação".
   ===================================================================== */
(function () {
    'use strict';
    const root = document.getElementById('hero-intro');
    if (!root) return;
    const hero = root.closest('.ms-hero');
    const stage = document.getElementById('hv-stage');
    const bstage = document.getElementById('hv-bstage');
    const hints = [...root.querySelectorAll('[data-hint-for]')];
    const pi = document.getElementById('pi');
    const glowEl = document.getElementById('hv-glow');
    const wallEl = document.getElementById('hv-wall');
    const shadeEl = document.getElementById('hv-shade');
    const colsEl = document.getElementById('hv-cols');
    const titleEl = stage.querySelector('.hv-title');
    const innerEl = stage.querySelector('.hv-inner');
    const loadBar = root.querySelector('.hv-load i');
    // telemóveis/ecrãs pequenos: imagens mais pequenas (no iPhone, imagens grandes descodificadas
    // esgotavam a memória e o Safari fechava a página)
    const SMALL = window.matchMedia('(max-width: 900px), (pointer: coarse) and (max-width: 1180px)').matches;
    const IMG = SMALL ? 'img/intro/m/' : 'img/intro/';
    const SPEED = 1.32;          // mais rápido do que o vídeo original
    const T_END = 1280 / 30;     // fim da animação (segundos de animação)

    if (SMALL) pi.classList.add('is-lite');
    // posições dos elementos nas capturas do site (página 1440x900)
    const R = {"google_btn":{"x":720,"y":487.4,"w":470,"h":44},"pop_login_card":{"x":461,"y":338.0,"width":518,"height":224.0},"pop_post_first":{"x":364.9,"y":331.6,"width":680.2,"height":757.8},"comment_btn":{"x":553.9,"y":870.4,"w":57.8,"h":38},"pop_comments":{"x":383.9,"y":337.4,"width":642.2,"height":225.6},"pop_pf_me":{"x":51,"y":343.6,"width":128,"height":150.3},"pop_pf_stats":{"x":246.1,"y":363.7,"width":470,"height":64.1},"pop_pf_date":{"x":1207.2,"y":138.6,"width":172.8,"height":157.6},"accent_btn":{"x":86,"y":674.6,"w":38,"h":38},"swatch_pink":{"x":327.9,"y":634.4,"w":25.7,"h":25.7},"pop_accent":{"x":199,"y":521.7,"width":224,"height":182.5},"pop_pf_me_bunny":{"x":51,"y":343.6,"width":128,"height":150.3},"bunny_follow":{"x":289.2,"y":466.8,"w":86.1,"h":42},"pop_bunny_board1":{"x":52,"y":467.6,"width":256,"height":338.7},"pop_bunny_board2":{"x":322,"y":467.6,"width":256,"height":321.9},"pop_bunny_board3":{"x":592,"y":467.6,"width":256,"height":321.9},"sc_login":{"x":1051.7,"y":246.9,"w":185.6,"h":44},"pop_sc_connect":{"x":134.4,"y":197.1,"width":1171.2,"height":99.5},"track1":{"x":720,"y":526.7,"w":250,"h":321.6},"pop_music_flow":{"x":134.4,"y":326.7,"width":1171.2,"height":400},"tool_image":{"x":44,"y":168,"w":46,"h":46},"collage":[{"x":488.3,"y":194.4,"w":229.6,"h":326.2,"rot":"-4"},{"x":711.2,"y":183.4,"w":234.2,"h":378.2,"rot":"5"},{"x":678.3,"y":479.5,"w":188.7,"h":299.5,"rot":"-6"},{"x":511.7,"y":530.7,"w":158.5,"h":203.4,"rot":"4"},{"x":736.3,"y":705.1,"w":232.5,"h":62.0,"rot":"0"}],"pop_layers":{"x":1156,"y":82,"width":272,"height":806},"pop_toolpanel":{"x":88,"y":82,"width":300,"height":806},"pop_follow_card":{"x":240,"y":355,"width":480,"height":140}};

    /* ---------- utilitários ---------- */
    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const seg = (t, a, b) => clamp((t - a) / (b - a));
    const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    const eo = x => 1 - Math.pow(1 - x, 3);
    const back = x => { const c1 = 0.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
    const lerp = (a, b, x) => a + (b - a) * x;
    function kf(K, t) {
        if (t <= K[0][0]) return K[0].slice(1);
        for (let i = 0; i < K.length - 1; i++) {
            const a = K[i], b = K[i + 1];
            if (t <= b[0]) { const x = eio(seg(t, a[0], b[0])); return a.slice(1).map((v, j) => lerp(v, b[j + 1], x)); }
        }
        return K[K.length - 1].slice(1);
    }

    /* ---------- estrutura das cenas ---------- */
    pi.innerHTML = `
        <div class="pi-cube"><div class="glow"></div><div class="body"></div><div class="prism"></div><div class="shine"></div></div>
        <div class="pi-world">
            <div class="pi-rig pi-desk">
                <div class="pi-device"><div class="pi-screen pi-scr"><div class="pi-glare"></div></div></div>
                <div class="pi-layer"><div class="pi-mk"></div></div>
                <div class="pi-dock"></div>
            </div>
            <div class="pi-rig pi-phone">
                <div class="pi-device"><div class="pi-screen pi-pscr"><div class="pi-island"></div><div class="pi-glare"></div></div></div>
            </div>
        </div>
        <div class="pi-ripple"></div>
        <div class="pi-cursor"><svg width="40" height="40" viewBox="0 0 28 28" aria-hidden="true"><path d="M5 3 L5 22.5 L10 17.8 L13.4 25.4 L16.9 23.9 L13.6 16.5 L20.5 16.5 Z" fill="#111" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg></div>
        <div class="pi-cap"><div class="k"></div><div class="t"></div><div class="s"></div></div>
        <div class="pi-intro"><div><div class="big">pin space<b>.</b></div><div class="tag">cria · partilha · ouve</div></div></div>`;
    const q = s => pi.querySelector(s);
    const desk = q('.pi-desk'), phone = q('.pi-phone'), layer = q('.pi-layer'), mk = q('.pi-mk');
    const cube = q('.pi-cube'), cubeBody = cube.querySelector('.body'), cubeGlow = cube.querySelector('.glow'), cubePrism = cube.querySelector('.prism'), cubeShine = cube.querySelector('.shine');
    const cursor = q('.pi-cursor'), ripple = q('.pi-ripple'), cap = q('.pi-cap'), introEl = q('.pi-intro');
    const urls = new Set();
    const img = (src, cls) => { const im = new Image(); im.decoding = 'async'; im.alt = ''; if (cls) im.className = cls; if (!SMALL) { im.src = src; urls.add(src); } return im; };

    /* ecrãs do "monitor" e do telemóvel */
    const SHOTS = [
        ['login_modal', 2.2], ['login_click', 4.85, 'fade'], ['feed', 5.7],
        ['feed_comments', 8.45, 'up'],
        ['profile_thu', 10.6], ['profile_thu_pink', 13.45], ['profile_thu_purple', 14.9],
        ['profile_bunny', 16.3], ['profile_bunny_following', 17.85], ['profile_bunny_boards', 19.4, 'up'],
        ['music_connect', 22.2], ['music_playing', 24.4],
        ['editor_empty', 27.0], ['editor_collage', 29.5],
        ['profile_bunny', 32.6], ['feed', 34.6]
    ];
    const scr = q('.pi-scr');
    SHOTS.forEach(s => { s.el = img(IMG + 's_' + s[0] + '.webp', 'pi-shot'); scr.insertBefore(s.el, scr.querySelector('.pi-glare')); });
    const PSHOTS = [['m_profile_bunny', 32.2], ['m_bunny_boards', 33.8, 'up'], ['m_feed', 35.4], ['m_profile_thu', 37.0]];
    const pscr = q('.pi-pscr');
    PSHOTS.forEach(s => { s.el = img(IMG + 's_' + s[0] + '.webp', 'pi-shot'); pscr.insertBefore(s.el, pscr.querySelector('.pi-island')); });

    function paintShots(list, t, H) {
        let cur = 0; list.forEach((s, i) => { if (t >= s[1]) cur = i; });
        list.forEach((s, i) => {
            let o = 0, y = 0;
            if (i === cur) { const x = seg(t, s[1], s[1] + .45); if (s[2] === 'up') { o = 1; y = (1 - eio(x)) * H; } else o = i === 0 ? 1 : eio(x); }
            else if (i === cur - 1) { const n = list[cur]; const x = seg(t, n[1], n[1] + .45); o = 1; if (n[2] === 'up') y = -eio(x) * H * .35; }
            s.el.style.opacity = o; s.el.style.transform = y ? `translateY(${y}px)` : ''; s.el.style.zIndex = i === cur ? 2 : 1;
        });
    }

    /* pop-ups */
    const POPS = [
        ['login_card', 2.9, 4.85, 1.15], ['post_first', 6.2, 8.3, .95], ['comments', 9.0, 10.4, 1.1],
        ['pf_date', 11.0, 12.2, 1.2], ['pf_me', 11.3, 12.4, 1.35], ['accent', 12.45, 14.4, 1.25],
        ['pf_me_bunny', 16.6, 17.3, 1.35], ['follow_card', 18.0, 19.1, 1.2],
        ['bunny_board1', 20.0, 21.95, 1.12], ['bunny_board2', 20.25, 21.95, 1.12], ['bunny_board3', 20.5, 21.95, 1.12],
        ['sc_connect', 22.6, 23.9, 1.02], ['music_flow', 24.9, 26.6, .98], ['layers', 30.3, 32.0, .98]
    ];
    const POPN = {};
    POPS.forEach(p => {
        const r = R['pop_' + p[0]]; const d = document.createElement('div'); d.className = 'pi-pop';
        let { x, y, width: w, height: h } = r, fs = 1;
        if (y + h > 890) { fs = 860 / h; const cx = x + w / 2; w *= fs; h *= fs; x = cx - w / 2; y = 20; }
        p.box = { fs, ox: r.x, oy: r.y };
        Object.assign(d.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
        d.innerHTML = '<div class="shadow"></div><div class="halo"></div>';
        d.appendChild(img(IMG + 'p_' + p[0] + '.webp'));
        layer.insertBefore(d, mk); p.el = d; POPN[p[0]] = p;
    });
    function paintPops(t) {
        POPS.forEach(p => {
            const [, a, b, ms] = p, el = p.el;
            if (t < a || t > b + .6) { if (el.style.opacity !== '0') el.style.opacity = 0; return; }
            const i = seg(t, a, a + .75), o = seg(t, b, b + .55);
            const s = lerp(.7, ms, back(i)) * lerp(1, .94, eio(o)) + Math.sin((t - a) * 1.2) * .004;
            const z = 8 + lerp(0, 110, eo(i)) * (1 - eio(o));
            el.style.opacity = Math.min(eo(seg(t, a, a + .35)), 1 - eio(o));
            el.style.transform = `translateZ(${z}px) rotateY(${Math.sin((t - a) * .9) * 1.6}deg) scale(${s})`;
        });
    }

    /* imagens que voam para a colagem do editor */
    const ROT = [-4, 5, -6, 4];
    const FLY = ['ref_vision', 'ref_rockstar', 'ref_godsplan', 'thu_avatar'].map((f, i) => {
        const r = R.collage[i], th = ROT[i] * Math.PI / 180, c = Math.cos(th), s = Math.abs(Math.sin(th));
        const w = (r.w * c - r.h * s) / (c * c - s * s), h = (r.h * c - r.w * s) / (c * c - s * s);
        const d = document.createElement('div'); d.className = 'pi-fly';
        Object.assign(d.style, { left: (r.x + r.w / 2 - w / 2) + 'px', top: (r.y + r.h / 2 - h / 2) + 'px', width: w + 'px', height: h + 'px' });
        d.appendChild(img(IMG + 'f_' + f + '.webp')); layer.insertBefore(d, mk);
        return { el: d, rot: ROT[i], t: 27.7 + i * .38, from: [[1500, -200], [1600, 300], [1500, 900], [-300, 1000]][i], cx: r.x + r.w / 2, cy: r.y + r.h / 2 };
    });
    function paintFly(t) {
        FLY.forEach(f => {
            const x = eo(seg(t, f.t, f.t + .7)), out = seg(t, 29.5, 29.8);
            if (t < f.t || out >= 1) { f.el.style.opacity = 0; return; }
            f.el.style.opacity = Math.min(1, x * 4) * (1 - out);
            f.el.style.transform = `translate(${(f.from[0] - f.cx) * (1 - x)}px,${(f.from[1] - f.cy) * (1 - x)}px) translateZ(${4 + Math.sin(x * Math.PI) * 260}px) rotate(${f.rot + (1 - x) * 25}deg) scale(${1 + (1 - x) * .3})`;
        });
    }

    /* cursor: posição calculada a partir do ponto real do ecrã 3D (ou do pop-up) */
    const G = R.google_btn, CB = R.comment_btn, AB = R.accent_btn, SW = R.swatch_pink, SC = R.sc_login, TR = R.track1, TI = R.tool_image, BF = R.bunny_follow;
    const CUR = [
        [2.6, 1060, 760, 0], [3.0, 1040, 740, 1], [4.3, G.x, G.y, 1, 'login_card'], [4.85, G.x, G.y, 1, 'login_card'],
        [5.9, 960, 620, 1], [7.7, CB.x, CB.y, 1], [8.35, CB.x, CB.y, 1], [9.4, 1000, 560, 1],
        [10.9, 860, 330, 1], [12.1, AB.x, AB.y, 1], [12.45, AB.x, AB.y, 1], [13.15, SW.x, SW.y, 1, 'accent'], [13.5, SW.x, SW.y, 1, 'accent'], [14.4, 560, 640, 1],
        [16.6, 760, 330, 1], [17.5, BF.x, BF.y, 1], [17.9, BF.x, BF.y, 1], [18.9, 760, 620, 1], [20.2, 980, 760, 1], [21.8, 1150, 640, 1],
        [22.5, 900, 520, 1], [23.8, SC.x, SC.y, 1], [24.25, SC.x, SC.y, 1], [25.6, TR.x, TR.y + 60, 1], [26.6, TR.x + 30, TR.y + 40, 1],
        [27.2, 300, 330, 1], [27.6, TI.x, TI.y, 1], [28.2, TI.x, TI.y, 1], [29.8, 760, 420, 1], [31.4, 800, 400, 1], [31.9, 800, 400, 0]
    ];
    const CLICKS = [4.7, 8.25, 12.35, 13.35, 17.75, 24.15, 27.65];
    let stageBox = null, stageScale = 1;
    function proj(x, y, on) {
        let host = layer, lx = x, ly = y;
        const p = on && POPN[on];
        if (p && +p.el.style.opacity > 0.05) { host = p.el; lx = (x - p.box.ox) * p.box.fs; ly = (y - p.box.oy) * p.box.fs; }
        if (mk.parentNode !== host) host.appendChild(mk);
        mk.style.left = lx + 'px'; mk.style.top = ly + 'px';
        const r = mk.getBoundingClientRect();
        // de volta às coordenadas do palco (1920x1080)
        return [(r.left + r.width / 2 - stageBox.left) / stageScale, (r.top + r.height / 2 - stageBox.top) / stageScale];
    }
    function paintCursor(t) {
        if (t < 2.5 || t > 32.1) { cursor.style.opacity = 0; ripple.style.opacity = 0; return; }
        stageBox = stage.getBoundingClientRect();
        let i = 0; while (i < CUR.length - 2 && t > CUR[i + 1][0]) i++;
        const A = CUR[i], B = CUR[i + 1];
        const k = t <= A[0] ? 0 : t >= B[0] ? 1 : seg(t, A[0], B[0]);
        const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const pa = proj(A[1], A[2], A[4]), pb = proj(B[1], B[2], B[4]);
        const dx = pb[0] - pa[0], dy = pb[1] - pa[1], dist = Math.hypot(dx, dy);
        const arc = Math.sin(e * Math.PI) * Math.min(60, dist * .12);
        const x = pa[0] + dx * e + (-dy / (dist || 1)) * arc, y = pa[1] + dy * e + (dx / (dist || 1)) * arc;
        const o = lerp(A[3], B[3], k);
        let sc = 1; CLICKS.forEach(c => { const d = t - c; if (d > -.1 && d < .18) sc = .86 + Math.abs(d - .04) * .5; });
        cursor.style.opacity = o;
        cursor.style.transform = `translate(${x - 7}px, ${y - 4}px) scale(${Math.min(1, sc)})`;
        let ro = 0, rs = 1;
        CLICKS.forEach(c => { const d = t - c; if (d >= 0 && d < .55) { ro = 1 - d / .55; rs = .35 + eo(d / .55) * 1.1; } });
        ripple.style.opacity = ro * o; ripple.style.transform = `translate(${x}px, ${y}px) scale(${rs})`;
    }

    /* doca */
    const IC = {
        login: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
        explore: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
        profile: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="11" r="2.5"/><path d="M14 10h4M14 14h4M6 17h12"/>',
        music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
        editor: '<rect x="3" y="3" width="8" height="10" rx="2"/><rect x="13" y="3" width="8" height="6" rx="2"/><rect x="13" y="11" width="8" height="10" rx="2"/><rect x="3" y="15" width="8" height="6" rx="2"/>'
    };
    const DOCKT = [[0, 'login'], [5.6, 'explore'], [10.6, 'profile'], [22.2, 'music'], [27.0, 'editor']];
    const dock = q('.pi-dock');
    dock.innerHTML = Object.keys(IC).map(k => `<div class="ic" data-k="${k}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${IC[k]}</svg></div>`).join('');
    const dockIcons = [...dock.children];
    let dockOn = '';
    function paintDock(t) {
        let a = 'login'; DOCKT.forEach(d => { if (t >= d[0]) a = d[1]; });
        if (a === dockOn) return; dockOn = a;
        dockIcons.forEach(ic => { const on = ic.dataset.k === a; ic.style.setProperty('--on', on ? 1 : 0); ic.style.background = on ? '#E60023' : 'rgba(10,10,10,.55)'; ic.style.transform = on ? 'translateY(-6px) scale(1.06)' : 'none'; });
    }

    /* legendas */
    const CAPS = [
        [2.4, 5.4, 'Entrar', 'Um clique com o Google.', 'Sem palavras-passe. Entras e o teu perfil fica pronto.'],
        [5.9, 10.3, 'Comunidade', 'Descobre quadros de toda a gente.', 'Likes, reposts e comentários em tempo real.'],
        [10.9, 16.0, 'O teu perfil', 'Banner animado, a tua cor.', 'Escolhe a cor e todo o perfil acompanha.'],
        [16.6, 21.9, 'Perfis', 'Os quadros de cada pessoa.', 'Segue quem te inspira e vê tudo o que publicou.'],
        [22.5, 26.7, 'Música', 'Liga o SoundCloud.', 'O teu feed toca enquanto crias.'],
        [27.3, 31.9, 'Editor', 'Arrasta. Roda. Cola.', 'Camadas, cortes, sombras e remoção de fundo.'],
        [32.6, 38.2, 'Em qualquer ecrã', 'No PC crias. No telemóvel vês, ouves e comentas.', 'O mesmo PinSpace no computador e no telemóvel.', 'top']
    ];
    function paintCap(t) {
        let c = null; CAPS.forEach(x => { if (t >= x[0] - .1 && t <= x[1] + .6) c = x; });
        if (!c) { cap.style.opacity = 0; return; }
        cap.style.opacity = 1; cap.className = 'pi-cap' + (c[5] ? ' ' + c[5] : '');
        if (cap.dataset.k !== c[2]) {
            cap.dataset.k = c[2];
            cap.children[0].textContent = c[2]; cap.children[1].textContent = c[3]; cap.children[2].textContent = c[4];
        }
        [...cap.children].forEach((e, i) => {
            const x = eo(seg(t, c[0] + i * .1, c[0] + i * .1 + .55)), o = eo(seg(t, c[1], c[1] + .45));
            e.style.opacity = x * (1 - o); e.style.transform = `translateY(${(1 - x) * 30 - o * 16}px)`;
            const b = (1 - x) * 8 + o * 6; e.style.filter = b > .05 ? `blur(${b}px)` : '';
        });
    }

    /* câmara (virada para a direita) */
    const CAM = [
        [0, 260, 60, -900, 10, 38, -2, .70], [2.6, 265, 30, -120, 7, 17, -1.2, .80],
        [7.6, 275, 30, -80, 6, 13, -1, .82], [11.8, 265, 20, -60, 8, 19, -1.5, .84],
        [16.3, 285, 30, -100, 6, 14, -1, .80], [21.8, 265, 30, -80, 7, 17, -1.2, .82],
        [26.8, 275, 30, -60, 6, 15, -1, .84], [31.6, 260, 30, -100, 5, 12, -.6, .82],
        [33.2, -230, 150, -380, 5, 20, -1, .58], [38.2, -215, 150, -360, 5, 17, -1, .59],
        [40.2, -260, 140, -1100, 6, 24, -1, .55], [44, -260, 140, -1100, 6, 24, -1, .55]
    ];
    const PCAM = [[32.2, 1250, 140, -200, 4, 30, -1, .84], [33.4, 600, 150, -100, 4, 20, -1, .82], [38.2, 590, 150, -80, 4, 16, -1, .83], [40.2, 760, 140, -900, 6, 26, -1, .8], [44, 760, 140, -900, 6, 26, -1, .8]];
    function camAt(K, t) { const v = kf(K, t); v[4] += Math.sin(t * .7) * 1.2; v[3] += Math.cos(t * .55) * .6; v[1] += Math.sin(t * .9) * 6; return v; }
    const camT = v => `translate3d(${v[0]}px,${v[1]}px,${v[2]}px) rotateX(${v[3]}deg) rotateY(${v[4]}deg) rotateZ(${v[5]}deg) scale(${v[6]})`;
    const BG = [[0, 230, 0, 35], [10.6, 209, 107, 165], [16.3, 190, 90, 150], [22.2, 255, 110, 40], [27, 230, 0, 35], [32.5, 150, 90, 230], [39, 230, 0, 35], [44, 230, 0, 35]];

    /* parede de ecrãs do final */
    const H = { long_feed: 712.5, m_feed: 647, editor_collage: 237.5, long_bunny: 633.5, m_profile_bunny: 647, profile_thu_pink: 237.5, music_playing: 237.5, m_bunny_boards: 647, m_profile_thu: 647, feed_comments: 237.5, profile_bunny: 237.5, profile_thu_purple: 237.5, feed: 237.5 };
    const COLS = [
        ['long_feed', 'm_feed', 'editor_collage', 'long_bunny'],
        ['m_profile_bunny', 'profile_thu_pink', 'music_playing', 'm_bunny_boards'],
        ['long_bunny', 'editor_collage', 'm_profile_thu', 'feed_comments'],
        ['m_bunny_boards', 'profile_bunny', 'long_feed', 'm_feed'],
        ['music_playing', 'm_profile_thu', 'profile_thu_purple', 'long_feed'],
        ['editor_collage', 'long_bunny', 'm_profile_bunny', 'feed']
    ];
    colsEl.innerHTML = COLS.map(c => '<div class="hv-col">' + [...c, ...c, ...c].map(n =>
        `<img class="${n.startsWith('m_') ? 'ph' : ''}" src="${IMG}${n}.jpg" width="380" height="${Math.round(H[n])}" alt="">`).join('') + '</div>').join('');
    COLS.forEach(c => c.forEach(n => urls.add(IMG + n + '.jpg')));
    const cols = [...colsEl.children].map((el, i) => {
        const dir = i % 2 ? 1 : -1, sp = 60 + (i % 3) * 18, off = i % 2 ? -400 : 0;
        const y = t => -900 + dir * (t - 38) * sp + off;
        return { el, y, y0: y(T_END), period: COLS[i].reduce((s, n) => s + H[n] + 34, 0) };
    });
    function paintWall(t) {
        cols.forEach(c => {
            const m = ((c.y0 - c.y(t)) % c.period + c.period) % c.period;
            c.el.style.transform = `translateY(${(c.y0 - m).toFixed(1)}px)`;
        });
    }

    /* ---------- desenho de um instante ---------- */
    let piOn = true;
    function render(t) {
        const col = kf(BG, t).map(Math.round);
        glowEl.style.background = `radial-gradient(48% 60% at ${62 + Math.sin(t * .3) * 4}% ${42 + Math.cos(t * .25) * 4}%, rgba(${col.join(',')},.26), transparent 70%), radial-gradient(36% 48% at 18% 82%, rgba(90,70,170,.18), transparent 70%), radial-gradient(64% 84% at 50% 50%, #121013, #060607)`;

        // final: parede, véu e título
        const wi = eo(seg(t, 38.6, 40.4));
        wallEl.style.opacity = wi; shadeEl.style.opacity = wi;
        wallEl.style.transform = wi < 1 ? `scale(${lerp(1.15, 1, wi)})` : '';
        if (wi > 0) paintWall(t);
        const ix = eo(seg(t, 40.2, 41.0));
        titleEl.style.opacity = ix; innerEl.style.transform = ix < 1 ? `scale(${lerp(.92, 1, ix)})` : '';

        const showPi = t < 40.4;
        if (showPi !== piOn) { piOn = showPi; pi.classList.toggle('is-off', !showPi); }
        if (!showPi) return;

        const ii = eo(seg(t, .1, .9)), io = eio(seg(t, 1.7, 2.4));
        introEl.style.opacity = ii * (1 - io);
        introEl.style.transform = `scale(${lerp(.92, 1, ii) + io * .08})`; introEl.style.filter = io > 0 ? `blur(${io * 12}px)` : '';

        const ro = eio(seg(t, 38.9, 40.0));
        desk.style.opacity = eo(seg(t, 2.05, 2.75)) * (1 - ro);   // só depois do nome
        desk.style.transform = camT(camAt(CAM, t));
        phone.style.opacity = eo(seg(t, 32.2, 33.1)) * (1 - ro);
        if (t > 32) phone.style.transform = camT(camAt(PCAM, t));

        const bi = eo(seg(t, 2.0, 3.2)), bo = eio(seg(t, 31.7, 32.5)), ph = eio(seg(t, 32.2, 33.4));   // a tecla sai quando entram o PC e o telemóvel
        const bx = 330 + Math.sin(t * .45) * 4 - ph * 40, by = 430 + Math.sin(t * .6) * 8 - ph * 70;
        cube.style.opacity = bi * (1 - bo);
        cube.style.visibility = bo >= 1 ? 'hidden' : '';
        cube.style.transform = `translate(${bx - 280}px, ${by - 280}px) scale(${lerp(.56, .6, bi) * (1 + Math.sin(t * .5) * .012) * (1 - ph * .1)})`;
        const hue = Math.sin(t * .35) * 18;
        cubeBody.style.filter = `hue-rotate(${hue}deg) saturate(1.3) brightness(1.12) contrast(1.06)`;
        cubeGlow.style.filter = `blur(46px) saturate(1.6) hue-rotate(${hue}deg)`;
        cubePrism.style.background = `conic-gradient(from ${(t * 40) % 360}deg at 50% 50%, #ff3d6e, #ffb300, #fff86b, #3dffb0, #3db8ff, #8a5cff, #ff3dd2, #ff3d6e)`;
        const sw = ((t * .28) % 1) * 2.2 - .6;
        cubeShine.style.background = `linear-gradient(115deg, transparent ${sw * 100 - 14}%, rgba(255,255,255,.55) ${sw * 100 - 2}%, rgba(255,255,255,.9) ${sw * 100}%, rgba(255,255,255,.55) ${sw * 100 + 2}%, transparent ${sw * 100 + 14}%)`;

        paintShots(SHOTS, t, 900);
        if (t > 32) paintShots(PSHOTS, t, 664);
        paintPops(t); paintFly(t); paintCursor(t); paintDock(t); paintCap(t);
    }

    /* ---------- escala do palco: cabe inteiro no ecrã ---------- */
    function fit() {
        const w = root.clientWidth, h = root.clientHeight;
        stageScale = Math.min(w / 1920, h / 1080);
        stage.style.transform = `scale(${stageScale})`;
        // a parede fica centrada no topo, mesmo que o fundo desça pela secção seguinte
        bstage.style.top = (h / 2) + 'px';
        bstage.style.transform = `scale(${stageScale})`;
        glowEl.style.height = h + 'px';
        placeHint();
    }
    // cada seta fica por baixo do seu botão na barra, com a ponta no centro dele
    function placeHint() {
        const nav = hero.querySelector('.ms-nav');
        if (!nav || !hints.length) return;
        const rb = root.getBoundingClientRect(), nb = nav.getBoundingClientRect();
        hints.forEach(h => {
            // a primeira opção da lista que existir; com data-hint-last usa o último elemento (ex.: "Entrar")
            let target = null;
            for (const sel of h.dataset.hintFor.split(',')) {
                const all = hero.querySelectorAll(sel.trim());
                if (all.length) { target = h.hasAttribute('data-hint-last') ? all[all.length - 1] : all[0]; break; }
            }
            if (!target) return;
            const tb = target.getBoundingClientRect();
            if (!tb.width) { h.style.visibility = 'hidden'; return; }
            h.style.visibility = '';
            const tipX = tb.left + tb.width / 2;
            const fromRight = Math.max(10, rb.right - tipX - 3);   // ponta da seta no centro do botão
            const right = h.hasAttribute('data-hint-corner') ? Math.min(fromRight, Math.max(16, rb.right - nb.right + 6)) : fromRight;
            h.style.right = right + 'px';
            h.querySelector('.hv-hint-arrow').style.marginRight = (fromRight - right) + 'px';
            h.style.top = (nb.bottom - rb.top + 2) + 'px';
        });
    }
    fit();
    window.addEventListener('resize', fit);
    // a barra muda quando a sessão é verificada → volta a apontar as setas
    const navEl = hero.querySelector('.ms-nav');
    if (navEl && 'MutationObserver' in window) new MutationObserver(() => requestAnimationFrame(placeHint)).observe(navEl, { childList: true, subtree: true });

    /* ---------- relógio, estados e controlos ---------- */
    let raf = 0, t0 = 0, mode = 'idle', visible = true;
    const html = document.documentElement;
    let locked = false;
    const T_NAME = 2.4;          // só o nome cobre o ecrã; depois a animação continua no topo do site
    function lock(on) { locked = on; html.classList.toggle('ps-intro-lock', on); hero.classList.toggle('is-revealed', !on); fit(); }

    function frame(now) {
        if (mode === 'play') {
            const t = (now - t0) / 1000 * SPEED;
            if (t >= T_END) { finish(); return; }
            if (locked && t >= T_NAME) lock(false);   // revela a barra e o scroll
            render(t);
        } else if (mode === 'end') {
            const t = T_END + (now - t0) / 1000;  // depois do fim: só a parede e o brilho
            render(t);
        }
        if (visible && !document.hidden) raf = requestAnimationFrame(frame);
        else raf = 0;
    }
    function loop() { if (!raf) raf = requestAnimationFrame(frame); }

    function play() {
        cancelAnimationFrame(raf); raf = 0;
        root.classList.remove('is-ended'); root.classList.add('is-playing');
        lock(true);
        const sc = document.querySelector('.home-container'); if (sc) sc.scrollTop = 0;
        mode = 'play'; t0 = performance.now();
        piOn = true; pi.classList.remove('is-off');   // volta a mostrar as cenas escondidas no fim
        render(0); loop();
    }
    function finish(opts = {}) {
        mode = opts.still ? 'still' : 'end';
        t0 = performance.now();
        render(T_END);
        root.classList.remove('is-playing'); root.classList.add('is-ended');
        lock(false);
        requestAnimationFrame(placeHint);
        cancelAnimationFrame(raf); raf = 0;
        if (mode === 'end') loop();
    }

    document.getElementById('hv-skip').addEventListener('click', () => finish());
    document.getElementById('hv-replay').addEventListener('click', play);
    root.querySelector('[data-hv-new]')?.addEventListener('click', () => document.getElementById('btn-novo-projeto')?.click());
    window.addEventListener('keydown', (e) => { if (mode === 'play' && locked && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); finish(); } });

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && mode !== 'idle' && mode !== 'still') loop(); }).observe(root);
    }
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) return;
        if (mode === 'play' && (performance.now() - t0) / 1000 * SPEED >= T_END) { finish(); return; }
        if (mode === 'play') loop();
        if (mode === 'end') loop();
    });

    /* ---------- arranque: espera pelas imagens (com limite) ---------- */
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const deepLink = location.hash && location.hash !== '#' && location.hash !== '#musica';
    // telemóvel: vai direto ao final e fica parado (o Safari do iPhone fechava a página com a animação)
    if (reduce || deepLink || SMALL) { finish({ still: reduce || SMALL }); return; }

    lock(true);
    const list = [...urls];
    let done = 0;
    const ready = Promise.all(list.map(u => new Promise(res => {
        const im = new Image(); im.onload = im.onerror = () => { done++; loadBar.style.width = (done / list.length * 100) + '%'; res(); }; im.src = u;
    })));
    const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('600 40px HVG'), document.fonts.load('800 40px HVM')]).catch(() => {}) : Promise.resolve();
    Promise.race([Promise.all([ready, fonts]), new Promise(r => setTimeout(r, 7000))]).then(play);
})();
