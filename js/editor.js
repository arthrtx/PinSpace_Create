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
    const filtroVal = (el && el.filtro) || 'none';
    return getImageToolsHTML() + `
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
                <label>Espelhar</label>
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

    bindImageToolsEvents(panel, callbacks);

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
                <button class="text-add-card" data-add="citacao" title="Adicionar citação">
                    <span class="text-add-sample" style="font-family:'Lora';font-style:italic;font-size:16px">"Uma citação"</span>
                    <span class="text-add-label">Citação</span>
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
                <label>Cor do texto</label>
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
                    <button class="toggle-btn ${el.alinhamento === 'left' ? 'active' : ''}" data-align="left" title="Esquerda">${uiIcon('alignL')}</button>
                    <button class="toggle-btn ${el.alinhamento === 'center' ? 'active' : ''}" data-align="center" title="Centro">${uiIcon('alignC')}</button>
                    <button class="toggle-btn ${el.alinhamento === 'right' ? 'active' : ''}" data-align="right" title="Direita">${uiIcon('alignR')}</button>
                </div>
            </div>
            <div class="form-group">
                <label>Espaçamento entre linhas</label>
                <input type="range" id="prop-line-height" min="0.8" max="2.5" step="0.1" value="${el.lineHeight || 1.2}">
                <span style="font-size:11px;color:var(--text-muted)">${(el.lineHeight || 1.2).toFixed(1)}</span>
            </div>
            <div class="form-group">
                <label>Espaçamento entre letras</label>
                <input type="range" id="prop-letter-spacing" min="-5" max="20" step="0.5" value="${el.letterSpacing || 0}">
                <span style="font-size:11px;color:var(--text-muted)">${(el.letterSpacing || 0).toFixed(1)}px</span>
            </div>
            <div class="form-group">
                <label>Transformação</label>
                <div class="toggle-group">
                    <button class="toggle-btn ${!el.textTransform || el.textTransform === 'none' ? 'active' : ''}" data-transform="none" title="Normal">Aa</button>
                    <button class="toggle-btn ${el.textTransform === 'uppercase' ? 'active' : ''}" data-transform="uppercase" title="Maiúsculas">AA</button>
                    <button class="toggle-btn ${el.textTransform === 'lowercase' ? 'active' : ''}" data-transform="lowercase" title="Minúsculas">aa</button>
                    <button class="toggle-btn ${el.textTransform === 'capitalize' ? 'active' : ''}" data-transform="capitalize" title="Capitalizar">Aa</button>
                </div>
            </div>
            <div class="form-group">
                <label>Cor de fundo do texto</label>
                <div style="display:flex;gap:8px;align-items:center">
                    <input type="checkbox" id="prop-has-bg" ${el.bgColor ? 'checked' : ''} style="margin:0">
                    <input type="color" id="prop-bg-color" value="${el.bgColor || '#ffffff'}" ${!el.bgColor ? 'disabled' : ''} style="flex:1">
                </div>
            </div>
            <div class="form-group">
                <label>Sombra do texto</label>
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
                    <input type="checkbox" id="prop-has-shadow" ${el.textShadow ? 'checked' : ''} style="margin:0">
                    <span style="font-size:12px;color:var(--text-muted)">Ativar sombra</span>
                </div>
                <div id="shadow-controls" style="display:${el.textShadow ? 'block' : 'none'}">
                    <div class="form-row">
                        <div class="form-group" style="flex:1">
                            <label style="font-size:11px">Desfoque</label>
                            <input type="range" id="prop-shadow-blur" min="0" max="20" value="${el.textShadowBlur || 4}">
                        </div>
                        <div class="form-group" style="flex:1">
                            <label style="font-size:11px">Cor</label>
                            <input type="color" id="prop-shadow-color" value="${el.textShadowColor || '#000000'}">
                        </div>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label><input type="checkbox" id="prop-autoajustar" ${el.autoAjustar !== false ? 'checked' : ''} style="margin-right:6px"> Auto-ajustar caixa ao conteúdo</label>
            </div>
            <div class="form-group">
                <label>Opacidade</label>
                <input type="range" id="prop-opacidade" min="0" max="1" step="0.05" value="${el.opacidade ?? 1}">
                <span style="font-size:11px;color:var(--text-muted)">${Math.round((el.opacidade ?? 1) * 100)}%</span>
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

    // Novos event handlers para opções avançadas de texto
    panel.querySelector('#prop-line-height')?.addEventListener('input', (e) => {
        el.lineHeight = parseFloat(e.target.value);
        e.target.nextElementSibling.textContent = el.lineHeight.toFixed(1);
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-letter-spacing')?.addEventListener('input', (e) => {
        el.letterSpacing = parseFloat(e.target.value);
        e.target.nextElementSibling.textContent = el.letterSpacing.toFixed(1) + 'px';
        callbacks.onUpdate(el);
    });

    panel.querySelectorAll('[data-transform]')?.forEach(btn => {
        btn.addEventListener('click', () => {
            el.textTransform = btn.dataset.transform;
            panel.querySelectorAll('[data-transform]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            callbacks.onUpdate(el);
        });
    });

    panel.querySelector('#prop-has-bg')?.addEventListener('change', (e) => {
        const colorInput = panel.querySelector('#prop-bg-color');
        if (e.target.checked) {
            el.bgColor = colorInput.value;
            colorInput.disabled = false;
        } else {
            el.bgColor = null;
            colorInput.disabled = true;
        }
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-bg-color')?.addEventListener('input', (e) => {
        if (panel.querySelector('#prop-has-bg').checked) {
            el.bgColor = e.target.value;
            callbacks.onUpdate(el);
        }
    });

    panel.querySelector('#prop-has-shadow')?.addEventListener('change', (e) => {
        const shadowControls = panel.querySelector('#shadow-controls');
        if (e.target.checked) {
            el.textShadow = true;
            el.textShadowBlur = parseInt(panel.querySelector('#prop-shadow-blur')?.value) || 4;
            el.textShadowColor = panel.querySelector('#prop-shadow-color')?.value || '#000000';
            shadowControls.style.display = 'block';
        } else {
            el.textShadow = false;
            el.textShadowBlur = 0;
            el.textShadowColor = '#000000';
            shadowControls.style.display = 'none';
        }
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-shadow-blur')?.addEventListener('input', (e) => {
        if (el.textShadow) {
            el.textShadowBlur = parseInt(e.target.value) || 0;
            callbacks.onUpdate(el);
        }
    });

    panel.querySelector('#prop-shadow-color')?.addEventListener('input', (e) => {
        if (el.textShadow) {
            el.textShadowColor = e.target.value;
            callbacks.onUpdate(el);
        }
    });

    // Atualizar displays de valores dos sliders
    panel.querySelector('#prop-opacidade')?.addEventListener('input', (e) => {
        el.opacidade = parseFloat(e.target.value);
        const display = e.target.nextElementSibling;
        if (display) display.textContent = Math.round(el.opacidade * 100) + '%';
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

/* Stickers e molduras: ver js/elements.js (pack de elementos aesthetic). */
