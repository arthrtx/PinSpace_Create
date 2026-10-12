const MAX_HISTORY = 50;

class HistoryManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this._listeners = [];
    }

    // Guarda o estado *depois* de cada alteração. "current" é o estado mais
    // recente; desfazer volta ao anterior (antes devolvia o próprio estado
    // atual, por isso o primeiro Ctrl+Z não fazia nada).
    push(state) {
        if (this.current) {
            this.undoStack.push(this.current);
            if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
        }
        this.current = deepClone(state);
        this.redoStack = [];
        this._notify();
    }

    undo(currentState) {
        if (this.undoStack.length === 0) return null;
        this.redoStack.push(currentState ? deepClone(currentState) : this.current);
        this.current = this.undoStack.pop();
        this._notify();
        return deepClone(this.current);
    }

    redo(currentState) {
        if (this.redoStack.length === 0) return null;
        this.undoStack.push(currentState ? deepClone(currentState) : this.current);
        this.current = this.redoStack.pop();
        this._notify();
        return deepClone(this.current);
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.current = null;
        this._notify();
    }

    onChange(fn) {
        this._listeners.push(fn);
    }

    _notify() {
        this._listeners.forEach(fn => fn({
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        }));
    }
}

function captureState(project) {
    return {
        elementos: deepClone(project.elementos),
        background: deepClone(project.background),
        titulo: project.titulo,
        numPaginas: project.numPaginas || 1
    };
}

function applyState(project, state) {
    project.elementos = deepClone(state.elementos);
    project.background = deepClone(state.background);
    if (state.titulo !== undefined) project.titulo = state.titulo;
    if (state.numPaginas !== undefined) project.numPaginas = state.numPaginas;
}

function sortByLayer(elementos) {
    return [...elementos].sort((a, b) => a.layer - b.layer);
}

function getNextLayer(elementos) {
    if (elementos.length === 0) return 0;
    return Math.max(...elementos.map(e => e.layer)) + 1;
}

function bringToFront(elementos, id) {
    const maxLayer = Math.max(...elementos.map(e => e.layer));
    const el = elementos.find(e => e.id === id);
    if (el) el.layer = maxLayer + 1;
    normalizeLayers(elementos);
}

function sendToBack(elementos, id) {
    const minLayer = Math.min(...elementos.map(e => e.layer));
    const el = elementos.find(e => e.id === id);
    if (el) el.layer = minLayer - 1;
    normalizeLayers(elementos);
}

function moveLayerUp(elementos, id) {
    const sorted = sortByLayer(elementos);
    const idx = sorted.findIndex(e => e.id === id);
    if (idx < sorted.length - 1) {
        const temp = sorted[idx].layer;
        sorted[idx].layer = sorted[idx + 1].layer;
        sorted[idx + 1].layer = temp;
    }
}

function moveLayerDown(elementos, id) {
    const sorted = sortByLayer(elementos);
    const idx = sorted.findIndex(e => e.id === id);
    if (idx > 0) {
        const temp = sorted[idx].layer;
        sorted[idx].layer = sorted[idx - 1].layer;
        sorted[idx - 1].layer = temp;
    }
}

function normalizeLayers(elementos) {
    const sorted = sortByLayer(elementos);
    sorted.forEach((el, i) => { el.layer = i; });
}

function moveLayerToPosition(elementos, dragId, targetId, position) {
    const sorted = sortByLayer(elementos);
    const from = sorted.findIndex(e => e.id === dragId);
    const to = sorted.findIndex(e => e.id === targetId);
    if (from < 0 || to < 0 || from === to) return false;

    const item = sorted.splice(from, 1)[0];
    let newIdx = sorted.findIndex(e => e.id === targetId);
    if (position === 'after') newIdx += 1;
    if (position === 'before' && newIdx > 0) newIdx -= 1;
    if (newIdx > sorted.length) newIdx = sorted.length;
    sorted.splice(newIdx, 0, item);

    sorted.forEach((el, i) => { el.layer = i; });
    return true;
}

function renderLayersList(container, elementos, selectedId, callbacks) {
    container.innerHTML = '';
    const sorted = sortByLayer(elementos).reverse();

    if (sorted.length === 0) {
        container.innerHTML = '<p class="empty-state" style="padding:16px;font-size:13px;">Nenhum elemento no quadro.</p>';
        return;
    }

    sorted.forEach(el => {
        const item = document.createElement('div');
        item.className = 'layer-item' + (el.id === selectedId ? ' selected' : '');
        item.dataset.id = el.id;
        item.draggable = true;
        item.title = 'Arraste para reordenar a camada';

        item.innerHTML = `
            <span class="layer-drag-handle">${uiIcon('drag', 14)}</span>
            <span class="layer-icon">${getElementIcon(el.forma || el.tipo)}</span>
            <input class="layer-name" value="${getElementLabel(el)}" ${el.bloqueada ? 'disabled' : ''}>
            <div class="layer-actions">
                <button class="layer-action-btn ${el.visivel === false ? '' : 'active'}" data-action="visibility" title="Visibilidade">${el.visivel === false ? uiIcon('eyeOff', 14) : uiIcon('eye', 14)}</button>
                <button class="layer-action-btn ${el.bloqueada ? 'active' : ''}" data-action="lock" title="Bloquear">${el.bloqueada ? uiIcon('lock', 14) : uiIcon('unlock', 14)}</button>
                <button class="layer-action-btn" data-action="delete" title="Eliminar">${uiIcon('trash', 14)}</button>
            </div>
        `;

        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', el.id);
            e.dataTransfer.effectAllowed = 'move';
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            container.querySelectorAll('.layer-item').forEach(i => i.classList.remove('drop-before', 'drop-after'));
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const rect = item.getBoundingClientRect();
            const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
            container.querySelectorAll('.layer-item').forEach(i => i.classList.remove('drop-before', 'drop-after'));
            item.classList.add(pos === 'before' ? 'drop-before' : 'drop-after');
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drop-before', 'drop-after');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            item.classList.remove('drop-before', 'drop-after');
            const dragId = e.dataTransfer.getData('text/plain');
            if (!dragId) return;
            const rect = item.getBoundingClientRect();
            const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
            if (moveLayerToPosition(elementos, dragId, el.id, position)) {
                callbacks.onReorder?.();
            }
        });

        item.querySelector('.layer-name').addEventListener('change', (e) => {
            el.nome = e.target.value;
            callbacks.onRename?.(el);
        });

        item.addEventListener('click', (e) => {
            if (e.target.closest('.layer-actions') || e.target.classList.contains('layer-name')) return;
            callbacks.onSelect?.(el.id);
        });

        item.querySelector('[data-action="visibility"]').addEventListener('click', (e) => {
            e.stopPropagation();
            el.visivel = el.visivel === false ? true : false;
            callbacks.onToggleVisibility?.(el);
        });

        item.querySelector('[data-action="lock"]').addEventListener('click', (e) => {
            e.stopPropagation();
            el.bloqueada = !el.bloqueada;
            callbacks.onToggleLock?.(el);
        });

        item.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
            e.stopPropagation();
            callbacks.onDelete?.(el.id);
        });

        container.appendChild(item);
    });
}

const FILTROS = {
    none: { label: 'Original', css: 'none' },
    grayscale: { label: 'Preto & Branco', css: 'grayscale(1)' },
    sepia: { label: 'Sépia', css: 'sepia(0.75)' },
    contrast: { label: 'Contraste', css: 'contrast(1.3)' },
    bright: { label: 'Brilho', css: 'brightness(1.2)' },
    dark: { label: 'Sombra', css: 'brightness(0.8)' },
    vintage: { label: 'Retro', css: 'sepia(0.35) contrast(1.1) brightness(1.05) saturate(1.15)' },
    cool: { label: 'Frio', css: 'saturate(0.6) hue-rotate(18deg) brightness(1.05)' },
    warm: { label: 'Quente', css: 'saturate(1.35) hue-rotate(-12deg) brightness(1.03)' },
    fade: { label: 'Claro', css: 'brightness(1.15) saturate(0.85) contrast(0.9)' },
    blur: { label: 'Suave', css: 'blur(1.5px)' },
    invert: { label: 'Negativo', css: 'invert(1)' },
    pop: { label: 'Colorido', css: 'saturate(1.8) contrast(1.1)' }
};

function getImageCSSFilter(el) {
    const parts = [];
    if (el.filtro && el.filtro !== 'none' && FILTROS[el.filtro]) {
        parts.push(FILTROS[el.filtro].css);
    }
    if ((el.brilho ?? 1) !== 1) parts.push('brightness(' + el.brilho + ')');
    if ((el.contraste ?? 1) !== 1) parts.push('contrast(' + el.contraste + ')');
    if ((el.saturacao ?? 1) !== 1) parts.push('saturate(' + el.saturacao + ')');
    return parts.length ? parts.join(' ') : 'none';
}

function createImageElement(src, x = 100, y = 100, layer = 0) {
    return {
        tipo: 'imagem',
        id: generateId(),
        src,
        x,
        y,
        width: 200,
        height: 180,
        rotation: 0,
        escala: 1,
        opacidade: 1,
        filtro: 'none',
        brilho: 1,
        contraste: 1,
        saturacao: 1,
        flipX: false,
        flipY: false,
        raio: 8,
        layer,
        bloqueada: false,
        visivel: true,
        nome: 'Imagem'
    };
}

async function importImageFromFile(file, elementos, x = 100, y = 100) {
    const src = await compactarFicheiroImagem(file);
    if (!src) return null;
    const layer = getNextLayer(elementos);
    const el = createImageElement(src, x, y, layer);

    const base = (file.name || 'Imagem').replace(/\.[a-z0-9]+$/i, '').trim() || 'Imagem';
    el.nome = base.length > 40 ? base.slice(0, 40) + '…' : base;

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const ratio = img.naturalWidth / img.naturalHeight;
            el.width = Math.min(300, img.naturalWidth);
            el.height = el.width / ratio;
            resolve(el);
        };
        img.onerror = () => resolve(el);
        img.src = src;
    });
}

function renderImageElement(dom, el) {
    let img = dom.querySelector('img');
    if (!img) {
        dom.innerHTML = '';
        img = document.createElement('img');
        img.draggable = false;
        dom.appendChild(img);
    }
    if (img.src !== el.src) img.src = el.src;
    img.style.filter = getImageCSSFilter(el);
    img.style.borderRadius = (el.raio ?? 8) + 'px';
    const sx = el.flipX ? -1 : 1;
    const sy = el.flipY ? -1 : 1;
    img.style.transform = `scale(${sx}, ${sy})`;
}

// Ferramentas da imagem (sempre no topo do painel, à vista).
function getImageToolsHTML() {
    return `
        <div class="panel-section img-tools-section">
            <h4>Ferramentas da imagem</h4>
            <div class="img-tools">
                <button type="button" class="img-tool" id="prop-crop">${uiIcon('crop', 18)}<span>Recortar</span></button>
                <button type="button" class="img-tool" id="prop-manual-bg">${uiIcon('scissors', 18)}<span>Apagar fundo</span></button>
                <button type="button" class="img-tool" id="prop-flip">${uiIcon('flip', 18)}<span>Espelhar</span></button>
                <button type="button" class="img-tool" id="prop-import-image">${uiIcon('camera', 18)}<span>Substituir</span></button>
            </div>
            <h4 class="img-tools-ai-title">${uiIcon('sparkle', 12)} Com IA</h4>
            <div class="img-tools img-tools-ai">
                <button type="button" class="img-tool img-tool-ai" id="prop-remove-bg">${uiIcon('sparkle', 18)}<span>Remover fundo</span><i>IA</i></button>
                <button type="button" class="img-tool img-tool-ai" id="prop-auto-colagem">${uiIcon('grid', 18)}<span>Colagem automática</span><i>IA</i></button>
            </div>
        </div>`;
}

function bindImageToolsEvents(panel, callbacks) {
    panel.querySelector('#prop-crop')?.addEventListener('click', () => callbacks.onCropImage?.());
    panel.querySelector('#prop-manual-bg')?.addEventListener('click', () => callbacks.onManualBg?.());
    panel.querySelector('#prop-flip')?.addEventListener('click', () => callbacks.onFlipImage?.());
    panel.querySelector('#prop-remove-bg')?.addEventListener('click', () => callbacks.onRemoveBackground?.());
    panel.querySelector('#prop-import-image')?.addEventListener('click', () => callbacks.onReplaceImage?.());
    panel.querySelector('#prop-auto-colagem')?.addEventListener('click', () => callbacks.onAutoCollage?.());
}

function getImagePanelHTML(el) {
    if (!el) return getImageToolsHTML();
    const filtroVal = el.filtro || 'none';
    const src = typeof safeImgSrc === 'function' ? (safeImgSrc(el.src) || el.src) : el.src;
    const shadowLabel = el.sombra && el.sombra.preset && IMG_SHADOWS[el.sombra.preset] ? IMG_SHADOWS[el.sombra.preset].label : '';
    const filterTiles = `<div class="fx-grid fx-grid-3">
        ${Object.entries(FILTROS).map(([k, f]) => `
            <button type="button" class="fx-tile fx-tile-img ${k === filtroVal ? 'on' : ''}" data-img-filter="${k}">
                <span class="fx-img-demo"><img src="${fxEsc(src)}" alt="" style="filter:${f.css}" draggable="false"></span>
                <span>${f.label}</span>
            </button>`).join('')}
    </div>`;
    const raio = el.raio ?? 8;
    const corners = [[0, 'Retos'], [12, 'Suaves'], [32, 'Redondos'], [9999, 'Círculo']];
    const ratio = el.width && el.height ? el.width / el.height : 1;
    return getImageToolsHTML()
        + fxSectionHTML('img-shadow', 'Sombra', imgShadowTilesHTML(el) + `<div data-fx-host="img-shadow">${imgShadowControlsHTML(el)}</div>`, { icon: FX_ICON.shadow, open: true, badge: shadowLabel })
        + fxSectionHTML('img-rotate', 'Rodar e virar', fxRotateHTML(el, true), { icon: FX_ICON.rotate, open: true })
        + fxSectionHTML('img-filter', 'Filtros', filterTiles, { icon: FX_ICON.filter, badge: filtroVal !== 'none' && FILTROS[filtroVal] ? FILTROS[filtroVal].label : '' })
        + fxSectionHTML('img-adjust', 'Ajustes de cor', `
            ${fxSliderHTML('ad-brilho', 'Brilho', 30, 200, 1, Math.round((el.brilho ?? 1) * 100), '%')}
            ${fxSliderHTML('ad-contraste', 'Contraste', 30, 200, 1, Math.round((el.contraste ?? 1) * 100), '%')}
            ${fxSliderHTML('ad-saturacao', 'Saturação', 0, 200, 1, Math.round((el.saturacao ?? 1) * 100), '%')}
            <button type="button" class="fx-link" data-ad-reset>Repor ajustes</button>`, { icon: FX_ICON.sliders })
        + fxSectionHTML('img-corner', 'Cantos', `
            <div class="fx-chips">${corners.map(([v, l]) => `<button type="button" class="fx-chip ${(v === 9999 ? raio >= 999 : raio === v) ? 'on' : ''}" data-corner="${v}"><i class="fx-corner-demo" style="border-radius:${v === 9999 ? '50%' : Math.min(v, 14) + 'px'}"></i>${l}</button>`).join('')}</div>
            ${fxSliderHTML('raio', 'Arredondar', 0, 300, 1, Math.min(raio, 300), ' px')}`, { icon: FX_ICON.corner })
        + fxSectionHTML('img-size', 'Tamanho e opacidade', `
            ${fxSliderHTML('img-op', 'Opacidade', 0, 100, 1, Math.round((el.opacidade ?? 1) * 100), '%')}
            <div class="fx-size-row">
                <label><span>L</span><input type="number" id="prop-width" value="${Math.round(el.width || 200)}" min="20"></label>
                <button type="button" class="fx-lock on" id="prop-lock" title="Manter proporção" aria-pressed="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                </button>
                <label><span>A</span><input type="number" id="prop-height" value="${Math.round(el.height || 180)}" min="20" data-ratio="${ratio}"></label>
            </div>`, { icon: FX_ICON.size });
}

function bindImagePanelEvents(panel, el, callbacks) {
    bindImageToolsEvents(panel, callbacks);
    if (!el) return;
    fxBindSections(panel);
    imgShadowBind(panel, el, callbacks);
    fxBindRotate(panel, el, callbacks);

    panel.querySelectorAll('[data-img-filter]').forEach(b => b.addEventListener('click', () => {
        el.filtro = b.dataset.imgFilter;
        panel.querySelectorAll('[data-img-filter]').forEach(x => x.classList.toggle('on', x === b));
        callbacks.onUpdate(el);
    }));

    const adj = (id, key) => fxBindSlider(panel, id, '%', (v) => { el[key] = v / 100; callbacks.onUpdate(el, false); }, () => callbacks.onUpdate(el));
    adj('ad-brilho', 'brilho');
    adj('ad-contraste', 'contraste');
    adj('ad-saturacao', 'saturacao');
    panel.querySelector('[data-ad-reset]')?.addEventListener('click', () => {
        el.brilho = 1; el.contraste = 1; el.saturacao = 1;
        ['ad-brilho', 'ad-contraste', 'ad-saturacao'].forEach(id => {
            const r = panel.querySelector(`[data-fx-range="${id}"]`);
            const o = panel.querySelector(`[data-fx-out="${id}"]`);
            if (r) r.value = 100;
            if (o) o.textContent = '100%';
        });
        callbacks.onUpdate(el);
    });

    panel.querySelectorAll('[data-corner]').forEach(b => b.addEventListener('click', () => {
        const v = parseInt(b.dataset.corner, 10);
        el.raio = v === 9999 ? Math.ceil(Math.max(el.width, el.height)) : v;
        panel.querySelectorAll('[data-corner]').forEach(x => x.classList.toggle('on', x === b));
        const r = panel.querySelector('[data-fx-range="raio"]');
        const o = panel.querySelector('[data-fx-out="raio"]');
        if (r) r.value = Math.min(el.raio, 300);
        if (o) o.textContent = Math.min(el.raio, 300) + ' px';
        callbacks.onUpdate(el);
    }));
    fxBindSlider(panel, 'raio', ' px', (v) => { el.raio = v; callbacks.onUpdate(el, false); }, () => callbacks.onUpdate(el));
    fxBindSlider(panel, 'img-op', '%', (v) => { el.opacidade = v / 100; callbacks.onUpdate(el, false); }, () => callbacks.onUpdate(el));

    const wIn = panel.querySelector('#prop-width');
    const hIn = panel.querySelector('#prop-height');
    const lock = panel.querySelector('#prop-lock');
    const ratio = parseFloat(hIn?.dataset.ratio) || 1;
    lock?.addEventListener('click', () => {
        const on = !lock.classList.contains('on');
        lock.classList.toggle('on', on);
        lock.setAttribute('aria-pressed', String(on));
    });
    wIn?.addEventListener('keydown', e => e.stopPropagation());
    hIn?.addEventListener('keydown', e => e.stopPropagation());
    wIn?.addEventListener('change', () => {
        el.width = Math.max(20, parseInt(wIn.value, 10) || el.width);
        if (lock?.classList.contains('on')) { el.height = Math.round(el.width / ratio); hIn.value = el.height; }
        callbacks.onUpdate(el);
    });
    hIn?.addEventListener('change', () => {
        el.height = Math.max(20, parseInt(hIn.value, 10) || el.height);
        if (lock?.classList.contains('on')) { el.width = Math.round(el.height * ratio); wIn.value = el.width; }
        callbacks.onUpdate(el);
    });
}

function duplicateImage(el, layer) {
    return {
        ...JSON.parse(JSON.stringify(el)),
        id: generateId(),
        x: el.x + 20,
        y: el.y + 20,
        layer
    };
}

function removeBackgroundManual(src, tolerance = 35) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const w = img.naturalWidth, h = img.naturalHeight;
            if (w < 2 || h < 2) { resolve(src); return; }
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, w, h);
            const id = ctx.getImageData(0, 0, w, h);
            const data = id.data;
            const visited = new Uint8Array(w * h);
            const queue = [];

            const enqueue = (x, y) => {
                if (x < 0 || y < 0 || x >= w || y >= h) return;
                const i = y * w + x;
                if (visited[i]) return;
                visited[i] = 1;
                queue.push(i);
            };

            for (let x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
            for (let y = 0; y < h; y++) { enqueue(0, y); enqueue(w - 1, y); }

            let front = 0;
            while (front < queue.length) {
                const idx = queue[front++];
                const pi = idx * 4;
                data[pi + 3] = 0;
                const x = idx % w, y = Math.floor(idx / w);
                const neighbours = [];
                if (x > 0) neighbours.push(idx - 1);
                if (x < w - 1) neighbours.push(idx + 1);
                if (y > 0) neighbours.push(idx - w);
                if (y < h - 1) neighbours.push(idx + w);
                for (const ni of neighbours) {
                    if (visited[ni]) continue;
                    const npi = ni * 4;
                    const dr = data[pi] - data[npi];
                    const dg = data[pi + 1] - data[npi + 1];
                    const db = data[pi + 2] - data[npi + 2];
                    if (Math.sqrt(dr * dr + dg * dg + db * db) <= tolerance) enqueue(ni);
                }
            }
            ctx.putImageData(id, 0, 0);
            resolve(c.toDataURL('image/png'));
        };
        img.onerror = () => resolve(src);
        img.src = src;
    });
}

const FONTES = [
    'Segoe UI', 'Inter', 'Montserrat', 'Poppins', 'Raleway',
    'Open Sans', 'Roboto', 'Lato', 'Nunito', 'Playfair Display',
    'Lora', 'Merriweather', 'Georgia', 'Times New Roman',
    'Oswald', 'Bebas Neue', 'Archivo Black', 'Abril Fatface',
    'Cinzel', 'Pacifico', 'Lobster', 'Dancing Script', 'Caveat',
    'Advent Pro', 'Courier New', 'Courier Prime', 'Verdana', 'Impact'
];

let fitMeasureCanvas = null;

const TEXT_PRESETS = {
    titulo: { conteudo: 'Adicione um título', fonte: 'Playfair Display', tamanho: 46, cor: '#0f172a', negrito: true, alinhamento: 'left', width: 520, height: 90 },
    subtitulo: { conteudo: 'Adicione um subtítulo', fonte: 'Montserrat', tamanho: 26, cor: '#3f3f46', negrito: false, alinhamento: 'left', width: 440, height: 60 },
    texto: { conteudo: 'Adicione algum texto', fonte: 'Segoe UI', tamanho: 18, cor: '#52525b', negrito: false, alinhamento: 'left', width: 360, height: 48 },
    citacao: { conteudo: '"Adicione uma citação inspiradora"', fonte: 'Playfair Display', tamanho: 32, cor: '#1e293b', negrito: false, italico: true, alinhamento: 'center', width: 480, height: 80 },
    destaque: { conteudo: 'DESTAQUE', fonte: 'Archivo Black', tamanho: 56, cor: '#E60023', negrito: true, alinhamento: 'center', width: 440, height: 100 },
    nota: { conteudo: 'Uma pequena nota', fonte: 'Inter', tamanho: 14, cor: '#64748b', negrito: false, alinhamento: 'left', width: 280, height: 40 },
    chamada: { conteudo: 'Sua mensagem aqui!', fonte: 'Poppins', tamanho: 38, cor: '#0ea5e9', negrito: true, alinhamento: 'center', width: 500, height: 85 }
};

function createTextPreset(preset, elementos) {
    const layer = getNextLayer(elementos);
    const base = TEXT_PRESETS[preset] || TEXT_PRESETS.texto;
    return {
        ...createTextElement(200, 200, layer),
        conteudo: (typeof window !== 'undefined' && window.psT) ? window.psT(base.conteudo) : base.conteudo,
        fonte: base.fonte,
        tamanho: base.tamanho,
        cor: base.cor,
        negrito: base.negrito,
        alinhamento: base.alinhamento,
        width: base.width,
        height: base.height
    };
}

function createTextElement(x = 200, y = 200, layer = 0) {
    return {
        tipo: 'texto',
        id: generateId(),
        conteudo: 'Clique para editar',
        x,
        y,
        width: 250,
        height: 60,
        rotation: 0,
        opacidade: 1,
        layer,
        bloqueada: false,
        visivel: true,
        nome: 'Texto',
        fonte: 'Segoe UI',
        tamanho: 24,
        cor: '#0f172a',
        negrito: false,
        italico: false,
        sublinhado: false,
        riscado: false,
        autoAjustar: true,
        alinhamento: 'left'
    };
}

function addTextElement(elementos) {
    const layer = getNextLayer(elementos);
    return createTextElement(200, 200, layer);
}

function renderTextElement(dom, el) {
    let textEl = dom.querySelector('.text-content');
    if (!textEl) {
        dom.innerHTML = '';
        textEl = document.createElement('div');
        textEl.className = 'text-content';
        dom.appendChild(textEl);
    }

    const editing = dom.dataset.editing === '1' && !el.bloqueada;
    if (!editing) dom.dataset.editing = '0';
    textEl.contentEditable = editing ? 'true' : 'false';
    textEl.classList.toggle('editing', editing);
    if (document.activeElement !== textEl) {
        textEl.textContent = el.conteudo;
    }

    // Estilos básicos
    textEl.style.fontFamily = el.fonte;
    textEl.style.fontSize = el.tamanho + 'px';
    textEl.style.color = el.cor;
    textEl.style.fontWeight = el.negrito ? 'bold' : 'normal';
    textEl.style.fontStyle = el.italico ? 'italic' : 'normal';
    textEl.style.textDecoration = [
        el.sublinhado ? 'underline' : '',
        el.riscado ? 'line-through' : ''
    ].filter(Boolean).join(' ') || 'none';
    textEl.style.textAlign = el.alinhamento;
    textEl.style.wordWrap = 'break-word';
    textEl.style.overflowWrap = 'break-word';
    textEl.style.whiteSpace = 'pre-wrap';
    textEl.style.padding = '4px';
    textEl.style.boxSizing = 'border-box';

    // Novos estilos avançados
    textEl.style.lineHeight = (el.lineHeight || 1.2);
    textEl.style.letterSpacing = (el.letterSpacing || 0) + 'px';
    textEl.style.textTransform = el.textTransform || 'none';

    // Cor de fundo do texto
    if (el.bgColor) {
        textEl.style.backgroundColor = el.bgColor;
        textEl.style.padding = '6px 8px';
    } else {
        textEl.style.backgroundColor = 'transparent';
        textEl.style.padding = '4px';
    }

    // Sombra do texto
    if (el.textShadow && el.textShadowBlur > 0) {
        const blur = el.textShadowBlur || 4;
        const color = el.textShadowColor || '#000000';
        textEl.style.textShadow = `0 2px ${blur}px ${color}`;
    } else {
        textEl.style.textShadow = 'none';
    }

    fitTextElement(dom, el);
}

function fitTextElement(dom, el) {
    if (!el || el.tipo !== 'texto' || el.autoAjustar === false) return;
    const block = measureTextBlock(el);
    const newH = Math.max(24, Math.round(block.height) + 8);
    if (newH !== el.height) {
        el.height = newH;
        dom.style.height = el.height + 'px';
    }
}

function measureTextBlock(el) {
    const c = fitMeasureCanvas || (fitMeasureCanvas = document.createElement('canvas'));
    const ctx = c.getContext('2d');
    ctx.font = `${el.italico ? 'italic ' : ''}${el.negrito ? 'bold ' : ''}${el.tamanho || 24}px ${el.fonte || 'Arial'}`;
    const availW = Math.max(20, (el.width || 250) - 8);
    const lineH = (el.tamanho || 24) * 1.3;
    const paragraphs = String(el.conteudo || '').split('\n');
    let lines = 0;
    for (const para of paragraphs) {
        const words = para.trim() ? para.trim().split(/\s+/) : [];
        if (!words.length) { lines += 1; continue; }
        lines += 1;
        let cur = '';
        for (const w of words) {
            const test = cur ? cur + ' ' + w : w;
            if (cur && ctx.measureText(test).width > availW) {
                lines += 1;
                cur = w;
            } else {
                cur = test;
            }
        }
    }
    return { height: Math.max(lineH, lines * lineH) };
}

function getTextPanelHTML(el) {
    const addCards = `
        <div class="panel-section">
            <h4>Adicionar texto</h4>
            <p class="panel-hint fx-drag-hint">Clica ou arrasta para o quadro.</p>
            <div class="text-add-grid">
                <button class="text-add-card" data-add="titulo" data-ps-drag="text:titulo" title="Adicionar título">
                    <span class="text-add-sample" style="font-family:'Playfair Display';font-weight:700;font-size:30px">Adicione um título</span>
                    <span class="text-add-label">Título</span>
                </button>
                <button class="text-add-card" data-add="subtitulo" data-ps-drag="text:subtitulo" title="Adicionar subtítulo">
                    <span class="text-add-sample" style="font-family:'Montserrat';font-weight:600;font-size:20px">Adicione um subtítulo</span>
                    <span class="text-add-label">Subtítulo</span>
                </button>
                <button class="text-add-card" data-add="texto" data-ps-drag="text:texto" title="Adicionar texto">
                    <span class="text-add-sample" style="font-family:'Segoe UI';font-weight:400;font-size:15px">Adicione algum texto</span>
                    <span class="text-add-label">Texto</span>
                </button>
                <button class="text-add-card" data-add="citacao" data-ps-drag="text:citacao" title="Adicionar citação">
                    <span class="text-add-sample" style="font-family:'Lora';font-style:italic;font-size:16px">"Uma citação"</span>
                    <span class="text-add-label">Citação</span>
                </button>
            </div>
        </div>`;
    if (!el) return addCards;

    const currentFont = psSafeFont(el.fonte || 'Segoe UI');
    const fx = textEffectOf(el);
    const fxLabel = fx.tipo && fx.tipo !== 'nenhum' && TEXT_EFFECTS[fx.tipo] ? TEXT_EFFECTS[fx.tipo].label : '';
    const tr = el.textTransform || 'none';
    return `
        <div class="panel-section fx-text-edit">
            <label class="fx-label" for="prop-conteudo">Conteúdo</label>
            <textarea id="prop-conteudo" rows="3">${escapeHTML(el.conteudo || '')}</textarea>
        </div>
        ${fxSectionHTML('tx-font', 'Fonte e estilo', `
            <button type="button" class="fx-font-btn" id="prop-font-btn" style="font-family:'${escapeHTML(currentFont)}'">
                <span>${escapeHTML(currentFont)}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div class="fx-row">
                <div class="text-size-group">
                    <button type="button" class="toggle-btn text-size-step" id="prop-tamanho-men" title="Diminuir">A−</button>
                    <input type="number" id="prop-tamanho" value="${Math.round(el.tamanho || 24)}" min="6" max="800" step="1" inputmode="numeric">
                    <button type="button" class="toggle-btn text-size-step" id="prop-tamanho-mais" title="Aumentar">A+</button>
                </div>
            </div>
            <div class="fx-row fx-row-split">
                <div class="toggle-group">
                    <button class="toggle-btn ${el.negrito ? 'active' : ''}" id="prop-negrito" title="Negrito"><b>B</b></button>
                    <button class="toggle-btn ${el.italico ? 'active' : ''}" id="prop-italico" title="Itálico"><i>I</i></button>
                    <button class="toggle-btn ${el.sublinhado ? 'active' : ''}" id="prop-sublinhado" title="Sublinhado"><u>U</u></button>
                    <button class="toggle-btn ${el.riscado ? 'active' : ''}" id="prop-riscado" title="Riscado"><s>S</s></button>
                </div>
                <div class="toggle-group">
                    <button class="toggle-btn ${el.alinhamento === 'left' ? 'active' : ''}" data-align="left" title="Esquerda">${uiIcon('alignL')}</button>
                    <button class="toggle-btn ${el.alinhamento === 'center' ? 'active' : ''}" data-align="center" title="Centro">${uiIcon('alignC')}</button>
                    <button class="toggle-btn ${el.alinhamento === 'right' ? 'active' : ''}" data-align="right" title="Direita">${uiIcon('alignR')}</button>
                </div>
            </div>`, { icon: FX_ICON.type, open: true })}
        ${fxSectionHTML('tx-color', 'Cor do texto', fxSwatchesHTML('tx-color', el.cor || '#0f172a'), { icon: FX_ICON.palette, open: true })}
        ${fxSectionHTML('tx-fx', 'Efeitos', textEffectTilesHTML(el) + `<div data-fx-host="text-fx">${textEffectControlsHTML(el)}</div>`, { icon: FX_ICON.sparkle, open: true, badge: fxLabel })}
        ${fxSectionHTML('tx-bg', 'Fundo do texto', fxSwatchesHTML('tx-bg', el.bgColor || '', { allowNone: true }), { icon: FX_ICON.palette })}
        ${fxSectionHTML('tx-space', 'Espaçamento e maiúsculas', `
            ${fxSliderHTML('tx-lh', 'Entre linhas', 0.8, 2.5, 0.05, (el.lineHeight || 1.2).toFixed(2), '')}
            ${fxSliderHTML('tx-ls', 'Entre letras', -5, 30, 0.5, el.letterSpacing || 0, ' px')}
            <div class="fx-chips">
                ${[['none', 'Normal', 'Aa'], ['uppercase', 'Maiúsculas', 'AA'], ['lowercase', 'Minúsculas', 'aa'], ['capitalize', 'Iniciais', 'Ab']].map(([v, l, d]) => `<button type="button" class="fx-chip ${tr === v ? 'on' : ''}" data-transform="${v}" title="${l}"><b>${d}</b>${l}</button>`).join('')}
            </div>`, { icon: FX_ICON.spacing })}
        ${fxSectionHTML('tx-rot', 'Rodar', fxRotateHTML(el, false), { icon: FX_ICON.rotate })}
        ${fxSectionHTML('tx-more', 'Mais opções', `
            ${fxSliderHTML('tx-op', 'Opacidade', 0, 100, 1, Math.round((el.opacidade ?? 1) * 100), '%')}
            <label class="fx-switch"><input type="checkbox" id="prop-autoajustar" ${el.autoAjustar !== false ? 'checked' : ''}><span></span>Ajustar a caixa ao texto</label>`, { icon: FX_ICON.sliders })}
        ${addCards}
    `;
}

function bindTextPanelEvents(panel, el, callbacks) {
    panel.querySelectorAll('[data-add]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (btn._psDragged) { btn._psDragged = false; return; }
            callbacks.onAddTextPreset?.(btn.dataset.add);
        });
    });

    if (!el) return;
    fxBindSections(panel);

    const sizeInput = panel.querySelector('#prop-tamanho');
    const setSize = (v) => {
        el.tamanho = clamp(Math.round(v), 6, 800);
        if (sizeInput) sizeInput.value = el.tamanho;
        callbacks.onUpdate(el);
    };
    panel.querySelector('#prop-tamanho-men')?.addEventListener('click', () => setSize((el.tamanho || 24) - 2));
    panel.querySelector('#prop-tamanho-mais')?.addEventListener('click', () => setSize((el.tamanho || 24) + 2));
    sizeInput?.addEventListener('keydown', e => e.stopPropagation());
    sizeInput?.addEventListener('change', () => setSize(parseFloat(String(sizeInput.value).replace(',', '.')) || 24));

    const content = panel.querySelector('#prop-conteudo');
    content?.addEventListener('keydown', e => e.stopPropagation());
    content?.addEventListener('input', (e) => {
        el.conteudo = e.target.value;
        callbacks.onUpdate(el, false);
    });
    content?.addEventListener('change', () => callbacks.onUpdate(el));

    const fontBtn = panel.querySelector('#prop-font-btn');
    fontBtn?.addEventListener('click', () => {
        fxOpenFontPicker(fontBtn, el.fonte, (f) => {
            el.fonte = f;
            fontBtn.style.fontFamily = `'${f}'`;
            fontBtn.querySelector('span').textContent = f;
            panel.querySelectorAll('.fx-text-demo b').forEach(b => { b.style.fontFamily = `'${f}'`; });
            callbacks.onUpdate(el);
        });
    });

    const toggle = (id, key) => panel.querySelector(id)?.addEventListener('click', (e) => {
        el[key] = !el[key];
        e.currentTarget.classList.toggle('active', !!el[key]);
        callbacks.onUpdate(el);
    });
    toggle('#prop-negrito', 'negrito');
    toggle('#prop-italico', 'italico');
    toggle('#prop-sublinhado', 'sublinhado');
    toggle('#prop-riscado', 'riscado');

    panel.querySelectorAll('[data-align]').forEach(btn => {
        btn.addEventListener('click', () => {
            el.alinhamento = btn.dataset.align;
            panel.querySelectorAll('[data-align]').forEach(b => b.classList.toggle('active', b === btn));
            callbacks.onUpdate(el);
        });
    });

    fxBindSwatches(panel, 'tx-color', (c) => {
        el.cor = c || '#000000';
        panel.querySelectorAll('.fx-text-demo b').forEach(b => {
            if (!b.style.webkitTextStroke || b.style.color !== 'transparent') b.style.color = el.cor;
        });
        callbacks.onUpdate(el);
    });
    textEffectBind(panel, el, callbacks);
    fxBindSwatches(panel, 'tx-bg', (c) => { el.bgColor = c || null; callbacks.onUpdate(el); });

    fxBindSlider(panel, 'tx-lh', '', (v) => { el.lineHeight = v; callbacks.onUpdate(el, false); }, () => callbacks.onUpdate(el));
    fxBindSlider(panel, 'tx-ls', ' px', (v) => { el.letterSpacing = v; callbacks.onUpdate(el, false); }, () => callbacks.onUpdate(el));
    panel.querySelectorAll('[data-transform]').forEach(btn => {
        btn.addEventListener('click', () => {
            el.textTransform = btn.dataset.transform;
            panel.querySelectorAll('[data-transform]').forEach(b => b.classList.toggle('on', b === btn));
            callbacks.onUpdate(el);
        });
    });

    fxBindRotate(panel, el, callbacks);
    fxBindSlider(panel, 'tx-op', '%', (v) => { el.opacidade = v / 100; callbacks.onUpdate(el, false); }, () => callbacks.onUpdate(el));
    panel.querySelector('#prop-autoajustar')?.addEventListener('change', (e) => {
        el.autoAjustar = e.target.checked;
        callbacks.onUpdate(el);
    });
}

function startTextEdit(dom, el) {
    if (!el || el.bloqueada) return;
    const textEl = dom.querySelector('.text-content');
    if (!textEl) return;
    dom.dataset.editing = '1';
    textEl.contentEditable = 'true';
    textEl.classList.add('editing');
    textEl.focus();
    const range = document.createRange();
    range.selectNodeContents(textEl);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

function stopTextEdit(dom, el) {
    const textEl = dom.querySelector('.text-content');
    if (!textEl) return;
    dom.dataset.editing = '0';
    textEl.contentEditable = 'false';
    textEl.classList.remove('editing');
    if (el) el.conteudo = textEl.textContent;
}

function bindTextContentEdit(dom, el, onUpdate) {
    if (dom.dataset.textBound === '1') return;
    dom.dataset.textBound = '1';
    const textEl = dom.querySelector('.text-content');
    if (!textEl) return;

    textEl.addEventListener('input', () => {
        el.conteudo = textEl.textContent;
        onUpdate(el, false);
    });

    textEl.addEventListener('blur', () => {
        stopTextEdit(dom, el);
        onUpdate(el, true);
    });

    dom.addEventListener('dblclick', (e) => {
        if (el.bloqueada) return;
        // Nos modos Mão / Redimensionar o duplo clique não abre a edição do texto.
        const mode = document.documentElement.dataset.edMode;
        if (mode && mode !== 'select') return;
        e.stopPropagation();
        startTextEdit(dom, el);
    });
}

function duplicateText(el, layer) {
    return {
        ...JSON.parse(JSON.stringify(el)),
        id: generateId(),
        x: el.x + 20,
        y: el.y + 20,
        layer
    };
}

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
        cor: isGuide ? '#111111' : '#E60023',
        corContorno: '#111111',
        espessura: isGuide ? 4 : 0,
        preenchimento: type !== 'linha'
    };
}

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

// Espessura do contorno que se vê de facto (contorno só, linha e seta
// nunca ficam invisíveis com espessura 0).
function shapeStrokeWidth(el) {
    const sw = Math.max(0, Number(el.espessura) || 0);
    if (el.forma === 'linha' || el.forma === 'seta') return Math.max(1, sw || 3);
    if (el.preenchimento === false) return Math.max(1, sw || 3);
    return sw;
}

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
    svg.style.overflow = 'visible';
    svg.setAttribute('viewBox', `0 0 ${el.width} ${el.height}`);
    svg.innerHTML = '';

    const shape = el.forma;
    const fill = el.preenchimento !== false ? el.cor : 'none';
    const stroke = el.corContorno || el.cor;
    const sw = shapeStrokeWidth(el);
    // O contorno fica por dentro da caixa (não é cortado nem deforma o elemento).
    const iw = Math.max(1, el.width - sw), ih = Math.max(1, el.height - sw);
    let node;

    switch (shape) {
        case 'quadrado':
        case 'retangulo':
            node = createSVGElement('rect', {
                x: sw / 2, y: sw / 2, width: iw, height: ih,
                fill, stroke: sw ? stroke : 'none', 'stroke-width': sw,
                rx: Math.min(shape === 'quadrado' ? 8 : 5, iw / 2, ih / 2), 'stroke-linejoin': 'round'
            });
            break;
        case 'circulo':
            node = createSVGElement('ellipse', {
                cx: el.width / 2, cy: el.height / 2, rx: iw / 2, ry: ih / 2,
                fill, stroke: sw ? stroke : 'none', 'stroke-width': sw
            });
            break;
        case 'linha':
            node = createSVGElement('line', {
                x1: sw / 2, y1: el.height / 2, x2: el.width - sw / 2, y2: el.height / 2,
                stroke, 'stroke-width': sw, 'stroke-linecap': 'round'
            });
            break;
        case 'seta': {
            const midY = el.height / 2;
            const headSize = Math.max(sw * 2.5, Math.min(Math.max(22, sw * 3), el.height, el.width / 2));
            node = createSVGElement('g', {});
            node.appendChild(createSVGElement('line', {
                x1: sw / 2, y1: midY, x2: el.width - headSize * 0.8, y2: midY,
                stroke, 'stroke-width': sw, 'stroke-linecap': 'round'
            }));
            node.appendChild(createSVGElement('polygon', {
                points: `${el.width},${midY} ${el.width - headSize},${midY - headSize / 2} ${el.width - headSize},${midY + headSize / 2}`,
                fill: stroke, stroke, 'stroke-width': Math.min(sw, 2), 'stroke-linejoin': 'round'
            }));
            break;
        }
        default: {
            const geo = shapeGeometry(shape, iw, ih);
            if (geo) {
                node = createSVGElement('path', {
                    d: geo.d, transform: `translate(${sw / 2} ${sw / 2})`,
                    fill, stroke: sw ? stroke : 'none', 'stroke-width': sw, 'stroke-linejoin': 'round'
                });
            }
        }
    }
    if (node) svg.appendChild(node);
}

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

function shapeStyleOf(el) {
    if (el.forma === 'linha' || el.forma === 'seta') return 'linha';
    if (el.preenchimento === false) return 'contorno';
    return (el.espessura || 0) > 0 ? 'ambos' : 'solido';
}

function getShapesPanelHTML(el) {
    const shapesHTML = SHAPE_TYPES.map(s => `
        <button class="shape-option fx-tile" data-shape="${s}" data-ps-drag="shape:${s}" title="${SHAPE_LABELS[s]} (clica ou arrasta para o quadro)" draggable="false">
            <span class="shape-preview">
                <svg viewBox="0 0 44 44" width="34" height="34" fill="currentColor" stroke="currentColor" stroke-width="1">
                    ${getShapePreviewSVG(s)}
                </svg>
            </span>
            <span class="shape-name">${SHAPE_LABELS[s]}</span>
        </button>`).join('');
    const add = `
        <div class="panel-section">
            <h4>Adicionar forma</h4>
            <p class="panel-hint fx-drag-hint">Clica ou arrasta para o quadro.</p>
            <div class="fx-grid fx-grid-3 shape-grid">${shapesHTML}</div>
        </div>`;
    if (!el) return add;

    const style = shapeStyleOf(el);
    const isLine = style === 'linha';
    const styleChip = (v, label, demo) => `<button type="button" class="fx-tile ${style === v ? 'on' : ''}" data-shape-style="${v}">
        <span class="fx-shape-demo">${demo}</span><span>${label}</span></button>`;
    const styles = isLine ? '' : fxSectionHTML('sh-style', 'Estilo', `<div class="fx-grid fx-grid-3">
            ${styleChip('solido', 'Sólido', '<svg viewBox="0 0 40 40" width="30" height="30"><rect x="6" y="6" width="28" height="28" rx="6" fill="currentColor"/></svg>')}
            ${styleChip('contorno', 'Contorno', '<svg viewBox="0 0 40 40" width="30" height="30"><rect x="7" y="7" width="26" height="26" rx="6" fill="none" stroke="currentColor" stroke-width="3"/></svg>')}
            ${styleChip('ambos', 'Cor + contorno', '<svg viewBox="0 0 40 40" width="30" height="30"><rect x="7" y="7" width="26" height="26" rx="6" fill="currentColor" fill-opacity=".35" stroke="currentColor" stroke-width="3"/></svg>')}
        </div>`, { icon: FX_ICON.sliders, open: true });
    const fillSec = (isLine || style === 'contorno') ? '' : fxSectionHTML('sh-fill', 'Cor de preenchimento', fxSwatchesHTML('sh-fill', el.cor), { icon: FX_ICON.palette, open: true });
    const strokeSec = (style === 'solido') ? '' : fxSectionHTML('sh-stroke', isLine ? 'Linha' : 'Contorno', `
            ${fxSwatchesHTML('sh-stroke', el.corContorno || el.cor)}
            ${fxSliderHTML('sh-sw', 'Espessura', 1, 40, 1, shapeStrokeWidth(el), ' px')}`, { icon: FX_ICON.corner, open: true });
    return add + styles + fillSec + strokeSec
        + fxSectionHTML('sh-rot', 'Rodar', fxRotateHTML(el, false), { icon: FX_ICON.rotate })
        + fxSectionHTML('sh-more', 'Opacidade', fxSliderHTML('sh-op', 'Opacidade', 0, 100, 1, Math.round((el.opacidade ?? 1) * 100), '%'), { icon: FX_ICON.size });
}

function bindShapesPanelEvents(panel, el, callbacks) {
    panel.querySelectorAll('[data-shape]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn._psDragged) return;
            callbacks.onAddShape?.(btn.dataset.shape);
        });
    });
    if (!el) return;
    fxBindSections(panel);

    panel.querySelectorAll('[data-shape-style]').forEach(b => b.addEventListener('click', () => {
        const v = b.dataset.shapeStyle;
        if (v === 'solido') { el.preenchimento = true; el.espessura = 0; }
        if (v === 'contorno') { if (el.preenchimento !== false && !(el.espessura > 0)) el.corContorno = el.cor; el.preenchimento = false; el.espessura = Math.max(3, el.espessura || 0); }
        if (v === 'ambos') { el.preenchimento = true; el.espessura = Math.max(3, el.espessura || 0); if (!el.corContorno || el.corContorno === el.cor) el.corContorno = '#111111'; }
        callbacks.onUpdateElement ? callbacks.onUpdateElement(el, true) : callbacks.onUpdate(el);
    }));
    fxBindSwatches(panel, 'sh-fill', (c) => { el.cor = c || '#E60023'; callbacks.onUpdate(el); });
    fxBindSwatches(panel, 'sh-stroke', (c) => { el.corContorno = c || '#111111'; callbacks.onUpdate(el); });
    fxBindSlider(panel, 'sh-sw', ' px', (v) => { el.espessura = v; callbacks.onUpdate(el, false); }, () => callbacks.onUpdate(el));
    fxBindRotate(panel, el, callbacks);
    fxBindSlider(panel, 'sh-op', '%', (v) => { el.opacidade = v / 100; callbacks.onUpdate(el, false); }, () => callbacks.onUpdate(el));
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

/* Stickers e molduras: ver js/elements.js (pack de elementos aesthetic). */
