/* =====================================================================
   PinSpace — pack de elementos gráficos "aesthetic" + molduras
   Substitui os stickers e molduras antigos. Tudo é SVG gerado, por isso
   cada elemento entra no quadro como uma imagem própria (separada) e
   leve, e as cores seguem a paleta escolhida (por omissão, o tema do
   editor: claro → "Studio", escuro → "Noite").

   API usada pelo resto do editor (igual à antiga):
     createStickerElement(id, elementos, boardW, boardH)
     createFrameElement(id, boardW, boardH, elementos)
     getStickersPanelHTML() / bindStickersPanelEvents(panel, callbacks)
     getMoldurasPanelHTML() / bindMoldurasPanelEvents(panel, callbacks)
   ===================================================================== */

const EL_PALETTES = {
    studio:    { label: 'Studio',    ink: '#1d1d1f', paper: '#f4f4f1', soft: '#d4d4d0', mid: '#8e8e8a', accent: '#e60023' },
    noite:     { label: 'Noite',     ink: '#f2f2f3', paper: '#1d1d20', soft: '#3a3a3f', mid: '#8a8a90', accent: '#a9bcae' },
    creme:     { label: 'Creme',     ink: '#3b3029', paper: '#f3ece0', soft: '#e3d5c0', mid: '#a8957c', accent: '#c96f4a' },
    terracota: { label: 'Terracota', ink: '#0a0a0a', paper: '#f6f5f1', soft: '#edebe6', mid: '#8b8780', accent: '#e60023' },
    pastel:    { label: 'Pastel',    ink: '#4a4560', paper: '#fff7f2', soft: '#f6d6e0', mid: '#b7c7e8', accent: '#f4b8a0' },
    cromo:     { label: 'Cromo',     ink: '#2b2b2e', paper: '#ffffff', soft: '#d9dbe0', mid: '#9aa0aa', accent: '#b9c2ff' }
};

const EL_PALETTE_KEY = 'pinspace_el_palette';

function elPaletteId() {
    let id = 'auto';
    try { id = localStorage.getItem(EL_PALETTE_KEY) || 'auto'; } catch { /* ok */ }
    if (id === 'noite') return 'noite';
    return document.documentElement.dataset.theme === 'dark' ? 'noite' : 'studio';
}

function elPalette() {
    return EL_PALETTES[elPaletteId()];
}

// Molduras seguem sempre o tema do editor (claro → Studio, escuro → Noite).
function elThemePalette() {
    return document.documentElement.dataset.theme === 'dark' ? EL_PALETTES.noite : EL_PALETTES.studio;
}

let _elUid = 0;
const _uid = (p) => p + (++_elUid).toString(36);

// Gradiente metálico para os elementos Y2K / cromo.
function _chrome(id, p) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff"/>
        <stop offset=".28" stop-color="${p.soft}"/>
        <stop offset=".5" stop-color="${p.mid}"/>
        <stop offset=".62" stop-color="#ffffff"/>
        <stop offset="1" stop-color="${p.mid}"/>
    </linearGradient>`;
}

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Arial, sans-serif";
const MONO = "'Courier New', monospace";

// Cada elemento: [id, rótulo, largura, altura, (p, u) => conteúdo SVG]
// p = paleta; u = prefixo único para ids internos (gradientes, padrões).
const ELEMENT_PACKS = [
    {
        id: 'minimal', label: 'Minimal',
        items: [
            ['arco', 'Arco', 200, 240, p => `<path d="M30 230V110a70 70 0 0 1 140 0v120" fill="none" stroke="${p.ink}" stroke-width="6" stroke-linecap="round"/>`],
            ['meia-lua', 'Meia-lua', 240, 130, p => `<path d="M10 120a110 110 0 0 1 220 0z" fill="${p.accent}"/><path d="M10 120h220" stroke="${p.ink}" stroke-width="4"/>`],
            ['circulo-aberto', 'Círculo aberto', 220, 220, p => `<circle cx="110" cy="110" r="90" fill="none" stroke="${p.ink}" stroke-width="5" stroke-dasharray="470 96" stroke-linecap="round" transform="rotate(-30 110 110)"/>`],
            ['onda', 'Linha em onda', 300, 80, p => `<path d="M10 40c25-30 45-30 70 0s45 30 70 0 45-30 70 0 45 30 70 0" fill="none" stroke="${p.ink}" stroke-width="5" stroke-linecap="round"/>`],
            ['pontos', 'Grelha de pontos', 200, 200, p => { let s = ''; for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) s += `<circle cx="${20 + x * 40}" cy="${20 + y * 40}" r="5" fill="${(x + y) % 4 === 0 ? p.accent : p.ink}"/>`; return s; }],
            ['cruz', 'Cruz fina', 160, 160, p => `<path d="M80 10v140M10 80h140" stroke="${p.ink}" stroke-width="4" stroke-linecap="round"/>`],
            ['brilho', 'Brilho', 200, 200, p => `<path d="M100 8c6 52 40 86 92 92-52 6-86 40-92 92-6-52-40-86-92-92 52-6 86-40 92-92z" fill="${p.ink}"/>`],
            ['asterisco', 'Asterisco', 200, 200, p => { let s = ''; for (let i = 0; i < 8; i++) s += `<path d="M100 100L100 12" stroke="${p.ink}" stroke-width="5" stroke-linecap="round" transform="rotate(${i * 45} 100 100)"/>`; return s + `<circle cx="100" cy="100" r="10" fill="${p.accent}"/>`; }],
            ['aneis', 'Anéis', 220, 220, p => `<circle cx="110" cy="110" r="96" fill="none" stroke="${p.ink}" stroke-width="3"/><circle cx="110" cy="110" r="62" fill="none" stroke="${p.ink}" stroke-width="3"/><circle cx="110" cy="110" r="28" fill="${p.accent}"/>`],
            ['seta-curva', 'Seta curva', 240, 160, p => `<path d="M20 130C40 40 150 20 210 70" fill="none" stroke="${p.ink}" stroke-width="5" stroke-linecap="round"/><path d="M180 52l32 20-36 12" fill="none" stroke="${p.ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`],
            ['losango', 'Losango', 200, 200, p => `<rect x="40" y="40" width="120" height="120" fill="none" stroke="${p.ink}" stroke-width="4" transform="rotate(45 100 100)"/><rect x="72" y="72" width="56" height="56" fill="${p.accent}" transform="rotate(45 100 100)"/>`],
            ['diagonais', 'Linhas diagonais', 220, 220, p => { let s = ''; for (let i = 0; i < 7; i++) s += `<path d="M${-60 + i * 50} 220L${60 + i * 50} 0" stroke="${p.ink}" stroke-width="3"/>`; return `<clipPath id="c"><circle cx="110" cy="110" r="100"/></clipPath><g clip-path="url(#c)">${s}</g>`; }],
            ['arco-iris', 'Arcos', 260, 150, p => `<g fill="none" stroke-width="16" stroke-linecap="round"><path d="M20 140a110 110 0 0 1 220 0" stroke="${p.ink}"/><path d="M52 140a78 78 0 0 1 156 0" stroke="${p.mid}"/><path d="M84 140a46 46 0 0 1 92 0" stroke="${p.accent}"/></g>`],
            ['quadrados', 'Quadrados', 220, 220, p => `<rect x="20" y="20" width="120" height="120" fill="none" stroke="${p.ink}" stroke-width="4"/><rect x="80" y="80" width="120" height="120" fill="${p.accent}" fill-opacity=".85"/>`]
        ]
    },
    {
        id: 'organico', label: 'Orgânico',
        items: [
            ['blob-1', 'Forma 1', 240, 220, p => `<path d="M126 14c52 4 98 40 100 92s-38 102-96 104S20 182 16 126 74 10 126 14z" fill="${p.accent}"/>`],
            ['blob-2', 'Forma 2', 240, 220, p => `<path d="M60 30c40-30 110-20 140 20s30 110-20 140-120 30-150-10S20 60 60 30z" fill="${p.soft}"/>`],
            ['blob-3', 'Forma 3', 240, 220, p => `<path d="M120 10c30 0 40 30 70 40s40 50 20 80-20 70-60 76-70-20-100-40S0 100 20 70 90 10 120 10z" fill="${p.ink}"/>`],
            ['blob-contorno', 'Forma contorno', 240, 220, p => `<path d="M126 14c52 4 98 40 100 92s-38 102-96 104S20 182 16 126 74 10 126 14z" fill="none" stroke="${p.ink}" stroke-width="4"/>`],
            ['seixo', 'Seixo', 220, 160, p => `<ellipse cx="110" cy="84" rx="100" ry="66" fill="${p.mid}" transform="rotate(-8 110 84)"/><ellipse cx="86" cy="64" rx="34" ry="16" fill="#fff" opacity=".25" transform="rotate(-8 110 84)"/>`],
            ['gota', 'Gota', 160, 220, p => `<path d="M80 10C110 70 150 110 150 150a70 70 0 0 1-140 0c0-40 40-80 70-140z" fill="${p.accent}"/>`],
            ['arco-cheio', 'Arco cheio', 180, 240, p => `<path d="M10 240V100a80 80 0 0 1 160 0v140z" fill="${p.soft}"/><path d="M40 240V108a50 50 0 0 1 100 0v132" fill="none" stroke="${p.ink}" stroke-width="3"/>`],
            ['mancha-pontos', 'Mancha pontilhada', 240, 220, (p, u) => `<defs><pattern id="${u}d" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="2.4" fill="${p.ink}"/></pattern></defs><path d="M126 14c52 4 98 40 100 92s-38 102-96 104S20 182 16 126 74 10 126 14z" fill="url(#${u}d)"/>`],
            ['sol-organico', 'Sol orgânico', 240, 240, p => { let s = ''; for (let i = 0; i < 12; i++) s += `<path d="M120 22c8 10 8 20 0 30" fill="none" stroke="${p.ink}" stroke-width="4" stroke-linecap="round" transform="rotate(${i * 30} 120 120)"/>`; return s + `<circle cx="120" cy="120" r="52" fill="${p.accent}"/>`; }],
            ['rabisco', 'Rabisco', 260, 120, p => `<path d="M10 80c30-60 50 40 80-10s40-50 60 0 30 40 50-10 30-20 50 10" fill="none" stroke="${p.ink}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`],
            ['flor-blob', 'Flor macia', 240, 240, p => { let s = ''; for (let i = 0; i < 6; i++) s += `<ellipse cx="120" cy="66" rx="34" ry="52" fill="${p.soft}" transform="rotate(${i * 60} 120 120)"/>`; return s + `<circle cx="120" cy="120" r="30" fill="${p.accent}"/>`; }]
        ]
    },
    {
        id: 'papel', label: 'Papelaria',
        items: [
            ['washi', 'Fita washi', 300, 70, (p, u) => `<defs><pattern id="${u}s" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="20" fill="${p.accent}"/><rect x="10" width="10" height="20" fill="${p.paper}"/></pattern></defs><path d="M8 10l6 6-6 6 6 6-6 6 6 6-6 6 6 6h272l-6-6 6-6-6-6 6-6-6-6 6-6-6-6 6-6z" fill="url(#${u}s)" opacity=".9"/>`],
            ['fita', 'Fita adesiva', 260, 80, p => `<path d="M6 14l10 8-8 10 10 8-8 10 10 8-6 8h236l-8-8 10-8-8-10 10-8-8-10 10-8-6-8z" fill="${p.soft}" fill-opacity=".72"/><path d="M20 30h220" stroke="#fff" stroke-opacity=".35" stroke-width="6"/>`],
            ['clip', 'Clipe', 90, 220, p => `<path d="M30 60V40a20 20 0 0 1 40 0v140a30 30 0 0 1-60 0V60a12 12 0 0 1 24 0v110" fill="none" stroke="${p.mid}" stroke-width="7" stroke-linecap="round"/>`],
            ['pionés', 'Pionés', 140, 200, p => `<path d="M70 120v76" stroke="${p.mid}" stroke-width="5" stroke-linecap="round"/><ellipse cx="70" cy="118" rx="44" ry="12" fill="${p.ink}" opacity=".25"/><path d="M40 112c0-30 10-40 10-60h40c0 20 10 30 10 60z" fill="${p.accent}"/><ellipse cx="70" cy="46" rx="30" ry="18" fill="${p.accent}"/><ellipse cx="62" cy="40" rx="10" ry="5" fill="#fff" opacity=".5"/>`],
            ['etiqueta', 'Etiqueta', 240, 140, p => `<path d="M60 20h160a10 10 0 0 1 10 10v80a10 10 0 0 1-10 10H60L14 70z" fill="${p.paper}" stroke="${p.ink}" stroke-width="3"/><circle cx="52" cy="70" r="8" fill="none" stroke="${p.ink}" stroke-width="3"/><path d="M80 58h110M80 82h80" stroke="${p.mid}" stroke-width="4" stroke-linecap="round"/>`],
            ['post-it', 'Post-it', 220, 220, p => `<path d="M14 14h192v150l-42 42H14z" fill="${p.accent}"/><path d="M206 164h-42v42z" fill="${p.ink}" opacity=".18"/><path d="M40 60h130M40 92h130M40 124h90" stroke="${p.ink}" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>`],
            ['bilhete', 'Bilhete', 300, 140, p => `<path d="M12 12h276v42a16 16 0 0 0 0 32v42H12V86a16 16 0 0 0 0-32z" fill="${p.paper}" stroke="${p.ink}" stroke-width="3"/><path d="M210 18v104" stroke="${p.ink}" stroke-width="2" stroke-dasharray="6 6"/><text x="36" y="66" font-family="${SANS}" font-size="26" font-weight="800" letter-spacing="3" fill="${p.ink}">ADMIT ONE</text><text x="36" y="96" font-family="${MONO}" font-size="14" fill="${p.mid}">PIN SPACE · Nº 0026</text><text x="226" y="78" font-family="${MONO}" font-size="16" fill="${p.ink}" transform="rotate(90 240 72)">★ 001</text>`],
            ['selo', 'Selo postal', 200, 240, p => { let s = ''; for (let i = 0; i <= 9; i++) { s += `<circle cx="${10 + i * 20}" cy="10" r="7" fill="#000"/><circle cx="${10 + i * 20}" cy="230" r="7" fill="#000"/>`; } for (let i = 0; i <= 11; i++) { s += `<circle cx="10" cy="${10 + i * 20}" r="7" fill="#000"/><circle cx="190" cy="${10 + i * 20}" r="7" fill="#000"/>`; } return `<mask id="m"><rect width="200" height="240" fill="#fff"/>${s}</mask><rect width="200" height="240" fill="${p.paper}" mask="url(#m)"/><rect x="26" y="26" width="148" height="150" fill="${p.accent}"/><circle cx="100" cy="101" r="40" fill="none" stroke="${p.ink}" stroke-width="3"/><text x="26" y="206" font-family="${SERIF}" font-size="22" font-style="italic" fill="${p.ink}">pin space</text><text x="144" y="206" font-family="${SANS}" font-size="20" font-weight="700" fill="${p.ink}">26</text>`; }],
            ['canto', 'Canto de foto', 140, 140, p => `<path d="M10 10h120L10 130z" fill="${p.ink}"/><path d="M26 22h70" stroke="#fff" stroke-opacity=".25" stroke-width="3"/>`],
            ['rasgado', 'Papel rasgado', 300, 120, p => `<path d="M0 30l14-8 12 10 16-12 14 8 18-10 12 12 20-10 14 6 16-12 18 10 14-8 16 12 20-10 12 10 18-8 16 10 20-12 14 8 16-6v80l-18 8-14-10-16 12-20-8-12 10-18-12-14 8-20-10-16 12-12-8-18 10-14-6-16 10-12-12-20 8-14-10-18 12-12-8-16 10-14-10z" fill="${p.paper}"/><path d="M30 60h240M30 80h180" stroke="${p.mid}" stroke-width="2" stroke-opacity=".5"/>`],
            ['recibo', 'Recibo', 200, 280, p => `<path d="M10 10h180v250l-15-10-15 10-15-10-15 10-15-10-15 10-15-10-15 10-15-10-15 10-15-10-15 10z" fill="${p.paper}" stroke="${p.soft}" stroke-width="2"/><text x="100" y="44" text-anchor="middle" font-family="${MONO}" font-size="16" font-weight="700" fill="${p.ink}">PIN SPACE</text><g font-family="${MONO}" font-size="12" fill="${p.ink}"><text x="26" y="84">ideias ....... 03</text><text x="26" y="108">café ......... 02</text><text x="26" y="132">sonhos ....... ∞</text><text x="26" y="156">coragem ...... 01</text></g><path d="M26 176h148" stroke="${p.ink}" stroke-dasharray="4 4"/><text x="26" y="202" font-family="${MONO}" font-size="14" font-weight="700" fill="${p.ink}">TOTAL  ✦ vibes</text>`]
        ]
    },
    {
        id: 'natureza', label: 'Natureza',
        items: [
            ['folha', 'Folha', 160, 260, p => `<path d="M80 250V40" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/><path d="M80 30C20 80 20 170 80 220c60-50 60-140 0-190z" fill="${p.accent}" fill-opacity=".9"/><path d="M80 80l-24 24M80 120l-30 26M80 160l-24 22M80 100l24 22M80 140l28 24" stroke="${p.ink}" stroke-width="2.5" stroke-linecap="round"/>`],
            ['ramo', 'Ramo', 200, 300, p => { let s = `<path d="M100 290C96 200 104 100 100 10" fill="none" stroke="${p.ink}" stroke-width="3"/>`; for (let i = 0; i < 6; i++) { const y = 40 + i * 42, d = i % 2 ? 1 : -1; s += `<path d="M100 ${y + 14}c${d * 40}-6 ${d * 60}-26 ${d * 64}-40c${-d * 34} -2 ${-d * 58} 10 ${-d * 64} 40z" fill="${i % 3 === 0 ? p.accent : p.soft}" stroke="${p.ink}" stroke-width="2"/>`; } return s; }],
            ['flor-linha', 'Flor em linha', 200, 300, p => { let s = `<path d="M100 290V130" stroke="${p.ink}" stroke-width="3"/><path d="M100 230c-30-4-46-26-50-46 30 0 46 20 50 46z" fill="none" stroke="${p.ink}" stroke-width="3"/>`; for (let i = 0; i < 6; i++) s += `<ellipse cx="100" cy="66" rx="18" ry="34" fill="none" stroke="${p.ink}" stroke-width="3" transform="rotate(${i * 60} 100 100)"/>`; return s + `<circle cx="100" cy="100" r="12" fill="${p.accent}"/>`; }],
            ['margarida', 'Margarida', 240, 240, p => { let s = ''; for (let i = 0; i < 12; i++) s += `<ellipse cx="120" cy="56" rx="16" ry="44" fill="${p.paper}" stroke="${p.soft}" stroke-width="2" transform="rotate(${i * 30} 120 120)"/>`; return s + `<circle cx="120" cy="120" r="30" fill="${p.accent}"/>`; }],
            ['tulipa', 'Tulipa', 160, 280, p => `<path d="M80 270V120" stroke="${p.ink}" stroke-width="4"/><path d="M80 220c-30 0-50-30-50-60 30 6 46 28 50 60z" fill="${p.soft}"/><path d="M36 40l22 24 22-34 22 34 22-24v54a44 44 0 0 1-88 0z" fill="${p.accent}"/>`],
            ['palmeira', 'Palmeira', 240, 300, p => `<path d="M128 290c-10-80-6-150 4-200" fill="none" stroke="${p.ink}" stroke-width="10" stroke-linecap="round"/><g fill="${p.ink}"><path d="M132 90C100 50 50 50 20 80c40-10 80 0 112 10z"/><path d="M132 90c30-44 80-50 100-24-40-4-74 10-100 24z"/><path d="M132 90C120 50 130 20 160 10c-14 30-20 56-28 80z"/><path d="M132 90c-40-10-80 10-90 50 30-30 60-40 90-50z"/><path d="M132 90c40-4 70 20 78 56-24-30-50-44-78-56z"/></g>`],
            ['montanhas', 'Montanhas', 300, 160, p => `<path d="M10 150L100 40l50 60 40-40 100 90z" fill="${p.soft}"/><path d="M10 150L100 40l50 60 40-40 100 90" fill="none" stroke="${p.ink}" stroke-width="4" stroke-linejoin="round"/><circle cx="236" cy="40" r="20" fill="${p.accent}"/>`],
            ['mar', 'Ondas do mar', 300, 120, p => `<g fill="none" stroke-width="5" stroke-linecap="round"><path d="M10 40c30-24 50-24 70 0s40 24 70 0 40-24 70 0 40 24 70 0" stroke="${p.ink}"/><path d="M10 70c30-24 50-24 70 0s40 24 70 0 40-24 70 0 40 24 70 0" stroke="${p.mid}"/><path d="M10 100c30-24 50-24 70 0s40 24 70 0 40-24 70 0 40 24 70 0" stroke="${p.accent}"/></g>`],
            ['nuvem', 'Nuvem', 260, 150, p => `<path d="M60 130a44 44 0 0 1-6-88 60 60 0 0 1 114-10 46 46 0 0 1 46 70 28 28 0 0 1-14 28z" fill="${p.paper}" stroke="${p.ink}" stroke-width="4" stroke-linejoin="round"/>`],
            ['sol', 'Sol', 240, 240, p => { let s = ''; for (let i = 0; i < 16; i++) s += `<path d="M120 10v34" stroke="${p.ink}" stroke-width="${i % 2 ? 3 : 5}" stroke-linecap="round" transform="rotate(${i * 22.5} 120 120)"/>`; return s + `<circle cx="120" cy="120" r="50" fill="${p.accent}" stroke="${p.ink}" stroke-width="4"/>`; }],
            ['lua', 'Lua crescente', 200, 200, p => `<path d="M140 20a84 84 0 1 0 40 150A70 70 0 1 1 140 20z" fill="${p.accent}"/><circle cx="74" cy="110" r="6" fill="${p.ink}" opacity=".25"/><circle cx="96" cy="150" r="9" fill="${p.ink}" opacity=".2"/>`],
            ['cogumelo', 'Cogumelo', 200, 220, p => `<path d="M80 120h40l10 90H70z" fill="${p.paper}" stroke="${p.ink}" stroke-width="3"/><path d="M14 124C14 60 60 20 100 20s86 40 86 104z" fill="${p.accent}" stroke="${p.ink}" stroke-width="3"/><circle cx="70" cy="70" r="12" fill="${p.paper}"/><circle cx="128" cy="62" r="9" fill="${p.paper}"/><circle cx="150" cy="98" r="8" fill="${p.paper}"/>`]
        ]
    },
    {
        id: 'celeste', label: 'Celestial',
        items: [
            ['estrela', 'Estrela', 220, 220, p => `<path d="M110 14l26 62 66 4-50 44 16 66-58-36-58 36 16-66-50-44 66-4z" fill="${p.accent}" stroke="${p.ink}" stroke-width="4" stroke-linejoin="round"/>`],
            ['constelacao', 'Constelação', 260, 200, p => { const pts = [[20, 150], [70, 120], [110, 140], [150, 70], [200, 90], [240, 30]]; return `<path d="${pts.map((q, i) => (i ? 'L' : 'M') + q.join(' ')).join('')}" fill="none" stroke="${p.mid}" stroke-width="2" stroke-dasharray="4 6"/>` + pts.map(([x, y], i) => `<path d="M${x} ${y - 12}c2 8 4 10 12 12-8 2-10 4-12 12-2-8-4-10-12-12 8-2 10-4 12-12z" fill="${i === 3 ? p.accent : p.ink}"/>`).join(''); }],
            ['planeta', 'Planeta', 260, 200, p => `<ellipse cx="130" cy="104" rx="120" ry="30" fill="none" stroke="${p.ink}" stroke-width="4" transform="rotate(-14 130 104)"/><circle cx="130" cy="100" r="64" fill="${p.accent}"/><path d="M76 120a120 30 -14 0 0 108-8" fill="none" stroke="${p.ink}" stroke-width="4" transform="rotate(-14 130 104)"/>`],
            ['fases', 'Fases da lua', 320, 90, (p, u) => { let s = ''; for (let i = 0; i < 5; i++) { const cx = 36 + i * 62; s += `<circle cx="${cx}" cy="45" r="26" fill="${p.soft}"/><clipPath id="${u}${i}"><circle cx="${cx}" cy="45" r="26"/></clipPath><circle cx="${cx + (i - 2) * 22}" cy="45" r="26" fill="${p.ink}" clip-path="url(#${u}${i})"/>`; } return s; }],
            ['estrelinhas', 'Estrelinhas', 220, 220, p => [[60, 60, 30], [150, 50, 18], [130, 140, 40], [50, 160, 16], [190, 180, 12]].map(([x, y, r], i) => `<path d="M${x} ${y - r}c${r * .2} ${r * .7} ${r * .3} ${r * .8} ${r} ${r}-${r * .7} ${r * .2}-${r * .8} ${r * .3}-${r} ${r}-${r * .2}-${r * .7}-${r * .3}-${r * .8}-${r}-${r} ${r * .7}-${r * .2} ${r * .8}-${r * .3} ${r}-${r}z" fill="${i === 2 ? p.accent : p.ink}"/>`).join('')],
            ['eclipse', 'Eclipse', 220, 220, p => `<circle cx="110" cy="110" r="90" fill="${p.accent}" opacity=".35"/><circle cx="110" cy="110" r="70" fill="${p.accent}"/><circle cx="130" cy="96" r="64" fill="${p.ink}"/>`],
            ['cometa', 'Cometa', 300, 140, p => `<path d="M20 120C100 90 180 60 240 50" stroke="${p.mid}" stroke-width="3" stroke-linecap="round"/><path d="M40 110c70-20 130-40 190-56" stroke="${p.soft}" stroke-width="10" stroke-linecap="round"/><circle cx="250" cy="48" r="22" fill="${p.accent}"/><path d="M250 18v-8M280 48h8M250 78v8" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>`],
            ['olho', 'Olho místico', 260, 160, p => `<path d="M10 80C60 10 200 10 250 80 200 150 60 150 10 80z" fill="${p.paper}" stroke="${p.ink}" stroke-width="4"/><circle cx="130" cy="80" r="40" fill="${p.accent}"/><circle cx="130" cy="80" r="16" fill="${p.ink}"/><path d="M130 10V-6M80 20l-10-14M180 20l10-14" stroke="${p.ink}" stroke-width="4" stroke-linecap="round" transform="translate(0 6)"/>`]
        ]
    },
    {
        id: 'tipografia', label: 'Tipografia',
        items: [
            ['carimbo-circular', 'Carimbo circular', 240, 240, (p, u) => `<defs><path id="${u}c" d="M120 120m-86 0a86 86 0 1 1 172 0a86 86 0 1 1-172 0"/></defs><circle cx="120" cy="120" r="112" fill="none" stroke="${p.ink}" stroke-width="3"/><text font-family="${SANS}" font-size="20" font-weight="700" letter-spacing="5" fill="${p.ink}"><textPath href="#${u}c">STAY CURIOUS • PIN SPACE • CREATE •</textPath></text><path d="M120 92c4 20 8 24 28 28-20 4-24 8-28 28-4-20-8-24-28-28 20-4 24-8 28-28z" fill="${p.accent}"/>`],
            ['vibes', 'vibes', 260, 120, p => `<text x="130" y="86" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="80" fill="${p.ink}">vibes</text><path d="M40 100c60 10 120 10 180 0" stroke="${p.accent}" stroke-width="8" stroke-linecap="round" fill="none"/>`],
            ['mood', 'MOOD', 260, 110, p => `<rect x="6" y="6" width="248" height="98" rx="49" fill="${p.ink}"/><text x="130" y="72" text-anchor="middle" font-family="${SANS}" font-size="46" font-weight="900" letter-spacing="8" fill="${p.paper}">MOOD</text>`],
            ['ano', '2026', 280, 120, p => `<text x="140" y="96" text-anchor="middle" font-family="${SANS}" font-size="100" font-weight="900" fill="none" stroke="${p.ink}" stroke-width="3">2026</text>`],
            ['dream', 'dream big', 280, 140, p => `<text x="20" y="60" font-family="${SERIF}" font-style="italic" font-size="56" fill="${p.ink}">dream</text><text x="120" y="122" font-family="${SANS}" font-size="58" font-weight="900" fill="${p.accent}" stroke="${p.ink}" stroke-width="2">BIG</text>`],
            ['create', 'CREATE', 280, 120, p => `<g transform="rotate(-6 140 60)"><rect x="14" y="20" width="252" height="80" fill="none" stroke="${p.accent}" stroke-width="6"/><text x="140" y="78" text-anchor="middle" font-family="${SANS}" font-size="50" font-weight="900" letter-spacing="10" fill="${p.accent}">CREATE</text></g>`],
            ['aspas', 'Aspas', 200, 160, p => `<text x="100" y="170" text-anchor="middle" font-family="${SERIF}" font-size="240" fill="${p.accent}">“</text>`],
            ['new', 'NEW', 160, 160, p => { let d = ''; for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, r = i % 2 ? 62 : 76; d += (i ? 'L' : 'M') + (80 + Math.cos(a) * r).toFixed(1) + ' ' + (80 + Math.sin(a) * r).toFixed(1); } return `<path d="${d}z" fill="${p.accent}" stroke="${p.ink}" stroke-width="3"/><text x="80" y="92" text-anchor="middle" font-family="${SANS}" font-size="34" font-weight="900" fill="${p.ink}" transform="rotate(-12 80 80)">NEW</text>`; }],
            ['sublinhado', 'Sublinhado à mão', 300, 60, p => `<path d="M10 36c60-14 140-18 280-10M30 48c80-8 150-8 240 0" fill="none" stroke="${p.accent}" stroke-width="7" stroke-linecap="round"/>`],
            ['xoxo', 'xoxo', 240, 110, p => `<text x="120" y="80" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="72" fill="${p.ink}">xoxo</text><path d="M196 24l8 8M204 24l-8 8" stroke="${p.accent}" stroke-width="4" stroke-linecap="round"/>`],
            ['pill-texto', 'Etiqueta pílula', 240, 80, p => `<rect x="4" y="4" width="232" height="72" rx="36" fill="${p.paper}" stroke="${p.ink}" stroke-width="3"/><circle cx="42" cy="40" r="10" fill="${p.accent}"/><text x="66" y="50" font-family="${SANS}" font-size="28" font-weight="600" fill="${p.ink}">inspiração</text>`],
            ['numero', 'Nº 01', 180, 180, p => `<circle cx="90" cy="90" r="84" fill="${p.ink}"/><text x="90" y="80" text-anchor="middle" font-family="${MONO}" font-size="20" fill="${p.paper}">Nº</text><text x="90" y="132" text-anchor="middle" font-family="${SERIF}" font-size="64" font-style="italic" fill="${p.accent}">01</text>`]
        ]
    },
    {
        id: 'interface', label: 'Interface',
        items: [
            ['chip-live', 'Chip "Live"', 220, 80, p => `<rect x="4" y="4" width="212" height="72" rx="36" fill="${p.paper}" stroke="${p.soft}" stroke-width="2"/><circle cx="44" cy="40" r="10" fill="${p.accent}"/><text x="68" y="50" font-family="${SANS}" font-size="28" font-weight="600" fill="${p.ink}">Live Mood</text>`],
            ['toggle', 'Interruptor', 200, 110, p => `<rect x="6" y="6" width="188" height="98" rx="49" fill="${p.accent}"/><circle cx="143" cy="55" r="38" fill="${p.paper}"/><circle cx="143" cy="55" r="38" fill="none" stroke="${p.ink}" stroke-opacity=".1"/>`],
            ['progresso', 'Barra de progresso', 300, 80, p => `<text x="10" y="26" font-family="${SANS}" font-size="18" fill="${p.mid}">Objetivo</text><text x="290" y="26" text-anchor="end" font-family="${SANS}" font-size="18" font-weight="700" fill="${p.ink}">78%</text><rect x="10" y="44" width="280" height="16" rx="8" fill="${p.soft}"/><rect x="10" y="44" width="218" height="16" rx="8" fill="${p.accent}"/>`],
            ['mira', 'Mira', 200, 200, p => `<circle cx="100" cy="100" r="70" fill="none" stroke="${p.ink}" stroke-width="3"/><circle cx="100" cy="100" r="6" fill="${p.accent}"/><path d="M100 10v50M100 140v50M10 100h50M140 100h50" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>`],
            ['visor', 'Cantos de visor', 260, 200, p => `<g fill="none" stroke="${p.ink}" stroke-width="5" stroke-linecap="round"><path d="M10 50V10h40M210 10h40v40M250 150v40h-40M50 190H10v-40"/></g><text x="130" y="108" text-anchor="middle" font-family="${MONO}" font-size="16" fill="${p.mid}">FOCUS</text>`],
            ['codigo-barras', 'Código de barras', 260, 120, p => { let s = '', x = 10; const w = [3, 1, 2, 1, 4, 1, 1, 3, 2, 1, 1, 4, 2, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 1, 1, 2, 4, 1, 3, 2]; w.forEach((b, i) => { if (i % 2 === 0) s += `<rect x="${x}" y="10" width="${b * 2.4}" height="80" fill="${p.ink}"/>`; x += b * 2.4 + 2; }); return s + `<text x="130" y="112" text-anchor="middle" font-family="${MONO}" font-size="14" letter-spacing="4" fill="${p.ink}">2026 0510 PINS</text>`; }],
            ['rec', 'REC', 240, 80, p => `<rect x="4" y="4" width="232" height="72" rx="14" fill="${p.ink}"/><circle cx="40" cy="40" r="12" fill="#ff3b30"/><text x="64" y="50" font-family="${MONO}" font-size="28" font-weight="700" fill="${p.paper}">REC 02:09</text>`],
            ['bussola', 'Bússola', 220, 220, p => { let s = `<circle cx="110" cy="110" r="96" fill="${p.paper}" stroke="${p.ink}" stroke-width="3"/>`; for (let i = 0; i < 36; i++) s += `<path d="M110 18v${i % 9 === 0 ? 14 : 6}" stroke="${p.ink}" stroke-width="2" transform="rotate(${i * 10} 110 110)"/>`; return s + `<path d="M110 50l14 60h-28z" fill="${p.accent}"/><path d="M110 170l14-60h-28z" fill="${p.ink}"/><circle cx="110" cy="110" r="6" fill="${p.paper}" stroke="${p.ink}" stroke-width="2"/><g font-family="${SANS}" font-size="16" font-weight="700" fill="${p.ink}" text-anchor="middle"><text x="110" y="48">N</text><text x="110" y="186">S</text><text x="182" y="116">E</text><text x="38" y="116">W</text></g>`; }],
            ['grafico', 'Gráfico', 300, 160, p => `<rect x="4" y="4" width="292" height="152" rx="18" fill="${p.paper}" stroke="${p.soft}" stroke-width="2"/><text x="22" y="36" font-family="${SANS}" font-size="16" fill="${p.mid}">Criatividade</text><text x="22" y="70" font-family="${SANS}" font-size="34" fill="${p.ink}">78.3%</text><path d="M20 130l20-10 20 6 20-20 20 8 20-24 20 14 20-30 20 12 20-20 20 6 20-26 20 10 20-18" fill="none" stroke="${p.ink}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="240" cy="88" r="6" fill="${p.accent}"/>`],
            ['play', 'Botão play', 160, 160, p => `<circle cx="80" cy="80" r="74" fill="${p.paper}" stroke="${p.soft}" stroke-width="3"/><path d="M66 50v60l46-30z" fill="${p.ink}"/>`],
            ['histograma', 'Histograma', 260, 140, p => { let s = ''; [20, 34, 50, 40, 62, 80, 96, 70, 86, 110, 92, 64, 48, 36, 22, 14].forEach((h, i) => s += `<rect x="${12 + i * 15}" y="${126 - h}" width="11" height="${h}" rx="3" fill="${i === 9 ? p.accent : p.ink}" fill-opacity="${i === 9 ? 1 : .75}"/>`); return s + `<path d="M8 128h244" stroke="${p.mid}" stroke-width="2"/>`; }],
            ['coordenadas', 'Coordenadas', 300, 80, p => `<path d="M14 40h20M24 30v20" stroke="${p.accent}" stroke-width="3"/><text x="48" y="50" font-family="${MONO}" font-size="24" letter-spacing="1" fill="${p.ink}">38°43'N 9°08'W</text>`],
            ['notificacao', 'Notificação', 320, 110, p => `<rect x="4" y="4" width="312" height="102" rx="24" fill="${p.paper}" stroke="${p.soft}" stroke-width="2"/><rect x="22" y="24" width="62" height="62" rx="16" fill="${p.accent}"/><path d="M53 40c-10 0-14 8-14 14 0 10 14 18 14 18s14-8 14-18c0-6-4-14-14-14z" fill="${p.ink}"/><text x="102" y="50" font-family="${SANS}" font-size="20" font-weight="700" fill="${p.ink}">pin space</text><text x="102" y="78" font-family="${SANS}" font-size="16" fill="${p.mid}">A tua ideia foi guardada ✦</text>`]
        ]
    },
    {
        id: 'y2k', label: 'Y2K Cromo',
        items: [
            ['estrela-cromo', 'Estrela cromada', 220, 220, (p, u) => `<defs>${_chrome(u, p)}</defs><path d="M110 6c10 70 34 94 104 104-70 10-94 34-104 104-10-70-34-94-104-104 70-10 94-34 104-104z" fill="url(#${u})" stroke="${p.mid}" stroke-width="2"/>`],
            ['coracao-cromo', 'Coração cromado', 240, 220, (p, u) => `<defs>${_chrome(u, p)}</defs><path d="M120 206C40 150 10 110 10 70a54 54 0 0 1 110-20 54 54 0 0 1 110 20c0 40-30 80-110 136z" fill="url(#${u})" stroke="${p.mid}" stroke-width="2"/><ellipse cx="70" cy="66" rx="22" ry="12" fill="#fff" opacity=".7" transform="rotate(-30 70 66)"/>`],
            ['borboleta', 'Borboleta', 260, 220, p => `<g fill="none" stroke="${p.ink}" stroke-width="4" stroke-linejoin="round"><path d="M130 110C100 40 30 20 20 60s40 60 110 50z"/><path d="M130 110c30-70 100-90 110-50s-40 60-110 50z"/><path d="M130 110c-30 10-80 30-70 70s50 10 70-70z"/><path d="M130 110c30 10 80 30 70 70s-50 10-70-70z"/></g><path d="M130 60v110" stroke="${p.ink}" stroke-width="6" stroke-linecap="round"/><circle cx="70" cy="70" r="10" fill="${p.accent}"/><circle cx="190" cy="70" r="10" fill="${p.accent}"/>`],
            ['orbita', 'Órbita', 240, 240, p => `<g fill="none" stroke="${p.ink}" stroke-width="3"><ellipse cx="120" cy="120" rx="108" ry="40"/><ellipse cx="120" cy="120" rx="108" ry="40" transform="rotate(60 120 120)"/><ellipse cx="120" cy="120" rx="108" ry="40" transform="rotate(120 120 120)"/></g><circle cx="120" cy="120" r="16" fill="${p.accent}"/>`],
            ['chama', 'Chama', 180, 240, (p, u) => `<defs><linearGradient id="${u}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.ink}"/></linearGradient></defs><path d="M90 230c-50 0-76-40-70-80 6-40 40-56 40-100 30 20 40 50 34 80 16-10 22-30 20-46 30 30 40 70 30 100-8 30-30 46-54 46z" fill="url(#${u})"/>`],
            ['smile', 'Smile', 200, 200, p => `<circle cx="100" cy="100" r="92" fill="${p.accent}" stroke="${p.ink}" stroke-width="4"/><ellipse cx="70" cy="80" rx="10" ry="18" fill="${p.ink}"/><ellipse cx="130" cy="80" rx="10" ry="18" fill="${p.ink}"/><path d="M50 116c20 44 80 44 100 0" fill="none" stroke="${p.ink}" stroke-width="7" stroke-linecap="round"/>`],
            ['flor-cromo', 'Flor cromada', 240, 240, (p, u) => { let s = ''; for (let i = 0; i < 8; i++) s += `<ellipse cx="120" cy="58" rx="28" ry="48" fill="url(#${u})" stroke="${p.mid}" stroke-width="1.5" transform="rotate(${i * 45} 120 120)"/>`; return `<defs>${_chrome(u, p)}</defs>${s}<circle cx="120" cy="120" r="30" fill="${p.accent}" stroke="${p.mid}" stroke-width="2"/>`; }],
            ['globo', 'Globo wireframe', 220, 220, p => `<g fill="none" stroke="${p.ink}" stroke-width="2.5"><circle cx="110" cy="110" r="96"/><ellipse cx="110" cy="110" rx="40" ry="96"/><ellipse cx="110" cy="110" rx="76" ry="96"/><path d="M14 110h192M24 64h172M24 156h172"/></g>`],
            ['raio', 'Raio', 160, 240, (p, u) => `<defs>${_chrome(u, p)}</defs><path d="M100 6L20 136h52l-16 98 84-140H86z" fill="url(#${u})" stroke="${p.ink}" stroke-width="3" stroke-linejoin="round"/>`],
            ['brilhos-cromo', 'Brilhos', 240, 200, (p, u) => `<defs>${_chrome(u, p)}</defs>` + [[80, 90, 70], [180, 50, 34], [186, 150, 26]].map(([x, y, r]) => `<path d="M${x} ${y - r}c${r * .15} ${r * .7} ${r * .3} ${r * .85} ${r} ${r}-${r * .7} ${r * .15}-${r * .85} ${r * .3}-${r} ${r}-${r * .15}-${r * .7}-${r * .3}-${r * .85}-${r}-${r} ${r * .7}-${r * .15} ${r * .85}-${r * .3} ${r}-${r}z" fill="url(#${u})" stroke="${p.mid}" stroke-width="1.5"/>`).join('')]
        ]
    }
];

function _elementSVG(item, p, uid) {
    const [, , w, h, draw] = item;
    const u = uid || _uid('e');
    let inner = draw(p, u);
    // ids genéricos ("c", "m") ficam únicos para várias pré-visualizações na mesma página
    inner = inner.replace(/id="(c|m)"/g, `id="${u}$1"`).replace(/url\(#(c|m)\)/g, `url(#${u}$1)`);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
}

function _findElement(id) {
    for (const pack of ELEMENT_PACKS) {
        const it = pack.items.find(i => i[0] === id);
        if (it) return it;
    }
    return null;
}

function _svgDataURL(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// Mantém o nome antigo para o resto do editor.
function createStickerElement(stickerId, elementos, boardW = 1080, boardH = 1080) {
    const item = _findElement(stickerId) || ELEMENT_PACKS[0].items[0];
    const p = elPalette();
    const svg = _elementSVG(item, p);
    const [, label, w, h] = item;
    // ~24% do lado menor do quadro, mantendo a proporção do desenho
    const target = Math.max(120, Math.min(boardW, boardH) * 0.24);
    const k = target / Math.max(w, h);
    return {
        tipo: 'imagem',
        id: generateId(),
        src: _svgDataURL(svg),
        x: 100,
        y: 100,
        width: Math.round(w * k),
        height: Math.round(h * k),
        rotation: 0,
        escala: 1,
        opacidade: 1,
        raio: 0,
        layer: getNextLayer(elementos),
        bloqueada: false,
        visivel: true,
        elemento: stickerId,
        nome: label
    };
}

/* ---------------------------------------------------------------------
   Painel "Elementos"
   --------------------------------------------------------------------- */
// Por agora: só 3 tipos com 3 elementos cada (a pasta de elementos
// definitiva vai substituir esta lista).
ELEMENT_PACKS.splice(3);
ELEMENT_PACKS.forEach(pk => pk.items.splice(3));

let _elActivePack = 'minimal';

function _paletteChips() {
    let saved = 'auto';
    try { saved = localStorage.getItem(EL_PALETTE_KEY) || 'auto'; } catch { /* ok */ }
    if (saved !== 'noite') saved = 'auto';
    const auto = document.documentElement.dataset.theme === 'dark' ? EL_PALETTES.noite : EL_PALETTES.studio;
    const chip = (id, label, p) => `
        <button type="button" class="el-palette ${saved === id ? 'active' : ''}" data-el-palette="${id}" title="${label}">
            <span class="el-palette-dots"><i style="background:${p.ink}"></i><i style="background:${p.accent}"></i><i style="background:${p.paper}"></i></span>
            <span>${label}</span>
        </button>`;
    // Só "Tema" (segue claro/escuro) e "Noite".
    return chip('auto', 'Tema', auto) + chip('noite', EL_PALETTES.noite.label, EL_PALETTES.noite);
}

function _elementsGrid(packId, query) {
    const p = elPalette();
    const q = String(query || '').toLowerCase().trim();
    const items = q
        ? ELEMENT_PACKS.flatMap(pk => pk.items).filter(i => i[1].toLowerCase().includes(q) || i[0].includes(q))
        : (ELEMENT_PACKS.find(pk => pk.id === packId) || ELEMENT_PACKS[0]).items;
    if (!items.length) return '<p class="panel-hint">Nenhum elemento com esse nome.</p>';
    return items.map(it => `
        <button type="button" class="el-option" data-sticker-id="${it[0]}" data-ps-drag="sticker:${it[0]}" title="${it[1]}" draggable="false">
            <span class="el-thumb">${_elementSVG(it, p)}</span>
            <span class="el-name">${it[1]}</span>
        </button>`).join('');
}

function getStickersPanelHTML() {
    const total = ELEMENT_PACKS.reduce((n, pk) => n + pk.items.length, 0);
    return `
        <div class="panel-section el-section">
            <div class="el-head">
                <h4>Elementos</h4>
                <span class="el-count">${total}</span>
            </div>
            <div class="el-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                <input type="search" id="el-search" placeholder="Procurar elementos…" autocomplete="off">
            </div>
            <div class="el-palettes" id="el-palettes">${_paletteChips()}</div>
            <div class="el-packs" id="el-packs">
                ${ELEMENT_PACKS.map(pk => `<button type="button" class="el-pack ${pk.id === _elActivePack ? 'active' : ''}" data-el-pack="${pk.id}">${pk.label}</button>`).join('')}
            </div>
            <div class="el-grid" id="el-grid">${_elementsGrid(_elActivePack)}</div>
            <p class="panel-hint">Clica ou arrasta para o quadro. Cada elemento fica numa camada própria — podes mudar a cor escolhendo outra paleta antes.</p>
        </div>`;
}

function bindStickersPanelEvents(panel, callbacks) {
    const grid = panel.querySelector('#el-grid');
    const search = panel.querySelector('#el-search');
    const redraw = () => { grid.innerHTML = _elementsGrid(_elActivePack, search.value); };

    panel.querySelector('#el-packs')?.addEventListener('click', (e) => {
        const b = e.target.closest('[data-el-pack]');
        if (!b) return;
        _elActivePack = b.dataset.elPack;
        panel.querySelectorAll('.el-pack').forEach(x => x.classList.toggle('active', x === b));
        search.value = '';
        redraw();
    });
    panel.querySelector('#el-palettes')?.addEventListener('click', (e) => {
        const b = e.target.closest('[data-el-palette]');
        if (!b) return;
        try { localStorage.setItem(EL_PALETTE_KEY, b.dataset.elPalette); } catch { /* ok */ }
        panel.querySelectorAll('.el-palette').forEach(x => x.classList.toggle('active', x === b));
        redraw();
    });
    search?.addEventListener('input', debounce(redraw, 120));
    grid?.addEventListener('click', (e) => {
        const b = e.target.closest('[data-sticker-id]');
        if (b) callbacks.onAddSticker?.(b.dataset.stickerId);
    });
}

/* ---------------------------------------------------------------------
   Molduras (ficam POR CIMA do conteúdo e deixam passar os cliques,
   por isso não tapam nem impedem de mexer nas fotos)
   --------------------------------------------------------------------- */
const MOLDURAS = [
    ['fina', 'Linha fina'],
    ['dupla', 'Dupla elegante'],
    ['polaroid', 'Polaroid'],
    ['filme', 'Película 35mm'],
    ['visor', 'Visor de câmara'],
    ['arco', 'Janela em arco'],
    ['cantos', 'Cantos de foto'],
    ['washi', 'Fitas nos cantos'],
    ['rasgado', 'Papel rasgado'],
    ['vinheta', 'Vinheta suave'],
    ['vidro', 'Vidro arredondado'],
    ['pontilhado', 'Pontilhado'],
    ['selo', 'Selo serrilhado'],
    ['editorial', 'Editorial']
];

function getMolduraSVG(id, W, H, p = elPalette()) {
    const s = Math.min(W, H) / 1000;           // escala das espessuras
    const m = Math.round(40 * s);              // margem
    const u = _uid('f');
    const sw = (n) => (n * s).toFixed(2);
    let body = '';
    switch (id) {
        case 'fina':
            body = `<rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" fill="none" stroke="${p.ink}" stroke-width="${sw(3)}"/>`;
            break;
        case 'dupla':
            body = `<rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" fill="none" stroke="${p.ink}" stroke-width="${sw(5)}"/>
                <rect x="${m * 1.6}" y="${m * 1.6}" width="${W - 3.2 * m}" height="${H - 3.2 * m}" fill="none" stroke="${p.ink}" stroke-width="${sw(1.5)}"/>`;
            break;
        case 'polaroid': {
            const b = 60 * s, bb = 220 * s;
            body = `<path fill-rule="evenodd" fill="${p.paper}" d="M0 0H${W}V${H}H0Z M${b} ${b}V${H - bb}H${W - b}V${b}Z"/>
                <rect x="${b}" y="${b}" width="${W - 2 * b}" height="${H - bb - b}" fill="none" stroke="${p.ink}" stroke-opacity=".08" stroke-width="${sw(2)}"/>
                <text x="${b}" y="${H - bb / 2 + 20 * s}" font-family="${SERIF}" font-style="italic" font-size="${70 * s}" fill="${p.ink}">pin space ✦</text>`;
            break;
        }
        case 'filme': {
            const band = 110 * s, hole = 40 * s, gap = 70 * s;
            let holes = '';
            for (let x = gap / 2; x < W; x += gap) holes += `<rect x="${x}" y="${(band - hole) / 2}" width="${hole * .7}" height="${hole}" rx="${6 * s}" fill="#fff" fill-opacity=".9"/><rect x="${x}" y="${H - band + (band - hole) / 2}" width="${hole * .7}" height="${hole}" rx="${6 * s}" fill="#fff" fill-opacity=".9"/>`;
            body = `<rect width="${W}" height="${band}" fill="#111"/><rect y="${H - band}" width="${W}" height="${band}" fill="#111"/>${holes}
                <text x="${W - 40 * s}" y="${band - 12 * s}" text-anchor="end" font-family="${MONO}" font-size="${22 * s}" fill="#e8b04a">KODAK 400 ▸ 24</text>`;
            break;
        }
        case 'visor': {
            const L = 120 * s, t = sw(6);
            body = `<g fill="none" stroke="${p.ink}" stroke-width="${t}" stroke-linecap="round">
                    <path d="M${m} ${m + L}V${m}H${m + L}"/><path d="M${W - m - L} ${m}H${W - m}V${m + L}"/>
                    <path d="M${W - m} ${H - m - L}V${H - m}H${W - m - L}"/><path d="M${m + L} ${H - m}H${m}V${H - m - L}"/>
                    <path d="M${W / 2 - 30 * s} ${H / 2}H${W / 2 + 30 * s}M${W / 2} ${H / 2 - 30 * s}V${H / 2 + 30 * s}" stroke-width="${sw(3)}"/>
                </g>
                <circle cx="${m + 60 * s}" cy="${m + 90 * s}" r="${12 * s}" fill="#ff3b30"/>
                <g font-family="${MONO}" font-size="${30 * s}" fill="${p.ink}">
                    <text x="${m + 84 * s}" y="${m + 101 * s}">REC 00:24</text>
                    <text x="${W - m - 40 * s}" y="${m + 101 * s}" text-anchor="end">4K · 24FPS</text>
                    <text x="${m + 40 * s}" y="${H - m - 40 * s}">ISO 400  f/2.8</text>
                    <text x="${W - m - 40 * s}" y="${H - m - 40 * s}" text-anchor="end">▮▮▮▯ 78%</text>
                </g>`;
            break;
        }
        case 'arco': {
            const ix = 110 * s, top = 110 * s, r = (W - 2 * ix) / 2;
            body = `<path fill-rule="evenodd" fill="${p.paper}" d="M0 0H${W}V${H}H0Z M${ix} ${H - top}V${top + r}A${r} ${r} 0 0 1 ${W - ix} ${top + r}V${H - top}Z"/>
                <path d="M${ix - 14 * s} ${H - top + 14 * s}V${top + r}A${r + 14 * s} ${r + 14 * s} 0 0 1 ${W - ix + 14 * s} ${top + r}V${H - top + 14 * s}" fill="none" stroke="${p.ink}" stroke-width="${sw(3)}"/>`;
            break;
        }
        case 'cantos': {
            const c = 150 * s;
            body = `<g fill="${p.ink}">
                <path d="M${m} ${m}h${c}L${m} ${m + c}z"/><path d="M${W - m} ${m}h-${c}L${W - m} ${m + c}z"/>
                <path d="M${W - m} ${H - m}h-${c}L${W - m} ${H - m - c}z"/><path d="M${m} ${H - m}h${c}L${m} ${H - m - c}z"/></g>`;
            break;
        }
        case 'washi': {
            const tw = 260 * s, th = 64 * s;
            const tape = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="${-tw / 2}" y="${-th / 2}" width="${tw}" height="${th}" fill="url(#${u}w)" opacity=".85"/></g>`;
            body = `<defs><pattern id="${u}w" width="${24 * s}" height="${24 * s}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${12 * s}" height="${24 * s}" fill="${p.accent}"/><rect x="${12 * s}" width="${12 * s}" height="${24 * s}" fill="${p.paper}"/></pattern></defs>
                ${tape(m + 60 * s, m + 40 * s, -38)}${tape(W - m - 60 * s, m + 40 * s, 38)}${tape(W - m - 60 * s, H - m - 40 * s, -38)}${tape(m + 60 * s, H - m - 40 * s, 38)}`;
            break;
        }
        case 'rasgado': {
            const d = 70 * s, step = 34 * s;
            const jag = (len, f) => { let pts = []; for (let i = 0; i <= len; i += step) pts.push(f(i, (i / step) % 2 ? d * .55 : d)); return pts; };
            const top = jag(W, (i, k) => `${i} ${k}`), right = jag(H, (i, k) => `${W - k} ${i}`), bottom = jag(W, (i, k) => `${W - i} ${H - k}`), left = jag(H, (i, k) => `${k} ${H - i}`);
            body = `<path fill-rule="evenodd" fill="${p.paper}" d="M0 0H${W}V${H}H0Z M${top.join('L')}L${right.join('L')}L${bottom.join('L')}L${left.join('L')}Z"/>`;
            break;
        }
        case 'vinheta':
            body = `<defs><radialGradient id="${u}v" cx="50%" cy="50%" r="72%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#${u}v)"/>`;
            break;
        case 'vidro': {
            const r = 60 * s;
            body = `<rect x="${m / 2}" y="${m / 2}" width="${W - m}" height="${H - m}" rx="${r}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="${sw(10)}"/>
                <rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" rx="${r * .7}" fill="none" stroke="${p.ink}" stroke-opacity=".18" stroke-width="${sw(2)}"/>`;
            break;
        }
        case 'pontilhado':
            body = `<rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" rx="${30 * s}" fill="none" stroke="${p.ink}" stroke-width="${sw(10)}" stroke-dasharray="0 ${sw(26)}" stroke-linecap="round"/>`;
            break;
        case 'selo': {
            const r = 22 * s, step = 2 * r + 8 * s;
            let holes = '';
            for (let x = r; x < W; x += step) holes += `<circle cx="${x}" cy="0" r="${r}"/><circle cx="${x}" cy="${H}" r="${r}"/>`;
            for (let y = r; y < H; y += step) holes += `<circle cx="0" cy="${y}" r="${r}"/><circle cx="${W}" cy="${y}" r="${r}"/>`;
            const b = 70 * s;
            body = `<defs><mask id="${u}m"><rect width="${W}" height="${H}" fill="#fff"/><rect x="${b}" y="${b}" width="${W - 2 * b}" height="${H - 2 * b}" fill="#000"/><g fill="#000">${holes}</g></mask></defs>
                <rect width="${W}" height="${H}" fill="${p.paper}" mask="url(#${u}m)"/>`;
            break;
        }
        case 'editorial':
            body = `<rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" fill="none" stroke="${p.ink}" stroke-width="${sw(2)}"/>
                <g font-family="${SANS}" font-size="${26 * s}" letter-spacing="${4 * s}" fill="${p.ink}">
                    <text x="${m + 30 * s}" y="${m + 60 * s}" font-weight="700">PIN SPACE — VOL. 01</text>
                    <text x="${W - m - 30 * s}" y="${m + 60 * s}" text-anchor="end">${new Date().getFullYear()}</text>
                    <text x="${m + 30 * s}" y="${H - m - 34 * s}">MOODBOARD</text>
                    <text x="${W - m - 30 * s}" y="${H - m - 34 * s}" text-anchor="end">Nº 001</text>
                </g>
                <text x="${W - m - 30 * s}" y="${m + 140 * s}" text-anchor="end" font-family="${SERIF}" font-style="italic" font-size="${64 * s}" fill="${p.ink}">stay curious</text>`;
            break;
        default:
            body = '';
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${body}</svg>`;
}

function createFrameElement(frameId, boardW, boardH, elementos) {
    const label = (MOLDURAS.find(m => m[0] === frameId) || [])[1] || frameId;
    return {
        tipo: 'imagem',
        id: generateId(),
        src: _svgDataURL(getMolduraSVG(frameId, boardW, boardH, elThemePalette())),
        x: 0,
        y: 0,
        width: boardW,
        height: boardH,
        rotation: 0,
        escala: 1,
        opacidade: 1,
        raio: 0,
        layer: getNextLayer(elementos),   // por cima de tudo…
        moldura: true,                    // …mas deixa passar os cliques
        bloqueada: false,
        visivel: true,
        nome: 'Moldura · ' + label
    };
}

function getMoldurasPanelHTML() {
    const p = elThemePalette();
    const W = 160, H = 200;
    const sample = `linear-gradient(135deg, ${p.soft}, ${p.mid})`;
    return `
        <div class="panel-section el-section">
            <p class="panel-hint fx-drag-hint">Clica ou arrasta para o quadro. A moldura fica por cima das fotos mas não as tapa nos cliques — para a mover ou apagar, escolhe-a nas Camadas.</p>
            <div class="fx-grid fx-grid-3 frame-grid" id="frame-grid">
                ${MOLDURAS.map(([id, label]) => `
                    <button type="button" class="fx-tile frame-option" data-moldura="${id}" data-ps-drag="frame:${id}" title="${label}" draggable="false">
                        <span class="frame-thumb" style="background:${sample}">${getMolduraSVG(id, W, H, p)}</span>
                        <span>${label}</span>
                    </button>`).join('')}
            </div>
        </div>`;
}

function bindMoldurasPanelEvents(panel, callbacks) {
    panel.querySelector('#frame-grid')?.addEventListener('click', (e) => {
        const b = e.target.closest('[data-moldura]');
        if (b && !b._psDragged) callbacks.onAddFrame?.(b.dataset.moldura);
    });
}
