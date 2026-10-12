/* =====================================================================
   PinSpace — efeitos do editor
   · Componentes de escolha visuais (amostras de cor, chips, sliders com
     valor, grelhas de pré-visualização) usados nos painéis.
   · Sombra de imagens (drop-shadow que segue o recorte/transparência).
   · Rodar e virar (90°, 180°, espelhar).
   · Efeitos de texto: sombra, levantar, brilho, néon, só contorno,
     traço, eco, sombra sólida (3D), glitch e destaque.
   · Exportação: imagens com sombra e texto com efeitos, quebra de linha,
     espaçamento e fundo também na imagem exportada/publicada.
   Carregado depois de tools.js (substitui drawElement com uma versão
   que conhece os efeitos e chama a original para o resto).
   ===================================================================== */

/* ---------------------------------------------------------------------
   Utilitários
   --------------------------------------------------------------------- */
const FX_SWATCHES = ['#111111', '#FFFFFF', '#E60023', '#F4465C', '#5F7466', '#A9BCAE', '#1E2A42', '#5D8296', '#D8A33B', '#C9B8A6'];

function fxRgba(hex, a = 1) {
    const h = String(hex || '#000000').replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6);
    const n = parseInt(full, 16) || 0;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function fxMix(hex, withHex, t) {
    const p = (x) => {
        const h = String(x || '#000').replace('#', '');
        const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6);
        const n = parseInt(f, 16) || 0;
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const a = p(hex), b = p(withHex);
    const m = a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return '#' + m.map(v => v.toString(16).padStart(2, '0')).join('');
}

function fxOffset(dist, angDeg) {
    const a = (angDeg || 0) * Math.PI / 180;
    return { x: Math.round(Math.cos(a) * dist * 10) / 10, y: Math.round(Math.sin(a) * dist * 10) / 10 };
}

function fxNormAngle(a) {
    a = Math.round(Number(a) || 0) % 360;
    if (a > 180) a -= 360;
    if (a <= -180) a += 360;
    return a;
}

function fxEsc(s) {
    return typeof escapeHTML === 'function' ? escapeHTML(s) : String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------------------------------------------------------------
   Componentes de escolha (HTML + ligação)
   --------------------------------------------------------------------- */

// Linha de amostras de cor + cor personalizada (+ opcionalmente "nenhuma").
function fxSwatchesHTML(id, value, opts = {}) {
    value = value ? psSafeColor(value, '') : '';
    const v = String(value || '').toLowerCase();
    const list = opts.colors || FX_SWATCHES;
    const none = opts.allowNone
        ? `<button type="button" class="fx-sw fx-sw-none ${!value ? 'on' : ''}" data-color="" title="Sem cor" aria-label="Sem cor"></button>`
        : '';
    return `<div class="fx-swatches" data-fx-sw="${id}">
        ${none}
        ${list.map(c => `<button type="button" class="fx-sw ${v === c.toLowerCase() ? 'on' : ''}" data-color="${c}" style="--c:${c}" title="${c}" aria-label="Cor ${c}"></button>`).join('')}
        <label class="fx-sw fx-sw-custom ${value && !list.some(c => c.toLowerCase() === v) ? 'on' : ''}" title="Outra cor" style="${value ? `--c:${value}` : ''}">
            <input type="color" value="${value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#E60023'}" aria-label="Escolher outra cor">
        </label>
    </div>`;
}

function fxBindSwatches(root, id, onChange) {
    const box = root.querySelector(`[data-fx-sw="${id}"]`);
    if (!box) return;
    const mark = (btn) => box.querySelectorAll('.fx-sw').forEach(b => b.classList.toggle('on', b === btn));
    box.addEventListener('click', (e) => {
        const b = e.target.closest('button.fx-sw');
        if (!b) return;
        mark(b);
        onChange(b.dataset.color || null);
    });
    const input = box.querySelector('input[type="color"]');
    const custom = box.querySelector('.fx-sw-custom');
    input?.addEventListener('input', () => {
        custom.style.setProperty('--c', input.value);
        mark(custom);
        onChange(input.value);
    });
}

// Slider com etiqueta e valor ao lado.
function fxSliderHTML(id, label, min, max, step, value, unit = '') {
    return `<div class="fx-slider">
        <div class="fx-slider-head"><span>${label}</span><output data-fx-out="${id}">${value}${unit}</output></div>
        <input type="range" data-fx-range="${id}" min="${min}" max="${max}" step="${step}" value="${value}">
    </div>`;
}

function fxBindSlider(root, id, unit, onInput, onChange) {
    const r = root.querySelector(`[data-fx-range="${id}"]`);
    const o = root.querySelector(`[data-fx-out="${id}"]`);
    if (!r) return;
    r.addEventListener('input', () => {
        if (o) o.textContent = r.value + unit;
        onInput(parseFloat(r.value));
    });
    if (onChange) r.addEventListener('change', () => onChange(parseFloat(r.value)));
}

// Secção que abre/fecha (acordeão) — mantém o painel curto e dinâmico.
const FX_OPEN_KEY = 'pinspace_fx_open';
function fxIsOpen(key, def = false) {
    try {
        const m = JSON.parse(sessionStorage.getItem(FX_OPEN_KEY) || '{}');
        return key in m ? !!m[key] : def;
    } catch { return def; }
}
function fxSetOpen(key, on) {
    try {
        const m = JSON.parse(sessionStorage.getItem(FX_OPEN_KEY) || '{}');
        m[key] = !!on;
        sessionStorage.setItem(FX_OPEN_KEY, JSON.stringify(m));
    } catch { /* ok */ }
}
function fxSectionHTML(key, title, body, opts = {}) {
    const open = fxIsOpen(key, !!opts.open);
    return `<section class="fx-sec ${open ? 'open' : ''}" data-fx-sec="${key}">
        <button type="button" class="fx-sec-head" aria-expanded="${open}">
            <span class="fx-sec-ic">${opts.icon || ''}</span>
            <span class="fx-sec-title">${title}</span>
            ${opts.badge ? `<span class="fx-sec-badge">${opts.badge}</span>` : ''}
            <svg class="fx-sec-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="fx-sec-body">${body}</div>
    </section>`;
}
function fxBindSections(root) {
    root.querySelectorAll('.fx-sec > .fx-sec-head').forEach(h => {
        h.addEventListener('click', () => {
            const sec = h.parentElement;
            const on = !sec.classList.contains('open');
            sec.classList.toggle('open', on);
            h.setAttribute('aria-expanded', String(on));
            fxSetOpen(sec.dataset.fxSec, on);
        });
    });
}

const FX_ICON = {
    rotL: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"/><path d="M3.5 13a9 9 0 1 0 2.6-6.4L3 8"/></svg>',
    rotR: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M20.5 13a9 9 0 1 1-2.6-6.4L21 8"/></svg>',
    upside: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="m7 16 5 5 5-5"/><path d="m7 8 5-5 5 5"/></svg>',
    flipH: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18" stroke-dasharray="2 2"/><path d="M9 7 4 12l5 5V7z"/><path d="m15 7 5 5-5 5V7z" fill="currentColor"/></svg>',
    flipV: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18" stroke-dasharray="2 2"/><path d="M7 9l5-5 5 5H7z"/><path d="m7 15 5 5 5-5H7z" fill="currentColor"/></svg>',
    lie: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="10" rx="2"/><path d="M8 4h8"/></svg>',
    reset: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V4"/><path d="M5 11l7-7 7 7"/></svg>',
    shadow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="13" height="13" rx="2"/><path d="M20 8v10a2 2 0 0 1-2 2H8" opacity=".55"/></svg>',
    rotate: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
    filter: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="9" r="6"/><circle cx="15" cy="15" r="6" opacity=".6"/></svg>',
    sliders: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    corner: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10a6 6 0 0 1 6-6h10"/></svg>',
    size: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
    sparkle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>',
    type: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7V5h16v2M9 19h6M12 5v14"/></svg>',
    palette: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-.5-.2-.8-.5-1.2-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4.1-4-7.6-9-7.6z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/></svg>',
    spacing: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 4h18M3 20h18M8 9l4-3 4 3M8 15l4 3 4-3"/></svg>'
};

/* ---------------------------------------------------------------------
   Rodar e virar
   --------------------------------------------------------------------- */
function fxRotateHTML(el, withFlip = true) {
    const b = (act, icon, label, title) => `<button type="button" class="fx-tile fx-tile-ic" data-fx-rot="${act}" title="${title || label}">${icon}<span>${label}</span></button>`;
    return `<div class="fx-grid fx-grid-4">
        ${b('left', FX_ICON.rotL, 'Esquerda', 'Rodar 90° para a esquerda')}
        ${b('right', FX_ICON.rotR, 'Direita', 'Rodar 90° para a direita')}
        ${b('lie', FX_ICON.lie, 'Deitar', 'Deitar (90°)')}
        ${b('upside', FX_ICON.upside, 'Ao contrário', 'De cabeça para baixo (180°)')}
        ${withFlip ? b('flipH', FX_ICON.flipH, 'Espelhar', 'Espelhar na horizontal') : ''}
        ${withFlip ? b('flipV', FX_ICON.flipV, 'Virar', 'Virar na vertical') : ''}
        ${b('reset', FX_ICON.reset, 'Repor', 'Pôr direito (0°)')}
    </div>
    ${fxSliderHTML('rot', 'Ângulo', -180, 180, 1, fxNormAngle(el?.rotation || 0), '°')}`;
}

function fxApplyRotate(el, act) {
    const r = el.rotation || 0;
    switch (act) {
        case 'left': el.rotation = fxNormAngle(r - 90); break;
        case 'right': el.rotation = fxNormAngle(r + 90); break;
        case 'lie': el.rotation = (fxNormAngle(r) === 90 || fxNormAngle(r) === -90) ? 0 : 90; break;
        case 'upside': el.rotation = fxNormAngle(r + 180); break;
        case 'flipH': el.flipX = !el.flipX; break;
        case 'flipV': el.flipY = !el.flipY; break;
        case 'reset': el.rotation = 0; el.flipX = false; el.flipY = false; break;
    }
}

function fxBindRotate(root, el, callbacks) {
    root.querySelectorAll('[data-fx-rot]').forEach(b => b.addEventListener('click', () => {
        fxApplyRotate(el, b.dataset.fxRot);
        const r = root.querySelector('[data-fx-range="rot"]');
        const o = root.querySelector('[data-fx-out="rot"]');
        if (r) r.value = fxNormAngle(el.rotation || 0);
        if (o) o.textContent = fxNormAngle(el.rotation || 0) + '°';
        callbacks.onUpdate(el);
    }));
    fxBindSlider(root, 'rot', '°', (v) => { el.rotation = v; callbacks.onUpdate(el, false); }, () => callbacks.onUpdate(el));
}

/* ---------------------------------------------------------------------
   Sombra de imagens
   --------------------------------------------------------------------- */
const IMG_SHADOWS = {
    nenhuma: { label: 'Nenhuma' },
    suave: { label: 'Suave', blur: 16, dist: 6, ang: 90, cor: '#000000', op: 0.22 },
    media: { label: 'Média', blur: 28, dist: 14, ang: 90, cor: '#000000', op: 0.34 },
    forte: { label: 'Forte', blur: 36, dist: 24, ang: 90, cor: '#000000', op: 0.55 },
    flutuar: { label: 'A flutuar', blur: 60, dist: 42, ang: 90, cor: '#000000', op: 0.32 },
    lateral: { label: 'Lateral', blur: 10, dist: 16, ang: 45, cor: '#000000', op: 0.45 },
    solida: { label: 'Sólida', blur: 0, dist: 14, ang: 45, cor: '#111111', op: 1 },
    brilho: { label: 'Brilho', blur: 34, dist: 0, ang: 90, cor: '#FFFFFF', op: 0.95 },
    aura: { label: 'Aura', blur: 30, dist: 0, ang: 90, cor: '#E60023', op: 0.85 }
};

function imgShadowFilter(el) {
    const s = el && el.sombra;
    if (!s || !s.preset || s.preset === 'nenhuma') return '';
    const o = fxOffset(s.dist || 0, s.ang ?? 90);
    return `drop-shadow(${o.x}px ${o.y}px ${Math.max(0, s.blur || 0)}px ${fxRgba(s.cor || '#000', s.op ?? 0.35)})`;
}

function imgShadowTilesHTML(el) {
    const cur = (el && el.sombra && el.sombra.preset) || 'nenhuma';
    return `<div class="fx-grid fx-grid-3">
        ${Object.entries(IMG_SHADOWS).map(([k, p]) => {
            const f = k === 'nenhuma' ? 'none' : `drop-shadow(${fxOffset((p.dist || 0) * 0.25, p.ang).x}px ${fxOffset((p.dist || 0) * 0.25, p.ang).y}px ${(p.blur || 0) * 0.3}px ${fxRgba(p.cor, p.op)})`;
            return `<button type="button" class="fx-tile ${cur === k ? 'on' : ''}" data-img-shadow="${k}">
                <span class="fx-shadow-demo ${k === 'brilho' ? 'is-dark' : ''}"><i style="filter:${f}"></i></span>
                <span>${p.label}</span>
            </button>`;
        }).join('')}
    </div>`;
}

function imgShadowControlsHTML(el) {
    const s = el.sombra;
    if (!s || !s.preset || s.preset === 'nenhuma') return '';
    return `<div class="fx-sub">
        ${fxSliderHTML('sh-blur', 'Desfoque', 0, 120, 1, s.blur ?? 20, ' px')}
        ${fxSliderHTML('sh-dist', 'Distância', 0, 120, 1, s.dist ?? 10, ' px')}
        ${fxSliderHTML('sh-ang', 'Direção', -180, 180, 5, s.ang ?? 90, '°')}
        ${fxSliderHTML('sh-op', 'Intensidade', 0, 100, 1, Math.round((s.op ?? 0.35) * 100), '%')}
        <div class="fx-label">Cor da sombra</div>
        ${fxSwatchesHTML('sh-cor', s.cor || '#000000', { colors: ['#000000', '#111111', '#FFFFFF', '#E60023', '#5F7466', '#A9BCAE', '#1E2A42', '#D8A33B'] })}
    </div>`;
}

function imgShadowBind(root, el, callbacks) {
    const host = root.querySelector('[data-fx-host="img-shadow"]');
    root.querySelectorAll('[data-img-shadow]').forEach(b => b.addEventListener('click', () => {
        const k = b.dataset.imgShadow;
        root.querySelectorAll('[data-img-shadow]').forEach(x => x.classList.toggle('on', x === b));
        if (k === 'nenhuma') el.sombra = null;
        else {
            const p = IMG_SHADOWS[k];
            el.sombra = { preset: k, blur: p.blur, dist: p.dist, ang: p.ang, cor: p.cor, op: p.op };
        }
        if (host) { host.innerHTML = imgShadowControlsHTML(el); bindCtl(); }
        callbacks.onUpdate(el);
    }));
    const bindCtl = () => {
        if (!host || !el.sombra) return;
        const live = (k, f) => fxBindSlider(host, k, k === 'sh-ang' ? '°' : k === 'sh-op' ? '%' : ' px', (v) => { f(v); callbacks.onUpdate(el, false); }, () => callbacks.onUpdate(el));
        live('sh-blur', v => { el.sombra.blur = v; });
        live('sh-dist', v => { el.sombra.dist = v; });
        live('sh-ang', v => { el.sombra.ang = v; });
        live('sh-op', v => { el.sombra.op = v / 100; });
        fxBindSwatches(host, 'sh-cor', (c) => { el.sombra.cor = c || '#000000'; callbacks.onUpdate(el); });
    };
    bindCtl();
}

/* ---------------------------------------------------------------------
   Efeitos de texto
   --------------------------------------------------------------------- */
const TEXT_EFFECTS = {
    nenhum: { label: 'Nenhum' },
    sombra: { label: 'Sombra', cor: '#000000', int: 50, dist: 8, ang: 45 },
    levantar: { label: 'Levantar', int: 50 },
    brilho: { label: 'Brilho', cor: '#FFD9E0', int: 60 },
    neon: { label: 'Néon', cor: '#E60023', int: 60 },
    contorno: { label: 'Só contorno', cor: '#111111', esp: 4 },
    traco: { label: 'Traço', cor: '#FFFFFF', esp: 8 },
    eco: { label: 'Eco', cor: '#E60023', dist: 6, ang: 45 },
    solido: { label: '3D sólido', cor: '#5F7466', dist: 8, ang: 45 },
    glitch: { label: 'Glitch', int: 50 },
    destaque: { label: 'Destaque', cor: '#E60023', int: 30 }
};

// Converte a sombra antiga (checkbox) para o novo formato.
function textEffectOf(el) {
    if (el.efeito && el.efeito.tipo) return el.efeito;
    if (el.textShadow && (el.textShadowBlur || 0) > 0) {
        return { tipo: 'sombra', cor: el.textShadowColor || '#000000', int: Math.min(100, (el.textShadowBlur || 4) * 5), dist: 4, ang: 90, legacy: true };
    }
    return { tipo: 'nenhum' };
}

// Estilos CSS do efeito (para o quadro e para as pré-visualizações).
function textEffectCSS(el, sizeOverride) {
    const fx = textEffectOf(el);
    const s = sizeOverride || el.tamanho || 24;
    const k = (fx.int ?? 50) / 100;
    const c = fx.cor || '#000000';
    const out = { textShadow: 'none', stroke: '', color: null, paintOrder: '', background: null, padding: null, radius: null };
    switch (fx.tipo) {
        case 'sombra': {
            const o = fxOffset((fx.dist ?? 8) / 100 * s, fx.ang ?? 45);
            out.textShadow = `${o.x}px ${o.y}px ${(0.04 + 0.3 * k) * s}px ${fxRgba(c, 0.35 + 0.6 * k)}`;
            break;
        }
        case 'levantar':
            out.textShadow = `0 ${(0.03 + 0.06 * k) * s}px ${(0.12 + 0.35 * k) * s}px rgba(0, 0, 0, ${0.12 + 0.4 * k})`;
            break;
        case 'brilho': {
            const b = (0.08 + 0.5 * k) * s;
            out.textShadow = `0 0 ${b}px ${fxRgba(c, 0.95)}, 0 0 ${b * 2}px ${fxRgba(c, 0.7)}`;
            break;
        }
        case 'neon': {
            const b = (0.1 + 0.4 * k) * s;
            out.color = fxMix(c, '#FFFFFF', 0.72);
            out.textShadow = `0 0 ${0.04 * s}px #FFFFFF, 0 0 ${b * 0.5}px ${c}, 0 0 ${b}px ${c}, 0 0 ${b * 1.8}px ${c}, 0 0 ${b * 3}px ${fxRgba(c, 0.8)}`;
            break;
        }
        case 'contorno': {
            const w = Math.max(1, (fx.esp ?? 4) / 100 * s);
            out.color = 'transparent';
            out.stroke = `${w}px ${c}`;
            break;
        }
        case 'traco': {
            const w = Math.max(1, (fx.esp ?? 8) / 100 * s);
            out.stroke = `${w * 2}px ${c}`;
            out.paintOrder = 'stroke fill';
            break;
        }
        case 'eco': {
            const o = fxOffset((fx.dist ?? 6) / 100 * s, fx.ang ?? 45);
            out.textShadow = `${o.x}px ${o.y}px 0 ${fxRgba(c, 0.55)}, ${o.x * 2}px ${o.y * 2}px 0 ${fxRgba(c, 0.3)}, ${o.x * 3}px ${o.y * 3}px 0 ${fxRgba(c, 0.14)}`;
            break;
        }
        case 'solido': {
            const n = Math.max(1, Math.round((fx.dist ?? 8) / 100 * s));
            const u = fxOffset(1, fx.ang ?? 45);
            const parts = [];
            const step = Math.max(1, Math.ceil(n / 40));
            for (let i = step; i <= n; i += step) parts.push(`${(u.x * i).toFixed(1)}px ${(u.y * i).toFixed(1)}px 0 ${c}`);
            out.textShadow = parts.join(', ');
            break;
        }
        case 'glitch': {
            const o = (0.02 + 0.06 * k) * s;
            out.textShadow = `${-o}px 0 0 rgba(0, 240, 255, 0.9), ${o}px 0 0 rgba(255, 0, 200, 0.9)`;
            break;
        }
        case 'destaque':
            out.background = c;
            out.padding = '0.12em 0.35em';
            out.radius = (k * 0.6) + 'em';
            break;
    }
    return out;
}

function applyTextEffect(textEl, el) {
    const fx = textEffectOf(el);
    if (fx.legacy || !el.efeito) {
        // Sem efeito novo: mantém o comportamento antigo (já aplicado por renderTextElement).
        textEl.style.webkitTextStroke = '';
        textEl.style.paintOrder = '';
        return;
    }
    const css = textEffectCSS(el);
    textEl.style.textShadow = css.textShadow;
    textEl.style.webkitTextStroke = css.stroke || '';
    textEl.style.paintOrder = css.paintOrder || '';
    if (css.color) textEl.style.color = css.color;
    if (css.background) {
        textEl.style.backgroundColor = css.background;
        textEl.style.padding = css.padding;
        textEl.style.borderRadius = css.radius;
    } else {
        textEl.style.borderRadius = '';
    }
}

function textEffectTilesHTML(el) {
    const cur = textEffectOf(el).tipo;
    const font = psSafeFont(el?.fonte || 'Montserrat');
    const color = el?.cor || '#111111';
    return `<div class="fx-grid fx-grid-3">
        ${Object.entries(TEXT_EFFECTS).map(([k, p]) => {
            const demo = { ...(el || {}), tamanho: 26, cor: color, efeito: { tipo: k, ...p } };
            const css = textEffectCSS(demo, 26);
            const st = [
                `font-family:'${font}'`,
                `color:${css.color || color}`,
                `text-shadow:${css.textShadow}`,
                css.stroke ? `-webkit-text-stroke:${css.stroke}` : '',
                css.paintOrder ? `paint-order:${css.paintOrder}` : '',
                css.background ? `background:${css.background};padding:0 .3em;border-radius:${css.radius}` : ''
            ].filter(Boolean).join(';');
            return `<button type="button" class="fx-tile fx-tile-text ${cur === k ? 'on' : ''}" data-text-fx="${k}">
                <span class="fx-text-demo ${k === 'neon' || k === 'brilho' ? 'is-dark' : ''}"><b style="${st}">Aa</b></span>
                <span>${p.label}</span>
            </button>`;
        }).join('')}
    </div>`;
}

function textEffectControlsHTML(el) {
    const fx = textEffectOf(el);
    if (!fx.tipo || fx.tipo === 'nenhum') return '';
    const def = TEXT_EFFECTS[fx.tipo] || {};
    const rows = [];
    if ('int' in def) rows.push(fxSliderHTML('tx-int', fx.tipo === 'destaque' ? 'Arredondado' : 'Intensidade', 0, 100, 1, fx.int ?? def.int, '%'));
    if ('dist' in def) rows.push(fxSliderHTML('tx-dist', fx.tipo === 'solido' ? 'Profundidade' : 'Distância', 0, 40, 1, fx.dist ?? def.dist, ''));
    if ('ang' in def) rows.push(fxSliderHTML('tx-ang', 'Direção', -180, 180, 5, fx.ang ?? def.ang, '°'));
    if ('esp' in def) rows.push(fxSliderHTML('tx-esp', 'Espessura', 1, 20, 1, fx.esp ?? def.esp, ''));
    if ('cor' in def) {
        rows.push(`<div class="fx-label">${fx.tipo === 'destaque' ? 'Cor do destaque' : 'Cor do efeito'}</div>`);
        rows.push(fxSwatchesHTML('tx-cor', fx.cor || def.cor));
    }
    return `<div class="fx-sub">${rows.join('')}</div>`;
}

function textEffectBind(root, el, callbacks) {
    const host = root.querySelector('[data-fx-host="text-fx"]');
    root.querySelectorAll('[data-text-fx]').forEach(b => b.addEventListener('click', () => {
        const k = b.dataset.textFx;
        root.querySelectorAll('[data-text-fx]').forEach(x => x.classList.toggle('on', x === b));
        el.textShadow = false; // a sombra antiga passa a ser um efeito
        el.textShadowBlur = 0;
        el.efeito = k === 'nenhum' ? { tipo: 'nenhum' } : { tipo: k, ...TEXT_EFFECTS[k] };
        delete el.efeito.label;
        if (host) { host.innerHTML = textEffectControlsHTML(el); bindCtl(); }
        callbacks.onUpdate(el);
    }));
    const bindCtl = () => {
        if (!host || !el.efeito || el.efeito.tipo === 'nenhum') return;
        const live = (id, key, unit) => fxBindSlider(host, id, unit, (v) => { el.efeito[key] = v; callbacks.onUpdate(el, false); }, () => callbacks.onUpdate(el));
        live('tx-int', 'int', '%');
        live('tx-dist', 'dist', '');
        live('tx-ang', 'ang', '°');
        live('tx-esp', 'esp', '');
        fxBindSwatches(host, 'tx-cor', (c) => { el.efeito.cor = c || '#000000'; callbacks.onUpdate(el); });
    };
    if (el.efeito) bindCtl();
}

/* ---------------------------------------------------------------------
   Seletor de fonte em menu flutuante (com pré-visualização e pesquisa)
   --------------------------------------------------------------------- */
function fxOpenFontPicker(anchor, current, onPick) {
    document.querySelector('.fx-pop')?.remove();
    const pop = document.createElement('div');
    pop.className = 'fx-pop fx-font-pop';
    const fonts = (typeof FONTES !== 'undefined' ? FONTES : ['Montserrat', 'Inter', 'Playfair Display']);
    pop.innerHTML = `
        <div class="fx-pop-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input type="search" placeholder="Procurar fonte…" autocomplete="off">
        </div>
        <div class="fx-font-list">${fonts.map(f => `<button type="button" class="fx-font ${f === current ? 'on' : ''}" data-font="${fxEsc(f)}" style="font-family:'${fxEsc(f)}'">${fxEsc(f)}</button>`).join('')}</div>`;
    fxPopHost().appendChild(pop);
    fxPlacePop(pop, anchor);
    const input = pop.querySelector('input');
    input.addEventListener('keydown', e => e.stopPropagation());
    input.addEventListener('input', () => {
        const q = input.value.toLowerCase();
        pop.querySelectorAll('.fx-font').forEach(b => { b.hidden = q && !b.dataset.font.toLowerCase().includes(q); });
    });
    pop.addEventListener('click', (e) => {
        const b = e.target.closest('[data-font]');
        if (!b) return;
        onPick(b.dataset.font);
        pop.remove();
    });
    pop.querySelector('.fx-font.on')?.scrollIntoView({ block: 'center' });
    setTimeout(() => input.focus(), 20);
    fxAutoClose(pop, anchor);
    return pop;
}

// Os menus flutuantes vivem dentro do editor (herdam as cores do tema).
function fxPopHost() {
    return document.getElementById('editor-view') || document.body;
}

// Coloca um menu flutuante junto de um botão, dentro do ecrã.
function fxPlacePop(pop, anchor) {
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth || 260, ph = pop.offsetHeight || 320;
    let left = r.left;
    let top = r.bottom + 8;
    if (left + pw > window.innerWidth - 10) left = window.innerWidth - pw - 10;
    if (top + ph > window.innerHeight - 10) top = Math.max(10, r.top - ph - 8);
    pop.style.left = Math.max(10, left) + 'px';
    pop.style.top = top + 'px';
}

function fxAutoClose(pop, anchor) {
    const close = (e) => {
        if (pop.contains(e.target) || (anchor && anchor.contains(e.target))) return;
        pop.remove();
        document.removeEventListener('mousedown', close, true);
        document.removeEventListener('keydown', esc, true);
    };
    const esc = (e) => { if (e.key === 'Escape') { pop.remove(); document.removeEventListener('mousedown', close, true); document.removeEventListener('keydown', esc, true); } };
    setTimeout(() => {
        document.addEventListener('mousedown', close, true);
        document.addEventListener('keydown', esc, true);
    }, 0);
}

/* ---------------------------------------------------------------------
   Exportação (canvas): imagens com sombra e texto com efeitos
   --------------------------------------------------------------------- */
function _fxRotateVec(x, y, deg) {
    const a = (deg || 0) * Math.PI / 180;
    return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
}

async function _fxDrawImage(ctx, el) {
    if (!el.src) return;
    const img = await loadImage(el.src);
    const w = Math.max(1, Math.round(el.width)), h = Math.max(1, Math.round(el.height));
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const o = off.getContext('2d');
    o.filter = getImageCSSFilter(el);
    o.translate(w / 2, h / 2);
    o.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
    const raio = Math.min(el.raio ?? 8, w / 2, h / 2);
    if (raio > 0) { roundRectPath(o, -w / 2, -h / 2, w, h, raio); o.clip(); }
    o.drawImage(img, -w / 2, -h / 2, w, h);

    const s = el.sombra;
    if (s && s.preset && s.preset !== 'nenhuma') {
        const off2 = _fxRotateVec(fxOffset(s.dist || 0, s.ang ?? 90).x, fxOffset(s.dist || 0, s.ang ?? 90).y, el.rotation);
        const scale = ctx.getTransform ? Math.hypot(ctx.getTransform().a, ctx.getTransform().b) : 1;
        ctx.shadowColor = fxRgba(s.cor || '#000', s.op ?? 0.35);
        ctx.shadowBlur = (s.blur || 0) * scale;
        ctx.shadowOffsetX = off2.x * scale;
        ctx.shadowOffsetY = off2.y * scale;
    }
    ctx.drawImage(off, -el.width / 2, -el.height / 2, el.width, el.height);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function _fxTransformText(t, mode) {
    if (mode === 'uppercase') return t.toUpperCase();
    if (mode === 'lowercase') return t.toLowerCase();
    if (mode === 'capitalize') return t.replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase());
    return t;
}

function _fxWrap(ctx, text, maxW) {
    const out = [];
    String(text || '').split('\n').forEach(para => {
        if (!para.trim()) { out.push(''); return; }
        const words = para.split(/(\s+)/);
        let cur = '';
        words.forEach(w => {
            const test = cur + w;
            if (cur.trim() && ctx.measureText(test.trimEnd()).width > maxW) {
                out.push(cur.trimEnd());
                cur = w.trimStart();
            } else {
                cur = test;
            }
        });
        out.push(cur.trimEnd());
    });
    return out;
}

function _fxDrawText(ctx, el) {
    const size = el.tamanho || 24;
    const fx = textEffectOf(el);
    const useNew = !!el.efeito && !fx.legacy;
    const css = useNew ? textEffectCSS(el) : null;
    const scale = ctx.getTransform ? Math.hypot(ctx.getTransform().a, ctx.getTransform().b) : 1;

    ctx.font = `${el.italico ? 'italic ' : ''}${el.negrito ? 'bold ' : ''}${size}px "${el.fonte || 'Arial'}"`;
    try { ctx.letterSpacing = (el.letterSpacing || 0) + 'px'; } catch { /* ok */ }
    ctx.textBaseline = 'middle';
    ctx.textAlign = el.alinhamento === 'center' ? 'center' : el.alinhamento === 'right' ? 'right' : 'left';

    const bg = (css && css.background) || el.bgColor || null;
    const pad = bg ? (css && css.background ? size * 0.35 : 8) : 4;
    const padY = bg ? (css && css.background ? size * 0.12 : 6) : 4;
    const W = el.width, H = el.height;

    if (bg) {
        ctx.save();
        ctx.fillStyle = bg;
        const r = css && css.radius ? parseFloat(css.radius) * size : 0;
        roundRectPath(ctx, -W / 2, -H / 2, W, H, Math.min(r, H / 2, W / 2));
        ctx.fill();
        ctx.restore();
    }

    const text = _fxTransformText(String(el.conteudo || ''), el.textTransform);
    const lines = _fxWrap(ctx, text, Math.max(10, W - pad * 2));
    const lineH = size * (el.lineHeight || 1.2);
    const top = -H / 2 + padY;
    let x = -W / 2 + pad;
    if (ctx.textAlign === 'center') x = 0;
    if (ctx.textAlign === 'right') x = W / 2 - pad;

    const fill = (css && css.color) || el.cor || '#000';
    const eachLine = (fn) => lines.forEach((line, i) => fn(line, x, top + i * lineH + lineH / 2));
    const shadowPass = (color, blur, ox, oy) => {
        const v = _fxRotateVec(ox, oy, el.rotation);
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = blur * scale;
        ctx.shadowOffsetX = v.x * scale;
        ctx.shadowOffsetY = v.y * scale;
        ctx.fillStyle = fill === 'transparent' ? 'rgba(0,0,0,0)' : fill;
        eachLine((l, lx, ly) => ctx.fillText(l, lx, ly));
        ctx.restore();
    };
    const k = (fx.int ?? 50) / 100;
    const c = fx.cor || '#000';

    if (!useNew) {
        if (el.textShadow && (el.textShadowBlur || 0) > 0) shadowPass(el.textShadowColor || '#000', el.textShadowBlur, 0, 2);
    } else {
        switch (fx.tipo) {
            case 'sombra': {
                const o = fxOffset((fx.dist ?? 8) / 100 * size, fx.ang ?? 45);
                shadowPass(fxRgba(c, 0.35 + 0.6 * k), (0.04 + 0.3 * k) * size, o.x, o.y);
                break;
            }
            case 'levantar':
                shadowPass(`rgba(0,0,0,${0.12 + 0.4 * k})`, (0.12 + 0.35 * k) * size, 0, (0.03 + 0.06 * k) * size);
                break;
            case 'brilho': {
                const b = (0.08 + 0.5 * k) * size;
                shadowPass(fxRgba(c, 0.7), b * 2, 0, 0);
                shadowPass(fxRgba(c, 0.95), b, 0, 0);
                break;
            }
            case 'neon': {
                const b = (0.1 + 0.4 * k) * size;
                shadowPass(fxRgba(c, 0.8), b * 3, 0, 0);
                shadowPass(c, b * 1.8, 0, 0);
                shadowPass(c, b, 0, 0);
                shadowPass(c, b * 0.5, 0, 0);
                break;
            }
            case 'eco': {
                const o = fxOffset((fx.dist ?? 6) / 100 * size, fx.ang ?? 45);
                [[3, 0.14], [2, 0.3], [1, 0.55]].forEach(([m, a]) => {
                    ctx.save();
                    ctx.fillStyle = fxRgba(c, a);
                    eachLine((l, lx, ly) => ctx.fillText(l, lx + o.x * m, ly + o.y * m));
                    ctx.restore();
                });
                break;
            }
            case 'solido': {
                const n = Math.max(1, Math.round((fx.dist ?? 8) / 100 * size));
                const u = fxOffset(1, fx.ang ?? 45);
                ctx.save();
                ctx.fillStyle = c;
                for (let i = n; i >= 1; i--) eachLine((l, lx, ly) => ctx.fillText(l, lx + u.x * i, ly + u.y * i));
                ctx.restore();
                break;
            }
            case 'glitch': {
                const o = (0.02 + 0.06 * k) * size;
                ctx.save();
                ctx.fillStyle = 'rgba(0, 240, 255, 0.9)';
                eachLine((l, lx, ly) => ctx.fillText(l, lx - o, ly));
                ctx.fillStyle = 'rgba(255, 0, 200, 0.9)';
                eachLine((l, lx, ly) => ctx.fillText(l, lx + o, ly));
                ctx.restore();
                break;
            }
            case 'traco': {
                const w = Math.max(1, (fx.esp ?? 8) / 100 * size);
                ctx.save();
                ctx.strokeStyle = c;
                ctx.lineWidth = w * 2;
                ctx.lineJoin = 'round';
                eachLine((l, lx, ly) => ctx.strokeText(l, lx, ly));
                ctx.restore();
                break;
            }
        }
    }

    if (useNew && fx.tipo === 'contorno') {
        const w = Math.max(1, (fx.esp ?? 4) / 100 * size);
        ctx.save();
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.lineJoin = 'round';
        eachLine((l, lx, ly) => ctx.strokeText(l, lx, ly));
        ctx.restore();
    } else {
        ctx.fillStyle = fill;
        eachLine((l, lx, ly) => ctx.fillText(l, lx, ly));
    }

    if (el.sublinhado || el.riscado) {
        ctx.save();
        ctx.strokeStyle = el.cor || '#000';
        ctx.lineWidth = Math.max(1, size * 0.07);
        eachLine((l, lx, ly) => {
            const mw = ctx.measureText(l).width;
            let sx = lx;
            if (ctx.textAlign === 'center') sx -= mw / 2;
            if (ctx.textAlign === 'right') sx -= mw;
            const ys = [];
            if (el.sublinhado) ys.push(ly + size * 0.45);
            if (el.riscado) ys.push(ly + size * 0.02);
            ys.forEach(yy => { ctx.beginPath(); ctx.moveTo(sx, yy); ctx.lineTo(sx + mw, yy); ctx.stroke(); });
        });
        ctx.restore();
    }
}

// Substitui o desenho de imagens e textos na exportação; o resto (formas) fica igual.
if (typeof drawElement === 'function') {
    const _psOrigDrawElement = drawElement;
    // eslint-disable-next-line no-global-assign
    drawElement = async function (ctx, el) {
        if (el.tipo !== 'imagem' && el.tipo !== 'texto') return _psOrigDrawElement(ctx, el);
        ctx.save();
        ctx.globalAlpha = el.opacidade ?? 1;
        ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
        ctx.rotate((el.rotation || 0) * Math.PI / 180);
        try {
            if (el.tipo === 'imagem') await _fxDrawImage(ctx, el);
            else _fxDrawText(ctx, el);
        } catch (err) {
            console.warn('Exportar elemento falhou:', err);
        }
        ctx.restore();
    };
}

/* ---------------------------------------------------------------------
   Ligação ao desenho no quadro (renderImageElement / renderTextElement)
   --------------------------------------------------------------------- */
if (typeof renderImageElement === 'function') {
    const _psOrigRenderImage = renderImageElement;
    // eslint-disable-next-line no-global-assign
    renderImageElement = function (dom, el) {
        _psOrigRenderImage(dom, el);
        const img = dom.querySelector('img');
        if (!img) return;
        const sh = imgShadowFilter(el);
        if (sh) {
            const base = getImageCSSFilter(el);
            img.style.filter = (base === 'none' ? '' : base + ' ') + sh;
        }
    };
}

if (typeof renderTextElement === 'function') {
    const _psOrigRenderText = renderTextElement;
    // eslint-disable-next-line no-global-assign
    renderTextElement = function (dom, el) {
        _psOrigRenderText(dom, el);
        const t = dom.querySelector('.text-content');
        if (t) applyTextEffect(t, el);
    };
}
