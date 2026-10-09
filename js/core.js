function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function radToDeg(rad) {
    return (rad * 180) / Math.PI;
}

function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// Cópia profunda rápida. As strings (incluindo imagens em base64 de
// centenas de KB) são imutáveis em JS e ficam partilhadas em vez de
// serem serializadas — o JSON.parse(JSON.stringify()) antigo copiava-as
// inteiras a cada ação do histórico. Mantém a semântica do JSON:
// ignora undefined/funções e converte Date em string.
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj.toJSON();
    if (Array.isArray(obj)) {
        const out = new Array(obj.length);
        for (let i = 0; i < obj.length; i++) {
            const v = obj[i];
            out[i] = (v === undefined || typeof v === 'function') ? null : deepClone(v);
        }
        return out;
    }
    const out = {};
    for (const k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        const v = obj[k];
        if (v === undefined || typeof v === 'function') continue;
        out[k] = deepClone(v);
    }
    return out;
}

function getElementIcon(type) {
    const icons = {
        imagem: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
        texto: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',
        forma: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
        quadrado: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/></svg>',
        retangulo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="1"/></svg>',
        circulo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>',
        triangulo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3L22 21H2z"/></svg>',
        losango: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L22 12L12 22L2 12z"/></svg>',
        pentagono: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L22 9L18 21H6L2 9z"/></svg>',
        hexagono: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L21 7V17L12 22L3 17V7z"/></svg>',
        estrela: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>',
        coracao: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
        linha: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/></svg>',
        seta: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>'
    };
    return icons[type] || '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12h6M12 9v6"/></svg>';
}

function getElementLabel(el) {
    if (el.nome) return el.nome;
    switch (el.tipo) {
        case 'imagem': return 'Imagem';
        case 'texto': return el.conteudo?.slice(0, 20) || 'Texto';
        case 'forma': return el.forma || 'Forma';
        default: return 'Elemento';
    }
}

function createSVGElement(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([key, val]) => el.setAttribute(key, val));
    return el;
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// As imagens sao guardadas como texto dentro do quadro, e esse texto tem
// um limite no servidor. Uma foto de telemovel ocupa 2-4 MB e nao cabia.
// Aqui reduzimos a imagem antes de a guardar: encolhemos o lado maior e
// vamos baixando a qualidade ate o ficheiro ficar dentro do orçamento.
const IMG_MAX_LADO = 1600;
const IMG_MAX_BYTES = 400_000;
const FUNDO_MAX_LADO = 2000;
const FUNDO_MAX_BYTES = 800_000;

function _formatoSuportaTransparencia(tipo) {
    return !(tipo === 'image/jpeg' || tipo === 'image/jpg');
}

function _tamanhoDataURL(dataURL) {
    const i = dataURL.indexOf(',');
    return Math.ceil(((dataURL.length - i - 1) * 3) / 4);
}

// Reduz uma imagem. Devolve a dataURL original se ja for pequena o
// suficiente, para nao voltar a codificar o que nao precisa.
//
// Vao tres tentativas antes de desistir: primeiro o tamanho normal, depois
// cada vez menor. Dentro de cada tamanho, tenta a melhor qualidade que
// caiba no orcamento. Se nada chegar ao orcamento, devolve o mais pequeno
// que conseguiu - nunca uma versao maior do que a original.
async function compactarImagem(src, opcoes = {}) {
    const maxLado = opcoes.maxLado || IMG_MAX_LADO;
    const maxBytes = opcoes.maxBytes || IMG_MAX_BYTES;

    if (typeof src !== 'string' || src.slice(0, 5) !== 'data:') return src;
    if (_tamanhoDataURL(src) <= maxBytes) return src;

    let img;
    try { img = await loadImage(src); } catch { return src; }

    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    if (!w0 || !h0) return src;

    // JPEG nao tem transparencia: so se usa quando a origem tambem nao tinha.
    const comAlpha = _formatoSuportaTransparencia(src.slice(5, src.indexOf(';')));
    const formatos = comAlpha
        ? [['image/webp', 0.85], ['image/webp', 0.7], ['image/png']]
        : [['image/webp', 0.85], ['image/webp', 0.7], ['image/jpeg', 0.7], ['image/jpeg', 0.45]];

    const escalaBase = Math.min(1, maxLado / Math.max(w0, h0));
    let melhor = null;
    let melhorBytes = Infinity;

    for (const fator of [1, 0.72, 0.5, 0.34]) {
        const escala = escalaBase * fator;
        const w = Math.max(1, Math.round(w0 * escala));
        const h = Math.max(1, Math.round(h0 * escala));
        if (w < 32 || h < 32) break;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);

        for (const [tipo, qualidade] of formatos) {
            let out;
            try { out = canvas.toDataURL(tipo, qualidade); } catch { out = null; }
            if (!out || out.slice(0, 5) !== 'data:') continue;
            // Alguns browsers nao suportam o formato pedido e devolvem PNG.
            if (tipo === 'image/webp' && out.slice(0, 15) !== 'data:image/webp') continue;

            const bytes = _tamanhoDataURL(out);
            if (bytes < melhorBytes) { melhorBytes = bytes; melhor = out; }
            if (bytes <= maxBytes) return out;
        }
    }

    return melhor || src;
}

// Versão para ficheiros: só converte o que o FileReader ia devolver, mas
// já reduzido.
async function compactarFicheiroImagem(file, opcoes = {}) {
    let src;
    try { src = await readFileAsDataURL(file); } catch { return null; }
    try { return await compactarImagem(src, opcoes); } catch { return src; }
}

// Passa por todas as imagens de um projecto e reduz as que ainda estão
// grandes. Serve para os quadros que já tinhas guardados antes disto:
// arrasta uma foto de 2020, volta a abrir o quadro, e a foto volta a ser
// pesada. Também ajuda o localStorage, que tem um limite baixo.
async function compactarProjeto(projeto) {
    if (!projeto || !Array.isArray(projeto.elementos)) return 0;
    let n = 0;

    for (const el of projeto.elementos) {
        if (!el || el.tipo !== 'imagem' || typeof el.src !== 'string') continue;
        if (!_ehDataURL(el.src) || _tamanhoDataURL(el.src) <= IMG_MAX_BYTES) continue;
        const novo = await compactarImagem(el.src);
        if (novo && novo !== el.src) { el.src = novo; n++; }
    }

    const fundo = projeto.background;
    if (fundo && fundo.tipo === 'imagem' && _ehDataURL(fundo.valor) && _tamanhoDataURL(fundo.valor) > FUNDO_MAX_BYTES) {
        const novo = await compactarImagem(fundo.valor, { maxLado: FUNDO_MAX_LADO, maxBytes: FUNDO_MAX_BYTES });
        if (novo && novo !== fundo.valor) { fundo.valor = novo; n++; }
    }

    return n;
}

function _ehDataURL(src) {
    return typeof src === 'string' && src.slice(0, 5) === 'data:';
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function getAngle(cx, cy, px, py) {
    return radToDeg(Math.atan2(py - cy, px - cx));
}

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

const MODERATION_BAD_WORDS = [
    'abo', 'arrombado', 'baitola', 'bicha', 'boceta', 'bosta', 'buceta',
    'caralho', 'cacete', 'cu', 'cuzão', 'cuzao', 'cornudo', 'corno',
    'desgraçado', 'desgracado', 'escroto', 'foder', 'fodase', 'foda-se',
    'fodido', 'filhadaputa', 'filho da puta', 'grelo', 'idiota', 'imbecil',
    'merda', 'otario', 'otário', 'pau', 'pinto', 'piroca', 'porra',
    'punheta', 'puta', 'putaria', 'puto', 'peido', 'pentelho', 'rola',
    'sacanagem', 'tarado', 'troxa', 'vagabunda', 'vagabundo', 'viado',
    'xoxota',
    'asshole', 'bastard', 'bitch', 'bullshit', 'cock', 'cunt', 'dick',
    'douche', 'faggot', 'fag', 'fuck', 'fucker', 'motherfucker', 'nigga',
    'nigger', 'pussy', 'retard', 'shit', 'slut', 'whore', 'wanker',
    'nazi', 'hitler'
];

const MODERATION_LEET = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
    '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's',
    '!': 'i', '|': 'i'
};

const IMAGE_RIGHTS_TERMS = [
    'Confirma que é o autor das imagens que publica ou que tem autorização ou licença dos respetivos titulares de direitos.',
    'É o único responsável pelo conteúdo que publica e não pode publicar imagens sem direitos de utilização.',
    'Nomes ofensivos, conteúdo de ódio, violento ou sexual, e conteúdo que viole direitos de terceiros são proibidos.',
    'Se publicar conteúdo que infrinja direitos de autor ou de imagem de terceiros, o conteúdo pode ser removido sem aviso e assume total responsabilidade por eventuais reclamações.'
];

function moderationNormalize(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[0-9@$!|]/g, (ch) => MODERATION_LEET[ch] || ch)
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function moderationCollapse(word) {
    return word.replace(/(.)\1+/g, '$1');
}

function moderationTokenize(normalized) {
    if (!normalized) return { tokens: [], joined: '' };
    const tokens = normalized.split(' ').map(moderationCollapse);
    return { tokens, joined: tokens.join('') };
}

function moderationStripDigits(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function findBadWords(text) {
    const variants = [moderationTokenize(moderationNormalize(text))];
    const stripped = moderationStripDigits(text);
    if (stripped) variants.push(moderationTokenize(stripped));
    const found = new Set();
    for (const raw of MODERATION_BAD_WORDS) {
        const banned = moderationCollapse(moderationNormalize(raw).replace(/\s+/g, ''));
        if (!banned) continue;
        for (const { tokens, joined } of variants) {
            if (tokens.includes(banned) || joined === banned || (banned.length >= 5 && joined.includes(banned))) {
                found.add(raw);
                break;
            }
        }
    }
    return [...found];
}

function moderationFormatList(words) {
    return words.map(w => '“' + w + '”').join(', ');
}

function moderationBadWordsReason(words) {
    const count = words.length === 1
        ? 'uma palavra proibida'
        : words.length + ' palavras proibidas';
    return 'O nome contém ' + count + ': ' + moderationFormatList(words) +
        '. Não é permitido usar linguagem ofensiva em quadros públicos — escolha outro nome.';
}

function validateAuthorName(name) {
    const value = String(name || '').trim() || 'Anónimo';
    if (value.length > 40) {
        return { ok: false, error: 'O nome tem ' + value.length + ' caracteres, mas o máximo permitido é 40. Encurte o nome para publicar.' };
    }
    if (/https?:\/\//i.test(value) || /www\./i.test(value) || /\S+\.(com|pt|net|org|io|xyz|info)\b/i.test(value)) {
        return { ok: false, error: 'O nome não pode conter links nem endereços de sites (ex.: www.exemplo.com). Remova o link e tente novamente.' };
    }
    const bad = findBadWords(value);
    if (bad.length) {
        return { ok: false, error: moderationBadWordsReason(bad) };
    }
    return { ok: true, value };
}


/* Ícones de linha usados nos painéis do editor (em vez de emojis). */
const UI_ICONS = {
    wand: '<path d="m15 4 5 5M3 21l12-12"/><path d="M14 4.5 15.5 3M19.5 9 21 7.5M18 3v2M21 6h-2M9 3v2M10 4H8"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    undoBrush: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 8v4l3 2"/>',
    flip: '<path d="M12 3v18"/><path d="m8 7-5 5 5 5V7zM16 7l5 5-5 5V7z"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    brush: '<path d="M9.06 11.9 17.1 3.86a2.12 2.12 0 0 1 3 3l-8.04 8.04"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    eraser: '<path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l10-10a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L11 21z"/><path d="M22 21H7M5 11l9 9"/>',
    marker: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
    spray: '<path d="M3 3h.01M7 5h.01M11 7h.01M3 7h.01M7 9h.01M3 11h.01"/><rect x="15" y="5" width="4" height="4"/><path d="m19 9 2 2v10c0 .6-.4 1-1 1h-6c-.6 0-1-.4-1-1V11l2-2"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.9 17.9A10 10 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9 9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22"/>',
    trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 6V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2"/>',
    crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
    sparkle: '<path d="M12 3c.8 4.6 3.4 7.2 8 8-4.6.8-7.2 3.4-8 8-.8-4.6-3.4-7.2-8-8 4.6-.8 7.2-3.4 8-8z"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    grid: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    alignL: '<path d="M3 6h18M3 12h12M3 18h16"/>',
    alignC: '<path d="M3 6h18M6 12h12M4 18h16"/>',
    alignR: '<path d="M3 6h18M9 12h12M5 18h16"/>',
    drag: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>'
};
function uiIcon(name, size = 15) {
    return `<svg class="ui-ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UI_ICONS[name] || ''}</svg>`;
}
