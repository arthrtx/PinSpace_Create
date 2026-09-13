/**
 * app.js — Orquestrador principal da aplicação PinSpace Create
 */

const BACKGROUND_REMOVAL_CDN = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.7/dist/index.mjs';

class PinSpaceApp {
    constructor() {
        this.project = null;
        this.history = new HistoryManager();
        this.ui = new UIManager();
        this.board = null;
        this.brush = null;
        this.isDirty = false;
        this._cropTargetId = null;
        this._dropPreviewURL = null;
        this._clipboard = null;
        this._pasteOffset = 0;
    }

    init() {
        this._initBoard();
        this._bindUI();
        this._applySettings();
        this._showHome();
        this._startAutosave();
    }

    _startAutosave() {
        this._autosaveTimer = setInterval(() => {
            if (this.project && this.isDirty && this.ui.editorView.classList.contains('active')) {
                this.saveCurrentProject(true);
            }
        }, 30000);
    }

    _initBoard() {
        this.board = new BoardManager(
            document.getElementById('board-viewport'),
            document.getElementById('board-canvas'),
            document.getElementById('board-elements'),
            document.getElementById('selection-box')
        );

        this.brush = new BrushManager(this.board, this.board.canvas);
        this.brush.onStroke = (result) => this._commitBrushStroke(result);
        this.ui.setBrushSettings(this.brush.settings);

        this.board.onSelectionChange = (id) => {
            this._refreshPanel();
        };

        this.board.onElementUpdate = () => {
            this._syncSelectedFromDOM();
            this._commitHistory();
        };
    }

    _bindUI() {
        this.ui.bindHomeEvents();
        this.ui.bindEditorEvents();

        this.ui.on('onNewProject', (size) => this.createNewProject(size));
        this.ui.on('onOpenProject', (id) => this.openProject(id));
        this.ui.on('onDeleteProject', (id) => this._deleteProject(id));
        this.ui.on('onSearchProjects', (q) => this._searchProjects(q));
        this.ui.on('onShowOpenModal', () => this._showOpenModal());
        this.ui.on('onBackHome', () => this._backToHome());
        this.ui.on('onSave', () => this.saveCurrentProject());
        this.ui.on('onUndo', () => this.undo());
        this.ui.on('onRedo', () => this.redo());
        this.ui.on('onZoomIn', () => { this.board.zoomIn(); this.ui.updateZoomLevel(this.board.getZoom()); });
        this.ui.on('onZoomOut', () => { this.board.zoomOut(); this.ui.updateZoomLevel(this.board.getZoom()); });
        this.ui.on('onZoomFit', () => { this.board.zoomFit(); this.ui.updateZoomLevel(this.board.getZoom()); });
        this.ui.on('onToolChange', (tool) => this._changeTool(tool));
        this.ui.on('onFocusIdeias', () => this._focusIdeiasSearch());
        this.ui.on('onTitleChange', (title) => { this.project.titulo = title; this.isDirty = true; });
        this.ui.on('onExport', (format) => this._export(format));
        this.ui.on('onThemeChange', (theme) => this._setTheme(theme));
        this.ui.on('onContextAction', (action, id) => this._contextAction(action, id));
        this.ui.on('onSelectElement', (id) => this._selectElement(id));
        this.ui.on('onCropApply', (rect) => this._applyCrop(rect));

        this.history.onChange(({ canUndo, canRedo }) => {
            this.ui.updateHistoryButtons(canUndo, canRedo);
        });

        // Responsividade: ajusta o quadro ao redimensionar a janela
        window.addEventListener('resize', () => {
            if (this.project) {
                this.board.zoomFit();
                this.ui.updateZoomLevel(this.board.getZoom());
            }
        });

        // Input de imagem
        this._imageInputMode = 'add';
        document.getElementById('input-imagem').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (this._imageInputMode === 'replace') {
                await this._replaceSelectedImage(file);
            } else {
                await this._addImage(file);
            }
            this._imageInputMode = 'add';
            e.target.value = '';
        });

        document.getElementById('input-bg-imagem').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                this._setBackground({ tipo: 'imagem', valor: ev.target.result });
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        });

        // Arrastar-e-soltar imagens para o quadro (estilo Canva)
        const dropOverlay = document.getElementById('drop-overlay');
        this._dragDepth = 0;
        const repaintDropOverlay = () => {
            dropOverlay.classList.toggle('hidden', this._dragDepth === 0);
        };

        window.addEventListener('dragenter', (e) => {
            if (!this.project || (!hasDraggableImage(e.dataTransfer) && !hasDraggableShape(e.dataTransfer))) return;
            e.preventDefault();
            if (hasDraggableImage(e.dataTransfer) && this._dragDepth === 0) this._prepareDropChip(e);
            this._dragDepth++;
            repaintDropOverlay();
        });

        window.addEventListener('dragover', (e) => {
            if (!this.project || (!hasDraggableImage(e.dataTransfer) && !hasDraggableShape(e.dataTransfer))) return;
            e.preventDefault();
            this._moveDropChip(e);
        });

        window.addEventListener('dragleave', (e) => {
            if (!this.project) return;
            this._dragDepth = Math.max(0, this._dragDepth - 1);
            if (this._dragDepth === 0) this._hideDropChip();
            repaintDropOverlay();
        });

        window.addEventListener('dragend', () => {
            this._dragDepth = 0;
            this._hideDropChip();
            repaintDropOverlay();
        });

        window.addEventListener('drop', async (e) => {
            e.preventDefault();
            this._dragDepth = 0;
            this._hideDropChip();
            repaintDropOverlay();
            if (!this.project) {
                this.ui.showToast('Crie ou abra um quadro primeiro.');
                return;
            }
            const shapeType = getDraggedShapeType(e.dataTransfer);
            if (shapeType) {
                const pos = this._dropToCanvasCoords(e.clientX, e.clientY);
                this._addShapeAt(shapeType, pos.x, pos.y);
                this.ui.showToast('Forma adicionada!');
                return;
            }
            const file = await getDroppedImageFile(e.dataTransfer);
            if (!file) {
                this.ui.showToast('Arraste uma imagem para o quadro.');
                return;
            }
            const pos = this._dropToCanvasCoords(e.clientX, e.clientY);
            await this._addImage(file, pos.x, pos.y);
            this.ui.showToast('Imagem adicionada!');
        });

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            if (!this.project) return;
            if (e.target.isContentEditable || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const ctrl = e.ctrlKey || e.metaKey;
            const selectedId = this.board.getSelectedId();
            const selectedEl = selectedId ? this.project.elementos.find(item => item.id === selectedId) : null;

            if (ctrl) {
                if (e.key === 'z') { e.preventDefault(); this.undo(); return; }
                if (e.key === 'y') { e.preventDefault(); this.redo(); return; }
                if (e.key === 's') { e.preventDefault(); this.saveCurrentProject(); return; }
                if (e.key === 'd') { e.preventDefault(); this._duplicateSelected(); return; }
                if (e.key === 'c' && selectedEl) { e.preventDefault(); this._copyElement(selectedEl); return; }
                if (e.key === 'x' && selectedEl) { e.preventDefault(); this._cutElement(selectedEl); return; }
                if (e.key === 'v') { e.preventDefault(); this._pasteElement(); return; }
            }

            if (e.key === 'Delete' && selectedEl) {
                this._deleteElement(selectedId);
                return;
            }

            if (e.key === 'Escape' && selectedId) {
                this.board.selectElement(null);
                return;
            }

            if (e.key === '=' || e.key === '+') { e.preventDefault(); this.board.zoomIn(); this.ui.updateZoomLevel(this.board.getZoom()); return; }
            if (e.key === '-') { e.preventDefault(); this.board.zoomOut(); this.ui.updateZoomLevel(this.board.getZoom()); return; }
            if (e.key === '0' && !ctrl) { e.preventDefault(); this.board.zoomFit(); this.ui.updateZoomLevel(this.board.getZoom()); return; }

            // Mover com setas (Shift = 10 px)
            if (selectedEl && !selectedEl.bloqueada) {
                let dx = 0, dy = 0;
                if (e.key === 'ArrowLeft') dx = -1;
                else if (e.key === 'ArrowRight') dx = 1;
                else if (e.key === 'ArrowUp') dy = -1;
                else if (e.key === 'ArrowDown') dy = 1;
                if (dx || dy) {
                    e.preventDefault();
                    if (e.shiftKey) { dx *= 10; dy *= 10; }
                    selectedEl.x = clamp(selectedEl.x + dx, 0, Math.max(0, (this.project.boardWidth || 3000) - selectedEl.width));
                    selectedEl.y = clamp(selectedEl.y + dy, 0, Math.max(0, (this.project.boardHeight || 3000) - selectedEl.height));
                    const dom = this.board.getElementDOM(selectedEl.id);
                    if (dom) {
                        dom.style.left = selectedEl.x + 'px';
                        dom.style.top = selectedEl.y + 'px';
                    }
                    this.board.updateSelectionBox();
                    if (!e.repeat) { this._commitHistory(); this.isDirty = true; }
                }
            }
        });

        // Drag de elementos
        document.getElementById('board-elements').addEventListener('mousedown', (e) => {
            const el = e.target.closest('.board-element');
            if (!el || e.button !== 0) return;
            if (e.target.classList.contains('text-content')) return;

            const data = this.project.elementos.find(item => item.id === el.dataset.id);
            if (!data || data.bloqueada) return;

            e.stopPropagation();
            this._selectElement(data.id);
            const zone = this.board.getEdgeZone(e.clientX, e.clientY, el);
            if (zone) {
                this.board.startResizeFromEdge(e.clientX, e.clientY, zone);
            } else {
                this.board.startDrag(e, data);
            }
        });

        // Scroll por cima de um texto = aumentar / diminuir o tamanho da letra
        document.getElementById('board-elements').addEventListener('wheel', (e) => {
            if (!this.project) return;
            const domEl = e.target.closest('.board-element');
            if (!domEl) return;
            const el = this.project.elementos.find(x => x.id === domEl.dataset.id);
            if (!el || el.tipo !== 'texto' || el.bloqueada) return;
            const textEl = domEl.querySelector('.text-content');
            if (textEl && document.activeElement === textEl) return;

            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY < 0 ? 1 : -1;
            el.tamanho = clamp((el.tamanho || 24) + delta, 8, 400);
            this._renderElement(el);
            this.board.updateSelectionBox();
            this.isDirty = true;
            if (!this._resizeTextTimer) this._commitHistory();
            clearTimeout(this._resizeTextTimer);
            this._resizeTextTimer = setTimeout(() => { this._resizeTextTimer = null; }, 400);
        });
    }

    _applySettings() {
        const settings = getSettings();
        this.ui.applyTheme(settings.theme || 'light');
    }

    _setTheme(theme) {
        this.ui.applyTheme(theme);
        saveSettings({ ...getSettings(), theme });
    }

    _showHome() {
        this.ui.showHome();
        this.ui.renderProjectsList(getAllProjects());
        this._loadPublicGallery();
    }

    async _loadPublicGallery() {
        try {
            const data = await getPublicCollages();
            window.PUBLIC_API_OK = true;
            this.ui.renderPublicList(data.collages || []);
        } catch {
            window.PUBLIC_API_OK = false;
            this.ui.renderPublicList(null);
        }
    }

    async _openPublic(id) {
        const local = getAllProjects().find(p => p.publicKey === id);
        if (local) {
            this.openProject(local.id);
            this.ui.showToast('Abriu uma cópia sua que está publicada.');
            return;
        }

        try {
            const data = await getPublicCollage(id);
            const original = data.collage;
            if (!original || !original.projeto) throw new Error('Quadro vazio');

            if (this.project && this.isDirty) {
                if (!confirm('Abrir este quadro público? Alterações não guardadas serão perdidas.')) return;
            }

            const base = original.projeto;
            const copy = {
                ...createEmptyProject(generateId(), (base.titulo || 'Sem título') + ' (cópia)'),
                boardWidth: base.boardWidth || 3000,
                boardHeight: base.boardHeight || 3000,
                background: base.background || { tipo: 'cor', valor: '#e8e8e8' },
                grade: base.grade == null ? 'pontos' : base.grade,
                elementos: (base.elementos || []).map(el => {
                    const nel = JSON.parse(JSON.stringify(el));
                    nel.id = generateId();
                    nel.layer = el.layer;
                    return nel;
                }),
                autor: base.autor || 'Anónimo'
            };

            this.project = copy;
            this.history.clear();
            this.isDirty = true;
            this._loadProjectIntoEditor();
            this.ui.showToast('Quadro público copiado para os seus projetos — edite à vontade!');
        } catch {
            window.PUBLIC_API_OK = false;
            this.ui.showToast('Não foi possível abrir o quadro público. Verifique se o servidor está a correr.');
        }
    }

    async _publishProject(autor, isUpdate = false) {
        if (!this.project || !this.project.id) return;

        this.project.autor = (autor || '').trim() || 'Anónimo';
        this._syncAllFromDOM();

        let thumb = this.project.thumbnail;
        try {
            if (!thumb) thumb = await generateThumbnailDataURL(this.project);
        } catch { /* thumb opcional */ }

        const payload = {
            publicId: this.project.publico ? this.project.publicKey : null,
            titulo: this.project.titulo || 'Sem título',
            autor: this.project.autor,
            thumb,
            projeto: JSON.parse(JSON.stringify({ ...this.project, thumbnail: undefined, publicKey: undefined }))
        };

        try {
            const res = await publishPublicCollage(payload);
            window.PUBLIC_API_OK = true;
            this.project.publico = true;
            this.project.publicKey = res.id;
            this.project.publicadoAt = new Date().toISOString();
            this.project.thumbnail = thumb;
            saveProject(this.project);
            this.isDirty = false;
            this._refreshPanel();
            this.ui.showToast(isUpdate ? 'Quadro público atualizado!' : 'Quadro publicado! Já aparece no início do site.');
        } catch {
            window.PUBLIC_API_OK = false;
            this.ui.showToast('Falha ao publicar. Inicie o servidor com python server.py.');
        }
    }

    async _unpublishProject() {
        if (!this.project || !this.project.publicKey) return;

        try {
            await deletePublicCollage(this.project.publicKey);
            window.PUBLIC_API_OK = true;
        } catch {
            window.PUBLIC_API_OK = false;
        }

        this.project.publico = false;
        this.project.publicKey = null;
        this.project.publicadoAt = null;
        saveProject(this.project);
        this._refreshPanel();
        this.ui.showToast('Quadro tornou-se privado.');
    }

    _backToHome() {
        if (this.isDirty) {
            if (confirm('Guardar alterações antes de sair?')) {
                this.saveCurrentProject();
            }
        }
        this.project = null;
        this._showHome();
    }

    createNewProject(size) {
        if (this.project && this.isDirty) {
            if (!confirm('Criar novo projeto? Alterações não guardadas serão perdidas.')) return;
        }

        const id = generateId();
        const width = size?.width || 3000;
        const height = size?.height || 3000;
        this.project = createEmptyProject(id, 'Sem título', width, height);
        this.history.clear();
        this.isDirty = false;
        this._loadProjectIntoEditor();
    }

    openProject(id) {
        const project = getAllProjects().find(p => p.id === id);
        if (!project) return;

        if (this.project && this.isDirty) {
            if (!confirm('Abrir outro projeto? Alterações não guardadas serão perdidas.')) return;
        }

        this.project = JSON.parse(JSON.stringify(project));
        this.history.clear();
        this.isDirty = false;
        this._loadProjectIntoEditor();
    }

    _loadProjectIntoEditor() {
        this.ui.showEditor();
        this.ui.openSideIdeas(this._getPanelCallbacks());
        this.ui.setProjectTitle(this.project.titulo);
        this.ui.setActiveTool('select');
        this.ui.showPanel('select', null, this._getPanelCallbacks());

        this.board.setBoardSize(this.project.boardWidth || 3000, this.project.boardHeight || 3000);
        this.brush.syncSize();
        this.board.zoomFit();
        this.board.applyBackground(this.project.background);
        this.board.setGrid(this.project.grade == null ? 'pontos' : this.project.grade);
        this.board.clearElements();

        this.project.elementos.forEach(el => this._renderElement(el));
        this.ui.updateZoomLevel(this.board.getZoom());
        this._updateSizeBadge();
    }

    async saveCurrentProject(silent = false) {
        if (!this.project) return;

        this._syncAllFromDOM();

        if (!silent || !this.project.thumbnail) {
            try {
                this.project.thumbnail = await generateThumbnailDataURL(this.project);
            } catch { /* thumbnail opcional */ }
        }

        saveProject(this.project);
        this.isDirty = false;
        if (!silent) this.ui.showToast('Projeto guardado com sucesso!');
    }

    _deleteProject(id) {
        deleteProject(id);
        this.ui.renderProjectsList(getAllProjects());
        this.ui.showToast('Projeto eliminado.');
    }

    _searchProjects(query) {
        this.ui.renderProjectsList(searchProjects(query));
    }

    _showOpenModal() {
        this.ui.renderModalProjectsList(getAllProjects());
        document.getElementById('modal-abrir').showModal();
    }

    async _addImage(file, x, y) {
        const el = await importImageFromFile(file, this.project.elementos, x, y);
        this._clampElementBounds(el);
        this.project.elementos.push(el);
        this._renderElement(el);
        this._selectElement(el.id);
        this._commitHistory();
        this.isDirty = true;
    }

    _dropToCanvasCoords(clientX, clientY) {
        const vp = this.board.viewport;
        const vpRect = vp.getBoundingClientRect();
        const desk = vp.querySelector('.board-desk');
        const ds = getComputedStyle(desk);
        const padX = parseFloat(ds.paddingLeft) || 56;
        const padY = parseFloat(ds.paddingTop) || 56;
        const zoom = this.board.getZoom();
        return {
            x: Math.max(0, Math.round((clientX - vpRect.left + vp.scrollLeft - padX) / zoom)),
            y: Math.max(0, Math.round((clientY - vpRect.top + vp.scrollTop - padY) / zoom))
        };
    }

    _prepareDropChip(e) {
        const chip = document.getElementById('drop-chip');
        if (!chip) return;
        chip.classList.remove('hidden');
        if (this._dropPreviewURL) {
            URL.revokeObjectURL(this._dropPreviewURL);
            this._dropPreviewURL = null;
        }
        const img = chip.querySelector('#drop-chip-img');
        try {
            const items = Array.from(e.dataTransfer.items || []);
            const item = items.find(it => it.kind === 'file');
            const f = item ? item.getAsFile() : e.dataTransfer.files[0];
            if (f && f.type && f.type.startsWith('image/')) {
                this._dropPreviewURL = URL.createObjectURL(f);
                img.src = this._dropPreviewURL;
                img.classList.remove('hidden');
            } else {
                img.classList.add('hidden');
            }
        } catch {
            img.classList.add('hidden');
        }
        this._moveDropChip(e);
    }

    _moveDropChip(e) {
        const chip = document.getElementById('drop-chip');
        if (!chip) return;
        chip.style.left = (e.clientX + 18) + 'px';
        chip.style.top = (e.clientY + 18) + 'px';
    }

    _hideDropChip() {
        const chip = document.getElementById('drop-chip');
        if (!chip) return;
        chip.classList.add('hidden');
        if (this._dropPreviewURL) {
            URL.revokeObjectURL(this._dropPreviewURL);
            this._dropPreviewURL = null;
        }
    }

    _updateSizeBadge() {
        const badge = document.getElementById('board-size-badge');
        if (badge && this.project) {
            badge.textContent = `${this.project.boardWidth || 3000} × ${this.project.boardHeight || 3000} px`;
        }
    }

    async _replaceSelectedImage(file) {
        const id = this.board.getSelectedId();
        const el = this.project.elementos.find(e => e.id === id && e.tipo === 'imagem');
        if (!el) {
            await this._addImage(file);
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            el.src = ev.target.result;
            this._renderElement(el);
            this._commitHistory();
            this.isDirty = true;
        };
        reader.readAsDataURL(file);
    }

    _addText(conteudo) {
        if (!this.project) return;
        const el = addTextElement(this.project.elementos);
        if (String(conteudo || '').trim()) el.conteudo = String(conteudo).trim();
        this._clampElementBounds(el);
        this.project.elementos.push(el);
        this._renderElement(el);
        this._selectElement(el.id);
        this._commitHistory();
        this.isDirty = true;
    }

    _addTextPreset(preset) {
        if (!this.project) return;
        const el = createTextPreset(preset, this.project.elementos);
        this._clampElementBounds(el);
        this.project.elementos.push(el);
        this._renderElement(el);
        this._selectElement(el.id);
        this._commitHistory();
        this.isDirty = true;
    }

    _addShape(type) {
        this._addShapeAt(type, 300, 300);
    }

    _addShapeAt(type, x, y) {
        const el = createShape(type, x, y, getNextLayer(this.project.elementos));
        this._clampElementBounds(el);
        this.project.elementos.push(el);
        this._renderElement(el);
        this._selectElement(el.id);
        this._commitHistory();
        this.isDirty = true;
    }

    _commitBrushStroke(result) {
        if (!this.project || !result) return;
        if (result.mode === 'borracha') {
            this._commitEraserStroke(result);
            return;
        }
        const el = {
            tipo: 'imagem',
            id: generateId(),
            src: result.src,
            x: result.x,
            y: result.y,
            width: result.width,
            height: result.height,
            rotation: 0,
            escala: 1,
            opacidade: 1,
            filtro: 'none',
            brilho: 1,
            contraste: 1,
            saturacao: 1,
            flipX: false,
            flipY: false,
            layer: getNextLayer(this.project.elementos),
            bloqueada: false,
            visivel: true,
            nome: 'Desenho'
        };
        this.project.elementos.push(el);
        this._renderElement(el);
        this._commitHistory();
        this.isDirty = true;
    }

    async _commitEraserStroke(strokeResult) {
        const boardW = this.board.boardWidth;
        const boardH = this.board.boardHeight;
        if (!strokeResult.points || strokeResult.points.length < 2) return;

        const pad = Math.max(40, strokeResult.size * 3);
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of strokeResult.points) {
            minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        }
        const b = {
            x: Math.max(0, Math.floor(minX - pad)),
            y: Math.max(0, Math.floor(minY - pad)),
            w: 0,
            h: 0
        };
        b.w = Math.min(boardW, Math.ceil(maxX + pad)) - b.x;
        b.h = Math.min(boardH, Math.ceil(maxY + pad)) - b.y;
        if (b.w < 2 || b.h < 2) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = b.w;
        tempCanvas.height = b.h;
        const tempCtx = tempCanvas.getContext('2d');

        await drawBackground(tempCtx, this.project.background, b.w, b.h);

        const sorted = sortByLayer(this.project.elementos);
        for (const el of sorted) {
            if (el.visivel === false) continue;
            if (!this._elementOverlapsBounds(el, b)) continue;
            tempCtx.save();
            tempCtx.translate(-b.x, -b.y);
            await drawElement(tempCtx, el);
            tempCtx.restore();
        }

        tempCtx.globalCompositeOperation = 'destination-out';
        tempCtx.lineCap = 'round';
        tempCtx.lineJoin = 'round';
        tempCtx.lineWidth = Math.max(1, strokeResult.size);
        tempCtx.beginPath();
        tempCtx.moveTo(strokeResult.points[0].x - b.x, strokeResult.points[0].y - b.y);
        for (let i = 1; i < strokeResult.points.length; i++) {
            tempCtx.lineTo(strokeResult.points[i].x - b.x, strokeResult.points[i].y - b.y);
        }
        tempCtx.stroke();
        tempCtx.globalCompositeOperation = 'source-over';

        const composite = {
            tipo: 'imagem',
            id: generateId(),
            src: tempCanvas.toDataURL('image/png'),
            x: b.x,
            y: b.y,
            width: b.w,
            height: b.h,
            rotation: 0,
            escala: 1,
            opacidade: 1,
            filtro: 'none',
            brilho: 1,
            contraste: 1,
            saturacao: 1,
            flipX: false,
            flipY: false,
            layer: 0,
            bloqueada: false,
            visivel: true,
            nome: 'Borracha'
        };

        this.project.elementos = this.project.elementos.filter(el => {
            if (el.visivel === false) return true;
            return !this._elementOverlapsBounds(el, b);
        });
        this.project.elementos.push(composite);

        this._rerenderAll();
        this._commitHistory();
        this.isDirty = true;
        this.ui.showToast('Área apagada.');
    }

    _elementOverlapsBounds(el, b) {
        return el.x < b.x + b.w && el.x + el.width > b.x && el.y < b.y + b.h && el.y + el.height > b.y;
    }

    _clampElementBounds(el) {
        const W = this.project.boardWidth || 3000;
        const H = this.project.boardHeight || 3000;
        el.x = clamp(el.x, 0, Math.max(0, W - el.width));
        el.y = clamp(el.y, 0, Math.max(0, H - el.height));
        if (el.width > 20) el.width = Math.min(el.width, Math.max(20, W - el.x));
        if (el.height > 20) el.height = Math.min(el.height, Math.max(20, H - el.y));
        return el;
    }

    _addSticker(emoji) {
        if (!this.project) return;
        const el = createStickerElement(emoji, this.project.elementos);
        el.x = (this.project.boardWidth / 2) - el.width / 2;
        el.y = (this.project.boardHeight / 2) - el.height / 2;
        this._clampElementBounds(el);
        this.project.elementos.push(el);
        this._renderElement(el);
        this._selectElement(el.id);
        this._commitHistory();
        this.isDirty = true;
    }

    _addFrame(frameId) {
        if (!this.project) return;
        const el = createFrameElement(frameId, this.project.boardWidth, this.project.boardHeight, this.project.elementos);
        this.project.elementos.push(el);
        this._renderElement(el);
        this._commitHistory();
        this.isDirty = true;
        this.ui.showToast('Moldura adicionada (atrás do conteúdo).');
    }

    _getSelectedImage() {
        const id = this.board.getSelectedId();
        return id ? this.project.elementos.find(e => e.id === id && e.tipo === 'imagem') : null;
    }

    async _addIdeaImage(url, nome, bak) {
        if (!this.project) return;
        this.ui.showToast('A carregar ideia…');
        try {
            const src = await fetchImageDataURL([url, bak], 1400);
            const layer = getNextLayer(this.project.elementos);
            const el = createImageElement(src, 100, 100, layer);
            el.nome = nome ? `Ideia (${nome})` : 'Ideia';
            el.raio = 12;
            const img = await loadImage(src);
            const ratio = img.naturalWidth / img.naturalHeight || 1;
            el.width = Math.min(420, img.naturalWidth);
            el.height = el.width / ratio;
            this._clampElementBounds(el);
            this.project.elementos.push(el);
            this._renderElement(el);
            this._selectElement(el.id);
            this._commitHistory();
            this.isDirty = true;
            this.ui.showToast('Ideia adicionada! ✨');
        } catch (err) {
            console.error(err);
            this.ui.showToast('Erro a carregar a imagem da ideia.');
        }
    }

    _autoColagem() {
        const imgs = (this.project.elementos || [])
            .filter(e => e.tipo === 'imagem' && e.visivel !== false);
        if (!imgs.length) {
            this.ui.showToast('Não há imagens no quadro para fazer colagem.');
            return;
        }
        const W = this.project.boardWidth || 3000;
        const H = this.project.boardHeight || 3000;
        const P = 18;
        const GAP = 14;
        const n = imgs.length;
        const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt(n * (W / H)))));
        const rows = Math.ceil(n / cols);
        const cellW = (W - P * 2 - GAP * (cols - 1)) / cols;
        const cellH = (H - P * 2 - GAP * (rows - 1)) / rows;

        imgs.forEach((el, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const ar = Math.max(0.05, (el.width || 200) / (el.height || 200));
            let w = cellW;
            let h = cellW / ar;
            if (h > cellH) {
                h = cellH;
                w = h * ar;
            }
            el.width = Math.round(Math.min(w, W - P * 2));
            el.height = Math.round(Math.min(h, H - P * 2));
            const cw = (cellW - el.width) / 2;
            const ch = (cellH - el.height) / 2;
            el.x = Math.round(clamp(P + col * (cellW + GAP) + cw, 0, Math.max(0, W - el.width)));
            el.y = Math.round(clamp(P + row * (cellH + GAP) + ch, 0, Math.max(0, H - el.height)));
            el.rotation = 0;
            el.raio = Math.min(el.raio ?? 8, 26);
        });

        this._rerenderAll();
        this._commitHistory();
        this.isDirty = true;
        this.ui.showToast(`Colagem automática criada com ${n} imagem(ns) ✓`);
    }

    _openCropImage() {
        const el = this._getSelectedImage();
        if (!el || !el.src) {
            this.ui.showToast('Selecione uma imagem para recortar.');
            return;
        }
        this._cropTargetId = el.id;
        this.ui.openCropModal(el);
    }

    async _applyCrop(rect) {
        const el = this._cropTargetId
            ? this.project.elementos.find(e => e.id === this._cropTargetId)
            : null;
        if (!el || !el.src) return;
        try {
            const img = await loadImage(el.src);
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            const px = {
                x: nw * rect.x / 100,
                y: nh * rect.y / 100,
                w: nw * rect.w / 100,
                h: nh * rect.h / 100
            };
            if (px.w < 2 || px.h < 2) return;
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(px.w);
            canvas.height = Math.round(px.h);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, px.x, px.y, px.w, px.h, 0, 0, canvas.width, canvas.height);
            el.src = canvas.toDataURL('image/png');
            el.height = el.width * (canvas.height / canvas.width);
            this._renderElement(el);
            this.board.updateSelectionBox();
            this._commitHistory();
            this.isDirty = true;
            this._refreshPanel();
            this.ui.showToast('Recorte aplicado!');
        } catch (err) {
            console.error(err);
            this.ui.showToast('Erro ao recortar a imagem.');
        }
    }

    async _removeBackgroundSelected() {
        const el = this._getSelectedImage();
        if (!el || !el.src) {
            this.ui.showToast('Selecione uma imagem.');
            return;
        }
        this.ui.showToast('A preparar remoção de fundo (1ª vez descarrega o modelo)…');
        try {
            if (!this._bgModule) {
                this._bgModule = await import(BACKGROUND_REMOVAL_CDN);
            }
            const startTime = Date.now();
            let timer = null;
            const updateToast = () => {
                const secs = Math.floor((Date.now() - startTime) / 1000);
                this.ui.showToast(`A remover fundo com IA… ${secs}s (1ª vez é mais lento)`, 120000);
            };
            timer = setInterval(updateToast, 700);
            updateToast();

            try {
                const blob = await this._bgModule.removeBackground(el.src, {
                    model: 'isnet_quint8',
                    output: { format: 'image/png' }
                });
                clearInterval(timer);
                el.src = await blobToDataURL(blob);
                this._renderElement(el);
                this.board.updateSelectionBox();
                this._commitHistory();
                this.isDirty = true;
                this._refreshPanel();
                this.ui.showToast('Fundo removido!');
                return;
            } catch (aiErr) {
                clearInterval(timer);
                console.warn('AI removeBackground failed, trying manual fallback:', aiErr);
                this.ui.showToast('A remover fundo localmente (rápido)…');
                try {
                    el.src = await removeBackgroundManual(el.src);
                    this._renderElement(el);
                    this.board.updateSelectionBox();
                    this._commitHistory();
                    this.isDirty = true;
                    this._refreshPanel();
                    this.ui.showToast('Fundo removido (método local)!');
                } catch (manualErr) {
                    console.error(manualErr);
                    this.ui.showToast('Não foi possível remover o fundo.');
                }
            }
        } catch (loadErr) {
            console.error(loadErr);
            this.ui.showToast('Não foi possível carregar o módulo de remoção.');
        }
    }

    _renderElement(el) {
        if (el.tipo === 'texto') {
            const t = String(el.conteudo || '').trim();
            el.nome = (t ? t.slice(0, 26).replace(/\s+/g, ' ') : 'Texto');
            if (t.length > 26) el.nome += '…';
        }

        const dom = this.board.renderElement(el);

        switch (el.tipo) {
            case 'imagem':
                renderImageElement(dom, el);
                break;
            case 'texto':
                renderTextElement(dom, el);
                bindTextContentEdit(dom, el, (updated, commit) => {
                    Object.assign(el, updated);
                    if (commit) this._commitHistory();
                    this.isDirty = true;
                });
                break;
            case 'forma':
                renderShapeElement(dom, el);
                break;
        }

        dom.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (e.target.classList.contains('text-content')) {
                this._selectElement(el.id);
                return;
            }
        });
    }

    _selectElement(id) {
        this.board.selectElement(id);
        this._refreshPanel();
    }

    _refreshPanel() {
        const selectedId = this.board.getSelectedId();
        const selected = selectedId
            ? this.project.elementos.find(e => e.id === selectedId)
            : null;
        this.ui.showPanel(this.ui.currentTool, selected, this._getPanelCallbacks());
    }

    _getPanelCallbacks() {
        return {
            onImportImage: () => {
                this._imageInputMode = 'add';
                document.getElementById('input-imagem').click();
            },
            onReplaceImage: () => {
                this._imageInputMode = 'replace';
                document.getElementById('input-imagem').click();
            },
            onAddText: (conteudo) => this._addText(conteudo),
            onAddTextPreset: (preset) => this._addTextPreset(preset),
            onAddShape: (type) => this._addShape(type),
            onUpdate: (el, commit = true) => {
                this._renderElement(el);
                this.board.updateSelectionBox();
                if (commit) this._commitHistory();
                this.isDirty = true;
            },
            onUpdateElement: (el, commit) => {
                this._renderElement(el);
                if (commit) this._commitHistory();
                this.isDirty = true;
                this._refreshPanel();
            },
            onBackgroundChange: (bg) => this._setBackground(bg),
            getBackground: () => this.project?.background,
            onImportBgImage: () => document.getElementById('input-bg-imagem').click(),
            getGrid: () => this.project?.grade || null,
            onGridChange: (mode) => {
                this.project.grade = mode === null ? 'none' : mode;
                this.board.setGrid(mode);
                this._commitHistory();
                this.isDirty = true;
            },
            onAddSticker: (emoji) => this._addSticker(emoji),
            onAddFrame: (frameId) => this._addFrame(frameId),
            onCropImage: () => this._openCropImage(),
            onRemoveBackground: () => this._removeBackgroundSelected(),
            onAddIdeaImage: (url, nome, bak) => this._addIdeaImage(url, nome, bak),
            onAutoCollage: () => this._autoColagem(),
            getElements: () => this.project?.elementos || [],
            onSelectElement: (id) => this._selectElement(id),
            onDeleteElement: (id) => this._deleteElement(id),
            onDuplicateElement: (id) => {
                const el = this.project.elementos.find(e => e.id === id);
                if (el) this._duplicateElement(el);
            },
            onAlign: (align) => this._alignSelected(align),
            onOrder: (action) => this._orderSelected(action),
            onLayersReordered: () => {
                this._commitHistory();
                this.isDirty = true;
                this._refreshPanel();
            },
            getPublicInfo: () => ({
                publico: !!(this.project && this.project.publico),
                autor: (this.project && this.project.autor) || 'Anónimo',
                server: !!window.PUBLIC_API_OK
            }),
            onPublish: (autor) => this._publishProject(autor, false),
            onUpdatePublic: (autor) => this._publishProject(autor, true),
            onUnpublish: () => this._unpublishProject(),
            onOpenPublic: (id) => this._openPublic(id)
        };
    }

    _setBackground(bg) {
        this.project.background = bg;
        this.board.applyBackground(bg);
        this._commitHistory();
        this.isDirty = true;
    }

    _changeTool(tool) {
        this.ui.setActiveTool(tool);
        this.brush.setActive(tool === 'brush');
        const selectedId = this.board.getSelectedId();
        const selected = selectedId
            ? this.project.elementos.find(e => e.id === selectedId)
            : null;
        this.ui.showPanel(tool, selected, this._getPanelCallbacks());

        if (tool === 'image') {
            // Não abrir automaticamente — utilizador clica no botão do painel
        }
    }

    _focusIdeiasSearch() {
        if (!this.ui.isSideIdeasOpen()) this.ui.openSideIdeas(this._getPanelCallbacks());
        this.ui.focusSideIdeasSearch(this._getPanelCallbacks());
    }

    _deleteElement(id) {
        this.project.elementos = this.project.elementos.filter(e => e.id !== id);
        this.board.removeElementDOM(id);
        this._commitHistory();
        this.isDirty = true;
        this._refreshPanel();
    }

    _contextAction(action, id) {
        const el = this.project.elementos.find(e => e.id === id);
        if (!el) return;

        switch (action) {
            case 'duplicate':
                this._duplicateElement(el);
                break;
            case 'rotate':
                el.rotation = ((el.rotation || 0) + 90) % 360;
                this._renderElement(el);
                this.board.updateSelectionBox();
                this._commitHistory();
                break;
            case 'bring-front':
                bringToFront(this.project.elementos, id);
                this._rerenderAll();
                this._commitHistory();
                break;
            case 'send-back':
                sendToBack(this.project.elementos, id);
                this._rerenderAll();
                this._commitHistory();
                break;
            case 'lock':
                el.bloqueada = !el.bloqueada;
                this._renderElement(el);
                this._commitHistory();
                break;
            case 'hide':
                el.visivel = el.visivel === false ? true : false;
                this._renderElement(el);
                this._commitHistory();
                break;
            case 'delete':
                this._deleteElement(id);
                break;
        }
        this.isDirty = true;
    }

    _duplicateElement(el) {
        const layer = getNextLayer(this.project.elementos);
        let copy;
        switch (el.tipo) {
            case 'imagem': copy = duplicateImage(el, layer); break;
            case 'texto': copy = duplicateText(el, layer); break;
            case 'forma': copy = duplicateShape(el, layer); break;
        }
        if (copy) {
            copy.x += 24;
            copy.y += 24;
            this._clampElementBounds(copy);
            this.project.elementos.push(copy);
            this._renderElement(copy);
            this._selectElement(copy.id);
            this._commitHistory();
        }
    }

    _duplicateSelected() {
        const id = this.board.getSelectedId();
        const el = this.project.elementos.find(e => e.id === id);
        if (!el || el.bloqueada) return;
        this._duplicateElement(el);
    }

    _copyElement(el) {
        this._clipboard = JSON.parse(JSON.stringify(el));
        this._pasteOffset = 0;
        this.ui.showToast('Elemento copiado.');
    }

    _cutElement(el) {
        this._copyElement(el);
        this.ui.showToast('Elemento cortado.');
        this._deleteElement(el.id);
    }

    _pasteElement() {
        if (!this._clipboard) {
            this.ui.showToast('Nada para colar.');
            return;
        }
        const copy = JSON.parse(JSON.stringify(this._clipboard));
        copy.id = generateId();
        copy.layer = getNextLayer(this.project.elementos);
        const offset = 24 + this._pasteOffset * 12;
        copy.x += offset;
        copy.y += offset;
        this._pasteOffset++;
        this._clampElementBounds(copy);
        this.project.elementos.push(copy);
        this._renderElement(copy);
        this._selectElement(copy.id);
        this._commitHistory();
        this.isDirty = true;
        this.ui.showToast('Elemento colado.');
    }

    _alignSelected(align) {
        const id = this.board.getSelectedId();
        const el = this.project.elementos.find(e => e.id === id);
        if (!el || el.bloqueada) return;
        const W = this.project.boardWidth || 3000;
        const H = this.project.boardHeight || 3000;
        switch (align) {
            case 'left': el.x = 0; break;
            case 'hcenter': el.x = Math.max(0, Math.round((W - el.width) / 2)); break;
            case 'right': el.x = Math.max(0, W - el.width); break;
            case 'top': el.y = 0; break;
            case 'vcenter': el.y = Math.max(0, Math.round((H - el.height) / 2)); break;
            case 'bottom': el.y = Math.max(0, H - el.height); break;
        }
        this._renderElement(el);
        this.board.updateSelectionBox();
        this._commitHistory();
        this.isDirty = true;
    }

    _orderSelected(action) {
        const id = this.board.getSelectedId();
        const el = this.project.elementos.find(e => e.id === id);
        if (!el) return;
        switch (action) {
            case 'front': bringToFront(this.project.elementos, id); break;
            case 'back': sendToBack(this.project.elementos, id); break;
            case 'up': moveLayerUp(this.project.elementos, id); break;
            case 'down': moveLayerDown(this.project.elementos, id); break;
        }
        this._rerenderAll();
        this._commitHistory();
        this.isDirty = true;
    }

    _rerenderAll() {
        const selId = this.board.getSelectedId();
        this.board.clearElements();
        this.project.elementos.forEach(el => this._renderElement(el));
        if (selId) this.board.selectElement(selId);
    }

    _syncSelectedFromDOM() {
        const id = this.board.getSelectedId();
        if (!id) return;
        const el = this.project.elementos.find(e => e.id === id);
        if (el) this.board.syncElementFromDOM(id, el);
        this.isDirty = true;
    }

    _syncAllFromDOM() {
        this.project.elementos.forEach(el => {
            this.board.syncElementFromDOM(el.id, el);
        });
    }

    _commitHistory() {
        this.history.push(captureState(this.project));
    }

    undo() {
        const state = this.history.undo(captureState(this.project));
        if (!state) return;
        applyState(this.project, state);
        this._rerenderAll();
        this.board.applyBackground(this.project.background);
        this.board.setGrid(this.project.grade == null ? 'pontos' : this.project.grade);
        this.ui.setProjectTitle(this.project.titulo);
        this._refreshPanel();
        this.isDirty = true;
    }

    redo() {
        const state = this.history.redo(captureState(this.project));
        if (!state) return;
        applyState(this.project, state);
        this._rerenderAll();
        this.board.applyBackground(this.project.background);
        this.board.setGrid(this.project.grade == null ? 'pontos' : this.project.grade);
        this.ui.setProjectTitle(this.project.titulo);
        this._refreshPanel();
        this.isDirty = true;
    }

    async _export(format) {
        this._syncAllFromDOM();
        this.ui.showToast(`A exportar como ${format.toUpperCase()}...`);
        try {
            await exportProject(this.project, format);
            this.ui.showToast(`Exportado com sucesso!`);
        } catch (err) {
            this.ui.showToast('Erro na exportação.');
            console.error(err);
        }
    }
}

function hasDraggableImage(dataTransfer) {
    if (!dataTransfer || !dataTransfer.types) return false;
    const types = Array.from(dataTransfer.types).map(t => String(t).toLowerCase());
    return types.includes('files')
        || types.includes('text/uri-list')
        || types.some(t => t.includes('image'));
}

const SHAPE_DRAG_MIME = 'application/x-pinshape';

function getDraggedShapeType(dataTransfer) {
    if (!dataTransfer) return null;
    try {
        return dataTransfer.getData(SHAPE_DRAG_MIME) || null;
    } catch {
        return null;
    }
}

function hasDraggableShape(dataTransfer) {
    return !!getDraggedShapeType(dataTransfer);
}

async function getDroppedImageFile(dataTransfer) {
    if (!dataTransfer) return null;

    // 1. dataTransfer.items (mais fiável em drag de ficheiros)
    try {
        const items = Array.from(dataTransfer.items || []);
        const fileItem = items.find(it => it.kind === 'file');
        if (fileItem) {
            const f = fileItem.getAsFile();
            if (f) return f;
        }
        const urlItem = items.find(it => it.kind === 'string' && String(it.type).toLowerCase() === 'text/uri-list');
        if (urlItem) {
            const str = await new Promise(res => urlItem.getAsString(res));
            const file = await fileFromUriList(str);
            if (file) return file;
        }
    } catch { /* continua */ }

    // 2. fallback: dataTransfer.files
    const files = Array.from(dataTransfer.files || []);
    const imageFile = files.find(f => f.type && f.type.startsWith('image/'));
    if (imageFile) return imageFile;
    if (files[0]) return files[0];

    // 3. text/uri-list (imagens arrastadas de páginas web)
    try {
        const uriList = dataTransfer.getData('text/uri-list') || '';
        return await fileFromUriList(uriList);
    } catch {
        return null;
    }
}

async function fileFromUriList(uriList) {
    const url = uriList
        .replace(/^#.*$/gm, '')
        .split(/\r?\n/)
        .map(s => s.trim())
        .find(u => u.startsWith('http'));
    if (!url) return null;
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        if (!blob.type.startsWith('image/')) return null;
        return new File([blob], 'imagem', { type: blob.type });
    } catch {
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new PinSpaceApp();
    app.init();
    window.pinspaceApp = app;
});
