class BrushManager {
    constructor(board, canvasEl) {
        this.board = board;
        this.layer = document.createElement('canvas');
        this.layer.id = 'draw-layer';
        this.layer.className = 'draw-layer';
        this.layer.width = 1;
        this.layer.height = 1;
        canvasEl.appendChild(this.layer);
        this.active = false;
        this.drawing = false;
        this.points = [];
        this._sprayDots = [];
        this.settings = { cor: '#e8572a', tamanho: 28, ponta: 'redondo', opacidade: 1, modo: 'pincel', tipo: 'acrilica' };
        this.onStroke = null;

        this._bind();
    }

    _bind() {
        this.layer.addEventListener('pointerdown', (e) => {
            if (!this.active) return;
            e.preventDefault();
            e.stopPropagation();
            this.layer.setPointerCapture(e.pointerId);
            const p = this._toBoard(e.clientX, e.clientY);
            this.drawing = true;
            this.points = [p];
            this._strokeBegin(p);
        });

        this.layer.addEventListener('pointermove', (e) => {
            if (!this.drawing) return;
            const p = this._toBoard(e.clientX, e.clientY);
            this.points.push(p);
            this._strokeTo(p);
        });

        this.layer.addEventListener('pointerup', (e) => {
            if (!this.drawing) return;
            this.drawing = false;
            this._strokeEnd();
        });

        this.layer.addEventListener('pointercancel', () => {
            if (!this.drawing) return;
            this.drawing = false;
            this._strokeEnd();
        });
    }

    setActive(active) {
        this.active = !!active;
        this.layer.classList.toggle('active', this.active);
    }

    setSettings(settings) {
        this.settings = settings || this.settings;
    }

    syncSize() {
        const w = this.board.boardWidth || 3000;
        const h = this.board.boardHeight || 3000;
        this.layer.style.width = w + 'px';
        this.layer.style.height = h + 'px';
        const limit = 2600;
        const scale = Math.min(1, limit / Math.max(w, h));
        this.layer.width = Math.max(1, Math.round(w * scale));
        this.layer.height = Math.max(1, Math.round(h * scale));
        const ctx = this.layer.getContext('2d');
        ctx.setTransform(this.layer.width / w, 0, 0, this.layer.height / h, 0, 0);
        ctx.clearRect(0, 0, w, h);
        this._pxScale = this.layer.width / w;
    }

    _toBoard(clientX, clientY) {
        const rect = this.board.canvas.getBoundingClientRect();
        const zoom = this.board.getZoom();
        return {
            x: (clientX - rect.left) / zoom,
            y: (clientY - rect.top) / zoom
        };
    }

    _lineStyle(ctx) {
        const opac = this.settings.opacidade ?? 1;
        ctx.lineWidth = Math.max(1, this.settings.tamanho);
        if (this.settings.modo === 'borracha') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.globalAlpha = 1;
        } else {
            const tipo = this.settings.tipo || 'caneta';
            ctx.strokeStyle = this.settings.cor;
            ctx.fillStyle = this.settings.cor;
            if (tipo === 'marcador') {
                ctx.globalAlpha = opac * 0.55;
                ctx.lineCap = 'butt';
                ctx.lineJoin = 'miter';
            } else if (tipo === 'spray') {
                ctx.globalAlpha = opac * 0.9;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            } else {
                ctx.globalAlpha = opac;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
        }
        if (this.settings.ponta === 'quadrado') {
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'miter';
        }
    }

    _isAcrylic() {
        return this.settings.modo !== 'borracha' && (this.settings.tipo || 'caneta') === 'acrilica';
    }

    _strokeBegin(p) {
        const ctx = this.layer.getContext('2d');
        ctx.save();
        if (this._isAcrylic()) {
            this._acr = createAcrylicStroke(this.settings, p);
            this.layer.style.opacity = String(this._acr.alpha);
            return;
        }
        this._lineStyle(ctx);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
    }

    _strokeTo(p) {
        if (this._acr) {
            const ops = acrylicStep(this._acr, p);
            drawAcrylicOps(this.layer.getContext('2d'), this._acr, ops);
            return;
        }
        const tipo = this.settings.tipo || 'caneta';
        if (this.settings.modo !== 'borracha' && tipo === 'spray') {
            this._sprayTo(p);
            return;
        }
        const ctx = this.layer.getContext('2d');
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
    }

    _sprayTo(p) {
        const ctx = this.layer.getContext('2d');
        const radius = Math.max(2, this.settings.tamanho / 2);
        const density = Math.max(12, Math.round(radius * 3));
        for (let i = 0; i < density; i++) {
            const ang = Math.random() * Math.PI * 2;
            const r = radius * Math.sqrt(Math.random());
            const x = p.x + Math.cos(ang) * r;
            const y = p.y + Math.sin(ang) * r;
            const size = 1 + Math.random() * Math.min(3, Math.max(1, radius * 0.3));
            this._sprayDots.push({ x, y, size });
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _strokeEnd() {
        const ctx = this.layer.getContext('2d');
        ctx.restore();
        if (this.onStroke) {
            if (this.settings.modo === 'borracha') {
                this.onStroke({
                    mode: 'borracha',
                    points: this.points.map(p => ({ x: p.x, y: p.y })),
                    size: this.settings.tamanho
                });
            } else {
                const result = this._snapshotStroke();
                if (result) {
                    result.mode = 'pincel';
                    this.onStroke(result);
                }
            }
        }
        this.points = [];
        this._sprayDots = [];
        this._acr = null;
        this.layer.style.opacity = '';
        this._clearLayer();
    }

    _snapshotStroke() {
        const isSpray = this.settings.modo !== 'borracha' && (this.settings.tipo || 'caneta') === 'spray';
        const acr = this._acr;
        const pad = acr ? this.settings.tamanho * 0.9 + 4 : Math.max(isSpray ? 8 : 2, this.settings.tamanho * (isSpray ? 0.9 : 0.6));
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        if (isSpray) {
            for (const d of this._sprayDots) {
                minX = Math.min(minX, d.x); minY = Math.min(minY, d.y);
                maxX = Math.max(maxX, d.x); maxY = Math.max(maxY, d.y);
            }
        } else {
            for (const p of this.points) {
                minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
            }
        }
        if (minX === Infinity) return null;
        minX = Math.floor(minX - pad);
        minY = Math.floor(minY - pad);
        maxX = Math.ceil(maxX + pad);
        maxY = Math.ceil(maxY + pad);
        const w = Math.max(1, maxX - minX);
        const h = Math.max(1, maxY - minY);
        if (w < 2 && h < 2) return null;

        const size = Math.max(w, h);
        const renderScale = size > 4000 ? 4000 / size : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * renderScale);
        canvas.height = Math.round(h * renderScale);
        const ctx = canvas.getContext('2d');
        ctx.setTransform(renderScale, 0, 0, renderScale, -minX * renderScale, -minY * renderScale);

        this._lineStyle(ctx);

        if (acr) {
            if (!acr.ops.length) acrylicStep(acr, { x: this.points[0].x + acr.size * 0.1, y: this.points[0].y + 0.5 });
            if (acr.alpha < 1) {
                // pinta opaco num canvas à parte e aplica a opacidade ao traço todo
                const tmp = document.createElement('canvas');
                tmp.width = canvas.width; tmp.height = canvas.height;
                const t = tmp.getContext('2d');
                t.setTransform(renderScale, 0, 0, renderScale, -minX * renderScale, -minY * renderScale);
                drawAcrylicOps(t, acr, acr.ops);
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.globalAlpha = acr.alpha;
                ctx.drawImage(tmp, 0, 0);
                ctx.restore();
            } else {
                drawAcrylicOps(ctx, acr, acr.ops);
            }
        } else if (isSpray) {
            for (const d of this._sprayDots) {
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }
            ctx.stroke();
        }

        this._clearLayer();
        return {
            src: canvas.toDataURL('image/png'),
            x: minX,
            y: minY,
            width: w,
            height: h
        };
    }

    _clearLayer() {
        const ctx = this.layer.getContext('2d');
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.layer.width, this.layer.height);
        ctx.restore();
    }
}

/* ---------- Tinta acrílica ----------
   Cada pincelada tem "cerdas" fixas (posição, cor ligeiramente diferente,
   espessura), que deixam riscos contínuos. A tinta vai acabando ao longo do
   traço (falhas de pincel seco no fim) e um realce/sombra dá relevo.
   As operações ficam guardadas para a pré-visualização e o resultado final
   serem exatamente iguais. */
function _hexToRgb(hex) {
    const h = String(hex || '#000').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function _shade(rgb, t) {
    const f = t < 0 ? 0 : 255;
    const k = Math.abs(t);
    return `rgb(${rgb.map(c => Math.round(c + (f - c) * k)).join(',')})`;
}

function createAcrylicStroke(settings, p) {
    const size = Math.max(4, settings.tamanho);
    const rgb = _hexToRgb(settings.cor);
    const n = Math.max(8, Math.min(42, Math.round(size / 1.6)));
    const bristles = [];
    for (let i = 0; i < n; i++) {
        const o0 = ((i + 0.5) / n - 0.5) * size;
        const edge = Math.abs(o0) / (size / 2);
        bristles.push({
            o0, o: o0 + (Math.random() - 0.5) * (size / n),
            edge,
            w: Math.max(1.1, (size / n) * (1.6 + Math.random() * 1.6)),
            t: (Math.random() - 0.5) * 0.24,          // tom (claro/escuro) que varia ao longo do risco
            dry: 0.3 + Math.random() * 0.7 + edge * 0.8,
            on: true,
            px: null, py: null
        });
    }
    return {
        size, rgb, bristles, ops: [], dist: 0, last: { x: p.x, y: p.y }, nx: 0, ny: -1,
        load: 1, alpha: settings.opacidade ?? 1,
        reach: size * (50 + Math.random() * 30)   // distância até a tinta começar a acabar
    };
}

function acrylicStep(st, p) {
    const dx = p.x - st.last.x, dy = p.y - st.last.y;
    const len = Math.hypot(dx, dy);
    if (len < Math.max(0.8, st.size * 0.05)) return [];
    let nx = -dy / len, ny = dx / len;
    if (nx * st.nx + ny * st.ny < 0 && st.dist > 0) { nx = -nx; ny = -ny; }
    st.nx = st.dist ? st.nx * 0.6 + nx * 0.4 : nx;
    st.ny = st.dist ? st.ny * 0.6 + ny * 0.4 : ny;
    const nl = Math.hypot(st.nx, st.ny) || 1;
    st.nx /= nl; st.ny /= nl;
    st.dist += len;
    st.load = Math.max(0.08, 1 - Math.max(0, st.dist - st.reach * 0.45) / st.reach);
    const dryness = 1 - st.load;
    // início da pincelada mais estreito (o pincel a assentar no papel)
    const taper = Math.min(1, 0.5 + st.dist / (st.size * 2.2) * 0.5);
    const ops = [];
    st.bristles.forEach((b, i) => {
        // cerdas desviam-se um pouco → bordas irregulares e riscos vivos
        b.o += (Math.random() - 0.5) * st.size * (0.012 + b.edge * 0.03);
        b.o += (b.o0 - b.o) * 0.08;
        b.t = Math.max(-0.22, Math.min(0.22, b.t + (Math.random() - 0.5) * 0.05));
        const o = b.o * taper;
        const x = p.x + st.nx * o, y = p.y + st.ny * o;
        // falhas: nas bordas sempre um pouco (efeito "arrastado"); no fim, pincel seco
        const pOff = (b.edge > 0.8 ? 0.025 * b.edge : 0) + dryness * b.dry * 0.18;
        if (b.on) { if (Math.random() < pOff) b.on = false; }
        else if (Math.random() < (b.edge > 0.8 ? 0.12 : 0.22) + st.load * 0.35) b.on = true;
        if (b.px !== null && b.on) {
            ops.push({ i, x1: b.px, y1: b.py, x2: x, y2: y, w: b.w * (0.75 + taper * 0.25), col: _shade(st.rgb, b.t - b.edge * 0.07 + dryness * 0.06) });
        }
        b.px = x; b.py = y;
    });
    st.last = { x: p.x, y: p.y };
    st.ops.push(...ops);
    return ops;
}

function drawAcrylicOps(ctx, st, ops) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const op of ops) {
        ctx.strokeStyle = op.col;
        ctx.lineWidth = op.w;
        ctx.beginPath();
        ctx.moveTo(op.x1, op.y1);
        ctx.lineTo(op.x2, op.y2);
        ctx.stroke();
    }
    ctx.restore();
}

function getBrushPanelHTML(settings) {
    const active = settings || { cor: '#e8572a', tamanho: 28, ponta: 'redondo', opacidade: 1, modo: 'pincel', tipo: 'acrilica' };
    const tipo = active.tipo || 'acrilica';
    return `
        <div class="panel-section">
            <h4>Pincel</h4>
            <p class="panel-hint">Desenhe ou apague diretamente no quadro com o rato ou touch.</p>
            <div class="form-group">
                <label>Modo</label>
                <div class="toggle-group">
                    <button class="toggle-btn ${active.modo !== 'borracha' ? 'active' : ''}" data-brush-modo="pincel">${uiIcon('pen')} Pincel</button>
                    <button class="toggle-btn ${active.modo === 'borracha' ? 'active' : ''}" data-brush-modo="borracha">${uiIcon('eraser')} Borracha</button>
                </div>
            </div>
            <div class="form-group">
                <label>Tipo de pincel</label>
                <div class="toggle-group tg-grid">
                    <button class="toggle-btn ${tipo === 'acrilica' ? 'active' : ''}" data-brush-tipo="acrilica" title="Tinta acrílica">${uiIcon('brush')} Acrílica</button>
                    <button class="toggle-btn ${tipo === 'caneta' ? 'active' : ''}" data-brush-tipo="caneta">${uiIcon('pen')} Caneta</button>
                    <button class="toggle-btn ${tipo === 'marcador' ? 'active' : ''}" data-brush-tipo="marcador">${uiIcon('marker')} Marcador</button>
                    <button class="toggle-btn ${tipo === 'spray' ? 'active' : ''}" data-brush-tipo="spray">${uiIcon('spray')} Spray</button>
                </div>
            </div>
            <div id="brush-color-group">
                <div class="form-group">
                    <label>Cor</label>
                    <input type="color" id="brush-cor" value="${active.cor}">
                </div>
            </div>
            <div class="form-group">
                <label>Espessura — <span id="brush-tamanho-label">${active.tamanho} px</span></label>
                <input type="range" id="brush-tamanho" min="1" max="80" step="1" value="${active.tamanho}">
            </div>
            <div id="brush-ponta-group">
                <div class="form-group">
                    <label>Ponta</label>
                    <div class="toggle-group">
                        <button class="toggle-btn ${active.ponta === 'redondo' ? 'active' : ''}" data-brush-ponta="redondo">Redonda</button>
                        <button class="toggle-btn ${active.ponta === 'quadrado' ? 'active' : ''}" data-brush-ponta="quadrado">Quadrada</button>
                    </div>
                </div>
            </div>
            <div id="brush-opacity-group">
                <div class="form-group">
                    <label>Opacidade</label>
                    <input type="range" id="brush-opacidade" min="0.1" max="1" step="0.05" value="${active.opacidade ?? 1}">
                </div>
            </div>
            <div class="brush-preview-area">
                <span class="brush-preview" id="brush-preview" style="background:${active.cor}"></span>
            </div>
        </div>
    `;
}

function bindBrushPanelEvents(panel, settings) {
    const isEraser = () => settings.modo === 'borracha';
    const isSpray = () => !isEraser() && (settings.tipo || 'acrilica') === 'spray';

    const updatePreview = () => {
        const dot = panel.querySelector('#brush-preview');
        if (dot) {
            dot.style.borderRadius = isSpray() || (settings.ponta === 'quadrado' && !isEraser()) ? '2px' : '50%';
            dot.style.width = Math.max(6, settings.tamanho) + 'px';
            dot.style.height = Math.max(6, settings.tamanho) + 'px';
            if (isEraser()) {
                dot.style.background = 'repeating-linear-gradient(135deg, #fda4af 0 4px, #ffffff 4px 8px)';
                dot.style.opacity = '1';
            } else {
                dot.style.background = settings.cor;
                dot.style.opacity = (settings.tipo === 'marcador' ? (settings.opacidade ?? 1) * 0.55 : (settings.opacidade ?? 1));
                if (isSpray()) dot.style.opacity = Math.max(0.5, dot.style.opacity);
            }
        }
        const colorGroup = panel.querySelector('#brush-color-group');
        const opacityGroup = panel.querySelector('#brush-opacity-group');
        const pontaGroup = panel.querySelector('#brush-ponta-group');
        if (colorGroup) colorGroup.style.display = isEraser() ? 'none' : '';
        if (opacityGroup) opacityGroup.style.display = isEraser() ? 'none' : '';
        if (pontaGroup) pontaGroup.style.display = isEraser() || isSpray() || settings.tipo === 'acrilica' ? 'none' : '';
    };

    panel.querySelectorAll('[data-brush-modo]').forEach(btn => {
        btn.addEventListener('click', () => {
            settings.modo = btn.dataset.brushModo;
            panel.querySelectorAll('[data-brush-modo]').forEach(b => b.classList.toggle('active', b === btn));
            updatePreview();
        });
    });

    panel.querySelectorAll('[data-brush-tipo]').forEach(btn => {
        btn.addEventListener('click', () => {
            settings.tipo = btn.dataset.brushTipo;
            panel.querySelectorAll('[data-brush-tipo]').forEach(b => b.classList.toggle('active', b === btn));
            updatePreview();
        });
    });

    panel.querySelector('#brush-cor')?.addEventListener('input', (e) => {
        settings.cor = e.target.value;
        updatePreview();
    });

    panel.querySelector('#brush-tamanho')?.addEventListener('input', (e) => {
        settings.tamanho = parseInt(e.target.value, 10) || 14;
        const label = panel.querySelector('#brush-tamanho-label');
        if (label) label.textContent = settings.tamanho + ' px';
        updatePreview();
    });

    panel.querySelectorAll('[data-brush-ponta]').forEach(btn => {
        btn.addEventListener('click', () => {
            settings.ponta = btn.dataset.brushPonta;
            panel.querySelectorAll('[data-brush-ponta]').forEach(b => b.classList.toggle('active', b === btn));
            updatePreview();
        });
    });

    panel.querySelector('#brush-opacidade')?.addEventListener('input', (e) => {
        settings.opacidade = parseFloat(e.target.value) || 1;
        updatePreview();
    });

    updatePreview();
}

async function exportProject(project, format = 'png') {
    const canvas = await renderToCanvas(project);
    const filename = sanitizeFilename(project.titulo);

    switch (format) {
        case 'png':
            canvas.toBlob(blob => downloadBlob(blob, `${filename}.png`), 'image/png');
            break;
        case 'jpeg':
            canvas.toBlob(blob => downloadBlob(blob, `${filename}.jpg`), 'image/jpeg', 0.92);
            break;
        case 'pdf':
            await exportPDF(canvas, filename);
            break;
    }
}

async function renderToCanvas(project) {
    const w = project.boardWidth || 3000;
    const h = project.boardHeight || 3000;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    await drawBackground(ctx, project.background, w, h);

    const sorted = sortByLayer(project.elementos || []);
    for (const el of sorted) {
        if (el.visivel === false) continue;
        await drawElement(ctx, el);
    }

    return canvas;
}

/* ---------------------------------------------------------------------
   Padrões de fundo (linhas, quadriculado, pautado…). Fazem PARTE do
   fundo: aparecem no ecrã, na exportação, na miniatura e na publicação.
   A "grelha guia" do painel Fundo continua a ser só uma ajuda visual.
   --------------------------------------------------------------------- */
const BG_PATTERNS = [
    ['nenhum', 'Nenhum'],
    ['linhas', 'Linhas'],
    ['quadriculado', 'Quadriculado'],
    ['pautado', 'Pautado'],
    ['pontos', 'Pontos'],
    ['diagonal', 'Diagonal'],
    ['xadrez', 'Xadrez']
];

function _hexToRgba(hex, a) {
    const h = String(hex || '#000000').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6), 16) || 0;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function _patternParams(pd) {
    const esp = Math.max(8, Number(pd.espaco) || 48);
    const lw = Math.max(1, Math.round(esp / 36));
    const col = _hexToRgba(pd.cor || '#000000', pd.opacidade ?? 0.22);
    return { esp, lw, col };
}

// Camadas CSS do padrão (por cima da cor/gradiente/imagem do fundo).
function bgPatternCSS(pd) {
    if (!pd || !pd.tipo || pd.tipo === 'nenhum') return '';
    const { esp, lw, col } = _patternParams(pd);
    const hLines = `repeating-linear-gradient(180deg, ${col} 0 ${lw}px, transparent ${lw}px ${esp}px)`;
    const vLines = `repeating-linear-gradient(90deg, ${col} 0 ${lw}px, transparent ${lw}px ${esp}px)`;
    switch (pd.tipo) {
        case 'linhas': return hLines;
        case 'quadriculado': return `${hLines}, ${vLines}`;
        case 'pautado': {
            const mx = Math.round(esp * 2.2);
            const red = _hexToRgba('#e0525a', Math.min(1, (pd.opacidade ?? 0.22) * 2.4));
            return `linear-gradient(90deg, transparent ${mx}px, ${red} ${mx}px ${mx + lw + 1}px, transparent ${mx + lw + 1}px), ${hLines}`;
        }
        case 'pontos': {
            const r = Math.max(1.5, esp / 18);
            return `radial-gradient(circle at ${esp / 2}px ${esp / 2}px, ${col} ${r}px, transparent ${r + 0.8}px) 0 0 / ${esp}px ${esp}px`;
        }
        case 'diagonal': return `repeating-linear-gradient(45deg, ${col} 0 ${lw}px, transparent ${lw}px ${esp}px)`;
        case 'xadrez': return `conic-gradient(${col} 25%, transparent 0 50%, ${col} 0 75%, transparent 0) 0 0 / ${esp * 2}px ${esp * 2}px`;
        default: return '';
    }
}

// O mesmo padrão desenhado no canvas (exportar PNG/JPG/PDF, miniaturas).
function drawBgPattern(ctx, pd, w, h) {
    if (!pd || !pd.tipo || pd.tipo === 'nenhum') return;
    const { esp, lw, col } = _patternParams(pd);
    ctx.save();
    ctx.fillStyle = col;
    const hLines = () => { for (let y = 0; y < h; y += esp) ctx.fillRect(0, y, w, lw); };
    const vLines = () => { for (let x = 0; x < w; x += esp) ctx.fillRect(x, 0, lw, h); };
    switch (pd.tipo) {
        case 'linhas': hLines(); break;
        case 'quadriculado': hLines(); vLines(); break;
        case 'pautado': {
            hLines();
            ctx.fillStyle = _hexToRgba('#e0525a', Math.min(1, (pd.opacidade ?? 0.22) * 2.4));
            ctx.fillRect(Math.round(esp * 2.2), 0, lw + 1, h);
            break;
        }
        case 'pontos': {
            const r = Math.max(1.5, esp / 18);
            for (let y = esp / 2; y < h; y += esp) for (let x = esp / 2; x < w; x += esp) {
                ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            }
            break;
        }
        case 'diagonal': {
            // Igual ao CSS repeating-linear-gradient(45deg): linhas a 45° espaçadas "esp".
            ctx.strokeStyle = col; ctx.lineWidth = lw;
            ctx.beginPath();
            for (let k = -h; k < w + h; k += esp * Math.SQRT2) { ctx.moveTo(k, h); ctx.lineTo(k + h, 0); }
            ctx.stroke();
            break;
        }
        case 'xadrez':
            for (let y = 0, r = 0; y < h; y += esp, r++) for (let x = 0, c = 0; x < w; x += esp, c++) if ((r + c) % 2 === 0) ctx.fillRect(x, y, esp, esp);
            break;
    }
    ctx.restore();
}

async function drawBackground(ctx, bg, w, h) {
    if (!bg) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        return;
    }

    switch (bg.tipo) {
        case 'cor':
            ctx.fillStyle = bg.valor || '#ffffff';
            ctx.fillRect(0, 0, w, h);
            break;
        case 'gradiente':
            if (bg.valor) {
                const angle = (bg.valor.angulo || 135) * Math.PI / 180;
                const x1 = w / 2 - Math.cos(angle) * w;
                const y1 = h / 2 - Math.sin(angle) * h;
                const x2 = w / 2 + Math.cos(angle) * w;
                const y2 = h / 2 + Math.sin(angle) * h;
                const grad = ctx.createLinearGradient(x1, y1, x2, y2);
                grad.addColorStop(0, bg.valor.cor1 || '#fff');
                grad.addColorStop(1, bg.valor.cor2 || '#ccc');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            }
            break;
        case 'imagem':
            if (bg.valor) {
                try {
                    const img = await loadImage(bg.valor);
                    ctx.drawImage(img, 0, 0, w, h);
                } catch {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, w, h);
                }
            }
            break;
        default:
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
    }
    drawBgPattern(ctx, bg.padrao, w, h);
}

async function drawElement(ctx, el) {
    ctx.save();
    ctx.globalAlpha = el.opacidade ?? 1;
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((el.rotation || 0) * Math.PI / 180);

    switch (el.tipo) {
        case 'imagem':
            if (el.src) {
                try {
                    ctx.filter = getImageCSSFilter(el);
                    const sx = el.flipX ? -1 : 1;
                    const sy = el.flipY ? -1 : 1;
                    const raio = Math.min(el.raio ?? 8, el.width / 2, el.height / 2);
                    ctx.save();
                    ctx.scale(sx, sy);
                    if (raio > 0) {
                        roundRectPath(ctx, -el.width / 2, -el.height / 2, el.width, el.height, raio);
                        ctx.clip();
                    }
                    const img = await loadImage(el.src);
                    ctx.drawImage(img, -el.width / 2, -el.height / 2, el.width, el.height);
                    ctx.restore();
                    ctx.filter = 'none';
                } catch { /* skip broken images */ }
            }
            break;

        case 'texto':
            ctx.fillStyle = el.cor || '#000';
            const fontStyle = `${el.italico ? 'italic ' : ''}${el.negrito ? 'bold ' : ''}${el.tamanho || 24}px ${el.fonte || 'Arial'}`;
            ctx.font = fontStyle;
            ctx.textAlign = el.alinhamento || 'left';
            ctx.textBaseline = 'top';

            const lines = (el.conteudo || '').split('\n');
            const lineHeight = (el.tamanho || 24) * 1.3;
            const startY = -el.height / 2 + 4;
            let textX = -el.width / 2;
            if (el.alinhamento === 'center') textX = 0;
            if (el.alinhamento === 'right') textX = el.width / 2;

            lines.forEach((line, i) => {
                const y = startY + i * lineHeight;
                ctx.fillText(line, textX, y);
                if (el.sublinhado || el.riscado) {
                    const metrics = ctx.measureText(line);
                    let lineY = y + (el.tamanho || 24) * 1.02;
                    if (el.riscado) lineY = y + (el.tamanho || 24) * 0.52;
                    let lineX = textX;
                    if (el.alinhamento === 'center') lineX -= metrics.width / 2;
                    if (el.alinhamento === 'right') lineX -= metrics.width;
                    ctx.beginPath();
                    ctx.moveTo(lineX, lineY);
                    ctx.lineTo(lineX + metrics.width, lineY);
                    ctx.strokeStyle = el.cor;
                    ctx.lineWidth = Math.max(1, (el.tamanho || 24) * 0.08);
                    ctx.stroke();

                    if (el.sublinhado && el.riscado) {
                        const ulY = y + (el.tamanho || 24) * 1.02;
                        ctx.beginPath();
                        ctx.moveTo(lineX, ulY);
                        ctx.lineTo(lineX + metrics.width, ulY);
                        ctx.stroke();
                    }
                }
            });
            break;

        case 'forma':
            drawShape(ctx, el);
            break;
    }

    ctx.restore();
}

function drawShape(ctx, el) {
    const fill = el.preenchimento !== false ? el.cor : 'transparent';
    const stroke = el.corContorno || el.cor;
    const sw = (el.espessura || 0) > 0 ? el.espessura : 0;
    const hw = el.width / 2;
    const hh = el.height / 2;

    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = sw;
    ctx.lineJoin = 'round';

    switch (el.forma) {
        case 'quadrado':
        case 'retangulo':
            ctx.fillRect(-hw, -hh, el.width, el.height);
            if (sw > 0) ctx.strokeRect(-hw, -hh, el.width, el.height);
            break;
        case 'circulo':
            ctx.beginPath();
            ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
            ctx.fill();
            if (sw > 0) ctx.stroke();
            break;
        case 'linha':
            ctx.beginPath();
            ctx.moveTo(-hw, 0);
            ctx.lineTo(hw, 0);
            ctx.lineCap = 'round';
            if (sw > 0) { ctx.lineWidth = sw; ctx.stroke(); }
            break;
        case 'seta': {
            const headSize = Math.min(24, el.height);
            ctx.beginPath();
            ctx.moveTo(-hw, 0);
            ctx.lineTo(hw - headSize, 0);
            ctx.lineCap = 'round';
            if (sw > 0) { ctx.lineWidth = Math.max(sw, 1); ctx.stroke(); }
            ctx.strokeStyle = stroke;
            ctx.beginPath();
            ctx.moveTo(hw, 0);
            ctx.lineTo(hw - headSize, -headSize / 2);
            ctx.lineTo(hw - headSize, headSize / 2);
            ctx.closePath();
            ctx.fillStyle = stroke;
            ctx.fill();
            break;
        }
        default: {
            const geo = shapeGeometry(el.forma, el.width, el.height);
            if (!geo) break;
            let path;
            try {
                path = new Path2D(geo.d);
            } catch {
                break;
            }
            if (el.preenchimento !== false) ctx.fill(path);
            if (sw > 0) ctx.stroke(path);
        }
    }
}

async function exportPDF(canvas, filename) {
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const imgBytes = dataURLToBytes(imgData);
    const w = canvas.width;
    const h = canvas.height;

    const pdf = buildMinimalPDF(imgBytes, w, h);
    const blob = new Blob([pdf], { type: 'application/pdf' });
    downloadBlob(blob, `${filename}.pdf`);
}

function dataURLToBytes(dataURL) {
    const base64 = dataURL.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function buildMinimalPDF(jpegBytes, width, height) {
    const pageW = 595.28;
    const pageH = 841.89;
    const scale = Math.min(pageW / width, pageH / height) * 0.95;
    const imgW = width * scale;
    const imgH = height * scale;
    const offsetX = (pageW - imgW) / 2;
    const offsetY = (pageH - imgH) / 2;

    const parts = [];
    let offset = 0;
    const objOffsets = [];

    function addObj(content) {
        objOffsets.push(offset);
        const bytes = new TextEncoder().encode(content);
        parts.push(bytes);
        offset += bytes.length;
    }

    const header = `%PDF-1.4\n`;
    parts.push(new TextEncoder().encode(header));
    offset += header.length;

    addObj(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
    addObj(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);
    addObj(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`);
    addObj(`4 0 obj\n<< /Length 44 >>\nstream\nq ${imgW.toFixed(2)} 0 0 ${imgH.toFixed(2)} ${offsetX.toFixed(2)} ${offsetY.toFixed(2)} cm /Im1 Do Q\nendstream\nendobj\n`);
    addObj(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);

    parts.push(jpegBytes);
    offset += jpegBytes.length;

    const streamEnd = `\nendstream\nendobj\n`;
    parts.push(new TextEncoder().encode(streamEnd));
    offset += streamEnd.length;

    const xrefOffset = offset;
    let xref = `xref\n0 6\n0000000000 65535 f \n`;
    objOffsets.forEach(off => {
        xref += `${String(off).padStart(10, '0')} 00000 n \n`;
    });

    const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    parts.push(new TextEncoder().encode(xref + trailer));

    const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
    const result = new Uint8Array(totalLength);
    let pos = 0;
    parts.forEach(p => { result.set(p, pos); pos += p.length; });
    return result;
}

function sanitizeFilename(name) {
    return (name || 'quadro').replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, '').trim() || 'quadro';
}

function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

async function generateThumbnailDataURL(project) {
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 400;
    thumbCanvas.height = 280;
    const fullCanvas = await renderToCanvas(project);
    const ctx = thumbCanvas.getContext('2d');
    const scale = Math.max(400 / fullCanvas.width, 280 / fullCanvas.height);
    const w = fullCanvas.width * scale;
    const h = fullCanvas.height * scale;
    ctx.drawImage(fullCanvas, (400 - w) / 2, (280 - h) / 2, w, h);
    return thumbCanvas.toDataURL('image/jpeg', 0.6);
}
