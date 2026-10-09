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
