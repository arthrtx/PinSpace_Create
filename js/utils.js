/**
 * utils.js — Funções utilitárias reutilizáveis
 */

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function degToRad(deg) {
    return (deg * Math.PI) / 180;
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

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function getElementIcon(type) {
    const icons = {
        imagem: '🖼️',
        texto: '📝',
        forma: '⬜',
        quadrado: '⬜',
        retangulo: '▭',
        circulo: '⭕',
        triangulo: '🔺',
        losango: '🔶',
        pentagono: '⬠',
        hexagono: '⬡',
        estrela: '⭐',
        coracao: '❤️',
        linha: '➖',
        seta: '➡️'
    };
    return icons[type] || '📄';
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

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function getDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
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
