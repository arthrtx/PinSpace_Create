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

