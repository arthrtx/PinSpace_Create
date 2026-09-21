/**
 * board.js — Viewport do quadro: zoom, pan, scroll, seleção e transformação
 */

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

    setBoardSize(w, h) {
        this.boardWidth = w;
        this.boardHeight = h;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
    }

    setZoom(level) {
        this.zoom = clamp(level, MIN_ZOOM, MAX_ZOOM);
        this.canvas.style.transform = `scale(${this.zoom})`;
        return this.zoom;
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
        const availW = this.viewport.clientWidth - 48;
        const availH = this.viewport.clientHeight - 48;
        const scale = Math.min(availW / this.boardWidth, availH / this.boardHeight, 1);
        this.setZoom(scale);
        this.centerBoard();
        return scale;
    }

    centerBoard() {
        const desk = this.viewport.querySelector('.board-desk');
        if (!desk) return;
        const cw = this.viewport.clientWidth;
        const ch = this.viewport.clientHeight;
        const visualW = this.boardWidth * this.zoom;
        const visualH = this.boardHeight * this.zoom;
        const padX = Math.max(24, Math.round((cw - visualW) / 2));
        const padY = Math.max(24, Math.round((ch - visualH) / 2));
        desk.style.paddingLeft = padX + 'px';
        desk.style.paddingRight = padX + 'px';
        desk.style.paddingTop = padY + 'px';
        desk.style.paddingBottom = padY + 'px';
        if (visualW <= cw && visualH <= ch) {
            this.viewport.scrollLeft = 0;
            this.viewport.scrollTop = 0;
        }
    }

    applyBackground(bg) {
        if (!bg) return;
        switch (bg.tipo) {
            case 'cor':
                this.canvas.style.background = bg.valor;
                this.canvas.style.backgroundImage = 'none';
                break;
            case 'gradiente':
                if (bg.valor) {
                    this.canvas.style.background = `linear-gradient(${bg.valor.angulo || 135}deg, ${bg.valor.cor1}, ${bg.valor.cor2})`;
                }
                break;
            case 'imagem':
                if (bg.valor) {
                    this.canvas.style.background = `url(${bg.valor}) center/cover no-repeat`;
                }
                break;
        }
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

        const left = elRect.left - vpRect.left + this.viewport.scrollLeft;
        const top = elRect.top - vpRect.top + this.viewport.scrollTop;

        const rotation = parseFloat(el.dataset.rotation || '0');

        this.selectionBox.style.left = left + 'px';
        this.selectionBox.style.top = top + 'px';
        this.selectionBox.style.width = elRect.width + 'px';
        this.selectionBox.style.height = elRect.height + 'px';
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

    startResizeFromEdge(clientX, clientY, zone) {
        this._startResize({ clientX, clientY }, zone);
    }

    _showSnapGuides(vertical, horizontal) {
        const gv = document.getElementById('snap-guide-v');
        const gh = document.getElementById('snap-guide-h');
        if (gv) gv.style.display = vertical ? 'block' : 'none';
        if (gh) gh.style.display = horizontal ? 'block' : 'none';
    }

    _bindEvents() {
        // Zoom com scroll
        this.viewport.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
                this.setZoom(this.zoom + delta);
                this._updateSelectionBox();
            }
        }, { passive: false });

        // Pan com botão do meio ou espaço+arrastar
        this.viewport.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && this._spacePressed)) {
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

        // Tecla espaço para pan
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.isContentEditable) {
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

        // Clique no viewport para desselecionar
        this.viewport.addEventListener('mousedown', (e) => {
            if (e.target === this.viewport || e.target === this.canvas || e.target === this.elementsContainer) {
                if (!this._spacePressed && e.button === 0) {
                    this.selectElement(null);
                }
            }
        });

        // Handles de seleção
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

        // Atualizar seleção ao scroll
        this.viewport.addEventListener('scroll', () => {
            if (this.selectedId) this._updateSelectionBox();
        });

        // Cursor de resize ao pairar nas bordas do elemento selecionado
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
            const minX = 0, minY = 0;
            const maxX = Math.max(0, this.boardWidth - w);
            const maxY = Math.max(0, this.boardHeight - h);
            let newX = clamp(this.dragStart.elX + dx, minX, maxX);
            let newY = clamp(this.dragStart.elY + dy, minY, maxY);

            const bcX = this.boardWidth / 2;
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
            aspectRatio: rect.width / rect.height
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

        // Manter dentro da área de edição do quadro
        width = Math.min(width, Math.max(20, this.boardWidth - x));
        height = Math.min(height, Math.max(20, this.boardHeight - y));
        x = clamp(x, 0, Math.max(0, this.boardWidth - width));
        y = clamp(y, 0, Math.max(0, this.boardHeight - height));

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
