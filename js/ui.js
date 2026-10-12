class UIManager {
    constructor() {
        this.homeView = document.getElementById('home-view');
        this.editorView = document.getElementById('editor-view');
        this.panel = document.getElementById('tool-panel');
        this.panelTitle = document.getElementById('panel-title');
        this.panelContent = document.getElementById('panel-content');
        this.contextMenu = document.getElementById('context-menu');
        this.toast = document.getElementById('toast');
        this.currentTool = 'select';
        this.callbacks = {};
        this._brushSettings = null;
        this._designTab = 'stickers';
    }

    setBrushSettings(settings) {
        this._brushSettings = settings;
    }

    on(event, fn) {
        this.callbacks[event] = fn;
    }

    openNewProjectModal(sizeOptions) {
        const modal = document.getElementById('modal-tamanho');
        if (!modal) return;

        const grid = modal.querySelector('#size-options');
        grid.innerHTML = sizeOptions.map(p => `
            <button class="size-card" data-width="${p.width}" data-height="${p.height}">
                <span class="size-card-icon">${p.icon}</span>
                <span class="size-card-name">${p.label}</span>
                <span class="size-card-dims">${p.width} × ${p.height}</span>
            </button>
        `).join('');

        grid.querySelectorAll('.size-card').forEach(card => {
            card.addEventListener('click', () => {
                const size = { width: +card.dataset.width, height: +card.dataset.height };
                modal.close();
                this.callbacks.onNewProject?.(size);
            });
        });

        const customBtn = modal.querySelector('#btn-custom-size');
        customBtn?.addEventListener('click', () => {
            const width = parseInt(modal.querySelector('#custom-width').value, 10) || 1600;
            const height = parseInt(modal.querySelector('#custom-height').value, 10) || 900;
            modal.close();
            this.callbacks.onNewProject?.({ width, height });
        });

        modal.showModal();
    }

    sizePresets() {
        return [
            { icon: '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="8" y="3" width="12" height="22" rx="2.5"/><path d="M11.5 6.5h4.8"/><path d="M11.5 21.5h4.8" stroke-opacity=".4"/></svg>', label: 'Celular', width: 1080, height: 1920 },
            { icon: '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3.5" y="5" width="21" height="14" rx="2"/><path d="M10.5 23.5h7"/><path d="M14 19v4.5"/></svg>', label: 'PC', width: 1920, height: 1080 },
            { icon: '<svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="5" width="22" height="15" rx="2"/><path d="M12 24h6"/><path d="M15 20v4"/><text x="15" y="16.4" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" stroke="none" font-family="inherit" letter-spacing="1">4K</text></svg>', label: 'PC 4K', width: 3840, height: 2160 },
            { icon: '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="6" width="20" height="16" rx="2.5"/><path d="M9.5 10.5l3 3 3-3" stroke-linecap="round" stroke-linejoin="round"/></svg>', label: 'Tablet', width: 1536, height: 2048 },
            { icon: '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="20" height="20" rx="2"/><path d="M20 9.5l-8.5 9L8 15" stroke-linecap="round" stroke-linejoin="round"/></svg>', label: 'Quadrado', width: 1080, height: 1080 }
        ];
    }

    openCropModal(el) {
        const modal = document.getElementById('modal-recorte');
        if (!modal || !el || !el.src) return;
        this._cropEl = el;
        const img = modal.querySelector('#crop-img');
        img.onload = () => this._updateCropPreview();
        img.src = el.src;
        modal.querySelector('#crop-x').value = 0;
        modal.querySelector('#crop-y').value = 0;
        modal.querySelector('#crop-w').value = 100;
        modal.querySelector('#crop-h').value = 100;
        this._updateCropPreview();
        modal.showModal();
    }

    _updateCropPreview() {
        const modal = document.getElementById('modal-recorte');
        if (!modal) return;
        const img = modal.querySelector('#crop-img');
        const rectDiv = modal.querySelector('#crop-rect');
        const result = modal.querySelector('#crop-result');
        const x = parseInt(modal.querySelector('#crop-x').value, 10) || 0;
        const y = parseInt(modal.querySelector('#crop-y').value, 10) || 0;
        const w = parseInt(modal.querySelector('#crop-w').value, 10) || 100;
        const h = parseInt(modal.querySelector('#crop-h').value, 10) || 100;

        rectDiv.style.left = x + '%';
        rectDiv.style.top = y + '%';
        rectDiv.style.width = w + '%';
        rectDiv.style.height = h + '%';

        if (!img.naturalWidth) return;
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        const px = { x: nw * x / 100, y: nh * y / 100, w: nw * w / 100, h: nh * h / 100 };
        const rctx = result.getContext('2d');
        const pw = 220;
        result.width = pw;
        result.height = Math.max(20, Math.round(pw * px.h / px.w));
        rctx.clearRect(0, 0, result.width, result.height);
        rctx.drawImage(img, px.x, px.y, px.w, px.h, 0, 0, result.width, result.height);
        result.classList.add('has-content');
    }

    showHome() {
        this.homeView.classList.add('active');
        this.editorView.classList.remove('active');
        document.getElementById('social-view')?.classList.remove('active');
        document.body.classList.remove('social-active');
    }

    showEditor() {
        this.homeView.classList.remove('active');
        this.editorView.classList.add('active');
        document.getElementById('social-view')?.classList.remove('active');
        document.body.classList.remove('social-active');
    }

    // Vista "rede social" (feed, explorar, perfil, notificações).
    showSocial() {
        this.homeView.classList.remove('active');
        this.editorView.classList.remove('active');
        document.getElementById('social-view')?.classList.add('active');
        document.body.classList.add('social-active');
    }

    isSocialActive() {
        return !!document.getElementById('social-view')?.classList.contains('active');
    }

    setProjectTitle(title) {
        const el = document.getElementById('project-title');
        if (el) el.textContent = title;
    }

    renderProjectsList(projects, containerId = 'lista-projetos', opts = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (projects.length === 0) {
            container.innerHTML = '<p class="ps-empty-simple" id="empty-projects">Ainda não tens nenhum quadro.</p>';
            return;
        }

        container.innerHTML = projects.map(p => `
            <div class="project-card" data-id="${p.id}">
                <div class="project-card-thumb">
                    ${p.thumbnail
                        ? `<img src="${p.thumbnail}" alt="${escapeHTML(p.titulo)}" loading="lazy" decoding="async">`
                        : '<span class="placeholder">📌</span>'}
                </div>
                <div class="project-card-info">
                    <h3>${escapeHTML(p.titulo)}</h3>
                    <time>${formatDate(p.ultimaEdicao)}</time>
                </div>
                <div class="project-card-actions">
                    <button data-action="open">Abrir</button>
                    ${opts.publish ? '<button data-action="publish" class="publish">Publicar</button>' : ''}
                    <button data-action="delete" class="delete">Apagar</button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('[data-action="delete"], [data-action="publish"]')) return;
                this.callbacks.onOpenProject?.(card.dataset.id);
            });
            card.querySelector('[data-action="open"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.callbacks.onOpenProject?.(card.dataset.id);
            });
            card.querySelector('[data-action="publish"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.callbacks.onPublishDraft?.(card.dataset.id);
            });
            card.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Apagar este quadro deste dispositivo?')) {
                    this.callbacks.onDeleteProject?.(card.dataset.id);
                }
            });
        });
    }

    renderModalProjectsList(projects) {
        const container = document.getElementById('modal-projetos-lista');
        if (!container) return;

        if (projects.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhum quadro encontrado.</p>';
            return;
        }

        container.innerHTML = projects.map(p => `
            <div class="modal-project-item" data-id="${p.id}">
                <span style="font-size:24px">${p.thumbnail ? `<img src="${escapeHTML(safeImgSrc(p.thumbnail))}" style="width:40px;height:28px;object-fit:cover;border-radius:4px">` : '📌'}</span>
                <div>
                    <strong>${escapeHTML(p.titulo)}</strong>
                    <div style="font-size:12px;color:var(--text-muted)">${formatDate(p.ultimaEdicao)}</div>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.modal-project-item').forEach(item => {
            item.addEventListener('click', () => {
                this.callbacks.onOpenProject?.(item.dataset.id);
                document.getElementById('modal-abrir')?.close();
            });
        });
    }

    setActiveTool(tool) {
        this.currentTool = tool;
        // Formas vive dentro de Ferramentas: o botão aceso é o de Ferramentas.
        const lit = (tool === 'shapes' || tool === 'frames') ? 'brush' : tool;
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === lit);
        });
    }

    showPanel(tool, selectedElement, projectCallbacks) {
        this.panel.classList.remove('collapsed');
        const titles = {
            select: 'Selecionar',
            image: 'Imagem',
            text: 'Texto',
            shapes: 'Formas',
            brush: 'Ferramentas',
            design: 'Studio e galeria de stickers',
            frames: 'Ferramentas',
            background: 'Fundo',
            layers: 'Camadas',
            settings: 'Configurações'
        };
        this.panelTitle.textContent = titles[tool] || tool;

        switch (tool) {
            case 'image':
                this.panelContent.innerHTML = getImagePanelHTML(selectedElement);
                bindImagePanelEvents(this.panelContent, selectedElement, projectCallbacks);
                if (!selectedElement) {
                    this.panelContent.innerHTML = `
                        <div class="panel-section">
                            <button type="button" class="img-dropzone" id="btn-import-image">
                                <span class="img-dropzone-art" aria-hidden="true">
                                    <span class="img-dz-card img-dz-card-1"></span>
                                    <span class="img-dz-card img-dz-card-2"></span>
                                    <span class="img-dz-arrow"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M6 10l6 6 6-6"/><path d="M4 20h16"/></svg></span>
                                </span>
                                <strong>Arrasta imagens para o quadro</strong>
                                <span>Do teu computador, do Pinterest ou de qualquer site — também podes arrastar um link de imagem.</span>
                                <em>ou clica para escolher do computador</em>
                            </button>
                            <div class="img-dz-tips">
                                <span><kbd>Ctrl</kbd>+<kbd>V</kbd> cola uma imagem ou um link</span>
                                <span>Seleciona uma imagem para sombra, filtros e cortes</span>
                            </div>
                        </div>
                    `;
                    this.panelContent.querySelector('#btn-import-image')?.addEventListener('click', () => {
                        projectCallbacks.onImportImage?.();
                    });
                }
                break;

            case 'text':
                this.panelContent.innerHTML = getTextPanelHTML(selectedElement);
                bindTextPanelEvents(this.panelContent, selectedElement, projectCallbacks);
                break;

            case 'shapes':
                this.panelContent.innerHTML = this._toolsTabs('shapes') + getShapesPanelHTML(selectedElement);
                bindShapesPanelEvents(this.panelContent, selectedElement, projectCallbacks);
                this._bindToolsTabs();
                break;

            case 'brush':
                this.panelContent.innerHTML = this._toolsTabs('brush') + getBrushPanelHTML(this._brushSettings);
                bindBrushPanelEvents(this.panelContent, this._brushSettings);
                this._bindToolsTabs();
                break;

            case 'design':
                this._renderDesignPanel(projectCallbacks);
                break;

            case 'frames':
                this.panelContent.innerHTML = this._toolsTabs('frames') + getMoldurasPanelHTML();
                bindMoldurasPanelEvents(this.panelContent, projectCallbacks);
                this._bindToolsTabs();
                break;

            case 'background':
                this._renderBackgroundPanel(projectCallbacks);
                break;

            case 'layers':
                this._renderLayersPanel(selectedElement, projectCallbacks);
                break;

            case 'settings':
                this._renderSettingsPanel(projectCallbacks);
                break;

            case 'select':
            default:
                this._renderSelectPanel(selectedElement, projectCallbacks);
        }
    }

    _renderSelectPanel(selectedElement, callbacks) {
        if (!selectedElement) {
            this.panelContent.innerHTML = `
                <div class="panel-section">
                    <h4>Selecionar</h4>
                    <p class="panel-hint">Clique num elemento do quadro para o selecionar e editar.</p>
                </div>
                <div class="panel-section">
                    <h4>Atalhos rápidos</h4>
                    <ul class="shortcut-list">
                        <li><kbd>Ctrl</kbd>+<kbd>D</kbd> Duplicar</li>
                        <li><kbd>Ctrl</kbd>+<kbd>C</kbd>/<kbd>V</kbd> Copiar / Colar</li>
                        <li><kbd>Ctrl</kbd>+<kbd>X</kbd> Cortar</li>
                        <li><kbd>Delete</kbd> Eliminar</li>
                        <li><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Mover (Shift = 10&nbsp;px)</li>
                        <li><kbd>Esc</kbd> Desselecionar</li>
                        <li><kbd>+</kbd>/<kbd>-</kbd> Zoom · <kbd>0</kbd> Ajustar</li>
                        <li><kbd>Ctrl</kbd>+<kbd>Z</kbd>/<kbd>Y</kbd> Desfazer / Refazer</li>
                    </ul>
                </div>
            `;
            return;
        }

        const alignBtns = [
            ['left', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="3" x2="3" y2="21"/><rect x="7" y="6" width="14" height="4" rx="1"/><rect x="7" y="14" width="8" height="4" rx="1"/></svg>', 'Alinhar à esquerda'],
            ['hcenter', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="3" x2="12" y2="21"/><rect x="5" y="6" width="14" height="4" rx="1"/><rect x="7" y="14" width="10" height="4" rx="1"/></svg>', 'Centrar na horizontal'],
            ['right', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="3" x2="21" y2="21"/><rect x="3" y="6" width="14" height="4" rx="1"/><rect x="9" y="14" width="8" height="4" rx="1"/></svg>', 'Alinhar à direita'],
            ['top', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="3" x2="21" y2="3"/><rect x="6" y="7" width="4" height="14" rx="1"/><rect x="14" y="7" width="4" height="8" rx="1"/></svg>', 'Alinhar ao topo'],
            ['vcenter', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="7" width="4" height="10" rx="1"/></svg>', 'Centrar na vertical'],
            ['bottom', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="21" x2="21" y2="21"/><rect x="6" y="3" width="4" height="14" rx="1"/><rect x="14" y="9" width="4" height="8" rx="1"/></svg>', 'Alinhar em baixo']
        ];

        const isImg = selectedElement.tipo === 'imagem' && !selectedElement.moldura;
        this.panelContent.innerHTML = (isImg ? getImageToolsHTML() : '') + `
            <div class="panel-section">
                <h4>${escapeHTML(getElementLabel(selectedElement))}</h4>
                <div class="quick-actions">
                    <button class="btn btn-primary" id="btn-quick-duplicate" style="flex:1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Duplicar</button>
                    <button class="btn btn-danger" id="btn-quick-delete" style="flex:1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>Eliminar</button>
                </div>
            </div>
            <div class="panel-section">
                <h4>Alinhar ao quadro</h4>
                <div class="align-grid">
                    ${alignBtns.map(([a, icon, title]) => `<button class="align-btn" data-align="${a}" title="${title}">${icon}</button>`).join('')}
                </div>
            </div>
            <div class="panel-section">
                <h4>Ordenar camada</h4>
                <div class="order-grid">
                    <button class="align-btn" data-order="front" title="Trazer para a frente"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 15l-6-6-6 6"/></svg> Frente</button>
                    <button class="align-btn" data-order="back" title="Enviar para trás"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg> Atrás</button>
                    <button class="align-btn" data-order="up" title="Subir um nível"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg> Subir</button>
                    <button class="align-btn" data-order="down" title="Descer um nível"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M19 12l-7 7-7-7"/></svg> Descer</button>
                </div>
            </div>
        `;

        if (isImg) bindImageToolsEvents(this.panelContent, callbacks);
        this.panelContent.querySelector('#btn-quick-duplicate')?.addEventListener('click', () => callbacks.onDuplicateElement?.(selectedElement.id));
        this.panelContent.querySelector('#btn-quick-delete')?.addEventListener('click', () => callbacks.onDeleteElement?.(selectedElement.id));
        this.panelContent.querySelectorAll('[data-align]').forEach(btn => {
            btn.addEventListener('click', () => callbacks.onAlign?.(btn.dataset.align));
        });
        this.panelContent.querySelectorAll('[data-order]').forEach(btn => {
            btn.addEventListener('click', () => callbacks.onOrder?.(btn.dataset.order));
        });
    }

    _renderBackgroundPanel(callbacks) {
        const bg = callbacks.getBackground?.() || { tipo: 'cor', valor: '#e8e8e8' };
        const grade = callbacks.getGrid?.() || null;
        const BG_COLORS = ['#FFFFFF', '#F6F5F1', '#EDEBE6', '#E8E8E8', '#F1E4D8', '#E6EDE7', '#A9BCAE', '#5F7466', '#1E2A42', '#111111', '#E60023', '#F4C9D0'];
        const GRADS = [
            { cor1: '#F6F5F1', cor2: '#E6EDE7', angulo: 135 }, { cor1: '#A9BCAE', cor2: '#5F7466', angulo: 135 },
            { cor1: '#F4C9D0', cor2: '#E60023', angulo: 135 }, { cor1: '#1E2A42', cor2: '#111111', angulo: 160 },
            { cor1: '#F1E4D8', cor2: '#D8A33B', angulo: 135 }, { cor1: '#E6EDE7', cor2: '#5D8296', angulo: 180 }
        ];
        const typeTile = (v, label, demo) => `<button type="button" class="fx-tile ${bg.tipo === v ? 'on' : ''}" data-bg-type="${v}"><span class="fx-bg-demo" style="background:${demo}"></span><span>${label}</span></button>`;
        this.panelContent.innerHTML = `
            ${fxSectionHTML('bg-type', 'Fundo', `
                <div class="fx-grid fx-grid-3">
                    ${typeTile('cor', 'Cor', '#F1E4D8')}
                    ${typeTile('gradiente', 'Gradiente', 'linear-gradient(135deg,#A9BCAE,#5F7466)')}
                    ${typeTile('imagem', 'Imagem', 'repeating-linear-gradient(45deg,#E8E8E8 0 6px,#F6F5F1 6px 12px)')}
                </div>
                <div id="bg-options"></div>`, { icon: FX_ICON.palette, open: true })}
            ${fxSectionHTML('bg-pattern', 'Padrão do fundo', `
                <p class="panel-hint">Faz parte do fundo: aparece ao exportar, na miniatura e ao publicar.</p>
                <div class="fx-grid fx-grid-3 pattern-grid" id="pattern-grid"></div>
                <div id="pattern-opts"></div>`, { icon: FX_ICON.sliders, open: true })}
            ${fxSectionHTML('bg-grid', 'Grelha guia', `
                <p class="panel-hint">Só aparece aqui no editor, para alinhar. Não sai na exportação.</p>
                <div class="fx-chips">
                    <button type="button" class="fx-chip ${grade === null || grade === 'none' ? 'on' : ''}" data-grid-mode="none">Sem</button>
                    <button type="button" class="fx-chip ${grade === 'pontos' ? 'on' : ''}" data-grid-mode="pontos">Pontos</button>
                    <button type="button" class="fx-chip ${grade === 'linhas' ? 'on' : ''}" data-grid-mode="linhas">Linhas</button>
                </div>`, { icon: FX_ICON.corner })}
        `;
        fxBindSections(this.panelContent);

        this.panelContent.querySelectorAll('[data-grid-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.panelContent.querySelectorAll('[data-grid-mode]').forEach(b => b.classList.toggle('on', b === btn));
                callbacks.onGridChange?.(btn.dataset.gridMode === 'none' ? null : btn.dataset.gridMode);
            });
        });

        // ---------- Padrão do fundo ----------
        const pd = Object.assign({ tipo: 'nenhum', cor: '#1d1d1f', opacidade: 0.18, espaco: 48 }, bg.padrao || {});
        const setPattern = (patch) => {
            Object.assign(pd, patch);
            const cur = callbacks.getBackground?.() || bg;
            callbacks.onBackgroundChange?.({ ...cur, padrao: pd.tipo === 'nenhum' ? null : { ...pd } });
        };
        const grid = this.panelContent.querySelector('#pattern-grid');
        const opts = this.panelContent.querySelector('#pattern-opts');
        const sw = (tipo) => {
            const css = tipo === 'nenhum' ? '' : bgPatternCSS({ tipo, cor: pd.cor, opacidade: Math.max(0.35, pd.opacidade), espaco: 10 });
            return `<span class="fx-bg-demo" style="background:${css ? css + ', ' : ''}var(--ed-swatch-bg, #f4f4f1)"></span>`;
        };
        const drawPatternUI = () => {
            grid.innerHTML = BG_PATTERNS.map(([id, label]) => `
                <button type="button" class="fx-tile ${pd.tipo === id ? 'on' : ''}" data-pattern="${id}">${sw(id)}<span>${label}</span></button>`).join('');
            opts.innerHTML = pd.tipo === 'nenhum' ? '' : `<div class="fx-sub">
                <div class="fx-label">Cor do padrão</div>
                ${fxSwatchesHTML('pat-cor', pd.cor, { colors: ['#1d1d1f', '#FFFFFF', '#E60023', '#5F7466', '#A9BCAE', '#1E2A42', '#D8A33B', '#8B8780'] })}
                ${fxSliderHTML('pat-op', 'Intensidade', 4, 80, 1, Math.round(pd.opacidade * 100), '%')}
                ${fxSliderHTML('pat-esp', 'Espaçamento', 12, 200, 1, pd.espaco, ' px')}
            </div>`;
            fxBindSwatches(opts, 'pat-cor', (c) => { setPattern({ cor: c || '#1d1d1f' }); grid.querySelectorAll('[data-pattern]').forEach(b => { b.querySelector('.fx-bg-demo').outerHTML = sw(b.dataset.pattern); }); });
            fxBindSlider(opts, 'pat-op', '%', (v) => setPattern({ opacidade: v / 100 }));
            fxBindSlider(opts, 'pat-esp', ' px', (v) => setPattern({ espaco: v }));
        };
        grid.addEventListener('click', (e) => {
            const b = e.target.closest('[data-pattern]');
            if (!b) return;
            setPattern({ tipo: b.dataset.pattern });
            drawPatternUI();
        });
        drawPatternUI();

        let sentGrad = bg.tipo === 'gradiente';
        const renderBgOptions = (tipo) => {
            const container = this.panelContent.querySelector('#bg-options');
            switch (tipo) {
                case 'cor': {
                    const cur = bg.tipo === 'cor' && typeof bg.valor === 'string' ? bg.valor : '#ffffff';
                    container.innerHTML = `<div class="fx-sub"><div class="fx-label">Cor de fundo</div>${fxSwatchesHTML('bg-cor', cur, { colors: BG_COLORS })}</div>`;
                    fxBindSwatches(container, 'bg-cor', (c) => callbacks.onBackgroundChange?.({ tipo: 'cor', valor: c || '#ffffff' }));
                    break;
                }
                case 'gradiente': {
                    const grad = bg.tipo === 'gradiente' && bg.valor ? { ...bg.valor } : { ...GRADS[1] };
                    const send = () => callbacks.onBackgroundChange?.({ tipo: 'gradiente', valor: { ...grad } });
                    container.innerHTML = `<div class="fx-sub">
                        <div class="fx-label">Prontos</div>
                        <div class="fx-grid fx-grid-3">${GRADS.map((g, i) => `<button type="button" class="fx-tile" data-grad="${i}"><span class="fx-bg-demo" style="background:linear-gradient(${g.angulo}deg,${g.cor1},${g.cor2})"></span></button>`).join('')}</div>
                        <div class="fx-label">Cor 1</div>${fxSwatchesHTML('bg-g1', grad.cor1, { colors: BG_COLORS })}
                        <div class="fx-label">Cor 2</div>${fxSwatchesHTML('bg-g2', grad.cor2, { colors: BG_COLORS })}
                        ${fxSliderHTML('bg-ang', 'Ângulo', 0, 360, 5, grad.angulo || 135, '°')}
                    </div>`;
                    container.querySelectorAll('[data-grad]').forEach(b => b.addEventListener('click', () => {
                        Object.assign(grad, GRADS[+b.dataset.grad]);
                        send();
                        renderBgOptions('gradiente');
                    }));
                    fxBindSwatches(container, 'bg-g1', (c) => { grad.cor1 = c || '#ffffff'; send(); });
                    fxBindSwatches(container, 'bg-g2', (c) => { grad.cor2 = c || '#ffffff'; send(); });
                    fxBindSlider(container, 'bg-ang', '°', (v) => { grad.angulo = v; send(); });
                    if (!sentGrad) { sentGrad = true; send(); }
                    break;
                }
                case 'imagem':
                    container.innerHTML = `<div class="fx-sub">
                        <button class="btn btn-primary" id="bg-import-img" style="width:100%"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>Importar imagem de fundo</button>
                    </div>`;
                    container.querySelector('#bg-import-img').addEventListener('click', () => callbacks.onImportBgImage?.());
                    break;
            }
        };
        renderBgOptions(bg.tipo);

        this.panelContent.querySelectorAll('[data-bg-type]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.panelContent.querySelectorAll('[data-bg-type]').forEach(b => b.classList.toggle('on', b === btn));
                renderBgOptions(btn.dataset.bgType);
            });
        });
    }

    _renderToolsMenu(callbacks) {
        this.panelContent.innerHTML = `
            <div class="panel-section">
                <p class="panel-hint">Escolha uma ferramenta para ver as suas opções.</p>
                <div class="tools-menu">
                    <button class="tools-menu-card" data-tools-sub="pincel">
                        <span class="tools-menu-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M14.7 6.3a1 1 0 000 1.4l1.4 1.4a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg></span>
                        <span class="tools-menu-body">
                            <span class="tools-menu-name">Pincel</span>
                            <span class="tools-menu-desc">Desenhar e apagar</span>
                        </span>
                    </button>
                    <button class="tools-menu-card" data-tools-sub="formas">
                        <span class="tools-menu-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></span>
                        <span class="tools-menu-body">
                            <span class="tools-menu-name">Formas</span>
                            <span class="tools-menu-desc">Figuras e polígonos</span>
                        </span>
                    </button>
                </div>
            </div>
        `;

        this.panelContent.querySelector('[data-tools-sub="pincel"]')?.addEventListener('click', () => {
            this.panelContent.innerHTML = this._backToTools() + getBrushPanelHTML(this._brushSettings);
            bindBrushPanelEvents(this.panelContent, this._brushSettings);
            this._bindBackToTools(callbacks);
        });
        this.panelContent.querySelector('[data-tools-sub="formas"]')?.addEventListener('click', () => {
            callbacks.onShowFormas?.();
        });
    }

    // Barra superior de Ferramentas: troca entre Pincel e Formas.
    _toolsTabs(active) {
        return `<div class="design-tabs tools-tabs">
            <button type="button" class="design-tab ${active === 'brush' ? 'active' : ''}" data-tools-tab="brush">${uiIcon('brush', 14)} Pincel</button>
            <button type="button" class="design-tab ${active === 'shapes' ? 'active' : ''}" data-tools-tab="shapes"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1"/><circle cx="17" cy="17" r="4"/><path d="M17 3l4 7h-8z"/></svg> Formas</button>
            <button type="button" class="design-tab ${active === 'frames' ? 'active' : ''}" data-tools-tab="frames"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg> Molduras</button>
        </div>`;
    }

    _bindToolsTabs() {
        this.panelContent.querySelectorAll('[data-tools-tab]').forEach(b => {
            b.addEventListener('click', () => {
                if (!b.classList.contains('active')) this.callbacks.onToolChange?.(b.dataset.toolsTab);
            });
        });
    }

    _backToTools() {
        return `<button type="button" class="ed-back" data-back-tools>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
            Ferramentas
        </button>`;
    }

    _bindBackToTools(callbacks) {
        this.panelContent.querySelector('[data-back-tools]')?.addEventListener('click', () => {
            this.callbacks.onToolChange?.('brush');
        });
    }

    // Studio e galeria de stickers — por agora vazio (a galeria nova vem a seguir).
    _renderDesignPanel(callbacks) {
        this.panelContent.innerHTML = `
            <div class="fx-soon">
                <span class="fx-soon-ic"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3c.8 4.6 3.4 7.2 8 8-4.6.8-7.2 3.4-8 8-.8-4.6-3.4-7.2-8-8 4.6-.8 7.2-3.4 8-8z"/></svg></span>
                <strong>Em breve</strong>
                <p>O studio e a galeria de stickers estão a ser preparados.</p>
            </div>`;
    }

    renderPartilhaPanel(container, callbacks) {
        const info = callbacks.getPublicInfo ? callbacks.getPublicInfo() : { publico: false, autor: 'Anónimo', server: false };
        const online = info.server;
        container.innerHTML = `
            <div class="panel-section">
                <div class="pub-status-row">
                    <span class="pub-badge ${info.publico ? 'pub' : 'priv'}">${info.publico ? uiIcon('globe', 13) + ' Público' : uiIcon('lock', 13) + ' Privado'}</span>
                    ${info.publico ? `<span class="pub-note">Qualquer pessoa pode ver este quadro no início do site e abri-lo para editar.</span>` : `<span class="pub-note">Só você vê este quadro. Pode publicá-lo para toda a gente.</span>`}
                </div>
                <div class="form-group">
                    <label>O seu nome (autor)</label>
                    <input type="text" id="pub-autor" value="${escapeHTML(info.autor || '')}" placeholder="Anónimo" maxlength="40" autocomplete="off">
                    <p class="panel-hint pub-erro" id="pub-autor-erro" style="display:none"></p>
                </div>
                ${!online ? '<p class="panel-hint" style="color:var(--color-danger)">' + uiIcon('warn', 13) + ' A publicação não vai funcionar: o Supabase não está configurado. Confira <code>js/data.js</code>.</p>' : ''}
                <div class="form-group pub-termos">
                    <label class="pub-termos-label">
                        <input type="checkbox" id="pub-termos">
                        <span>Confirmo que tenho direitos sobre as imagens e aceito os <button type="button" class="pub-termos-link" id="pub-termos-toggle">termos e condições</button>.</span>
                    </label>
                    <div class="pub-termos-detalhe" id="pub-termos-detalhe" hidden>
                        <ul>${IMAGE_RIGHTS_TERMS.map(t => `<li>${escapeHTML(t)}</li>`).join('')}</ul>
                    </div>
                </div>
                ${info.publico
                    ? `<button class="btn btn-primary" id="btn-pub-atualizar" style="width:100%">${uiIcon('refresh')} Atualizar quadro público</button>
                       <button class="btn btn-secondary" id="btn-pub-privado" style="width:100%;margin-top:8px">${uiIcon('lock')} Tornar privado (apagar do público)</button>`
                    : `<button class="btn btn-primary" id="btn-pub-publicar" style="width:100%">${uiIcon('globe')} Publicar quadro</button>`}
            </div>
        `;

        const autorInput = container.querySelector('#pub-autor');
        const erroEl = container.querySelector('#pub-autor-erro');
        const termosBox = container.querySelector('#pub-termos');
        const btnPublicar = container.querySelector('#btn-pub-publicar');
        const btnAtualizar = container.querySelector('#btn-pub-atualizar');

        const showError = (msg) => {
            if (!erroEl) return;
            erroEl.textContent = msg || '';
            erroEl.style.display = msg ? 'block' : 'none';
        };

        const refresh = () => {
            const check = validateAuthorName(autorInput.value);
            showError(check.ok ? '' : check.error);
            const ok = check.ok && termosBox.checked && online;
            if (btnPublicar) btnPublicar.disabled = !ok;
            if (btnAtualizar) btnAtualizar.disabled = !ok;
        };

        autorInput.addEventListener('input', refresh);
        termosBox.addEventListener('change', refresh);
        container.querySelector('#pub-termos-toggle')?.addEventListener('click', () => {
            const det = container.querySelector('#pub-termos-detalhe');
            if (det) det.hidden = !det.hidden;
        });

        const readAuthor = () => {
            const check = validateAuthorName(autorInput.value);
            if (!check.ok) {
                showError(check.error);
                return null;
            }
            if (!termosBox.checked) {
                showError('Tem de aceitar os termos e condições antes de publicar.');
                return null;
            }
            return check.value;
        };

        btnPublicar?.addEventListener('click', () => {
            const autor = readAuthor();
            if (autor === null) return;
            callbacks.onPublish?.(autor);
        });
        btnAtualizar?.addEventListener('click', () => {
            const autor = readAuthor();
            if (autor === null) return;
            callbacks.onUpdatePublic?.(autor);
        });
        container.querySelector('#btn-pub-privado')?.addEventListener('click', () => {
            callbacks.onUnpublish?.();
        });

        refresh();
    }

    _renderLayersPanel(selectedElement, callbacks) {
        this.panelContent.innerHTML = `
            <p class="layers-hint">Arraste uma camada para cima ou para baixo para mudar a ordem. Na lista, a primeira é a mais à frente.</p>
            <div class="layers-list" id="layers-list-container"></div>
        `;
        const container = this.panelContent.querySelector('#layers-list-container');
        renderLayersList(container, callbacks.getElements?.() || [], selectedElement?.id, {
            onSelect: (id) => callbacks.onSelectElement?.(id),
            onRename: (el) => callbacks.onUpdateElement?.(el, true),
            onToggleVisibility: (el) => callbacks.onUpdateElement?.(el, true),
            onToggleLock: (el) => callbacks.onUpdateElement?.(el, true),
            onDelete: (id) => callbacks.onDeleteElement?.(id),
            onReorder: () => callbacks.onLayersReordered?.()
        });
    }

    _renderSettingsPanel(callbacks) {
        const theme = document.documentElement.dataset.theme || 'light';
        this.panelContent.innerHTML = `
            <div class="panel-section">
                <h4>Aparência</h4>
                <div class="theme-toggle">
                    <button class="theme-option ${theme === 'light' ? 'active' : ''}" data-theme="light">
                        <span class="theme-icon">${uiIcon('sun')}</span> Claro
                    </button>
                    <button class="theme-option ${theme === 'dark' ? 'active' : ''}" data-theme="dark">
                        <span class="theme-icon">${uiIcon('moon')}</span> Escuro
                    </button>
                </div>
            </div>
            <div class="panel-section">
                <h4>Publicar</h4>
                <div id="settings-conta"></div>
            </div>
        `;

        this.panelContent.querySelectorAll('.theme-option').forEach(btn => {
            btn.addEventListener('click', () => {
                this.callbacks.onThemeChange?.(btn.dataset.theme);
                this._renderSettingsPanel(callbacks);
            });
        });

        const conta = this.panelContent.querySelector('#settings-conta');
        if (conta) this.renderContaPanel(conta, callbacks);

    }

    // Publicar: só com sessão iniciada. O autor é sempre o utilizador
    // da sessão e o quadro fica ligado à conta (tabela boards).
    renderContaPanel(container, callbacks) {
        const info = callbacks.getAccountInfo ? callbacks.getAccountInfo() : { user: null };
        if (!info.user) {
            container.innerHTML = `
                <p class="panel-hint">Para publicar tens de ter sessão iniciada. O quadro fica ligado à tua conta e o teu nome de utilizador aparece como autor.</p>
                <button class="btn btn-primary" id="btn-conta-login" style="width:100%">${uiIcon('user')} Entrar / Criar conta</button>
            `;
            container.querySelector('#btn-conta-login')?.addEventListener('click', () => callbacks.onShowLogin?.());
            return;
        }

        const u = info.user;
        const pub = !!info.perfilPublico;
        const synced = info.syncedAt ? 'guardado ' + formatDate(info.syncedAt) : 'ainda não guardado na conta';
        const foreign = info.foreign
            ? '<p class="panel-hint">Abriste o quadro público de outra pessoa. Ao guardar, as tuas alterações ficam num quadro novo na tua conta.</p>'
            : '';
        container.innerHTML = `
            <div class="pub-author">
                <span class="pub-author-av">${u.image ? `<img src="${escapeHTML(u.image)}" alt="">` : uiIcon('user', 16)}</span>
                <span class="pub-author-text"><small>Autor</small><strong>@${escapeHTML(u.username || '')}</strong></span>
                <span class="pub-badge ${pub ? 'pub' : 'priv'}">${pub ? uiIcon('globe', 13) + ' Público' : uiIcon('lock', 13) + ' Privado'}</span>
            </div>
            <p class="panel-hint" id="conta-sync">${escapeHTML(synced.charAt(0).toUpperCase() + synced.slice(1))}${pub ? ' · aparece no teu perfil, em Explorar e na galeria do início.' : '.'}</p>
            ${foreign}
            <div class="form-group">
                <label for="conta-desc">Descrição (opcional)</label>
                <textarea id="conta-desc" rows="3" maxlength="500" placeholder="Sobre o que é este quadro?">${escapeHTML(info.descricao || '')}</textarea>
            </div>
            ${pub ? '' : `
            <div class="form-group pub-termos">
                <label class="pub-termos-label">
                    <input type="checkbox" id="conta-termos">
                    <span>Confirmo que tenho direitos sobre as imagens e aceito os <button type="button" class="pub-termos-link" id="pub-termos-toggle">termos</button>.</span>
                </label>
                <div class="pub-termos-detalhe" id="pub-termos-detalhe" hidden>
                    <ul>${IMAGE_RIGHTS_TERMS.map(t => `<li>${escapeHTML(t)}</li>`).join('')}</ul>
                </div>
            </div>`}
            <p class="panel-hint pub-erro" id="conta-erro" hidden></p>
            ${pub
                ? `<button class="btn btn-primary" id="btn-publicar-quadro" style="width:100%">${uiIcon('refresh')} Atualizar publicação</button>
                   <button class="btn btn-secondary" id="btn-conta-privado" style="width:100%;margin-top:8px">${uiIcon('lock')} Tornar privado</button>`
                : `<button class="btn btn-primary" id="btn-publicar-quadro" style="width:100%">${uiIcon('globe')} Publicar quadro</button>
                   <button class="btn btn-secondary" id="btn-conta-guardar" style="width:100%;margin-top:8px">Guardar sem publicar</button>`}
            <a class="btn btn-secondary" href="#profile/${encodeURIComponent(u.username || '')}" style="width:100%;margin-top:8px;text-decoration:none">Ver o meu perfil</a>
        `;
        const desc = container.querySelector('#conta-desc');
        const erro = container.querySelector('#conta-erro');
        container.querySelector('#pub-termos-toggle')?.addEventListener('click', () => {
            const d = container.querySelector('#pub-termos-detalhe');
            if (d) d.hidden = !d.hidden;
        });
        const run = async (btn, perfilPublico, busy) => {
            const label = btn.innerHTML;
            btn.disabled = true;
            btn.textContent = busy;
            try { await callbacks.onAccountSave?.({ descricao: desc.value, perfilPublico }); }
            finally { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = label; } }
        };
        container.querySelector('#btn-publicar-quadro')?.addEventListener('click', (e) => {
            const termos = container.querySelector('#conta-termos');
            if (termos && !termos.checked) {
                erro.textContent = 'Para publicar, confirma que tens direitos sobre as imagens.';
                erro.hidden = false;
                return;
            }
            erro.hidden = true;
            run(e.currentTarget, true, 'A publicar…');
        });
        container.querySelector('#btn-conta-guardar')?.addEventListener('click', (e) => run(e.currentTarget, false, 'A guardar…'));
        container.querySelector('#btn-conta-privado')?.addEventListener('click', (e) => run(e.currentTarget, false, 'A tornar privado…'));
    }

    updateHistoryButtons(canUndo, canRedo) {
        document.getElementById('btn-desfazer').disabled = !canUndo;
        document.getElementById('btn-refazer').disabled = !canRedo;
    }

    updateZoomLevel(zoom) {
        document.getElementById('zoom-level').textContent = Math.round(zoom * 100) + '%';
    }

    showToast(message, duration = 2500) {
        this.toast.textContent = message;
        this.toast.classList.remove('hidden');
        this.toast.classList.add('visible');
        setTimeout(() => {
            this.toast.classList.remove('visible');
            setTimeout(() => this.toast.classList.add('hidden'), 300);
        }, duration);
    }

    showContextMenu(x, y, elementId) {
        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        this.contextMenu.classList.remove('hidden');
        this.contextMenu.dataset.targetId = elementId;
    }

    hideContextMenu() {
        this.contextMenu.classList.add('hidden');
    }

    applyTheme(theme) {
        document.documentElement.dataset.theme = theme;
    }

    _sidebarWidth() {
        const raw = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width');
        return parseInt(raw, 10) || 0;
    }

    _panelMaxWidth() {
        return Math.min(620, Math.max(200, window.innerWidth - this._sidebarWidth() - 120));
    }

    _setPanelWidth(width) {
        document.documentElement.style.setProperty('--panel-width', width + 'px');
    }

    _initPanelResize() {
        const resizer = document.getElementById('panel-resizer');
        if (!resizer || !this.panel) return;

        const MIN = 200;
        const saved = parseInt(localStorage.getItem('pins.toolPanelWidth'), 10);
        if (saved && saved >= MIN) this._setPanelWidth(saved);

        let startX = 0;
        let startWidth = 0;

        const onMove = (e) => {
            const width = Math.max(MIN, Math.min(this._panelMaxWidth(), startWidth + (e.clientX - startX)));
            this._setPanelWidth(width);
        };

        const onUp = () => {
            resizer.classList.remove('dragging');
            this.panel.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            const current = parseInt(getComputedStyle(this.panel).width, 10);
            if (current > 0) localStorage.setItem('pins.toolPanelWidth', current);
            window.dispatchEvent(new Event('resize'));
        };

        resizer.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            startX = e.clientX;
            startWidth = this.panel.getBoundingClientRect().width;
            resizer.classList.add('dragging');
            this.panel.classList.add('resizing');
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        });

        window.addEventListener('resize', () => {
            if (this.panel.classList.contains('collapsed')) return;
            const current = parseInt(getComputedStyle(this.panel).width, 10);
            if (current > this._panelMaxWidth()) this._setPanelWidth(this._panelMaxWidth());
        });
    }

    bindHomeEvents() {
        document.getElementById('btn-novo-projeto')?.addEventListener('click', () => {
            this.openNewProjectModal(this.sizePresets());
        });

        document.getElementById('btn-abrir-projeto')?.addEventListener('click', () => {
            this.callbacks.onShowOpenModal?.();
        });

    }

    bindEditorEvents() {
        this._initPanelResize();

        document.getElementById('btn-voltar-home')?.addEventListener('click', () => {
            this.callbacks.onBackHome?.();
        });

        document.getElementById('btn-novo')?.addEventListener('click', () => {
            this.openNewProjectModal(this.sizePresets());
        });

        document.getElementById('btn-guardar')?.addEventListener('click', () => {
            this.callbacks.onSave?.();
        });

        document.getElementById('btn-abrir')?.addEventListener('click', () => {
            this.callbacks.onShowOpenModal?.();
        });

        document.getElementById('btn-exportar')?.addEventListener('click', () => {
            document.getElementById('modal-exportar')?.showModal();
        });

        document.getElementById('btn-desfazer')?.addEventListener('click', () => {
            this.callbacks.onUndo?.();
        });

        document.getElementById('btn-refazer')?.addEventListener('click', () => {
            this.callbacks.onRedo?.();
        });

        document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
            this.callbacks.onZoomIn?.();
        });

        document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
            this.callbacks.onZoomOut?.();
        });

        document.getElementById('btn-zoom-fit')?.addEventListener('click', () => {
            this.callbacks.onZoomFit?.();
        });

        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.callbacks.onToolChange?.(btn.dataset.tool);
            });
        });

        document.getElementById('panel-close')?.addEventListener('click', () => {
            this.panel.classList.add('collapsed');
        });

        document.getElementById('project-title')?.addEventListener('blur', (e) => {
            this.callbacks.onTitleChange?.(e.target.textContent.trim());
        });

        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('dialog')?.close();
            });
        });

        document.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.callbacks.onExport?.(btn.dataset.format);
                document.getElementById('modal-exportar')?.close();
            });
        });

        this.contextMenu.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = this.contextMenu.dataset.targetId;
                this.callbacks.onContextAction?.(btn.dataset.action, id);
                this.hideContextMenu();
            });
        });

        const cropModal = document.getElementById('modal-recorte');
        if (cropModal) {
            ['#crop-x', '#crop-y', '#crop-w', '#crop-h'].forEach(sel => {
                cropModal.querySelector(sel)?.addEventListener('input', () => this._updateCropPreview());
            });
            cropModal.querySelector('#btn-crop-aplicar')?.addEventListener('click', () => {
                this.callbacks.onCropApply?.({
                    x: parseInt(cropModal.querySelector('#crop-x').value, 10) || 0,
                    y: parseInt(cropModal.querySelector('#crop-y').value, 10) || 0,
                    w: parseInt(cropModal.querySelector('#crop-w').value, 10) || 100,
                    h: parseInt(cropModal.querySelector('#crop-h').value, 10) || 100
                });
                cropModal.close();
            });
        }

        document.addEventListener('click', (e) => {
            if (!this.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        document.addEventListener('contextmenu', (e) => {
            const el = e.target.closest('.board-element');
            if (el) {
                e.preventDefault();
                this.callbacks.onSelectElement?.(el.dataset.id);
                this.showContextMenu(e.clientX, e.clientY, el.dataset.id);
            }
        });
    }
}

// Escapa também aspas: o resultado é seguro dentro de atributos (title="…", alt="…").
function escapeHTML(str) {
    return String(str ?? '').replace(/[&<>"'`]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));
}
