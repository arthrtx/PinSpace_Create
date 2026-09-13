/**
 * shapes.js — Formas geométricas (estilo Canva/PicsArt)
 */

const SHAPE_TYPES = [
    'quadrado', 'retangulo', 'circulo', 'triangulo', 'losango',
    'pentagono', 'hexagono', 'estrela', 'coracao', 'seta', 'linha'
];

const SHAPE_LABELS = {
    quadrado: 'Quadrado', retangulo: 'Retângulo', circulo: 'Círculo',
    triangulo: 'Triângulo', losango: 'Losango', pentagono: 'Pentágono',
    hexagono: 'Hexágono', estrela: 'Estrela', coracao: 'Coração',
    seta: 'Seta', linha: 'Linha'
};

const SHAPE_DEFAULTS = {
    quadrado: { width: 120, height: 120 },
    retangulo: { width: 220, height: 130 },
    circulo: { width: 130, height: 130 },
    triangulo: { width: 200, height: 160 },
    losango: { width: 160, height: 160 },
    pentagono: { width: 170, height: 170 },
    hexagono: { width: 180, height: 165 },
    estrela: { width: 180, height: 180 },
    coracao: { width: 170, height: 160 },
    seta: { width: 220, height: 46 },
    linha: { width: 220, height: 6 }
};

function createShape(type, x = 300, y = 300, layer = 0) {
    const size = SHAPE_DEFAULTS[type] || SHAPE_DEFAULTS.retangulo;
    const isGuide = type === 'linha' || type === 'seta';
    return {
        tipo: 'forma',
        forma: type,
        id: generateId(),
        x,
        y,
        width: size.width,
        height: size.height,
        rotation: 0,
        opacidade: 1,
        layer,
        bloqueada: false,
        visivel: true,
        nome: SHAPE_LABELS[type] || type,
        cor: '#6366f1',
        corContorno: '#6366f1',
        espessura: isGuide ? 3 : 2,
        preenchimento: type !== 'linha'
    };
}

function addShape(type, elementos) {
    const layer = getNextLayer(elementos);
    return createShape(type, 300, 300, layer);
}

/* ===== Geometria das formas ===== */

function polygonPoints(cx, cy, radius, sides, rotation = -Math.PI / 2, innerRadius = null) {
    const pts = [];
    for (let i = 0; i < sides; i++) {
        const a = rotation + (i * 2 * Math.PI / sides);
        pts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
        if (innerRadius !== null) {
            const b = rotation + ((i + 0.5) * 2 * Math.PI / sides);
            pts.push([cx + Math.cos(b) * innerRadius, cy + Math.sin(b) * innerRadius]);
        }
    }
    return pts;
}

function pointsToPath(points) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ') + ' Z';
}

function shapeGeometry(forma, w, h) {
    const cx = w / 2, cy = h / 2;
    const inset = Math.max(2, Math.min(w, h) * 0.05);
    const R = Math.max(1, Math.min(w, h) / 2 - inset);

    switch (forma) {
        case 'triangulo':
            return { d: pointsToPath([[cx, inset], [inset, h - inset], [w - inset, h - inset]]) };
        case 'losango':
            return { d: pointsToPath([[cx, inset], [w - inset, cy], [cx, h - inset], [inset, cy]]) };
        case 'pentagono':
            return { d: pointsToPath(polygonPoints(cx, cy, R, 5, -Math.PI / 2)) };
        case 'hexagono':
            return { d: pointsToPath(polygonPoints(cx, cy, R, 6, -Math.PI / 2)) };
        case 'estrela':
            return { d: pointsToPath(polygonPoints(cx, cy, R, 5, -Math.PI / 2, R * 0.55)) };
        case 'coracao': {
            const d = `M ${cx.toFixed(2)} ${(h * 0.72).toFixed(2)} C ${(w * 0.04).toFixed(2)} ${(h * 0.46).toFixed(2)} ${(w * 0.16).toFixed(2)} ${(h * 0.1).toFixed(2)} ${cx.toFixed(2)} ${(h * 0.3).toFixed(2)} C ${(w * 0.84).toFixed(2)} ${(h * 0.1).toFixed(2)} ${(w * 0.96).toFixed(2)} ${(h * 0.46).toFixed(2)} ${cx.toFixed(2)} ${(h * 0.72).toFixed(2)} Z`;
            return { d };
        }
        default:
            return null;
    }
}

/* ===== Renderização no quadro ===== */

function renderShapeElement(dom, el) {
    let svg = dom.querySelector('.shape-svg');
    if (!svg) {
        dom.innerHTML = '';
        svg = createSVGElement('svg', {
            class: 'shape-svg',
            viewBox: `0 0 ${el.width} ${el.height}`,
            preserveAspectRatio: 'none'
        });
        dom.appendChild(svg);
    }

    svg.setAttribute('viewBox', `0 0 ${el.width} ${el.height}`);
    svg.innerHTML = '';

    const shape = el.forma;
    const fill = el.preenchimento !== false ? el.cor : 'none';
    const stroke = el.corContorno || el.cor;
    const sw = el.espessura || 0;

    let node;

    switch (shape) {
        case 'quadrado':
        case 'retangulo':
            node = createSVGElement('rect', {
                x: sw / 2, y: sw / 2,
                width: el.width - sw, height: el.height - sw,
                fill, stroke, 'stroke-width': sw, rx: shape === 'quadrado' ? 8 : 5
            });
            break;

        case 'circulo':
            node = createSVGElement('ellipse', {
                cx: el.width / 2, cy: el.height / 2,
                rx: Math.max(1, el.width / 2 - sw / 2), ry: Math.max(1, el.height / 2 - sw / 2),
                fill, stroke, 'stroke-width': sw
            });
            break;

        case 'linha':
            node = createSVGElement('line', {
                x1: 0, y1: el.height / 2,
                x2: el.width, y2: el.height / 2,
                stroke: stroke, 'stroke-width': sw, 'stroke-linecap': 'round'
            });
            break;

        case 'seta':
            const midY = el.height / 2;
            const headSize = Math.min(22, el.height);
            node = createSVGElement('g', {});
            const line = createSVGElement('line', {
                x1: 0, y1: midY, x2: el.width - headSize, y2: midY,
                stroke: stroke, 'stroke-width': sw, 'stroke-linecap': 'round'
            });
            const headFill = el.preenchimento !== false ? stroke : 'none';
            const head = createSVGElement('polygon', {
                points: `${el.width},${midY} ${el.width - headSize},${midY - headSize / 2} ${el.width - headSize},${midY + headSize / 2}`,
                fill: headFill
            });
            node.appendChild(line);
            node.appendChild(head);
            break;

        default: {
            const geo = shapeGeometry(shape, el.width, el.height);
            if (geo) {
                node = createSVGElement('path', {
                    d: geo.d,
                    fill, stroke, 'stroke-width': sw,
                    'stroke-linejoin': 'round'
                });
            }
        }
    }

    if (node) svg.appendChild(node);
}

/* ===== Pré-visualizações (painel) ===== */

function getShapePreviewSVG(forma) {
    const w = 44, h = 44;
    switch (forma) {
        case 'quadrado':
            return '<rect x="6" y="6" width="32" height="32" rx="4"/>';
        case 'retangulo':
            return '<rect x="2" y="14" width="40" height="16" rx="4"/>';
        case 'circulo':
            return '<circle cx="22" cy="22" r="18"/>';
        case 'linha':
            return '<line x1="2" y1="22" x2="42" y2="22" stroke-width="3.5" stroke-linecap="round"/>';
        case 'seta':
            return '<path d="M2 22 H34 M34 22 L25 14 M34 22 L25 30" stroke-width="3.5" stroke-linecap="round" fill="none"/>';
        default: {
            const geo = shapeGeometry(forma, w, h);
            return geo ? `<path d="${geo.d}"/>` : '';
        }
    }
}

function getShapesPanelHTML(el) {
    const shapesHTML = SHAPE_TYPES.map(s => `
        <button class="shape-option" data-shape="${s}" title="${SHAPE_LABELS[s]} (arrasta para o quadro)" draggable="true">
            <span class="shape-preview">
                <svg viewBox="0 0 44 44" width="38" height="38" fill="currentColor" stroke="currentColor" stroke-width="1">
                    ${getShapePreviewSVG(s)}
                </svg>
            </span>
            <span class="shape-name">${SHAPE_LABELS[s]}</span>
        </button>
    `).join('');

    let propsHTML = '';
    if (el) {
        propsHTML = `
            <div class="panel-section" style="margin-top:16px">
                <h4>Propriedades</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Preenchimento</label>
                        <input type="color" id="prop-cor" value="${el.cor || '#6366f1'}">
                    </div>
                    <div class="form-group">
                        <label>Contorno</label>
                        <input type="color" id="prop-corContorno" value="${el.corContorno || el.cor || '#6366f1'}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Espessura do contorno</label>
                    <input type="range" id="prop-espessura" min="0" max="20" step="1" value="${el.espessura || 0}">
                </div>
                <div class="form-group">
                    <label>Estilo</label>
                    <div class="toggle-group">
                        <button class="toggle-btn ${el.preenchimento !== false ? 'active' : ''}" id="prop-preenchimento">Sólido</button>
                        <button class="toggle-btn ${el.preenchimento === false ? 'active' : ''}" id="prop-contorno-only">Contorno</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Opacidade</label>
                    <input type="range" id="prop-opacidade" min="0" max="1" step="0.05" value="${el.opacidade ?? 1}">
                </div>
                <div class="form-group">
                    <label>Rotação</label>
                    <input type="number" id="prop-rotation" value="${el.rotation || 0}" min="-360" max="360">
                </div>
            </div>
        `;
    }

    return `
        <div class="panel-section">
            <h4>Adicionar forma</h4>
            <div class="shape-grid">${shapesHTML}</div>
        </div>
        ${propsHTML}
    `;
}

function bindShapesPanelEvents(panel, el, callbacks) {
    panel.querySelectorAll('[data-shape]').forEach(btn => {
        btn.addEventListener('click', () => {
            callbacks.onAddShape?.(btn.dataset.shape);
        });
        btn.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/x-pinshape', btn.dataset.shape);
            e.dataTransfer.effectAllowed = 'copy';
        });
    });

    if (!el) return;

    panel.querySelector('#prop-cor')?.addEventListener('input', (e) => {
        el.cor = e.target.value;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-corContorno')?.addEventListener('input', (e) => {
        el.corContorno = e.target.value;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-espessura')?.addEventListener('input', (e) => {
        el.espessura = parseInt(e.target.value, 10) || 0;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-preenchimento')?.addEventListener('click', (e) => {
        el.preenchimento = true;
        panel.querySelector('#prop-preenchimento').classList.add('active');
        panel.querySelector('#prop-contorno-only').classList.remove('active');
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-contorno-only')?.addEventListener('click', (e) => {
        el.preenchimento = false;
        panel.querySelector('#prop-contorno-only').classList.add('active');
        panel.querySelector('#prop-preenchimento').classList.remove('active');
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-opacidade')?.addEventListener('input', (e) => {
        el.opacidade = parseFloat(e.target.value);
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-rotation')?.addEventListener('change', (e) => {
        el.rotation = parseInt(e.target.value, 10) || 0;
        callbacks.onUpdate(el);
    });
}

function duplicateShape(el, layer) {
    return {
        ...JSON.parse(JSON.stringify(el)),
        id: generateId(),
        x: el.x + 20,
        y: el.y + 20,
        layer
    };
}