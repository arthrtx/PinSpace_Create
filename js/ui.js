/**
 * ui.js — Interface: painéis, modais, toast, tema, home
 */

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
    }

    showEditor() {
        this.homeView.classList.remove('active');
        this.editorView.classList.add('active');
    }

    setProjectTitle(title) {
        const el = document.getElementById('project-title');
        if (el) el.textContent = title;
    }

    renderProjectsList(projects, containerId = 'lista-projetos') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (projects.length === 0) {
            container.innerHTML = '<p class="empty-state" id="empty-projects">Nenhum projeto ainda. Crie o seu primeiro quadro!</p>';
            return;
        }

        container.innerHTML = projects.map(p => `
            <div class="project-card" data-id="${p.id}">
                <div class="project-card-thumb">
                    ${p.thumbnail
                        ? `<img src="${p.thumbnail}" alt="${p.titulo}">`
                        : '<span class="placeholder">📌</span>'}
                </div>
                <div class="project-card-info">
                    <h3>${escapeHTML(p.titulo)}</h3>
                    <time>${formatDate(p.ultimaEdicao)}</time>
                </div>
                <div class="project-card-actions">
                    <button data-action="open">Abrir</button>
                    <button data-action="delete" class="delete">Eliminar</button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('[data-action="delete"]')) return;
                this.callbacks.onOpenProject?.(card.dataset.id);
            });
            card.querySelector('[data-action="open"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.callbacks.onOpenProject?.(card.dataset.id);
            });
            card.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Eliminar este projeto?')) {
                    this.callbacks.onDeleteProject?.(card.dataset.id);
                }
            });
        });
    }

    renderModalProjectsList(projects) {
        const container = document.getElementById('modal-projetos-lista');
        if (!container) return;

        if (projects.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhum projeto encontrado.</p>';
            return;
        }

        container.innerHTML = projects.map(p => `
            <div class="modal-project-item" data-id="${p.id}">
                <span style="font-size:24px">${p.thumbnail ? `<img src="${p.thumbnail}" style="width:40px;height:28px;object-fit:cover;border-radius:4px">` : '📌'}</span>
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

    renderPublicList(collages) {
        const container = document.getElementById('lista-publicos');
        if (!container) return;

        if (!collages) {
            container.innerHTML = '<p class="empty-state" id="empty-publicos">Servidor público não disponível — publique quadros para serem vistos por todos.</p>';
            return;
        }

        if (collages.length === 0) {
            container.innerHTML = '<p class="empty-state" id="empty-publicos">Ainda não há quadros públicos. No editor, abra Ajustes → Partilha e publique o seu.</p>';
            return;
        }

        container.innerHTML = collages.map(c => `
            <div class="project-card public-card" data-id="${escapeHTML(c.id)}">
                <div class="project-card-thumb">
                    ${c.thumb
                        ? `<img src="${c.thumb}" alt="${escapeHTML(c.titulo)}" loading="lazy">`
                        : '<span class="placeholder">📌</span>'}
                </div>
                <div class="project-card-info">
                    <h3>${escapeHTML(c.titulo)}</h3>
                    <time>Por ${escapeHTML(c.autor || 'Anónimo')} · ${formatDate(c.atualizado)}</time>
                </div>
                <div class="project-card-actions">
                    <button data-action="open">Abrir cópia</button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', (e) => {
                this.callbacks.onOpenPublic?.(card.dataset.id);
            });
            card.querySelector('[data-action="open"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.callbacks.onOpenPublic?.(card.dataset.id);
            });
        });
    }

    setActiveTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
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
            design: 'Stickers',
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
                            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">Importe uma imagem do seu computador.</p>
                            <button class="btn btn-primary" id="btn-import-image" style="width:100%"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>Importar imagem</button>
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
                this.panelContent.innerHTML = getShapesPanelHTML(selectedElement);
                bindShapesPanelEvents(this.panelContent, selectedElement, projectCallbacks);
                break;

            case 'brush':
                this._renderToolsMenu(projectCallbacks);
                break;

            case 'design':
                this._renderDesignPanel(projectCallbacks);
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

        this.panelContent.innerHTML = `
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

        this.panelContent.innerHTML = `
            <div class="panel-section">
                <h4>Tipo de fundo</h4>
                <div class="toggle-group" style="margin-bottom:16px">
                    <button class="toggle-btn ${bg.tipo === 'cor' ? 'active' : ''}" data-bg-type="cor">Cor</button>
                    <button class="toggle-btn ${bg.tipo === 'gradiente' ? 'active' : ''}" data-bg-type="gradiente">Gradiente</button>
                    <button class="toggle-btn ${bg.tipo === 'imagem' ? 'active' : ''}" data-bg-type="imagem">Imagem</button>
                </div>
                <div id="bg-options"></div>
            </div>
            <div class="panel-section">
                <h4>Grade de alinhamento</h4>
                <p class="panel-hint">Pontos ou linhas bem subtis para alinhar conteúdo.</p>
                <div class="toggle-group">
                    <button class="toggle-btn ${grade === null || grade === 'none' ? 'active' : ''}" data-grid-mode="none">Sem</button>
                    <button class="toggle-btn ${grade === 'pontos' ? 'active' : ''}" data-grid-mode="pontos">Pontos</button>
                    <button class="toggle-btn ${grade === 'linhas' ? 'active' : ''}" data-grid-mode="linhas">Linhas</button>
                </div>
            </div>
        `;

        this.panelContent.querySelectorAll('[data-grid-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.panelContent.querySelectorAll('[data-grid-mode]').forEach(b => b.classList.toggle('active', b === btn));
                callbacks.onGridChange?.(btn.dataset.gridMode === 'none' ? null : btn.dataset.gridMode);
            });
        });

        const renderBgOptions = (tipo) => {
            const container = this.panelContent.querySelector('#bg-options');
            switch (tipo) {
                case 'cor':
                    container.innerHTML = `
                        <div class="form-group">
                            <label>Cor de fundo</label>
                            <input type="color" id="bg-cor" value="${typeof bg.valor === 'string' ? bg.valor : '#ffffff'}">
                        </div>
                    `;
                    container.querySelector('#bg-cor').addEventListener('input', (e) => {
                        callbacks.onBackgroundChange?.({ tipo: 'cor', valor: e.target.value });
                    });
                    break;
                case 'gradiente':
                    const grad = bg.tipo === 'gradiente' && bg.valor ? bg.valor : { cor1: '#6366f1', cor2: '#ec4899', angulo: 135 };
                    container.innerHTML = `
                        <div class="form-row">
                            <div class="form-group"><label>Cor 1</label><input type="color" id="bg-grad1" value="${grad.cor1}"></div>
                            <div class="form-group"><label>Cor 2</label><input type="color" id="bg-grad2" value="${grad.cor2}"></div>
                        </div>
                        <div class="form-group"><label>Ângulo</label><input type="number" id="bg-angulo" value="${grad.angulo}" min="0" max="360"></div>
                    `;
                    const updateGrad = () => {
                        callbacks.onBackgroundChange?.({
                            tipo: 'gradiente',
                            valor: {
                                cor1: container.querySelector('#bg-grad1').value,
                                cor2: container.querySelector('#bg-grad2').value,
                                angulo: parseInt(container.querySelector('#bg-angulo').value) || 135
                            }
                        });
                    };
                    container.querySelector('#bg-grad1').addEventListener('input', updateGrad);
                    container.querySelector('#bg-grad2').addEventListener('input', updateGrad);
                    container.querySelector('#bg-angulo').addEventListener('change', updateGrad);
                    break;
                case 'imagem':
                    container.innerHTML = `
                        <button class="btn btn-primary" id="bg-import-img" style="width:100%"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>Importar imagem de fundo</button>
                    `;
                    container.querySelector('#bg-import-img').addEventListener('click', () => {
                        callbacks.onImportBgImage?.();
                    });
                    break;
            }
        };

        renderBgOptions(bg.tipo);

        this.panelContent.querySelectorAll('[data-bg-type]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.panelContent.querySelectorAll('[data-bg-type]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
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
            this.panelContent.innerHTML = getBrushPanelHTML(this._brushSettings);
            bindBrushPanelEvents(this.panelContent, this._brushSettings);
        });
        this.panelContent.querySelector('[data-tools-sub="formas"]')?.addEventListener('click', () => {
            callbacks.onShowFormas?.();
        });
    }

    _renderDesignPanel(callbacks) {
        this.panelContent.innerHTML = `
            <div class="design-tabs">
                <button class="design-tab ${this._designTab === 'stickers' ? 'active' : ''}" data-design-tab="stickers"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> Stickers</button>
                <button class="design-tab ${this._designTab === 'molduras' ? 'active' : ''}" data-design-tab="molduras"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15l5-5 4 4 4-6 5 7"/></svg> Molduras</button>
            </div>
            <div id="design-content"></div>
        `;

        const renderTab = (tab) => {
            const container = this.panelContent.querySelector('#design-content');
            if (tab === 'molduras') {
                container.innerHTML = getMoldurasPanelHTML();
                bindMoldurasPanelEvents(container, callbacks);
            } else {
                container.innerHTML = getStickersPanelHTML();
                bindStickersPanelEvents(container, callbacks);
            }
        };

        renderTab(this._designTab);

        this.panelContent.querySelectorAll('.design-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this._designTab = btn.dataset.designTab;
                this.panelContent.querySelectorAll('.design-tab').forEach(b => b.classList.toggle('active', b === btn));
                renderTab(this._designTab);
            });
        });
    }

    renderPartilhaPanel(container, callbacks) {
        const info = callbacks.getPublicInfo ? callbacks.getPublicInfo() : { publico: false, autor: 'Anónimo', server: false };
        const online = info.server;
        container.innerHTML = `
            <div class="panel-section">
                <div class="pub-status-row">
                    <span class="pub-badge ${info.publico ? 'pub' : 'priv'}">${info.publico ? '🔓 Público' : '🔒 Privado'}</span>
                    ${info.publico ? `<span class="pub-note">Qualquer pessoa pode ver este quadro no início do site e fazer uma cópia.</span>` : `<span class="pub-note">Só você vê este quadro. Pode publicá-lo para toda a gente.</span>`}
                </div>
                <div class="form-group">
                    <label>O seu nome (autor)</label>
                    <input type="text" id="pub-autor" value="${escapeHTML(info.autor || '')}" placeholder="Anónimo" maxlength="40" autocomplete="off">
                    <p class="panel-hint pub-erro" id="pub-autor-erro" style="display:none"></p>
                </div>
                ${!online ? '<p class="panel-hint" style="color:var(--color-danger)">⚠️ A publicação não vai funcionar: o Supabase não está configurado. Confira <code>js/supabase-config.js</code>.</p>' : ''}
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
                    ? `<button class="btn btn-primary" id="btn-pub-atualizar" style="width:100%">🔄 Atualizar quadro público</button>
                       <button class="btn btn-secondary" id="btn-pub-privado" style="width:100%;margin-top:8px">🔒 Tornar privado (apagar do público)</button>`
                    : `<button class="btn btn-primary" id="btn-pub-publicar" style="width:100%">🌐 Publicar quadro</button>`}
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
                        <span class="theme-icon">☀️</span> Claro
                    </button>
                    <button class="theme-option ${theme === 'dark' ? 'active' : ''}" data-theme="dark">
                        <span class="theme-icon">🌙</span> Escuro
                    </button>
                </div>
            </div>
            <div class="panel-section">
                <h4>🌐 Partilha</h4>
                <div id="settings-partilha"></div>
            </div>
            <div class="panel-section">
                <h4>Sobre</h4>
                <p style="font-size:13px;color:var(--text-secondary)">PinSpace Create v1.0<br>Vision Board Editor</p>
            </div>
        `;

        this.panelContent.querySelectorAll('.theme-option').forEach(btn => {
            btn.addEventListener('click', () => {
                this.callbacks.onThemeChange?.(btn.dataset.theme);
                this._renderSettingsPanel(callbacks);
            });
        });

        const container = this.panelContent.querySelector('#settings-partilha');
        if (container) this.renderPartilhaPanel(container, callbacks);
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

        const searchInput = document.getElementById('search-projetos');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                this.callbacks.onSearchProjects?.(e.target.value);
            }, 200));
        }
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

        document.querySelectorAll('.tool-btn').forEach(btn => {
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

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
