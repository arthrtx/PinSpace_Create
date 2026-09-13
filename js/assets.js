/**
 * assets.js — Autocolantes (stickers) e molduras decorativas
 */

const STICKERS = [
    { emoji: '🌸', label: 'Flor' },
    { emoji: '🌷', label: 'Tulipa' },
    { emoji: '🌻', label: 'Girassol' },
    { emoji: '🌿', label: 'Folha' },
    { emoji: '🍃', label: 'Ramo' },
    { emoji: '🌵', label: 'Cato' },
    { emoji: '🦋', label: 'Borboleta' },
    { emoji: '🐻', label: 'Ursinho' },
    { emoji: '🧸', label: 'Peluche' },
    { emoji: '🎀', label: 'Laço' },
    { emoji: '💗', label: 'Coração' },
    { emoji: '✨', label: 'Brilho' },
    { emoji: '⭐', label: 'Estrela' },
    { emoji: '🌈', label: 'Arco-íris' },
    { emoji: '🌙', label: 'Lua' },
    { emoji: '☀️', label: 'Sol' },
    { emoji: '☁️', label: 'Nuvem' },
    { emoji: '💖', label: 'Coração rosa' },
    { emoji: '🧡', label: 'Coração laranja' },
    { emoji: '💚', label: 'Coração verde' },
    { emoji: '💙', label: 'Coração azul' },
    { emoji: '💜', label: 'Coração roxo' },
    { emoji: '🤍', label: 'Coração branco' },
    { emoji: '🔮', label: 'Cristal' },
    { emoji: '👑', label: 'Coroa' },
    { emoji: '🎈', label: 'Balão' },
    { emoji: '🎡', label: 'Roda gigante' },
    { emoji: '🏖️', label: 'Praia' },
    { emoji: '🍓', label: 'Morango' },
    { emoji: '🍉', label: 'Melancia' },
    { emoji: '🍦', label: 'Gelado' },
    { emoji: '🎂', label: 'Bolo' },
    { emoji: '🥐', label: 'Croissant' },
    { emoji: '☕', label: 'Café' },
    { emoji: '🎧', label: 'Auscultadores' },
    { emoji: '📷', label: 'Câmara' },
    { emoji: '📌', label: 'Pin' },
    { emoji: '🗒️', label: 'Notas' },
    { emoji: '✏️', label: 'Lápis' },
    { emoji: '🖌️', label: 'Pincel' },
    { emoji: '🎨', label: 'Paleta' },
    { emoji: '🕊️', label: 'Pomba' },
    { emoji: '⚡', label: 'Raio' },
    { emoji: '🧿', label: 'Olho turco' }
];

const MOLDURAS = [
    { id: 'pontinhos', label: 'Pontinhos' },
    { id: 'tracos', label: 'Rasgos' },
    { id: 'dupla', label: 'Dupla' },
    { id: 'coracoes', label: 'Corações' },
    { id: 'flores', label: 'Flores' },
    { id: 'estrelas', label: 'Estrelas' },
    { id: 'ondas', label: 'Ondas' },
    { id: 'fita', label: 'Fita' },
    { id: 'torn', label: 'Recortada' }
];

function _frameColors() {
    return {
        c1: '#e60023',
        c2: '#ec4899',
        c3: '#6366f1',
        c4: '#f59e0b',
        c5: '#10b981'
    };
}

function getMolduraSVG(id, w, h) {
    const { c1, c2, c3, c4, c5 } = _frameColors();
    const rect = 'rounded-rect';
    const x = w * 0.025;
    const y = h * 0.025;
    const iw = w - x * 2;
    const ih = h - y * 2;
    let inner = '';

    switch (id) {
        case 'pontinhos': {
            const step = Math.max(10, Math.min(w, h) * 0.028);
            let dots = '';
            const top = y + iw * 0.02;
            const bottom = y + ih - iw * 0.02;
            for (let i = 0; i <= Math.floor(iw / step); i++) {
                dots += `<circle cx="${x + i * step}" cy="${y}" r="${w * 0.006}" fill="${c1}"/>`;
                dots += `<circle cx="${x + i * step}" cy="${y + ih}" r="${w * 0.006}" fill="${c1}"/>`;
            }
            for (let i = 0; i <= Math.floor(ih / step); i++) {
                dots += `<circle cx="${x}" cy="${y + i * step}" r="${w * 0.006}" fill="${c1}"/>`;
                dots += `<circle cx="${x + iw}" cy="${y + i * step}" r="${w * 0.006}" fill="${c1}"/>`;
            }
            inner = `<rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="${Math.min(x, y) * 1.4}" fill="none" stroke="${c1}" stroke-width="${w * 0.008}" stroke-dasharray="2 ${w * 0.012}"/>${dots}`;
            break;
        }
        case 'tracos': {
            const seg = Math.max(14, Math.min(w, h) * 0.05);
            const gap = seg * 0.9;
            const th = Math.max(w, h) * 0.01;
            let lines = '';
            for (let i = 0; i <= Math.floor(iw / (seg + gap)); i++) {
                const sx = x + i * (seg + gap);
                lines += `<line x1="${sx}" y1="${y}" x2="${sx + seg}" y2="${y}" stroke="${c3}" stroke-width="${th}" stroke-linecap="round"/>`;
                lines += `<line x1="${sx}" y1="${y + ih}" x2="${sx + seg}" y2="${y + ih}" stroke="${c3}" stroke-width="${th}" stroke-linecap="round"/>`;
            }
            for (let i = 0; i <= Math.floor(ih / (seg + gap)); i++) {
                const sy = y + i * (seg + gap);
                lines += `<line x1="${x}" y1="${sy}" x2="${x}" y2="${sy + seg}" stroke="${c3}" stroke-width="${th}" stroke-linecap="round"/>`;
                lines += `<line x1="${x + iw}" y1="${sy}" x2="${x + iw}" y2="${sy + seg}" stroke="${c3}" stroke-width="${th}" stroke-linecap="round"/>`;
            }
            inner = lines;
            break;
        }
        case 'dupla': {
            const o = Math.max(10, Math.min(w, h) * 0.035);
            inner = `<rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="${o * 1.2}" fill="none" stroke="${c1}" stroke-width="${w * 0.01}"/>` +
                    `<rect x="${x + o}" y="${y + o}" width="${iw - o * 2}" height="${ih - o * 2}" rx="${o * 1.2}" fill="none" stroke="${c2}" stroke-width="${w * 0.006}"/>`;
            break;
        }
        case 'coracoes': {
            const s = w * 0.05;
            const heart = (cx, cy, col) => `
                <path d="M${cx} ${cy - s * 0.5} C${cx - s * 0.95} ${cy - s * 1.4}, ${cx - s * 1.8} ${cy + s * 0.35}, ${cx} ${cy + s * 1.4} C${cx + s * 1.8} ${cy + s * 0.35}, ${cx + s * 0.95} ${cy - s * 1.4}, ${cx} ${cy - s * 0.5} Z" fill="${col}"/>`;
            inner = `<rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="${Math.min(x, y)}" fill="none" stroke="${c1}" stroke-width="${w * 0.006}"/>` +
                heart(x, y, c2) + heart(x + iw, y, c3) + heart(x, y + ih, c3) + heart(x + iw, y + ih, c2) +
                heart(x + iw / 2, y, c4) + heart(x + iw / 2, y + ih, c4) +
                heart(x, y + ih / 2, c5) + heart(x + iw, y + ih / 2, c5);
            break;
        }
        case 'flores': {
            const s = w * 0.04;
            const petal = (cx, cy, col) => `
                <g fill="${col}">
                    <circle cx="${cx}" cy="${cy - s}" r="${s * 0.75}"/>
                    <circle cx="${cx + s}" cy="${cy}" r="${s * 0.75}"/>
                    <circle cx="${cx}" cy="${cy + s}" r="${s * 0.75}"/>
                    <circle cx="${cx - s}" cy="${cy}" r="${s * 0.75}"/>
                    <circle cx="${cx}" cy="${cy}" r="${s * 0.55}" fill="#fde68a"/>
                </g>`;
            inner = `<rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="${Math.min(x, y)}" fill="none" stroke="${c5}" stroke-width="${w * 0.006}"/>` +
                petal(x, y, c4) + petal(x + iw, y, c2) + petal(x, y + ih, c2) + petal(x + iw, y + ih, c4);
            break;
        }
        case 'estrelas': {
            const s = w * 0.04;
            const star = (cx, cy, col) => {
                let d = '';
                for (let i = 0; i < 10; i++) {
                    const r = i % 2 === 0 ? s : s * 0.45;
                    const a = (i * Math.PI) / 5 - Math.PI / 2;
                    d += (i === 0 ? 'M' : 'L') + (cx + r * Math.cos(a)) + ' ' + (cy + r * Math.sin(a)) + ' ';
                }
                return `<path d="${d} Z" fill="${col}"/>`;
            };
            inner = `<rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="${Math.min(x, y)}" fill="none" stroke="${c3}" stroke-width="${w * 0.006}" stroke-dasharray="1 ${w * 0.02}"/>` +
                star(x, y, c4) + star(x + iw, y, c1) + star(x, y + ih, c1) + star(x + iw, y + ih, c4);
            break;
        }
        case 'ondas': {
            const amp = Math.max(10, Math.min(w, h) * 0.02);
            const wavePath = (yOffset, col) => {
                const seg = Math.min(w, h) * 0.06;
                let d = `M ${x} ${yOffset}`;
                for (let i = 1; i <= Math.floor(iw / seg); i++) {
                    const midx = x + i * seg - seg / 2;
                    const prevx = x + (i - 1) * seg;
                    d += ` Q ${midx} ${yOffset - (i % 2 === 0 ? amp : -amp) * 2}, ${prevx + seg} ${yOffset}`;
                }
                return d;
            };
            inner = `<path d="${wavePath(y, c1)}" fill="none" stroke="${c1}" stroke-width="${w * 0.007}" stroke-linecap="round"/>` +
                `<path d="${wavePath(y + ih, c2)}" fill="none" stroke="${c2}" stroke-width="${w * 0.007}" stroke-linecap="round"/>`;
            break;
        }
        case 'fita': {
            const s = Math.max(16, Math.min(w, h) * 0.05);
            const tape = (cx1, cy1, col) => `<rect x="${cx1 - s * 0.55}" y="${cy1 - s * 0.28}" width="${s * 1.7}" height="${s * 0.85}" rx="${s * 0.12}" fill="${col}" opacity="0.85" transform="rotate(-28 ${cx1} ${cy1})"/>`;
            inner = `<rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="${Math.min(x, y)}" fill="none" stroke="${c4}" stroke-width="${w * 0.005}" stroke-dasharray="4 ${w * 0.012}"/>` +
                tape(x + s * 0.2, y + s * 0.2, c2) + tape(x + iw - s * 0.2, y + s * 0.2, c3) + tape(x + s * 0.2, y + ih - s * 0.2, c3) + tape(x + iw - s * 0.2, y + ih - s * 0.2, c2);
            break;
        }
        case 'torn': {
            if (rect === 'rounded-rect') { /* noop para manter lint consistente */ }
            let tearTop = `M ${x} ${y + ih * 0.18}`;
            let tearBottom = `M ${x} ${y + ih * 0.82}`;
            for (let i = 0; i <= Math.floor(iw / 60); i++) {
                tearTop += ` L ${x + i * 60 + 12} ${y + ih * 0.18 - (i % 2 === 0 ? 8 : -8)} L ${x + (i + 1) * 60} ${y + ih * 0.18}`;
                tearBottom += ` L ${x + i * 60 + 12} ${y + ih * 0.82 + (i % 2 === 0 ? -8 : 8)} L ${x + (i + 1) * 60} ${y + ih * 0.82}`;
            }
            inner = `<path d="${tearTop}" fill="none" stroke="${c5}" stroke-width="${w * 0.008}" stroke-linecap="round"/>` +
                `<path d="${tearBottom}" fill="none" stroke="${c5}" stroke-width="${w * 0.008}" stroke-linecap="round"/>` +
                `<rect x="${x + w * 0.02}" y="${y}" width="${iw - w * 0.04}" height="${ih}" rx="0" fill="none" stroke="${c1}" stroke-width="${w * 0.006}"/>`;
            break;
        }
        default:
            inner = `<rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="${Math.min(x, y)}" fill="none" stroke="${c1}" stroke-width="${w * 0.01}"/>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
}

function getMolduraPreviewSVG(id) {
    const { c1, c2, c3, c4, c5 } = _frameColors();
    const w = 112;
    const h = 112;
    const x = w * 0.12;
    const y = h * 0.12;
    const iw = w - x * 2;
    const ih = h - y * 2;
    let inner = '';

    switch (id) {
        case 'pontinhos': {
            let dots = '';
            const step = w * 0.14;
            for (let i = 0; i <= Math.floor(iw / step); i++) {
                dots += `<circle cx="${x + i * step}" cy="${y}" r="1.4" fill="${c1}"/><circle cx="${x + i * step}" cy="${y + ih}" r="1.4" fill="${c1}"/>`;
            }
            for (let i = 1; i < Math.floor(ih / step); i++) {
                dots += `<circle cx="${x}" cy="${y + i * step}" r="1.4" fill="${c1}"/><circle cx="${x + iw}" cy="${y + i * step}" r="1.4" fill="${c1}"/>`;
            }
            inner = dots + `<rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="${x}" fill="none" stroke="${c1}" stroke-width="1.6"/>`;
            break;
        }
        case 'tracos': {
            inner = ``;
            const seg = w * 0.12;
            const gap = seg * 0.8;
            const th = 2;
            for (let i = 0; i <= Math.floor(iw / (seg + gap)); i++) {
                const sx = x + i * (seg + gap);
                inner += `<line x1="${sx}" y1="${y}" x2="${sx + seg}" y2="${y}" stroke="${c3}" stroke-width="${th}" stroke-linecap="round"/>`;
                inner += `<line x1="${sx}" y1="${y + ih}" x2="${sx + seg}" y2="${y + ih}" stroke="${c3}" stroke-width="${th}" stroke-linecap="round"/>`;
            }
            for (let i = 0; i <= Math.floor(ih / (seg + gap)); i++) {
                const sy = y + i * (seg + gap);
                inner += `<line x1="${x}" y1="${sy}" x2="${x}" y2="${sy + seg}" stroke="${c3}" stroke-width="${th}" stroke-linecap="round"/>`;
                inner += `<line x1="${x + iw}" y1="${sy}" x2="${x + iw}" y2="${sy + seg}" stroke="${c3}" stroke-width="${th}" stroke-linecap="round"/>`;
            }
            break;
        }
        case 'dupla': {
            const o = w * 0.06;
            inner = `<rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="${x}" fill="none" stroke="${c1}" stroke-width="2.4"/>` +
                `<rect x="${x + o}" y="${y + o}" width="${iw - o * 2}" height="${ih - o * 2}" rx="${x}" fill="none" stroke="${c2}" stroke-width="1.6"/>`;
            break;
        }
        case 'coracoes': {
            const s = w * 0.06;
            const heart = (cx, cy, col) => `<path d="M${cx} ${cy - s * 0.5} C${cx - s} ${cy - s * 1.6}, ${cx - s * 2} ${cy + s * 0.4}, ${cx} ${cy + s * 1.6} C${cx + s * 2} ${cy + s * 0.4}, ${cx + s} ${cy - s * 1.6}, ${cx} ${cy - s * 0.5} Z" fill="${col}"/>`;
            inner = `<rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="${x}" fill="none" stroke="${c1}" stroke-width="1.6"/>` +
                heart(x, y, c2) + heart(x + iw, y, c3) + heart(x, y + ih, c3) + heart(x + iw, y + ih, c2) +
                heart(w / 2, y, c4) + heart(w / 2, y + ih, c4);
            break;
        }
        case 'flores': {
            const s = w * 0.045;
            const petal = (cx, cy, col) => `
                <g fill="${col}">
                    <circle cx="${cx}" cy="${cy - s}" r="${s * 0.8}"/><circle cx="${cx + s}" cy="${cy}" r="${s * 0.8}"/>
                    <circle cx="${cx}" cy="${cy + s}" r="${s * 0.8}"/><circle cx="${cx - s}" cy="${cy}" r="${s * 0.8}"/>
                    <circle cx="${cx}" cy="${cy}" r="${s * 0.6}" fill="#fde68a"/>
                </g>`;
            inner = `<rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="${x}" fill="none" stroke="${c5}" stroke-width="1.6"/>` +
                petal(x, y, c4) + petal(x + iw, y, c2) + petal(x, y + ih, c2) + petal(x + iw, y + ih, c4);
            break;
        }
        case 'estrelas': {
            const s = w * 0.045;
            const star = (cx, cy, col) => {
                let d = '';
                for (let i = 0; i < 10; i++) {
                    const r = i % 2 === 0 ? s : s * 0.45;
                    const a = (i * Math.PI) / 5 - Math.PI / 2;
                    d += (i === 0 ? 'M' : 'L') + (cx + r * Math.cos(a)) + ' ' + (cy + r * Math.sin(a)) + ' ';
                }
                return `<path d="${d} Z" fill="${col}"/>`;
            };
            inner = `<rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="${x}" fill="none" stroke="${c3}" stroke-width="1.2" stroke-dasharray="1 3"/>` +
                star(x, y, c4) + star(x + iw, y, c1) + star(x, y + ih, c1) + star(x + iw, y + ih, c4);
            break;
        }
        case 'ondas': {
            const amp = w * 0.02;
            const wavePath = (yOffset, col) => {
                const seg = w * 0.18;
                let d = `M ${x} ${yOffset}`;
                for (let i = 1; i <= Math.floor(iw / seg); i++) {
                    const midx = x + i * seg - seg / 2;
                    const prevx = x + (i - 1) * seg;
                    d += ` Q ${midx} ${yOffset - (i % 2 === 0 ? amp : -amp) * 2}, ${prevx + seg} ${yOffset}`;
                }
                return `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round"/>`;
            };
            inner = wavePath(y, c1) + wavePath(y + ih, c2) + `<rect x="${x}" y="${y}" width="${iw}" height="${ih}" fill="none" stroke="${c1}" stroke-width="0.8"/>`;
            break;
        }
        case 'fita': {
            const s = w * 0.07;
            const tape = (cx1, cy1, col) => `<rect x="${cx1 - s}" y="${cy1 - s * 0.7}" width="${s * 3}" height="${s * 1.9}" rx="${s * 0.5}" fill="${col}" transform="rotate(-30 ${cx1} ${cy1})" opacity="0.9"/>`;
            inner = `<rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="${x}" fill="none" stroke="${c4}" stroke-width="1.2" stroke-dasharray="2 3"/>` +
                tape(x + s, y + s, c2) + tape(x + iw - s, y + s, c3) + tape(x + s, y + ih - s, c3) + tape(x + iw - s, y + ih - s, c2);
            break;
        }
        case 'torn': {
            let tearTop = `M ${x} ${y + ih * 0.2}`;
            let tearBottom = `M ${x} ${y + ih * 0.8}`;
            for (let i = 0; i <= 3; i++) {
                tearTop += ` L ${x + i * 18 + 5} ${y + ih * 0.2 - (i % 2 === 0 ? 4 : -4)} L ${x + (i + 1) * 18} ${y + ih * 0.2}`;
                tearBottom += ` L ${x + i * 18 + 5} ${y + ih * 0.8 + (i % 2 === 0 ? -4 : 4)} L ${x + (i + 1) * 18} ${y + ih * 0.8}`;
            }
            inner = `<path d="${tearTop}" fill="none" stroke="${c5}" stroke-width="2" stroke-linecap="round"/>` +
                `<path d="${tearBottom}" fill="none" stroke="${c5}" stroke-width="2" stroke-linecap="round"/>` +
                `<rect x="${x + 3}" y="${y}" width="${iw - 6}" height="${ih}" fill="none" stroke="${c1}" stroke-width="1.6"/>`;
            break;
        }
        default:
            inner = `<rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="${x}" fill="none" stroke="${c1}" stroke-width="2.4"/>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
}

function _svgDataURL(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function createStickerElement(emoji, elementos) {
    const size = 360;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.font = `${Math.round(size * 0.8)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2);
    const src = canvas.toDataURL('image/png');

    return {
        tipo: 'imagem',
        id: generateId(),
        src,
        x: 100,
        y: 100,
        width: 220,
        height: 220,
        rotation: 0,
        escala: 1,
        opacidade: 1,
        layer: getNextLayer(elementos),
        bloqueada: false,
        visivel: true,
        nome: 'Autocolante ' + emoji
    };
}

function createFrameElement(frameId, boardW, boardH, elementos) {
    const svg = getMolduraSVG(frameId, boardW, boardH);
    return {
        tipo: 'imagem',
        id: generateId(),
        src: _svgDataURL(svg),
        x: 0,
        y: 0,
        width: boardW,
        height: boardH,
        rotation: 0,
        escala: 1,
        opacidade: 1,
        layer: 0,
        bloqueada: false,
        visivel: true,
        nome: 'Moldura ' + (MOLDURAS.find(m => m.id === frameId)?.label || frameId)
    };
}

function getStickersPanelHTML() {
    return `
        <div class="panel-section">
            <h4>Autocolantes</h4>
            <p class="panel-hint">Toque num autocolante para o adicionar ao quadro.</p>
            <div class="sticker-grid">
                ${STICKERS.map(s => `
                    <button class="sticker-option" data-emoji="${s.emoji}" title="${s.label}">
                        <span class="sticker-emoji">${s.emoji}</span>
                        <span class="sticker-label">${s.label}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function bindStickersPanelEvents(panel, callbacks) {
    panel.querySelectorAll('.sticker-option').forEach(btn => {
        btn.addEventListener('click', () => {
            callbacks.onAddSticker?.(btn.dataset.emoji);
        });
    });
}

function getMoldurasPanelHTML() {
    return `
        <div class="panel-section">
            <h4>Molduras</h4>
            <p class="panel-hint">A moldura entra atrás do conteúdo, com o tamanho do quadro.</p>
            <div class="moldura-grid">
                ${MOLDURAS.map(m => `
                    <button class="moldura-option" data-moldura="${m.id}">
                        <span class="moldura-preview">${getMolduraPreviewSVG(m.id)}</span>
                        <span class="moldura-label">${m.label}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function bindMoldurasPanelEvents(panel, callbacks) {
    panel.querySelectorAll('.moldura-option').forEach(btn => {
        btn.addEventListener('click', () => {
            callbacks.onAddFrame?.(btn.dataset.moldura);
        });
    });
}