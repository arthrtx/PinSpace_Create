const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

class BoardManager {
    constructor(viewportEl, canvasEl, elementsEl, selectionEl) {
        this.viewport = viewportEl;
        this.canvas = canvasEl;
        this.elementsContainer = elementsEl;
        this.selectionBox = selectionEl;
        this.zoom = 1;
        this.boardWidth = 3000;
        this.boardHeight = 3000;
        this.pages = 1;          // páginas extra (botão + por baixo do quadro)
        this.pageGap = 0;
        this.onPageAction = null;
        this.selectedId = null;
        this.isPanning = false;
        this.panStart = { x: 0, y: 0, scrollX: 0, scrollY: 0 };
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.dragStart = {};
        this.onSelectionChange = null;
        this.onElementUpdate = null;
        this._spacePressed = false;

        this._bindEvents();
    }

    setBoardSize(w, h, pages = this.pages) {
        this.boardWidth = w;
        this.boardHeight = h;
        this.pages = Math.max(1, Math.min(30, pages | 0 || 1));
        this.pageGap = typeof boardPageGap === 'function' ? boardPageGap(w) : Math.round(Math.max(60, w * 0.07));
        this.canvas.style.width = this.totalWidth + 'px';
        this.canvas.style.height = h + 'px';
        this._layoutPages();
        this._applyZoomBox();
    }

    // As páginas ficam lado a lado (da esquerda para a direita).
    get totalWidth() {
        return this.pages * this.boardWidth + (this.pages - 1) * this.pageGap;
    }

    get totalHeight() {
        return this.boardHeight;
    }

    pageLeft(k) {
        return k * (this.boardWidth + this.pageGap);
    }

    // Página onde fica uma coordenada x do quadro (0 = primeira).
    pageOf(x) {
        const k = Math.floor((x + this.pageGap / 2) / (this.boardWidth + this.pageGap));
        return Math.max(0, Math.min(this.pages - 1, k));
    }

    setZoom(level) {
        this.zoom = clamp(level, MIN_ZOOM, MAX_ZOOM);
        this.canvas.style.transform = `scale(${this.zoom})`;
        this._applyZoomBox();
        return this.zoom;
    }

    // O transform não muda o tamanho do layout: as margens negativas fazem
    // a área de scroll corresponder ao tamanho visível (com várias páginas).
    _applyZoomBox() {
        const z = this.zoom || 1;
        this.canvas.style.marginRight = (-(this.totalWidth * (1 - z))) + 'px';
        this.canvas.style.marginBottom = (-(this.boardHeight * (1 - z))) + 'px';
        this.canvas.style.setProperty('--z', z);
        this._layoutPageUI();
    }

    _layoutPages() {
        const multi = this.pages > 1;
        this.canvas.classList.toggle('multi-page', multi);
        // Com uma só página o fundo volta para o próprio quadro (antes ficava
        // transparente depois de apagar a 2.ª página e os elementos "flutuavam").
        if (this._bgCSS) this.canvas.style.background = multi ? 'transparent' : this._bgCSS;
        let sheets = this.canvas.querySelector('.board-pages');
        if (!sheets) {
            sheets = document.createElement('div');
            sheets.className = 'board-pages';
            this.canvas.insertBefore(sheets, this.canvas.firstChild);
        }
        sheets.innerHTML = '';
        if (multi) {
            for (let k = 0; k < this.pages; k++) {
                const d = document.createElement('div');
                d.className = 'board-page';
                d.dataset.page = k;
                d.style.left = this.pageLeft(k) + 'px';
                d.style.width = this.boardWidth + 'px';
                d.style.top = '0px';
                d.style.height = this.boardHeight + 'px';
                d.style.background = this._bgCSS || '';
                sheets.appendChild(d);
            }
        }
        this._layoutWatermarks();
        // Os elementos (e a grelha) só aparecem dentro das páginas.
        const clip = multi ? this._pagesClipPath() : '';
        this.elementsContainer.style.clipPath = clip;
        const grid = document.getElementById('board-grid');
        if (grid) grid.style.clipPath = clip;
        this._layoutPageUI();
    }

    // Marca d'água "pin space." pequena no canto de cada página (obrigatória:
    // não é um elemento, não se seleciona nem se apaga).
    _layoutWatermarks() {
        let layer = this.canvas.querySelector('.board-watermarks');
        if (!layer) {
            layer = document.createElement('div');
            layer.className = 'board-watermarks';
            layer.setAttribute('aria-hidden', 'true');
            this.canvas.appendChild(layer);
        }
        const size = typeof psWatermarkSize === 'function' ? psWatermarkSize(this.boardWidth, this.boardHeight) : Math.max(13, Math.round(Math.min(this.boardWidth, this.boardHeight) * 0.026));
        const pad = Math.round(size * 1.1);
        layer.style.setProperty('--wm-size', size + 'px');
        layer.innerHTML = '';
        for (let k = 0; k < this.pages; k++) {
            const m = document.createElement('span');
            m.className = 'board-watermark';
            m.textContent = 'pin space.';
            m.style.left = (this.pageLeft(k) + this.boardWidth - pad) + 'px';
            m.style.top = (this.boardHeight - pad) + 'px';
            layer.appendChild(m);
        }
    }

    _pagesClipPath() {
        const w = this.boardWidth, h = this.boardHeight, r = 18;
        let d = '';
        for (let k = 0; k < this.pages; k++) {
            const l = this.pageLeft(k);
            d += `M${l + r} 0H${l + w - r}A${r} ${r} 0 0 1 ${l + w} ${r}V${h - r}A${r} ${r} 0 0 1 ${l + w - r} ${h}H${l + r}A${r} ${r} 0 0 1 ${l} ${h - r}V${r}A${r} ${r} 0 0 1 ${l + r} 0Z`;
        }
        return `path('${d}')`;
    }

    // Etiquetas "Página N" e o botão + (em pixels do ecrã, fora do zoom).
    _layoutPageUI() {
        const desk = this.viewport.querySelector('.board-desk');
        if (!desk) return;
        let ui = desk.querySelector('.board-pages-ui');
        if (!ui) {
            ui = document.createElement('div');
            ui.className = 'board-pages-ui';
            desk.appendChild(ui);
            ui.addEventListener('click', (e) => {
                const b = e.target.closest('[data-page-act]');
                if (!b) return;
                e.stopPropagation();
                this.onPageAction?.(b.dataset.pageAct, parseInt(b.dataset.page || '0', 10));
            });
            ui.addEventListener('mousedown', (e) => e.stopPropagation());
        }
        const z = this.zoom || 1;
        const left = this.canvas.offsetLeft;
        const top = this.canvas.offsetTop;
        const w = this.boardWidth * z;
        const icon = {
            up: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg>',
            down: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>',
            dup: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
            del: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 6V4a2 2 0 0 1 4 0v2"/></svg>'
        };
        let html = '';
        if (this.pages > 1) {
            for (let k = 0; k < this.pages; k++) {
                const x = left + this.pageLeft(k) * z;
                html += `<div class="board-page-label" style="left:${x}px;top:${top - 32}px;width:${w}px">
                    <span>Página ${k + 1}</span>
                    <span class="board-page-acts">
                        ${k > 0 ? `<button type="button" data-page-act="up" data-page="${k}" title="Mover para a esquerda">${icon.up}</button>` : ''}
                        ${k < this.pages - 1 ? `<button type="button" data-page-act="down" data-page="${k}" title="Mover para a direita">${icon.down}</button>` : ''}
                        <button type="button" data-page-act="dup" data-page="${k}" title="Duplicar página">${icon.dup}</button>
                        <button type="button" data-page-act="del" data-page="${k}" title="Apagar página">${icon.del}</button>
                    </span>
                </div>`;
            }
        }
        const addLeft = left + this.totalWidth * z + 18;
        html += `<button type="button" class="board-add-page" data-page-act="add" style="left:${addLeft}px;top:${top}px;height:${this.boardHeight * z}px" title="Adicionar página">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            <span>Adicionar página</span>
        </button>`;
        ui.innerHTML = html;
    }

    getZoom() {
        return this.zoom;
    }

    zoomIn() {
        return this.setZoom(this.zoom + ZOOM_STEP);
    }

    zoomOut() {
        return this.setZoom(this.zoom - ZOOM_STEP);
    }

    zoomFit() {
        const ins = this._insets();
        // Deixa à vista o botão "+ Adicionar página" ao lado do quadro.
        const availW = this.viewport.clientWidth - 48 - 90;
        const availH = this.viewport.clientHeight - ins.top - ins.bottom;
        const scale = Math.min(availW / this.boardWidth, availH / this.boardHeight, 1);
        this.setZoom(scale);
        this.centerBoard();
        return scale;
    }

    _insets() {
        const narrow = this.viewport.clientWidth < 560;
        return narrow ? { top: 56, bottom: 74 } : { top: 66, bottom: 86 };
    }

    centerBoard() {
        const desk = this.viewport.querySelector('.board-desk');
        if (!desk) return;
        const cw = this.viewport.clientWidth;
        const ch = this.viewport.clientHeight;
        // Todas as páginas + o botão "+" ao lado (≈ 90 px).
        const visualW = this.totalWidth * this.zoom + 90;
        const visualH = this.boardHeight * this.zoom;
        const padX = Math.max(24, Math.round((cw - visualW) / 2));
        // Deixa espaço livre em cima (zoom) e em baixo (leitor de música).
        const ins = this._insets();
        const padY = Math.max(0, Math.round((ch - ins.top - ins.bottom - visualH) / 2));
        desk.style.paddingLeft = padX + 'px';
        desk.style.paddingRight = (padX + 90) + 'px';
        desk.style.paddingTop = (ins.top + padY) + 'px';
        desk.style.paddingBottom = (ins.bottom + padY) + 'px';
        this._layoutPageUI();
        if (visualW <= cw && visualH <= ch) {
            this.viewport.scrollLeft = 0;
            this.viewport.scrollTop = 0;
        }
    }

    applyBackground(bg) {
        if (!bg) return;
        let base = '';
        switch (bg.tipo) {
            case 'cor':
                base = bg.valor || '#ffffff';
                break;
            case 'gradiente':
                base = bg.valor ? `linear-gradient(${bg.valor.angulo || 135}deg, ${bg.valor.cor1}, ${bg.valor.cor2})` : '#ffffff';
                break;
            case 'imagem':
                base = bg.valor ? `url(${bg.valor}) center/cover no-repeat` : '#ffffff';
                break;
            default:
                base = '#ffffff';
        }
        const pattern = typeof bgPatternCSS === 'function' ? bgPatternCSS(bg.padrao) : '';
        // Padrão por cima da base (cor/gradiente/imagem), tudo no mesmo fundo.
        this._bgCSS = pattern ? `${pattern}, ${base}` : base;
        this.canvas.style.background = this.pages > 1 ? 'transparent' : this._bgCSS;
        this.canvas.querySelectorAll('.board-page').forEach(p => { p.style.background = this._bgCSS; });
    }

    setGrid(mode) {
        const grid = document.getElementById('board-grid');
        if (!grid) return;
        if (!mode || mode === 'none') {
            grid.classList.add('hidden');
            grid.removeAttribute('data-mode');
        } else {
            grid.classList.remove('hidden');
            grid.dataset.mode = mode;
        }
    }

    selectElement(id) {
        this.selectedId = id;
        if (id) {
            this._updateSelectionBox();
            this.selectionBox.classList.remove('hidden');
        } else {
            this.selectionBox.classList.add('hidden');
        }
        this.onSelectionChange?.(id);
    }

    getSelectedId() {
        return this.selectedId;
    }

    updateSelectionBox() {
        if (this.selectedId) this._updateSelectionBox();
    }

    _updateSelectionBox() {
        const el = this.elementsContainer.querySelector(`[data-id="${this.selectedId}"]`);
        if (!el) {
            this.selectionBox.classList.add('hidden');
            return;
        }

        const canvasRect = this.canvas.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const vpRect = this.viewport.getBoundingClientRect();

        const rotation = parseFloat(el.dataset.rotation || '0');
        // Caixa com o tamanho real do elemento (sem rodar), centrada nele e
        // depois rodada — antes usava o retângulo já rodado e ficava torta.
        const w = (parseFloat(el.style.width) || el.offsetWidth) * this.zoom;
        const h = (parseFloat(el.style.height) || el.offsetHeight) * this.zoom;
        const cx = elRect.left + elRect.width / 2 - vpRect.left + this.viewport.scrollLeft;
        const cy = elRect.top + elRect.height / 2 - vpRect.top + this.viewport.scrollTop;
        const left = cx - w / 2;
        const top = cy - h / 2;

        this.selectionBox.style.left = left + 'px';
        this.selectionBox.style.top = top + 'px';
        this.selectionBox.style.width = w + 'px';
        this.selectionBox.style.height = h + 'px';
        this.selectionBox.style.transformOrigin = 'center center';
        this.selectionBox.style.transform = rotation ? `rotate(${rotation}deg)` : '';
    }

    getElementDOM(id) {
        return this.elementsContainer.querySelector(`[data-id="${id}"]`);
    }

    getEdgeZone(clientX, clientY, el) {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const th = 12;
        const left = clientX >= rect.left - th && clientX <= rect.left + th;
        const right = clientX >= rect.right - th && clientX <= rect.right + th;
        const top = clientY >= rect.top - th && clientY <= rect.top + th;
        const bottom = clientY >= rect.bottom - th && clientY <= rect.bottom + th;
        if (left && top) return 'nw';
        if (right && top) return 'ne';
        if (left && bottom) return 'sw';
        if (right && bottom) return 'se';
        if (left) return 'w';
        if (right) return 'e';
        if (top) return 'n';
        if (bottom) return 's';
        return null;
    }

    startResizeFromEdge(clientX, clientY, zone, keepAspect = false) {
        this._startResize({ clientX, clientY }, zone);
        if (this.dragStart) this.dragStart.keepAspect = keepAspect;
    }

    _showSnapGuides(vertical, horizontal) {
        const gv = document.getElementById('snap-guide-v');
        const gh = document.getElementById('snap-guide-h');
        if (gv) gv.style.display = vertical ? 'block' : 'none';
        if (gh) gh.style.display = horizontal ? 'block' : 'none';
    }

    _bindEvents() {
        this.viewport.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
                this.setZoom(this.zoom + delta);
                this._updateSelectionBox();
            }
        }, { passive: false });

        this.viewport.addEventListener('mousedown', (e) => {
            const onEmpty = !e.target.closest('.board-element') && !e.target.closest('.handle') && !e.target.closest('.ed-modes, .ed-zoom, .ed-music, .ed-crop-bar');
            if (e.button === 1 || (e.button === 0 && this._spacePressed) || (e.button === 0 && this.handMode && onEmpty)) {
                e.preventDefault();
                this.isPanning = true;
                this.panStart = {
                    x: e.clientX,
                    y: e.clientY,
                    scrollX: this.viewport.scrollLeft,
                    scrollY: this.viewport.scrollTop
                };
                this.viewport.classList.add('panning');
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                const dx = e.clientX - this.panStart.x;
                const dy = e.clientY - this.panStart.y;
                this.viewport.scrollLeft = this.panStart.scrollX - dx;
                this.viewport.scrollTop = this.panStart.scrollY - dy;
                this._updateSelectionBox();
            }

            if (this.isDragging) this._handleDrag(e);
            if (this.isResizing) this._handleResize(e);
            if (this.isRotating) this._handleRotate(e);
        });

        window.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.viewport.classList.remove('panning');
            }
            if (this.isDragging || this.isResizing || this.isRotating) {
                this._showSnapGuides(false, false);
                const shouldCommit = this.isResizing || this.isRotating || (this.dragStart && this.dragStart.moved);
                this.isDragging = false;
                this.isResizing = false;
                this.isRotating = false;
                if (shouldCommit) this.onElementUpdate?.();
            }
        });

        window.addEventListener('keydown', (e) => {
            // Espaço = mão para arrastar o quadro, mas NUNCA enquanto se escreve
            const t = e.target;
            const typing = t && (t.isContentEditable
                || (t.closest && t.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')));
            const editorOn = !!document.getElementById('editor-view')?.classList.contains('active');
            if (e.code === 'Space' && !typing && editorOn) {
                e.preventDefault();
                this._spacePressed = true;
                this.viewport.style.cursor = 'grab';
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this._spacePressed = false;
                this.viewport.style.cursor = '';
            }
        });

        this.viewport.addEventListener('mousedown', (e) => {
            if (e.target === this.viewport || e.target === this.canvas || e.target === this.elementsContainer
                || (e.target.classList && (e.target.classList.contains('board-page') || e.target.classList.contains('board-desk')))) {
                if (!this._spacePressed && e.button === 0) {
                    this.selectElement(null);
                }
            }
        });

        this.selectionBox.querySelectorAll('.handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const type = handle.dataset.handle;
                if (type === 'rotate') {
                    this._startRotate(e);
                } else {
                    this._startResize(e, type);
                }
            });
        });

        this.viewport.addEventListener('scroll', () => {
            if (this.selectedId) this._updateSelectionBox();
        });

        this.elementsContainer.addEventListener('mousemove', (e) => {
            if (!this.selectedId) return;
            const el = e.target.closest('.board-element');
            if (!el || el.dataset.id !== this.selectedId || this.isResizing || this.isDragging) {
                if (el) el.style.cursor = '';
                return;
            }
            const zone = this.getEdgeZone(e.clientX, e.clientY, el);
            const cursors = { n:'ns-resize', s:'ns-resize', e:'ew-resize', w:'ew-resize', nw:'nwse-resize', se:'nwse-resize', ne:'nesw-resize', sw:'nesw-resize' };
            el.style.cursor = zone ? cursors[zone] : '';
        });
    }

    startDrag(e, elementData) {
        if (elementData.bloqueada) return;
        this.isDragging = true;
        this.dragStart = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            elX: elementData.x,
            elY: elementData.y,
            id: elementData.id,
            moved: false
        };
    }

    _handleDrag(e) {
        if (!this.dragStart.moved) {
            if (Math.abs(e.clientX - this.dragStart.mouseX) < 3 && Math.abs(e.clientY - this.dragStart.mouseY) < 3) return;
            this.dragStart.moved = true;
        }
        const dx = (e.clientX - this.dragStart.mouseX) / this.zoom;
        const dy = (e.clientY - this.dragStart.mouseY) / this.zoom;
        const dom = this.getElementDOM(this.dragStart.id);
        if (dom) {
            const w = parseFloat(dom.style.width) || 100;
            const h = parseFloat(dom.style.height) || 100;
            // Pode sair do quadro: a parte de fora fica recortada (e se sair
            // toda, a app apaga o elemento quando se larga).
            let newX = this.dragStart.elX + dx;
            let newY = this.dragStart.elY + dy;

            const bcX = this.pageLeft(this.pageOf(newX + w / 2)) + this.boardWidth / 2;
            const bcY = this.boardHeight / 2;
            const SNAP = 8;
            let snapX = null, snapY = null;
            if (Math.abs(newX + w / 2 - bcX) <= SNAP) snapX = bcX - w / 2;
            if (Math.abs(newY + h / 2 - bcY) <= SNAP) snapY = bcY - h / 2;
            dom.style.left = (snapX !== null ? snapX : newX) + 'px';
            dom.style.top = (snapY !== null ? snapY : newY) + 'px';
            this._showSnapGuides(snapX !== null, snapY !== null);
        }
        this._updateSelectionBox();
    }

    _startResize(e, handle) {
        const el = this.elementsContainer.querySelector(`[data-id="${this.selectedId}"]`);
        if (!el) return;
        this.isResizing = true;
        const rect = el.getBoundingClientRect();
        this.dragStart = {
            handle,
            mouseX: e.clientX,
            mouseY: e.clientY,
            width: rect.width / this.zoom,
            height: rect.height / this.zoom,
            x: parseFloat(el.style.left),
            y: parseFloat(el.style.top),
            id: this.selectedId,
            aspectRatio: rect.width / rect.height,
            w0: parseFloat(el.style.width) || rect.width / this.zoom,
            h0: parseFloat(el.style.height) || rect.height / this.zoom
        };
    }

    _handleResize(e) {
        const dx = (e.clientX - this.dragStart.mouseX) / this.zoom;
        const dy = (e.clientY - this.dragStart.mouseY) / this.zoom;
        const dom = this.getElementDOM(this.dragStart.id);
        if (!dom) return;

        let { width, height, x, y } = this.dragStart;
        const h = this.dragStart.handle;

        if (h.includes('e')) width += dx;
        if (h.includes('w')) { width -= dx; x += dx; }
        if (h.includes('s')) height += dy;
        if (h.includes('n')) { height -= dy; y += dy; }

        width = Math.max(20, width);
        height = Math.max(20, height);

        // Modo Redimensionar: mantém a proporção (cantos).
        if (this.dragStart.keepAspect && h.length === 2) {
            const ds = this.dragStart;
            const ratio = ds.h0 / ds.w0;
            const byW = Math.abs(width - ds.w0) >= Math.abs(height - ds.h0) / ratio;
            if (byW) height = width * ratio; else width = height / ratio;
            if (h.includes('w')) x = ds.x + ds.w0 - width;
            if (h.includes('n')) y = ds.y + ds.h0 - height;
        }

        // A app pode ajustar o redimensionamento (ex.: texto escala a letra nos cantos).
        const adj = this.onResizing ? this.onResizing(this.dragStart, { width, height, x, y }) : null;
        if (adj) ({ width, height, x, y } = adj);


        dom.style.width = width + 'px';
        dom.style.height = height + 'px';
        dom.style.left = x + 'px';
        dom.style.top = y + 'px';
        this._updateSelectionBox();
    }

    _startRotate(e) {
        const dom = this.getElementDOM(this.selectedId);
        if (!dom) return;
        this.isRotating = true;
        const rect = dom.getBoundingClientRect();
        this.dragStart = {
            cx: rect.left + rect.width / 2,
            cy: rect.top + rect.height / 2,
            startAngle: getAngle(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
                e.clientX, e.clientY
            ),
            currentRotation: parseFloat(dom.dataset.rotation || '0'),
            id: this.selectedId
        };
    }

    _handleRotate(e) {
        const angle = getAngle(this.dragStart.cx, this.dragStart.cy, e.clientX, e.clientY);
        const rotation = this.dragStart.currentRotation + (angle - this.dragStart.startAngle);
        const dom = this.getElementDOM(this.dragStart.id);
        if (dom) {
            dom.dataset.rotation = rotation;
            dom.style.transform = `rotate(${rotation}deg)`;
        }
        this._updateSelectionBox();
    }

    syncElementFromDOM(id, data) {
        const dom = this.getElementDOM(id);
        if (!dom) return data;
        data.x = parseFloat(dom.style.left) || 0;
        data.y = parseFloat(dom.style.top) || 0;
        data.width = parseFloat(dom.style.width) || data.width;
        data.height = parseFloat(dom.style.height) || data.height;
        data.rotation = parseFloat(dom.dataset.rotation || '0');
        return data;
    }

    renderElement(el) {
        let dom = this.getElementDOM(el.id);
        if (!dom) {
            dom = document.createElement('div');
            dom.className = 'board-element';
            dom.dataset.id = el.id;
            this.elementsContainer.appendChild(dom);
        }

        dom.style.left = el.x + 'px';
        dom.style.top = el.y + 'px';
        dom.style.width = el.width + 'px';
        dom.style.height = el.height + 'px';
        dom.style.opacity = el.opacidade ?? 1;
        dom.style.zIndex = el.layer;
        dom.style.transform = `rotate(${el.rotation || 0}deg)`;
        dom.dataset.rotation = el.rotation || 0;

        dom.classList.toggle('locked', !!el.bloqueada);
        // Molduras ficam por cima mas não apanham cliques (escolhe-se nas Camadas).
        dom.classList.toggle('pass-through', !!el.moldura);
        dom.classList.toggle('hidden-el', el.visivel === false);

        return dom;
    }

    removeElementDOM(id) {
        const dom = this.getElementDOM(id);
        if (dom) dom.remove();
        if (this.selectedId === id) this.selectElement(null);
    }

    clearElements() {
        this.elementsContainer.innerHTML = '';
        this.selectElement(null);
    }
}

/* ---------------------------------------------------------------------
   Guardar com dono: localStorage (sempre) + Supabase (se houver sessão).
   O BoardManager acima continua a tratar só do canvas.
   --------------------------------------------------------------------- */
async function saveWithOwner(project, options = {}) {
    const cloud = options.cloud !== false;
    const user = typeof getCachedUser === 'function' ? getCachedUser() : null;

    if (user && (!project.autor || project.autor === 'Anónimo')) {
        project.autor = user.username || project.autor;
    }

    saveProject(project);

    if (!cloud || !user || !authAvailable()) return { cloud: false };

    await saveBoardToCloud(project);   // define project.remoteId / authorId / cloudSyncedAt
    saveProject(project);
    return { cloud: true, remoteId: project.remoteId };
}
