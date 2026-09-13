/**
 * image.js — Gestão de elementos de imagem (filtros, cores, flip, recorte, IA)
 */

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
    const src = await readFileAsDataURL(file);
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
