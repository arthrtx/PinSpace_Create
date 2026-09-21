/**
 * assets.js — Stickers SVG (por pacotes) e molduras decorativas
 */

const STICKER_PACKS = [
    {
        id: 'collage',
        label: 'Collage',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15l5-5 4 4 4-6 5 7"/></svg>`,
        stickers: [
            { id: 'tape', label: 'Fita adesiva' },
            { id: 'pin', label: 'Pin' },
            { id: 'scissors', label: 'Tesoura' },
            { id: 'photo-corner', label: 'Canto' },
            { id: 'washi', label: 'Washi' },
            { id: 'paper-clip', label: 'Clips' },
            { id: 'stamp', label: 'Carimbo' },
            { id: 'label', label: 'Etiqueta' },
            { id: 'torn-paper', label: 'Rasgado' },
            { id: 'sticker-star', label: 'Adesivo estrela' }
        ]
    },
    {
        id: 'visionboard',
        label: 'Vision Board',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>`,
        stickers: [
            { id: 'heart', label: 'Coração' },
            { id: 'star-burst', label: 'Estrela' },
            { id: 'sparkle', label: 'Brilho' },
            { id: 'crown', label: 'Coroa' },
            { id: 'diamond', label: 'Diamante' },
            { id: 'eye', label: 'Olho' },
            { id: 'arrow-up', label: 'Seta' },
            { id: 'cloud', label: 'Nuvem' },
            { id: 'rainbow', label: 'Arco-íris' },
            { id: 'moon', label: 'Lua' },
            { id: 'sun', label: 'Sol' },
            { id: 'lightning', label: 'Raio' }
        ]
    },
    {
        id: 'moodboard',
        label: 'Moodboard',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 010 20M12 2a15 15 0 000 20M2 12h20"/></svg>`,
        stickers: [
            { id: 'flower-1', label: 'Flor' },
            { id: 'flower-2', label: 'Tulipa' },
            { id: 'leaf', label: 'Folha' },
            { id: 'butterfly', label: 'Borboleta' },
            { id: 'wave', label: 'Onda' },
            { id: 'circle-deco', label: 'Círculo' },
            { id: 'cross-deco', label: 'Cruz' },
            { id: 'triangle-deco', label: 'Triângulo' },
            { id: 'dots', label: 'Pontos' },
            { id: 'ring', label: 'Anel' }
        ]
    }
];

const STICKER_COLORS = {
    terracotta: '#E60023',
    moss: '#6E7F47',
    mustard: '#D8A33B',
    sky: '#5D8296',
    pink: '#ec4899',
    indigo: '#6366f1',
    cream: '#F6F5F1',
    ink: '#0A0A0A'
};

function getStickerSVG(id) {
    const c = STICKER_COLORS;
    const svgs = {
        'tape': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" width="120" height="40">
            <rect x="5" y="8" width="110" height="24" rx="3" fill="${c.cream}" opacity="0.88" stroke="${c.ink}" stroke-width="1.2" stroke-dasharray="4 3"/>
            <line x1="20" y1="12" x2="20" y2="28" stroke="${c.terracotta}" stroke-width="0.8" opacity="0.4"/>
            <line x1="40" y1="12" x2="40" y2="28" stroke="${c.terracotta}" stroke-width="0.8" opacity="0.4"/>
            <line x1="60" y1="12" x2="60" y2="28" stroke="${c.terracotta}" stroke-width="0.8" opacity="0.4"/>
            <line x1="80" y1="12" x2="80" y2="28" stroke="${c.terracotta}" stroke-width="0.8" opacity="0.4"/>
            <line x1="100" y1="12" x2="100" y2="28" stroke="${c.terracotta}" stroke-width="0.8" opacity="0.4"/>
        </svg>`,
        'pin': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
            <circle cx="40" cy="30" r="18" fill="${c.terracotta}"/>
            <circle cx="40" cy="30" r="18" fill="none" stroke="${c.ink}" stroke-width="1.5"/>
            <circle cx="40" cy="26" r="5" fill="white" opacity="0.6"/>
            <line x1="40" y1="48" x2="40" y2="72" stroke="${c.ink}" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="40" cy="72" r="2" fill="${c.ink}"/>
        </svg>`,
        'scissors': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
            <circle cx="22" cy="56" r="10" fill="none" stroke="${c.ink}" stroke-width="2.5"/>
            <circle cx="58" cy="56" r="10" fill="none" stroke="${c.ink}" stroke-width="2.5"/>
            <line x1="22" y1="46" x2="58" y2="14" stroke="${c.ink}" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="58" y1="46" x2="22" y2="14" stroke="${c.ink}" stroke-width="2.5" stroke-linecap="round"/>
        </svg>`,
        'photo-corner': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
            <path d="M5 5 L5 55 L55 55 Z" fill="none" stroke="${c.ink}" stroke-width="2.5" stroke-linejoin="round"/>
            <path d="M5 5 L55 5 L55 55" fill="none" stroke="${c.mustard}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="6 4"/>
        </svg>`,
        'washi': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 36" width="120" height="36">
            <rect x="2" y="6" width="116" height="24" rx="2" fill="${c.pink}" opacity="0.75"/>
            <rect x="2" y="6" width="116" height="24" rx="2" fill="none" stroke="${c.ink}" stroke-width="1" opacity="0.3"/>
            <line x1="10" y1="10" x2="10" y2="26" stroke="white" stroke-width="0.8" opacity="0.5"/>
            <line x1="25" y1="10" x2="25" y2="26" stroke="white" stroke-width="0.8" opacity="0.5"/>
            <line x1="40" y1="10" x2="40" y2="26" stroke="white" stroke-width="0.8" opacity="0.5"/>
            <line x1="55" y1="10" x2="55" y2="26" stroke="white" stroke-width="0.8" opacity="0.5"/>
            <line x1="70" y1="10" x2="70" y2="26" stroke="white" stroke-width="0.8" opacity="0.5"/>
            <line x1="85" y1="10" x2="85" y2="26" stroke="white" stroke-width="0.8" opacity="0.5"/>
            <line x1="100" y1="10" x2="100" y2="26" stroke="white" stroke-width="0.8" opacity="0.5"/>
        </svg>`,
        'paper-clip': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 80" width="50" height="80">
            <path d="M15 10 L15 65 Q15 72 22 72 L28 72 Q35 72 35 65 L35 20 Q35 14 28 14 L22 14 Q18 14 18 20 L18 58" fill="none" stroke="${c.indigo}" stroke-width="3" stroke-linecap="round"/>
        </svg>`,
        'stamp': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
            <rect x="20" y="10" width="40" height="20" rx="3" fill="${c.ink}"/>
            <rect x="15" y="30" width="50" height="8" rx="2" fill="${c.ink}" opacity="0.8"/>
            <rect x="10" y="38" width="60" height="18" rx="3" fill="none" stroke="${c.terracotta}" stroke-width="2.5"/>
            <text x="40" y="50" text-anchor="middle" font-size="9" font-weight="700" fill="${c.terracotta}" font-family="sans-serif">APROVADO</text>
            <line x1="10" y1="56" x2="70" y2="56" stroke="${c.terracotta}" stroke-width="1"/>
        </svg>`,
        'label': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50">
            <path d="M10 10 L90 10 L90 40 L50 40 L40 50 L40 40 L10 40 Z" fill="${c.cream}" stroke="${c.ink}" stroke-width="1.5"/>
            <line x1="20" y1="18" x2="80" y2="18" stroke="${c.ink}" stroke-width="1" opacity="0.3"/>
            <line x1="20" y1="26" x2="60" y2="26" stroke="${c.ink}" stroke-width="1" opacity="0.3"/>
        </svg>`,
        'torn-paper': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" width="100" height="80">
            <path d="M5 5 L95 5 L95 50 L88 53 L80 48 L72 55 L64 50 L56 56 L48 49 L40 54 L32 48 L24 53 L16 47 L8 52 L5 50 Z" fill="${c.cream}" stroke="${c.ink}" stroke-width="1.2"/>
            <line x1="15" y1="16" x2="85" y2="16" stroke="${c.ink}" stroke-width="0.8" opacity="0.3"/>
            <line x1="15" y1="26" x2="75" y2="26" stroke="${c.ink}" stroke-width="0.8" opacity="0.3"/>
            <line x1="15" y1="36" x2="65" y2="36" stroke="${c.ink}" stroke-width="0.8" opacity="0.3"/>
        </svg>`,
        'sticker-star': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
            <polygon points="40,5 47,30 75,30 52,47 60,75 40,57 20,75 28,47 5,30 33,30" fill="${c.mustard}" stroke="${c.ink}" stroke-width="1.5"/>
            <polygon points="40,15 45,32 65,32 49,44 54,62 40,50 26,62 31,44 15,32 35,32" fill="white" opacity="0.3"/>
        </svg>`,
        'heart': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
            <path d="M40 70 C20 50 5 35 5 22 C5 12 15 5 25 5 C32 5 37 10 40 15 C43 10 48 5 55 5 C65 5 75 12 75 22 C75 35 60 50 40 70Z" fill="${c.terracotta}"/>
            <path d="M40 70 C20 50 5 35 5 22 C5 12 15 5 25 5 C32 5 37 10 40 15" fill="none" stroke="white" stroke-width="1.5" opacity="0.4"/>
        </svg>`,
        'star-burst': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
            <polygon points="40,2 47,28 75,28 52,44 59,72 40,56 21,72 28,44 5,28 33,28" fill="${c.mustard}"/>
            <circle cx="40" cy="40" r="12" fill="white" opacity="0.3"/>
        </svg>`,
        'sparkle': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
            <path d="M40 5 L44 35 L75 40 L44 45 L40 75 L36 45 L5 40 L36 35 Z" fill="${c.mustard}"/>
            <path d="M60 10 L62 22 L74 24 L62 26 L60 38 L58 26 L46 24 L58 22 Z" fill="${c.terracotta}" opacity="0.7"/>
            <path d="M18 55 L20 63 L28 65 L20 67 L18 75 L16 67 L8 65 L16 63 Z" fill="${c.sky}" opacity="0.7"/>
        </svg>`,
        'crown': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" width="80" height="60">
            <path d="M10 50 L10 25 L25 38 L40 15 L55 38 L70 25 L70 50 Z" fill="${c.mustard}" stroke="${c.ink}" stroke-width="1.5"/>
            <circle cx="10" cy="22" r="4" fill="${c.terracotta}"/>
            <circle cx="40" cy="12" r="4" fill="${c.terracotta}"/>
            <circle cx="70" cy="22" r="4" fill="${c.terracotta}"/>
            <rect x="10" y="44" width="60" height="6" rx="1" fill="${c.ink}"/>
        </svg>`,
        'diamond': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
            <polygon points="40,5 75,40 40,75 5,40" fill="${c.sky}" stroke="${c.ink}" stroke-width="1.5"/>
            <polygon points="40,5 55,40 40,75" fill="white" opacity="0.25"/>
            <line x1="5" y1="40" x2="75" y2="40" stroke="white" stroke-width="0.8" opacity="0.4"/>
            <line x1="40" y1="5" x2="20" y2="40" stroke="white" stroke-width="0.8" opacity="0.3"/>
            <line x1="40" y1="5" x2="60" y2="40" stroke="white" stroke-width="0.8" opacity="0.3"/>
        </svg>`,
        'eye': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 50" width="80" height="50">
            <ellipse cx="40" cy="25" rx="35" ry="20" fill="none" stroke="${c.ink}" stroke-width="2.5"/>
            <circle cx="40" cy="25" r="12" fill="${c.indigo}"/>
            <circle cx="40" cy="25" r="6" fill="${c.ink}"/>
            <circle cx="44" cy="21" r="2.5" fill="white" opacity="0.7"/>
            <path d="M5 25 Q20 8 40 8 Q60 8 75 25" fill="none" stroke="${c.ink}" stroke-width="1.5"/>
            <path d="M5 25 Q20 42 40 42 Q60 42 75 25" fill="none" stroke="${c.ink}" stroke-width="1.5"/>
        </svg>`,
        'arrow-up': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" width="60" height="80">
            <line x1="30" y1="70" x2="30" y2="15" stroke="${c.ink}" stroke-width="3" stroke-linecap="round"/>
            <polyline points="12,32 30,12 48,32" fill="none" stroke="${c.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        'cloud': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="90" height="60">
            <path d="M25 48 Q10 48 10 38 Q10 28 22 26 Q22 14 36 14 Q48 14 50 24 Q54 18 64 20 Q78 22 78 36 Q88 36 88 44 Q88 52 78 52 L25 52 Z" fill="${c.sky}" opacity="0.8"/>
            <path d="M25 48 Q10 48 10 38 Q10 28 22 26 Q22 14 36 14 Q48 14 50 24" fill="none" stroke="white" stroke-width="1.5" opacity="0.4"/>
        </svg>`,
        'rainbow': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 55" width="90" height="55">
            <path d="M5 50 Q5 10 45 10 Q85 10 85 50" fill="none" stroke="${c.terracotta}" stroke-width="4"/>
            <path d="M12 50 Q12 18 45 18 Q78 18 78 50" fill="none" stroke="${c.mustard}" stroke-width="3.5"/>
            <path d="M19 50 Q19 25 45 25 Q71 25 71 50" fill="none" stroke="${c.moss}" stroke-width="3"/>
            <path d="M26 50 Q26 32 45 32 Q64 32 64 50" fill="none" stroke="${c.sky}" stroke-width="2.5"/>
            <path d="M33 50 Q33 38 45 38 Q57 38 57 50" fill="none" stroke="${c.indigo}" stroke-width="2"/>
        </svg>`,
        'moon': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70" width="70" height="70">
            <path d="M45 10 A28 28 0 1 0 45 60 A20 20 0 1 1 45 10Z" fill="${c.mustard}"/>
            <circle cx="28" cy="30" r="3" fill="${c.mustard}" opacity="0.3"/>
            <circle cx="38" cy="45" r="2" fill="${c.mustard}" opacity="0.3"/>
            <circle cx="22" cy="42" r="1.5" fill="${c.mustard}" opacity="0.3"/>
        </svg>`,
        'sun': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
            <circle cx="40" cy="40" r="16" fill="${c.mustard}"/>
            <g stroke="${c.mustard}" stroke-width="2.5" stroke-linecap="round">
                <line x1="40" y1="6" x2="40" y2="16"/>
                <line x1="40" y1="64" x2="40" y2="74"/>
                <line x1="6" y1="40" x2="16" y2="40"/>
                <line x1="64" y1="40" x2="74" y2="40"/>
                <line x1="16" y1="16" x2="23" y2="23"/>
                <line x1="57" y1="57" x2="64" y2="64"/>
                <line x1="64" y1="16" x2="57" y2="23"/>
                <line x1="23" y1="57" x2="16" y2="64"/>
            </g>
        </svg>`,
        'lightning': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 80" width="50" height="80">
            <polygon points="30,2 10,38 22,38 16,78 42,32 28,32" fill="${c.mustard}" stroke="${c.ink}" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>`,
        'flower-1': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
            <circle cx="40" cy="20" r="12" fill="${c.terracotta}" opacity="0.85"/>
            <circle cx="56" cy="34" r="12" fill="${c.pink}" opacity="0.85"/>
            <circle cx="50" cy="54" r="12" fill="${c.terracotta}" opacity="0.85"/>
            <circle cx="30" cy="54" r="12" fill="${c.pink}" opacity="0.85"/>
            <circle cx="24" cy="34" r="12" fill="${c.terracotta}" opacity="0.85"/>
            <circle cx="40" cy="38" r="9" fill="${c.mustard}"/>
        </svg>`,
        'flower-2': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 90" width="70" height="90">
            <ellipse cx="35" cy="25" rx="14" ry="20" fill="${c.terracotta}" opacity="0.85"/>
            <ellipse cx="22" cy="35" rx="12" ry="18" fill="${c.pink}" opacity="0.7" transform="rotate(-25 22 35)"/>
            <ellipse cx="48" cy="35" rx="12" ry="18" fill="${c.pink}" opacity="0.7" transform="rotate(25 48 35)"/>
            <circle cx="35" cy="32" r="5" fill="${c.mustard}"/>
            <line x1="35" y1="45" x2="35" y2="85" stroke="${c.moss}" stroke-width="3" stroke-linecap="round"/>
            <ellipse cx="28" cy="65" rx="8" ry="4" fill="${c.moss}" opacity="0.7" transform="rotate(-30 28 65)"/>
        </svg>`,
        'leaf': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 90" width="70" height="90">
            <path d="M35 10 Q60 25 55 55 Q50 80 35 85 Q20 80 15 55 Q10 25 35 10Z" fill="${c.moss}" opacity="0.85"/>
            <path d="M35 15 Q35 50 35 80" fill="none" stroke="white" stroke-width="1.5" opacity="0.4"/>
            <path d="M35 30 Q25 35 18 45" fill="none" stroke="white" stroke-width="1" opacity="0.3"/>
            <path d="M35 45 Q45 50 52 55" fill="none" stroke="white" stroke-width="1" opacity="0.3"/>
        </svg>`,
        'butterfly': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 70" width="80" height="70">
            <ellipse cx="25" cy="25" rx="20" ry="18" fill="${c.indigo}" opacity="0.8" transform="rotate(-15 25 25)"/>
            <ellipse cx="55" cy="25" rx="20" ry="18" fill="${c.indigo}" opacity="0.8" transform="rotate(15 55 25)"/>
            <ellipse cx="22" cy="48" rx="14" ry="12" fill="${c.sky}" opacity="0.8" transform="rotate(-10 22 48)"/>
            <ellipse cx="58" cy="48" rx="14" ry="12" fill="${c.sky}" opacity="0.8" transform="rotate(10 58 48)"/>
            <ellipse cx="40" cy="35" rx="4" ry="18" fill="${c.ink}"/>
            <line x1="38" y1="18" x2="32" y2="8" stroke="${c.ink}" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="42" y1="18" x2="48" y2="8" stroke="${c.ink}" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="32" cy="7" r="2" fill="${c.ink}"/>
            <circle cx="48" cy="7" r="2" fill="${c.ink}"/>
        </svg>`,
        'wave': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" width="100" height="40">
            <path d="M5 20 Q15 5 25 20 Q35 35 45 20 Q55 5 65 20 Q75 35 85 20 Q95 5 95 20" fill="none" stroke="${c.sky}" stroke-width="3" stroke-linecap="round"/>
        </svg>`,
        'circle-deco': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70" width="70" height="70">
            <circle cx="35" cy="35" r="30" fill="none" stroke="${c.terracotta}" stroke-width="3"/>
            <circle cx="35" cy="35" r="20" fill="none" stroke="${c.pink}" stroke-width="2" stroke-dasharray="5 4"/>
            <circle cx="35" cy="35" r="8" fill="${c.mustard}" opacity="0.7"/>
        </svg>`,
        'cross-deco': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
            <rect x="22" y="5" width="16" height="50" rx="4" fill="${c.terracotta}" opacity="0.8"/>
            <rect x="5" y="22" width="50" height="16" rx="4" fill="${c.terracotta}" opacity="0.8"/>
        </svg>`,
        'triangle-deco': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 65" width="70" height="65">
            <polygon points="35,5 68,60 2,60" fill="${c.sky}" opacity="0.8" stroke="${c.ink}" stroke-width="1.5"/>
            <polygon points="35,20 55,55 15,55" fill="white" opacity="0.2"/>
        </svg>`,
        'dots': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70" width="70" height="70">
            <circle cx="15" cy="15" r="6" fill="${c.terracotta}" opacity="0.8"/>
            <circle cx="35" cy="15" r="6" fill="${c.mustard}" opacity="0.8"/>
            <circle cx="55" cy="15" r="6" fill="${c.sky}" opacity="0.8"/>
            <circle cx="15" cy="35" r="6" fill="${c.moss}" opacity="0.8"/>
            <circle cx="35" cy="35" r="6" fill="${c.pink}" opacity="0.8"/>
            <circle cx="55" cy="35" r="6" fill="${c.indigo}" opacity="0.8"/>
            <circle cx="15" cy="55" r="6" fill="${c.sky}" opacity="0.8"/>
            <circle cx="35" cy="55" r="6" fill="${c.terracotta}" opacity="0.8"/>
            <circle cx="55" cy="55" r="6" fill="${c.mustard}" opacity="0.8"/>
        </svg>`,
        'ring': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70" width="70" height="70">
            <circle cx="35" cy="35" r="28" fill="none" stroke="${c.mustard}" stroke-width="4"/>
            <circle cx="35" cy="35" r="20" fill="none" stroke="${c.terracotta}" stroke-width="2"/>
            <circle cx="35" cy="7" r="5" fill="${c.sky}"/>
        </svg>`
    };
    return svgs[id] || svgs['heart'];
}

function getStickerPreviewSVG(id) {
    return getStickerSVG(id);
}

function _svgDataURL(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function createStickerElement(stickerId, elementos) {
    const svg = getStickerSVG(stickerId);
    const src = _svgDataURL(svg);
    const allStickers = STICKER_PACKS.flatMap(p => p.stickers);
    const sticker = allStickers.find(s => s.id === stickerId);
    const label = sticker ? sticker.label : stickerId;

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
        nome: 'Sticker ' + label
    };
}

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
            if (rect === 'rounded-rect') { /* noop */ }
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

function getStickersPanelHTML(activePack) {
    const packId = activePack || STICKER_PACKS[0].id;
    return `
        <div class="panel-section">
            <h4>Stickers</h4>
            <p class="panel-hint">Toque num sticker para o adicionar ao quadro.</p>
            <div class="sticker-packs-tabs">
                ${STICKER_PACKS.map(p => `
                    <button class="sticker-pack-tab ${p.id === packId ? 'active' : ''}" data-sticker-pack="${p.id}">
                        <span class="sticker-pack-icon">${p.icon}</span>
                        <span class="sticker-pack-label">${p.label}</span>
                    </button>
                `).join('')}
            </div>
            <div class="sticker-grid" id="sticker-grid">
                ${_renderStickerPack(packId)}
            </div>
        </div>
    `;
}

function _renderStickerPack(packId) {
    const pack = STICKER_PACKS.find(p => p.id === packId);
    if (!pack) return '';
    return pack.stickers.map(s => `
        <button class="sticker-option" data-sticker-id="${s.id}" title="${s.label}">
            <span class="sticker-svg">${getStickerPreviewSVG(s.id)}</span>
            <span class="sticker-label">${s.label}</span>
        </button>
    `).join('');
}

function bindStickersPanelEvents(panel, callbacks) {
    panel.querySelectorAll('.sticker-pack-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            panel.querySelectorAll('.sticker-pack-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const grid = panel.querySelector('#sticker-grid');
            if (grid) grid.innerHTML = _renderStickerPack(tab.dataset.stickerPack);
            bindStickerGridEvents(panel, callbacks);
        });
    });
    bindStickerGridEvents(panel, callbacks);
}

function bindStickerGridEvents(panel, callbacks) {
    panel.querySelectorAll('.sticker-option').forEach(btn => {
        btn.addEventListener('click', () => {
            callbacks.onAddSticker?.(btn.dataset.stickerId);
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
