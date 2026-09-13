/**
 * brush.js — Camada de desenho livre (pincel) + painel de configuração
 */

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
        this.settings = { cor: '#e60023', tamanho: 14, ponta: 'redondo', opacidade: 1, modo: 'pincel', tipo: 'caneta' };
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

    _strokeBegin(p) {
        const ctx = this.layer.getContext('2d');
        ctx.save();
        this._lineStyle(ctx);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
    }

    _strokeTo(p) {
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
        this._clearLayer();
    }

    _snapshotStroke() {
        const isSpray = this.settings.modo !== 'borracha' && (this.settings.tipo || 'caneta') === 'spray';
        const pad = Math.max(isSpray ? 8 : 2, this.settings.tamanho * (isSpray ? 0.9 : 0.6));
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

        if (isSpray) {
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

function getBrushPanelHTML(settings) {
    const active = settings || { cor: '#e60023', tamanho: 14, ponta: 'redondo', opacidade: 1, modo: 'pincel', tipo: 'caneta' };
    const tipo = active.tipo || 'caneta';
    return `
        <div class="panel-section">
            <h4>Pincel</h4>
            <p class="panel-hint">Desenhe ou apague diretamente no quadro com o rato ou touch.</p>
            <div class="form-group">
                <label>Modo</label>
                <div class="toggle-group">
                    <button class="toggle-btn ${active.modo !== 'borracha' ? 'active' : ''}" data-brush-modo="pincel">✏️ Pincel</button>
                    <button class="toggle-btn ${active.modo === 'borracha' ? 'active' : ''}" data-brush-modo="borracha">🧹 Borracha</button>
                </div>
            </div>
            <div class="form-group">
                <label>Tipo de pincel</label>
                <div class="toggle-group">
                    <button class="toggle-btn ${tipo === 'caneta' ? 'active' : ''}" data-brush-tipo="caneta">🖊️ Caneta</button>
                    <button class="toggle-btn ${tipo === 'marcador' ? 'active' : ''}" data-brush-tipo="marcador">🖍️ Marcador</button>
                    <button class="toggle-btn ${tipo === 'spray' ? 'active' : ''}" data-brush-tipo="spray">🎨 Spray</button>
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
    const isSpray = () => !isEraser() && (settings.tipo || 'caneta') === 'spray';

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
        if (pontaGroup) pontaGroup.style.display = isEraser() || isSpray() ? 'none' : '';
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