const MAX_HISTORY = 50;

class HistoryManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this._listeners = [];
    }

    push(state) {
        this.undoStack.push(deepClone(state));
        if (this.undoStack.length > MAX_HISTORY) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        this._notify();
    }

    undo(currentState) {
        if (this.undoStack.length === 0) return null;
        this.redoStack.push(deepClone(currentState));
        const prev = this.undoStack.pop();
        this._notify();
        return prev;
    }

    redo(currentState) {
        if (this.redoStack.length === 0) return null;
        this.undoStack.push(deepClone(currentState));
        const next = this.redoStack.pop();
        this._notify();
        return next;
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
        titulo: project.titulo
    };
}

function applyState(project, state) {
    project.elementos = deepClone(state.elementos);
    project.background = deepClone(state.background);
    if (state.titulo !== undefined) project.titulo = state.titulo;
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
            <span class="layer-drag-handle">⠿</span>
            <span class="layer-icon">${getElementIcon(el.forma || el.tipo)}</span>
            <input class="layer-name" value="${getElementLabel(el)}" ${el.bloqueada ? 'disabled' : ''}>
            <div class="layer-actions">
                <button class="layer-action-btn ${el.visivel === false ? '' : 'active'}" data-action="visibility" title="Visibilidade">${el.visivel === false ? '👁️‍🗨️' : '👁️'}</button>
                <button class="layer-action-btn ${el.bloqueada ? 'active' : ''}" data-action="lock" title="Bloquear">${el.bloqueada ? '🔒' : '🔓'}</button>
                <button class="layer-action-btn" data-action="delete" title="Eliminar">🗑️</button>
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

function getImagePanelHTML(el) {
    const filtroVal = (el && el.filtro) || 'none';
    return `
        <div class="panel-section">
            <h4>Imagem</h4>
            <div class="form-group">
                <label>Opacidade</label>
                <input type="range" id="prop-opacidade" min="0" max="1" step="0.05" value="${el?.opacidade ?? 1}">
            </div>
            <div class="form-group">
                <label>Largura</label>
                <input type="number" id="prop-width" value="${el?.width || 200}" min="20">
            </div>
            <div class="form-group">
                <label>Altura</label>
                <input type="number" id="prop-height" value="${el?.height || 180}" min="20">
            </div>
            <div class="form-group">
                <label>Rotação</label>
                <input type="number" id="prop-rotation" value="${el?.rotation || 0}" min="-360" max="360">
            </div>
            <div class="form-group">
                <label>Largura</label>
                <div class="form-row">
                    <button class="btn btn-secondary btn-sm" id="prop-flip-h" style="width:50%">↔ Inverter H</button>
                    <button class="btn btn-secondary btn-sm" id="prop-flip-v" style="width:50%">↕ Inverter V</button>
                </div>
            </div>
        </div>
        <div class="panel-section">
            <h4>Cor e Efeitos</h4>
            <div class="form-group">
                <label>Filtro</label>
                <select id="prop-filtro">
                    ${Object.entries(FILTROS).map(([k, f]) => `<option value="${k}" ${k === filtroVal ? 'selected' : ''}>${f.label}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Brilho</label>
                <input type="range" id="prop-brilho" min="0.3" max="2" step="0.05" value="${el?.brilho ?? 1}">
            </div>
            <div class="form-group">
                <label>Contraste</label>
                <input type="range" id="prop-contraste" min="0.3" max="2" step="0.05" value="${el?.contraste ?? 1}">
            </div>
            <div class="form-group">
                <label>Saturação</label>
                <input type="range" id="prop-saturacao" min="0" max="2" step="0.05" value="${el?.saturacao ?? 1}">
            </div>
        </div>
        <div class="panel-section">
            <h4>Bordas</h4>
            <div class="form-group">
                <label>Bordas arredondadas</label>
                <input type="range" id="prop-raio" min="0" max="120" step="1" value="${el?.raio ?? 8}">
                <span class="range-value" id="prop-raio-val">${el?.raio ?? 8} px</span>
            </div>
        </div>
        <div class="panel-section">
            <h4>Ferramentas</h4>
            <button class="btn btn-secondary" id="prop-crop" style="width:100%;margin-bottom:8px">✂️ Recortar imagem</button>
            <button class="btn btn-secondary" id="prop-remove-bg" style="width:100%;margin-bottom:8px">✨ Remover fundo (IA)</button>
            <button class="btn btn-secondary" id="prop-import-image" style="width:100%;margin-bottom:8px">📷 Substituir imagem</button>
            <button class="btn btn-primary" id="prop-auto-colagem" style="width:100%">🧩 Colagem automática (IA)</button>
        </div>
    `;
}

function bindImagePanelEvents(panel, el, callbacks) {
    panel.querySelector('#prop-opacidade')?.addEventListener('input', (e) => {
        el.opacidade = parseFloat(e.target.value);
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-width')?.addEventListener('change', (e) => {
        el.width = parseInt(e.target.value) || 200;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-height')?.addEventListener('change', (e) => {
        el.height = parseInt(e.target.value) || 180;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-rotation')?.addEventListener('change', (e) => {
        el.rotation = parseInt(e.target.value) || 0;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-filtro')?.addEventListener('change', (e) => {
        el.filtro = e.target.value;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-brilho')?.addEventListener('input', (e) => {
        el.brilho = parseFloat(e.target.value) || 1;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-contraste')?.addEventListener('input', (e) => {
        el.contraste = parseFloat(e.target.value) || 1;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-saturacao')?.addEventListener('input', (e) => {
        el.saturacao = parseFloat(e.target.value) || 1;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-flip-h')?.addEventListener('click', () => {
        el.flipX = !el.flipX;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-flip-v')?.addEventListener('click', () => {
        el.flipY = !el.flipY;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-crop')?.addEventListener('click', () => {
        callbacks.onCropImage?.();
    });

    panel.querySelector('#prop-remove-bg')?.addEventListener('click', () => {
        callbacks.onRemoveBackground?.();
    });

    panel.querySelector('#prop-import-image')?.addEventListener('click', () => {
        callbacks.onReplaceImage?.();
    });

    const raioInput = panel.querySelector('#prop-raio');
    if (raioInput) {
        const showAtual = () => {
            const val = panel.querySelector('#prop-raio-val');
            if (val) val.textContent = raioInput.value + ' px';
        };
        raioInput.addEventListener('input', () => {
            el.raio = parseInt(raioInput.value, 10) || 0;
            showAtual();
            callbacks.onUpdate(el);
        });
    }

    panel.querySelector('#prop-auto-colagem')?.addEventListener('click', () => {
        callbacks.onAutoCollage?.();
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
    texto: { conteudo: 'Adicione algum texto', fonte: 'Segoe UI', tamanho: 18, cor: '#52525b', negrito: false, alinhamento: 'left', width: 360, height: 48 }
};

function createTextPreset(preset, elementos) {
    const layer = getNextLayer(elementos);
    const base = TEXT_PRESETS[preset] || TEXT_PRESETS.texto;
    return {
        ...createTextElement(200, 200, layer),
        conteudo: base.conteudo,
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
    const currentFont = el?.fonte || 'Segoe UI';
    const fontOptions = FONTES.map(f => {
        const sel = el?.fonte === f ? ' selected' : '';
        return `<option value="${f}" style="font-family:'${f}';font-size:13px"${sel}>${f}</option>`;
    }).join('');

    return `
        <div class="panel-section">
            <h4>Adicionar texto</h4>
            <div class="text-add-grid">
                <button class="text-add-card" data-add="titulo" title="Adicionar título">
                    <span class="text-add-sample" style="font-family:'Playfair Display';font-weight:700;font-size:30px">Adicione um título</span>
                    <span class="text-add-label">Título</span>
                </button>
                <button class="text-add-card" data-add="subtitulo" title="Adicionar subtítulo">
                    <span class="text-add-sample" style="font-family:'Montserrat';font-weight:600;font-size:20px">Adicione um subtítulo</span>
                    <span class="text-add-label">Subtítulo</span>
                </button>
                <button class="text-add-card" data-add="texto" title="Adicionar texto">
                    <span class="text-add-sample" style="font-family:'Segoe UI';font-weight:400;font-size:15px">Adicione algum texto</span>
                    <span class="text-add-label">Texto</span>
                </button>
            </div>
        </div>
        ${el ? `
        <div class="panel-section" style="margin-top:16px">
            <div class="form-group">
                <label>Conteúdo</label>
                <textarea id="prop-conteudo" rows="3">${escapeHTML(el.conteudo || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Fonte</label>
                <div id="font-preview" style="font-family:'${currentFont}';font-size:18px;color:var(--text-primary);background:var(--bg-secondary);padding:8px 12px;border-radius:8px;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(currentFont)}</div>
                <select id="prop-fonte">${fontOptions}</select>
            </div>
            <div class="form-group">
                <label>Tamanho</label>
                <div class="text-size-group">
                    <button type="button" class="toggle-btn text-size-step" id="prop-tamanho-men" title="Diminuir">A−</button>
                    <input type="number" id="prop-tamanho" value="${el.tamanho || 24}" min="8" max="400">
                    <button type="button" class="toggle-btn text-size-step" id="prop-tamanho-mais" title="Aumentar">A+</button>
                </div>
            </div>
            <div class="form-group">
                <label>Cor</label>
                <input type="color" id="prop-cor" value="${el.cor || '#0f172a'}">
            </div>
            <div class="form-group">
                <label>Estilo</label>
                <div class="toggle-group">
                    <button class="toggle-btn ${el.negrito ? 'active' : ''}" id="prop-negrito" title="Negrito"><b>B</b></button>
                    <button class="toggle-btn ${el.italico ? 'active' : ''}" id="prop-italico" title="Itálico"><i>I</i></button>
                    <button class="toggle-btn ${el.sublinhado ? 'active' : ''}" id="prop-sublinhado" title="Sublinhado"><u>U</u></button>
                    <button class="toggle-btn ${el.riscado ? 'active' : ''}" id="prop-riscado" title="Riscado"><s>S</s></button>
                </div>
            </div>
            <div class="form-group">
                <label>Alinhamento</label>
                <div class="toggle-group">
                    <button class="toggle-btn ${el.alinhamento === 'left' ? 'active' : ''}" data-align="left" title="Esquerda">⬅</button>
                    <button class="toggle-btn ${el.alinhamento === 'center' ? 'active' : ''}" data-align="center" title="Centro">⬌</button>
                    <button class="toggle-btn ${el.alinhamento === 'right' ? 'active' : ''}" data-align="right" title="Direita">➡</button>
                </div>
            </div>
            <div class="form-group">
                <label><input type="checkbox" id="prop-autoajustar" ${el.autoAjustar !== false ? 'checked' : ''} style="margin-right:6px"> Auto-ajustar caixa ao conteúdo</label>
            </div>
            <div class="form-group">
                <label>Opacidade</label>
                <input type="range" id="prop-opacidade" min="0" max="1" step="0.05" value="${el.opacidade ?? 1}">
            </div>
            <div class="form-group">
                <label>Rotação</label>
                <input type="number" id="prop-rotation" value="${el.rotation || 0}" min="-360" max="360">
            </div>
        </div>` : ''}
    `;
}

function bindTextPanelEvents(panel, el, callbacks) {
    panel.querySelectorAll('[data-add]').forEach(btn => {
        btn.addEventListener('click', () => {
            callbacks.onAddTextPreset?.(btn.dataset.add);
        });
    });

    if (!el) return;

    panel.querySelector('#prop-tamanho-men')?.addEventListener('click', () => {
        const input = panel.querySelector('#prop-tamanho');
        const val = Math.max(8, (parseInt(input.value, 10) || 24) - 2);
        input.value = val;
        el.tamanho = val;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-tamanho-mais')?.addEventListener('click', () => {
        const input = panel.querySelector('#prop-tamanho');
        const val = Math.min(400, (parseInt(input.value, 10) || 24) + 2);
        input.value = val;
        el.tamanho = val;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-conteudo')?.addEventListener('input', (e) => {
        el.conteudo = e.target.value;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-fonte')?.addEventListener('change', (e) => {
        el.fonte = e.target.value;
        const sel = e.target;
        sel.style.fontFamily = `'${el.fonte}'`;
        const preview = panel.querySelector('#font-preview');
        if (preview) {
            preview.style.fontFamily = `'${el.fonte}'`;
            preview.textContent = el.fonte;
        }
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-tamanho')?.addEventListener('change', (e) => {
        el.tamanho = parseInt(e.target.value) || 24;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-cor')?.addEventListener('input', (e) => {
        el.cor = e.target.value;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-negrito')?.addEventListener('click', (e) => {
        el.negrito = !el.negrito;
        e.target.classList.toggle('active');
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-italico')?.addEventListener('click', (e) => {
        el.italico = !el.italico;
        e.target.classList.toggle('active');
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-sublinhado')?.addEventListener('click', (e) => {
        el.sublinhado = !el.sublinhado;
        e.target.classList.toggle('active');
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-riscado')?.addEventListener('click', (e) => {
        el.riscado = !el.riscado;
        e.target.classList.toggle('active');
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-autoajustar')?.addEventListener('change', (e) => {
        el.autoAjustar = e.target.checked;
        callbacks.onUpdate(el);
    });

    panel.querySelectorAll('[data-align]').forEach(btn => {
        btn.addEventListener('click', () => {
            el.alinhamento = btn.dataset.align;
            panel.querySelectorAll('[data-align]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            callbacks.onUpdate(el);
        });
    });

    panel.querySelector('#prop-opacidade')?.addEventListener('input', (e) => {
        el.opacidade = parseFloat(e.target.value);
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-rotation')?.addEventListener('change', (e) => {
        el.rotation = parseInt(e.target.value) || 0;
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
        cor: '#6366f1',
        corContorno: '#6366f1',
        espessura: isGuide ? 3 : 2,
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
