const BACKGROUND_REMOVAL_CDN = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.7/+esm';
const CLIP_MARKER = 'pinspace:elemento';

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

        // Contas / rede social
        this.currentUser = null;      // { id, email, username, image, bio } ou null
        this.authState = 'loading';   // 'loading' | 'loggedIn' | 'loggedOut'
        this.authReady = Promise.resolve();
        this.social = new SocialUI(this);
        this.homeWidgets = new HomeWidgets(this);
        this.music = new MusicPlayer(this);
    }

    init() {
        this._initBoard();
        this._bindUI();
        this._applySettings();
        this.social.init();
        this.homeWidgets.init();
        this.music.init();
        this.authReady = this.checkAuth();
        this._initRouter();
        this._startAutosave();
    }

    /* ================= Contas ================= */

    async checkAuth() {
        this.authState = 'loading';
        this.social.renderAuthAreas();
        let user = null;
        try {
            user = await getCurrentUser();
        } catch (err) {
            console.warn('Não foi possível verificar a sessão:', err);
        }
        if (user) {
            this.currentUser = user;
            this.authState = 'loggedIn';
            this.showLoggedInUI();
        } else {
            this.currentUser = null;
            this.authState = 'loggedOut';
            this.showLoggedOutUI();
        }
        return user;
    }

    showLoggedInUI() {
        document.documentElement.classList.add('is-logged-in');
        this.social.renderAuthAreas();
        this.social.startNotifPolling();
        if (this.project && this.ui.editorView.classList.contains('active') && this.ui.currentTool === 'settings') this._refreshPanel();
        // Quadros públicos sem imagem no Supabase → gera-a em segundo plano.
        const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
        idle(() => backfillMyBoardImages().then((n) => {
            if (n > 0) { this.homeWidgets?.loadFeatured?.(); this._loadPublicGallery?.(); }
        }).catch((err) => console.warn('Imagens dos quadros:', err)), { timeout: 4000 });
    }

    showLoggedOutUI() {
        document.documentElement.classList.remove('is-logged-in');
        this.social.renderAuthAreas();
        this.social.stopNotifPolling();
        if (this.project && this.ui.editorView.classList.contains('active') && this.ui.currentTool === 'settings') this._refreshPanel();
    }

    showLoginModal(mode = 'login', hint = '') {
        this.social.openAuth(mode, hint);
    }

    async onSignedIn(isNewAccount = false) {
        this.authReady = this.checkAuth();
        const user = await this.authReady;
        if (!user) return;
        this.ui.showToast(isNewAccount ? `Bem-vindo(a), @${user.username}!` : `Olá, @${user.username}!`);
        if (this.ui.editorView.classList.contains('active')) return; // fica no editor
        const target = '#profile/' + encodeURIComponent(user.username || '');
        if (window.location.hash === target) this._handleHashChange();
        else window.location.hash = target;
    }

    async logout() {
        await signOut();
        this.currentUser = null;
        this.authState = 'loggedOut';
        this.authReady = Promise.resolve(null);
        this.showLoggedOutUI();
        this.ui.showToast('Sessão terminada.');
        if (this.ui.isSocialActive()) {
            const r = this._parseRoute();
            if (r && r.name === 'notifications') window.location.hash = '#explore';
            else if (r) this.social.render(r);
        }
    }

    toggleTheme() {
        const cur = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
        this._setTheme(cur === 'dark' ? 'light' : 'dark');
    }

    /* ================= Router por hash =================
       #explore[?q=] · #notifications · #profile · #profile/<user>[/reposts|followers|following]
       Qualquer outro hash (ex.: #projetos-recentes) = landing page.        */

    _initRouter() {
        window.addEventListener('hashchange', () => this._handleHashChange());

        window.addEventListener('pinspace:auth', async (e) => {
            const { event, session } = e.detail || {};
            if (event === 'SIGNED_OUT' && this.currentUser) {
                this.currentUser = null;
                this.authState = 'loggedOut';
                this.showLoggedOutUI();
                if (this.ui.isSocialActive()) this._handleHashChange();
            } else if (event === 'SIGNED_IN' && session && (!this.currentUser || this.currentUser.id !== session.user.id)) {
                // Login noutro separador ou regresso do link de confirmação por email.
                this.authReady = this.checkAuth();
                await this.authReady;
                if (/access_token|type=signup/.test(window.location.hash)) window.location.hash = '#profile';
                else if (this.ui.isSocialActive()) this._handleHashChange();
            }
        });

        this._handleHashChange(true);
    }

    _parseRoute() {
        let h = window.location.hash.replace(/^#\/?/, '');
        if (!h) return null;
        let query = '';
        const qi = h.indexOf('?');
        if (qi >= 0) { query = h.slice(qi + 1); h = h.slice(0, qi); }
        const parts = h.split('/').map(x => { try { return decodeURIComponent(x); } catch { return x; } });
        switch (parts[0]) {
            case 'feed':        // links antigos do feed vão para Explorar
            case 'inicio':
            case 'dashboard':
            case 'explore':
            case 'explorar':
                return { name: 'explore', q: new URLSearchParams(query).get('q') || '' };
            case 'notifications':
            case 'notificacoes':
                return { name: 'notifications' };
            case 'profile':
            case 'perfil': {
                const tab = ['reposts', 'followers', 'following'].includes(parts[2]) ? parts[2] : 'boards';
                return { name: 'profile', username: parts[1] || null, tab };
            }
            default:
                return null;
        }
    }

    _handleHashChange(initial = false) {
        const route = this._parseRoute();

        if (!route) {
            if (initial) this._showHome();
            else if (this.ui.isSocialActive()) this._showHome();
            return;
        }

        if (this.ui.editorView.classList.contains('active') && this.project) {
            if (this.isDirty && confirm('Guardar alterações antes de sair do editor?')) {
                this.saveCurrentProject();
            }
            this.project = null;
        }

        if (initial) this.ui.renderProjectsList(getAllProjects());
        this.ui.showSocial();
        this.social.render(route);
    }

    // Abre um quadro da tabela boards. Se for meu, abre-o como meu (fica
    // ligado à conta). Se for de outra pessoa, abre uma cópia para editar.
    async openCloudBoard(remoteId) {
        if (!remoteId) return;
        const user = this.currentUser;
        const local = getAllProjects().find(p => p.remoteId === remoteId);
        if (local && user && local.authorId === user.id) {
            this.openProject(local.id);
            return;
        }

        try {
            this.ui.showToast('A abrir quadro…');
            const row = await getCloudBoardProject(remoteId);
            const base = row.projeto;
            if (!base || !Array.isArray(base.elementos)) {
                throw new Error('Este quadro foi guardado sem conteúdo.');
            }
            if (this.project && this.isDirty) {
                if (!confirm('Abrir este quadro? Alterações não guardadas serão perdidas.')) return;
            }

            const isMine = !!(user && row.author_id === user.id);
            if (!isMine) registerBoardView(remoteId).catch(() => {});
            const shared = {
                boardWidth: base.boardWidth || 3000,
                boardHeight: base.boardHeight || 3000,
                background: base.background || { tipo: 'cor', valor: '#e8e8e8' },
                grade: base.grade == null ? 'pontos' : base.grade
            };
            let project;
            if (isMine) {
                // Mesmo quadro noutro dispositivo: mantém a ligação à conta.
                const idTaken = base.id && getAllProjects().some(p => p.id === base.id && p.remoteId !== remoteId);
                project = {
                    ...createEmptyProject(base.id && !idTaken ? base.id : generateId(), row.title),
                    ...JSON.parse(JSON.stringify(base)),
                    ...shared,
                    titulo: row.title,
                    descricao: row.description || '',
                    perfilPublico: !!row.is_public,
                    remoteId: row.id,
                    authorId: row.author_id
                };
                if (idTaken || !base.id) project.id = generateId();
            } else {
                project = {
                    ...createEmptyProject(generateId(), (row.title || 'Sem título') + ' (cópia)'),
                    ...shared,
                    elementos: base.elementos.map(el => {
                        const nel = JSON.parse(JSON.stringify(el));
                        nel.id = generateId();
                        return nel;
                    }),
                    autor: user ? user.username : 'Anónimo',
                    descricao: row.description || '',
                    perfilPublico: false,
                    remoteId: null,
                    authorId: null,
                    copiadoDe: { remoteId: row.id, username: row.author ? row.author.username : null }
                };
            }

            this.project = project;
            this.history.clear();
            this.isDirty = !isMine;
            this._loadProjectIntoEditor();
            this.ui.showToast(isMine
                ? 'Quadro aberto. Guardar atualiza-o na tua conta.'
                : `Cópia do quadro de @${(row.author && row.author.username) || 'alguém'} — edita à vontade!`);
        } catch (err) {
            console.error('Abrir quadro da conta falhou:', err);
            this.ui.showToast(_socialErrMsg(err));
            this.homeWidgets?.loadFeatured?.();
            this._loadPublicGallery?.();
        }
    }

    // O quadro remoto foi apagado: as cópias locais deixam de estar ligadas.
    forgetRemoteId(remoteId) {
        getAllProjects().forEach(p => {
            if (p.remoteId === remoteId) {
                p.remoteId = null;
                p.cloudSyncedAt = null;
                saveProject(p);
            }
        });
        if (this.project && this.project.remoteId === remoteId) {
            this.project.remoteId = null;
            this.project.cloudSyncedAt = null;
        }
    }

    async _syncToCloud(project = this.project) {
        if (!project || !this.currentUser || !authAvailable()) return false;
        try {
            const n = await compactarProjeto(project);
            if (n > 0 && this.project === project) this._rerenderAll();
            await saveWithOwner(project);
            // Quadros públicos ficam também guardados como imagem (Storage).
            try {
                if (project.perfilPublico) await uploadBoardImage(project);
                else if (project.imageFull) await removeBoardImage(project);
                saveProject(project);
            } catch (imgErr) {
                console.warn('Imagem do quadro não foi enviada:', imgErr);
                this.ui.showToast('Quadro guardado, mas a imagem não foi para o Supabase: ' + (imgErr.message || imgErr), 6000);
            }
            return true;
        } catch (err) {
            console.error('Sincronizar com a conta falhou:', err);
            this.ui.showToast('Guardado neste dispositivo, mas falhou na conta: ' + _socialErrMsg(err), 5000);
            return false;
        }
    }

    async _saveAccountSettings({ descricao, perfilPublico }) {
        if (!this.project) return;
        if (!this.currentUser) {
            this.showLoginModal('login', 'Entra para guardar este quadro na tua conta.');
            return;
        }
        this.project.descricao = String(descricao || '').slice(0, 500);
        this.project.perfilPublico = !!perfilPublico;
        // O autor é sempre quem tem a sessão iniciada.
        this.project.autor = this.currentUser.username || this.project.autor;
        this._syncAllFromDOM();
        try {
            this.project.thumbnail = await generateThumbnailDataURL(this.project);
        } catch { /* miniatura opcional */ }
        saveProject(this.project);
        const ok = await this._syncToCloud();
        if (ok) {
            this.isDirty = false;
            this.ui.showToast(this.project.perfilPublico
                ? `Publicado como @${this.currentUser.username} — já aparece no teu perfil e em Explorar.`
                : 'Guardado na conta (privado — só tu vês).');
        }
        if (this.ui.currentTool === 'settings') this._refreshPanel();
    }

    _startAutosave() {
        // Guardar serializa todos os projetos (pode ser lento com muitas
        // fotos), por isso esperamos por um momento em que o browser esteja
        // livre — nunca a meio de um arrasto ou de uma animação.
        const idle = window.requestIdleCallback
            ? (fn) => window.requestIdleCallback(fn, { timeout: 5000 })
            : (fn) => setTimeout(fn, 200);
        this._autosaveTimer = setInterval(() => {
            if (!(this.project && this.isDirty && this.ui.editorView.classList.contains('active'))) return;
            if (this.board && (this.board.isDragging || this.board.isResizing || this.board.isRotating)) return;
            idle(() => {
                if (this.project && this.isDirty) this.saveCurrentProject(true);
            });
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
            if (id) this._maybePreloadBg();
        };

        // Texto: puxar um canto aumenta/diminui a letra (como no Canva);
        // as pegas laterais só mudam a largura da caixa.
        this.board.onResizing = (ds, r) => {
            const el = this.project && this.project.elementos.find(e => e.id === ds.id);
            if (!el || el.tipo !== 'texto' || !ds.handle || ds.handle.length !== 2) return null;
            if (ds.tam0 == null) ds.tam0 = el.tamanho || 24;
            const s = Math.max(0.05, r.width / ds.w0);
            const W = ds.w0 * s, H = ds.h0 * s;
            const x = ds.handle.includes('w') ? ds.x + ds.w0 - W : ds.x;
            const y = ds.handle.includes('n') ? ds.y + ds.h0 - H : ds.y;
            el.tamanho = clamp(Math.round(ds.tam0 * s * 10) / 10, 6, 800);
            const t = this.board.getElementDOM(el.id)?.querySelector('.text-content');
            if (t) t.style.fontSize = el.tamanho + 'px';
            ds.textScaled = true;
            return { width: W, height: H, x, y };
        };

        this.board.onElementUpdate = () => {
            this._syncSelectedFromDOM();
            const id = this.board.getSelectedId();
            const el = id && this.project.elementos.find(e => e.id === id);
            if (el && this._removeIfOffBoard(el)) return;
            this._commitHistory();
            if (el && el.tipo === 'texto') this._refreshPanel(); // mostra o novo tamanho da letra
        };
    }

    _bindUI() {
        this.ui.bindHomeEvents();
        this.ui.bindEditorEvents();
        this.ui.bindEditorChrome?.(this);
        document.getElementById('ed-modes')?.addEventListener('click', (e) => {
            const b = e.target.closest('[data-mode]');
            if (b) this.setInteractMode(b.dataset.mode);
        });
        this.setInteractMode('select');

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
        this.ui.on('onTitleChange', (title) => { this.project.titulo = title; this.isDirty = true; });
        this.ui.on('onExport', (format) => this._export(format));
        this.ui.on('onThemeChange', (theme) => this._setTheme(theme));
        this.ui.on('onContextAction', (action, id) => this._contextAction(action, id));
        this.ui.on('onSelectElement', (id) => this._selectElement(id));
        this.ui.on('onCropApply', (rect) => this._applyCrop(rect));
        // A galeria publica chama este callback. Sem ele, o botao "Abrir
        // copia" nao fazia nada e nao dava erro nenhum.
        this.ui.on('onOpenPublic', (id) => this._openPublic(id));

        this.history.onChange(({ canUndo, canRedo }) => {
            this.ui.updateHistoryButtons(canUndo, canRedo);
        });

        let resizeRaf = 0;
        window.addEventListener('resize', () => {
            if (resizeRaf) return;
            resizeRaf = requestAnimationFrame(() => {
                resizeRaf = 0;
                if (this.project && this.ui.editorView.classList.contains('active')) {
                    this.board.zoomFit();
                    this.ui.updateZoomLevel(this.board.getZoom());
                    this.board.updateSelectionBox();
                }
            });
        });
        // Abrir/fechar painéis muda a largura do palco sem mudar a janela:
        // recentra o quadro e a caixa de seleção acompanha.
        if ('ResizeObserver' in window) {
            let roRaf = 0;
            new ResizeObserver(() => {
                if (roRaf) return;
                roRaf = requestAnimationFrame(() => {
                    roRaf = 0;
                    if (!this.project || !this.ui.editorView.classList.contains('active')) return;
                    this.board.centerBoard();
                    this.board.updateSelectionBox();
                });
            }).observe(document.getElementById('board-viewport'));
        }

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
            const src = await compactarFicheiroImagem(file, { maxLado: FUNDO_MAX_LADO, maxBytes: FUNDO_MAX_BYTES });
            if (src) this._setBackground({ tipo: 'imagem', valor: src });
            e.target.value = '';
        });

        const dropOverlay = document.getElementById('drop-overlay');
        this._dragDepth = 0;
        const repaintDropOverlay = () => {
            dropOverlay.classList.toggle('hidden', this._dragDepth === 0);
        };

        // Arrastos de dentro da página (camadas, etc.) não são imagens para largar.
        this._internalDrag = false;
        document.addEventListener('dragstart', (e) => {
            const types = Array.from(e.dataTransfer?.types || []);
            this._internalDrag = !types.includes(SHAPE_DRAG_MIME);
        });
        document.addEventListener('dragend', () => { this._internalDrag = false; });

        window.addEventListener('dragenter', (e) => {
            if (this._internalDrag) return;
            if (!this.project || (!hasDraggableImage(e.dataTransfer) && !hasDraggableShape(e.dataTransfer))) return;
            e.preventDefault();
            if (hasDraggableImage(e.dataTransfer) && this._dragDepth === 0) this._prepareDropChip(e);
            this._dragDepth++;
            repaintDropOverlay();
        });

        window.addEventListener('dragover', (e) => {
            if (this._internalDrag) return;
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
            if (this._internalDrag) { this._internalDrag = false; return; }
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
            // Tudo o que vem no arrasto tem de ser lido já: depois do primeiro
            // "await" o browser esvazia o dataTransfer (era por isso que os links falhavam).
            const payload = readDropPayload(e.dataTransfer);
            const pos = this._dropToCanvasCoords(e.clientX, e.clientY);
            if (payload.file) {
                await this._addImage(payload.file, pos.x, pos.y);
                this.ui.showToast('Imagem adicionada!');
                return;
            }
            if (!payload.urls.length) {
                this.ui.showToast('Arraste um ficheiro de imagem ou um link de imagem para o quadro.');
                return;
            }
            this.ui.showToast('A carregar imagem do link…', 20000);
            for (const u of payload.urls) {
                const file = await fileFromUrl(u);
                if (file) {
                    await this._addImage(file, pos.x, pos.y);
                    this.ui.showToast('Imagem adicionada!');
                    return;
                }
            }
            this.ui.showToast('Não consegui abrir essa imagem. Se arrastaste o link de uma página, abre a imagem e arrasta-a (ou copia o endereço da imagem).', 6000);
        });

        document.addEventListener('paste', (e) => this._onPaste(e));

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
                if (e.key === 'v') return; // tratado no evento 'paste'
            }

            if (!ctrl && !e.altKey) {
                const k = e.key.toLowerCase();
                if (k === 'v') { this.setInteractMode('select'); return; }
                if (k === 'h') { this.setInteractMode('move'); return; }
                if (k === 'r') { this.setInteractMode('resize'); return; }
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

            if (selectedEl && !selectedEl.bloqueada) {
                let dx = 0, dy = 0;
                if (e.key === 'ArrowLeft') dx = -1;
                else if (e.key === 'ArrowRight') dx = 1;
                else if (e.key === 'ArrowUp') dy = -1;
                else if (e.key === 'ArrowDown') dy = 1;
                if (dx || dy) {
                    e.preventDefault();
                    if (e.shiftKey) { dx *= 10; dy *= 10; }
                    selectedEl.x += dx;
                    selectedEl.y += dy;
                    const dom = this.board.getElementDOM(selectedEl.id);
                    if (dom) {
                        dom.style.left = selectedEl.x + 'px';
                        dom.style.top = selectedEl.y + 'px';
                    }
                    this.board.updateSelectionBox();
                    if (this._removeIfOffBoard(selectedEl)) return;
                    if (!e.repeat) { this._commitHistory(); this.isDirty = true; }
                }
            }
        });

        document.getElementById('board-elements').addEventListener('mousedown', (e) => {
            const el = e.target.closest('.board-element');
            if (!el || e.button !== 0) return;
            if (el.dataset.editing === '1') return;

            const data = this.project.elementos.find(item => item.id === el.dataset.id);
            if (!data || data.bloqueada) return;

            e.stopPropagation();
            this._selectElement(data.id);
            const mode = this.interactMode || 'select';
            if (mode === 'move') { this.board.startDrag(e, data); return; }
            if (mode === 'resize') {
                // Puxa a partir do canto mais próximo de onde se clicou, sem deformar.
                const r = el.getBoundingClientRect();
                const zone = (e.clientY < r.top + r.height / 2 ? 'n' : 's') + (e.clientX < r.left + r.width / 2 ? 'w' : 'e');
                this.board.startResizeFromEdge(e.clientX, e.clientY, zone, data.tipo === 'imagem' || data.tipo === 'texto');
                return;
            }
            const zone = this.board.getEdgeZone(e.clientX, e.clientY, el);
            if (zone) {
                this.board.startResizeFromEdge(e.clientX, e.clientY, zone);
            } else {
                this.board.startDrag(e, data);
            }
        });

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
        this.social?.renderAuthAreas();
    }

    _showHome() {
        this.ui.showHome();
        this.ui.renderProjectsList(getAllProjects());
        this._loadPublicGallery();
        this.homeWidgets.refresh();
    }

    // A landing mostra só 3 quadros públicos (cabem certinhos no widget).
    // O resto está em Explorar.
    async _loadPublicGallery() {
        try {
            const data = await getPublicCollages();
            this._publicCollages = data.collages || [];
            this._renderPublicPreview(document.getElementById('search-projetos')?.value || '');
        } catch (err) {
            console.error('Falha ao carregar os quadros públicos:', err);
            this.ui.renderPublicList(null, err && err.message);
        }
    }

    async _openPublic(id) {
        if (String(id).startsWith('b:')) return this.openCloudBoard(String(id).slice(2));
        const local = getAllProjects().find(p => p.publicKey === id);
        if (local) {
            this.openProject(local.id);
            this.ui.showToast('Abriu uma cópia sua que está publicada.');
            return;
        }

        try {
            // getPublicCollage ja avisa quando o quadro nao existe ou foi
            // publicado sem conteudo, por isso nao repetimos a validacao.
            const base = await getPublicCollage(id);

            if (this.project && this.isDirty) {
                if (!confirm('Abrir este quadro público? Alterações não guardadas serão perdidas.')) return;
            }

            const copy = {
                ...createEmptyProject(generateId(), (base.titulo || 'Sem título') + ' (cópia)'),
                boardWidth: base.boardWidth || 3000,
                boardHeight: base.boardHeight || 3000,
                background: base.background || { tipo: 'cor', valor: '#e8e8e8' },
                grade: base.grade == null ? 'pontos' : base.grade,
                elementos: base.elementos.map(el => {
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
        } catch (err) {
            console.error('Abrir quadro público falhou:', err);
            this.ui.showToast(err.message || 'Não foi possível abrir o quadro público.');
            this.homeWidgets?.loadFeatured?.();   // tira dos destaques o que já não existe
            this._loadPublicGallery?.();
        }
    }

    async _publishProject(autor, isUpdate = false) {
        if (!this.project || !this.project.id) return;

        const check = validateAuthorName(autor);
        if (!check.ok) {
            this.ui.showToast(check.error);
            return;
        }
        this.project.autor = check.value;
        this._syncAllFromDOM();

        // Quadros abertos antes de existir a redução podem ainda ter fotos
        // pesadas. Encolhemos antes de tentar, senão o servidor recusa.
        try {
            const n = await compactarProjeto(this.project);
            if (n > 0) {
                saveProject(this.project);
                this._rerenderAll();
                this.ui.showToast(`${n} imagem${n > 1 ? 'ns' : ''} reduzida${n > 1 ? 's' : ''} para caber na publicação.`);
            }
        } catch (err) {
            console.warn('Não foi possível reduzir as imagens:', err);
        }

        let thumb = this.project.thumbnail;
        try {
            if (!thumb) thumb = await generateThumbnailDataURL(this.project);
        } catch { /* thumb opcional */ }

        const enviar = async (publicId, ownerToken) => {
            const corpo = {
                publicId,
                ownerToken,
                titulo: this.project.titulo || 'Sem título',
                autor: this.project.autor,
                termosAceitos: true,
                thumb,
                projeto: JSON.parse(JSON.stringify({ ...this.project, thumbnail: undefined, publicKey: undefined, ownerToken: undefined }))
            };
            return await publishPublicCollage(corpo);
        };

        try {
            let res;
            try {
                res = await enviar(
                    this.project.publico ? this.project.publicKey : null,
                    this.project.ownerToken || null
                );
            } catch (err) {
                // O quadro antigo na BD não tem dono (foi publicado antes do
                // token existir). Republicamos como quadro novo em vez de
                // deixar o utilizador preso.
                const semDono = this.project.publico && !this.project.ownerToken && err && err.status === 403;
                if (!semDono) throw err;
                res = await enviar(null, null);
            }

            this.project.publico = true;
            this.project.publicKey = res.id;
            this.project.ownerToken = res.ownerToken || null;
            this.project.publicadoAt = new Date().toISOString();
            this.project.thumbnail = thumb;
            saveProject(this.project);
            this.isDirty = false;
            this._refreshPanel();
            this.ui.showToast(isUpdate ? 'Quadro público atualizado!' : 'Quadro publicado! Já aparece no início do site.');
        } catch (err) {
            const msg = err && err.message ? String(err.message) : '';
            this.ui.showToast(msg || 'Falha ao publicar. Tente novamente.');
        }
    }

    async _unpublishProject() {
        if (!this.project || !this.project.publicKey) return;

        try {
            await deletePublicCollage(this.project.publicKey, this.project.ownerToken);
        } catch (err) {
            const msg = err && err.message ? String(err.message) : '';
            this.ui.showToast(msg || 'Falha ao remover da base de dados. Tente novamente.');
            return;
        }

        this.project.publico = false;
        this.project.publicKey = null;
        this.project.ownerToken = null;
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
        // Se viemos do perfil/explorar, voltamos para lá.
        const route = this._parseRoute();
        if (route) {
            this.ui.showSocial();
            this.social.render(route);
        } else {
            this._showHome();
        }
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

        this.project = deepClone(project);
        this.history.clear();
        this.isDirty = false;
        this._loadProjectIntoEditor();
    }

    _loadProjectIntoEditor() {
        this.ui.showEditor();
        this.ui.setProjectTitle(this.project.titulo);
        this.ui.setActiveTool('select');
        this.ui.showPanel('select', null, this._getPanelCallbacks());

        this.board.setBoardSize(this.project.boardWidth || 3000, this.project.boardHeight || 3000);
        this.brush.syncSize();
        this.board.zoomFit();
        this.board.applyBackground(this.project.background);
        this.board.setGrid(this._gridMode());
        this.board.clearElements();

        this.project.elementos.forEach(el => this._renderElement(el));
        this.ui.updateZoomLevel(this.board.getZoom());
        this._updateSizeBadge();
        this._renderRight();
        // Estado de partida do histórico (o primeiro Ctrl+Z volta aqui).
        this.history.clear();
        this.history.push(captureState(this.project));
        if (typeof animateBoardEntry === 'function') animateBoardEntry(document.getElementById('board-elements'));
    }

    async saveCurrentProject(silent = false) {
        // Guardamos a referência: quem chama pode pôr this.project = null
        // logo a seguir (ex.: sair do editor) enquanto isto ainda corre.
        const project = this.project;
        if (!project) return;

        if (this.project === project) this._syncAllFromDOM();

        if (!silent || !project.thumbnail) {
            try {
                project.thumbnail = await generateThumbnailDataURL(project);
            } catch { /* thumbnail opcional */ }
        }

        saveProject(project);
        if (this.project === project) this.isDirty = false;
        if (silent) return; // o autosave não envia para a conta (evita uploads a cada 30 s)

        if (this.currentUser && authAvailable()) {
            const ok = await this._syncToCloud(project);
            if (ok) this.ui.showToast('Guardado neste dispositivo e na tua conta!');
            if (this.project === project && this.ui.currentTool === 'settings') this._refreshPanel();
        } else {
            this.ui.showToast('Projeto guardado com sucesso!');
        }
    }

    _deleteProject(id) {
        const p = getAllProjects().find(x => x.id === id);
        deleteProject(id);
        this.ui.renderProjectsList(getAllProjects());
        this.homeWidgets.refreshLocal();
        if (this.ui.isSocialActive() && this.social.route) this.social.render(this.social.route);
        this.ui.showToast(p && p.remoteId
            ? 'Removido deste dispositivo. Continua na tua conta (apaga-o no teu perfil se quiseres).'
            : 'Projeto eliminado.');
    }

    _renderPublicPreview(query = '') {
        const q = String(query || '').toLowerCase().trim();
        const all = this._publicCollages || [];
        const list = q
            ? all.filter(c => (c.titulo || '').toLowerCase().includes(q) || (c.autor || '').toLowerCase().includes(q))
            : all;
        this.ui.renderPublicList(list.slice(0, 3));
        if (q && !list.length) {
            const box = document.getElementById('lista-publicos');
            if (box) box.innerHTML = `<p class="empty-state">Nenhum quadro público com “${escapeHTML(query)}”. <a href="#explore?q=${encodeURIComponent(query)}" class="ps-landing-more">procurar na comunidade →</a></p>`;
        }
    }

    // A pesquisa da landing procura nos quadros públicos (os quadros
    // deste dispositivo estão agora no perfil).
    _searchProjects(query) {
        this._renderPublicPreview(query);
    }

    _showOpenModal() {
        this.ui.renderModalProjectsList(getAllProjects());
        document.getElementById('modal-abrir').showModal();
    }

    async _addImage(file, x, y) {
        const el = await importImageFromFile(file, this.project.elementos, x, y);
        if (!el) {
            this.ui.showToast('Não foi possível ler essa imagem.');
            return;
        }
        this._clampElementBounds(el);
        this.project.elementos.push(el);
        this._renderElement(el);
        this._selectElement(el.id);
        this._commitHistory();
        this.isDirty = true;
    }

    /* ---------- Fora do quadro ----------
       Um elemento pode ficar parcialmente fora: o quadro recorta-o e só
       aparece (e só se exporta) a parte de dentro. Totalmente fora → apagado. */
    _isOffBoard(el) {
        const W = this.project.boardWidth || 3000, H = this.project.boardHeight || 3000;
        const a = (el.rotation || 0) * Math.PI / 180;
        const cos = Math.abs(Math.cos(a)), sin = Math.abs(Math.sin(a));
        const w = el.width * cos + el.height * sin, h = el.width * sin + el.height * cos;
        const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
        return cx + w / 2 <= 0 || cy + h / 2 <= 0 || cx - w / 2 >= W || cy - h / 2 >= H;
    }

    _removeIfOffBoard(el) {
        if (!el || !this._isOffBoard(el)) return false;
        this._deleteElement(el.id);
        this.ui.showToast('Elemento removido — ficou totalmente fora do quadro. (Ctrl+Z para recuperar)');
        return true;
    }

    /* ---------- Imagens por link ---------- */
    _onPaste(e) {
        if (!this.project || !this.ui.editorView.classList.contains('active')) return;
        const t = e.target;
        if (t && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName))) return;
        const cd = e.clipboardData;
        if (!cd) return;
        const file = Array.from(cd.files || []).find(f => f.type && f.type.startsWith('image/'));
        if (file) {
            e.preventDefault();
            this._addImage(file).then(() => this.ui.showToast('Imagem colada!'));
            return;
        }
        const text = (cd.getData('text/plain') || '').trim();
        if (text === CLIP_MARKER || (!text && this._clipboard)) {
            e.preventDefault();
            this._pasteElement();
            return;
        }
        const html = cd.getData('text/html') || '';
        const htmlImg = (html.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1];
        const url = /^(https?:\/\/|data:image\/)/i.test(text) ? text : htmlImg;
        if (url) {
            e.preventDefault();
            this._addImageFromUrl(url);
            return;
        }
        if (this._clipboard) {
            e.preventDefault();
            this._pasteElement();
        }
    }

    async _addImageFromUrl(raw, x, y) {
        if (!this.project) return;
        const url = normalizeImageUrl(raw);
        if (!url) {
            this.ui.showToast('Isso não parece um link. Cola o endereço da imagem (começa por https://).');
            return;
        }
        if (/pinterest\.[a-z.]+\/pin\//i.test(url) || /instagram\.com\/p\//i.test(url)) {
            this.ui.showToast('Esse é o link da página, não da imagem. Abre a imagem, clica com o botão direito → "Copiar endereço da imagem" e cola aqui.', 7000);
            return;
        }
        this.ui.showToast('A carregar imagem do link…', 20000);
        const file = await fileFromUrl(url);
        if (!file) {
            this.ui.showToast('Não consegui abrir essa imagem. Confirma que o link leva diretamente a uma imagem (.jpg, .png, .webp…).', 6000);
            return;
        }
        await this._addImage(file, x, y);
        this.ui.showToast('Imagem adicionada!');
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
        const src = await compactarFicheiroImagem(file);
        if (!src) return;
        el.src = src;
        this._renderElement(el);
        this._commitHistory();
        this.isDirty = true;
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

    // Borracha: apaga só a parte tocada de CADA elemento, que continua a
    // ser um elemento separado na sua camada (antes juntava tudo — fundo
    // incluído — numa única imagem, e a colagem deixava de ser editável
    // por partes ao publicar/copiar).
    async _commitEraserStroke(strokeResult) {
        if (!strokeResult.points || strokeResult.points.length < 2) return;
        const pad = Math.max(4, strokeResult.size);
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of strokeResult.points) {
            minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        }
        const stroke = { x: minX - pad, y: minY - pad, w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad };

        const aabb = (el) => {
            const a = (el.rotation || 0) * Math.PI / 180;
            const cos = Math.abs(Math.cos(a)), sin = Math.abs(Math.sin(a));
            const w = el.width * cos + el.height * sin;
            const h = el.width * sin + el.height * cos;
            const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
            return { x: Math.floor(cx - w / 2), y: Math.floor(cy - h / 2), w: Math.ceil(w), h: Math.ceil(h) };
        };

        let changed = 0;
        const removed = new Set();
        for (const el of this.project.elementos) {
            if (el.visivel === false || el.bloqueada || el.moldura) continue;
            const box = aabb(el);
            if (!this._elementOverlapsBounds({ x: box.x, y: box.y, width: box.w, height: box.h }, stroke)) continue;
            if (box.w < 2 || box.h < 2 || box.w * box.h > 40e6) continue;

            try {
                const c = document.createElement('canvas');
                c.width = box.w;
                c.height = box.h;
                const ctx = c.getContext('2d');
                ctx.translate(-box.x, -box.y);
                // opacidade fica como propriedade; o resto (rotação, filtros, cantos) é "cozido".
                await drawElement(ctx, { ...el, opacidade: 1 });
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineWidth = Math.max(1, strokeResult.size);
                ctx.beginPath();
                ctx.moveTo(strokeResult.points[0].x - box.x, strokeResult.points[0].y - box.y);
                for (let i = 1; i < strokeResult.points.length; i++) {
                    ctx.lineTo(strokeResult.points[i].x - box.x, strokeResult.points[i].y - box.y);
                }
                ctx.stroke();

                // Ficou totalmente apagado? Remove o elemento.
                const data = ctx.getImageData(0, 0, box.w, box.h).data;
                let opaque = false;
                for (let i = 3; i < data.length; i += 16) { if (data[i] > 8) { opaque = true; break; } }
                if (!opaque) { removed.add(el.id); changed++; continue; }

                const src = c.toDataURL('image/png');
                const keep = { id: el.id, layer: el.layer, nome: el.nome || getElementLabel(el), opacidade: el.opacidade ?? 1, bloqueada: false, visivel: true };
                Object.keys(el).forEach(k => delete el[k]);
                Object.assign(el, keep, {
                    tipo: 'imagem', src, x: box.x, y: box.y, width: box.w, height: box.h,
                    rotation: 0, escala: 1, filtro: 'none', brilho: 1, contraste: 1, saturacao: 1,
                    flipX: false, flipY: false, raio: 0
                });
                changed++;
            } catch (err) {
                // Imagem de outro site (canvas "tainted"): não dá para apagar essa.
                console.warn('Borracha: elemento ignorado', el.id, err);
            }
        }

        if (!changed) {
            this.ui.showToast('Nada para apagar aí.');
            return;
        }
        if (removed.size) this.project.elementos = this.project.elementos.filter(e => !removed.has(e.id));
        this._rerenderAll();
        this._commitHistory();
        this.isDirty = true;
        this.ui.showToast(changed === 1 ? 'Área apagada.' : `Área apagada em ${changed} elementos (continuam separados).`);
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

    _addSticker(stickerId) {
        if (!this.project) return;
        const el = createStickerElement(stickerId, this.project.elementos, this.project.boardWidth || 3000, this.project.boardHeight || 3000);
        // Espalha os elementos novos para não ficarem todos empilhados ao centro.
        const SPOTS = [[0, 0], [-.22, -.18], [.22, .16], [.2, -.2], [-.2, .2], [0, -.28], [0, .28], [-.28, 0], [.28, 0]];
        const n = this.project.elementos.filter(e => e.elemento).length;
        const [ox, oy] = SPOTS[n % SPOTS.length];
        const bw = this.project.boardWidth || 3000, bh = this.project.boardHeight || 3000;
        el.x = bw / 2 - el.width / 2 + ox * bw + (Math.random() - .5) * bw * .04;
        el.y = bh / 2 - el.height / 2 + oy * bh + (Math.random() - .5) * bh * .04;
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
        this.ui.showToast('Moldura adicionada — fica por cima, mas os cliques passam para as fotos.');
    }

    _getSelectedImage() {
        const id = this.board.getSelectedId();
        return id ? this.project.elementos.find(e => e.id === id && e.tipo === 'imagem') : null;
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
            el.src = await compactarImagem(canvas.toDataURL('image/png'));
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

    // Carrega a biblioteca (uma vez) e escolhe GPU quando o browser tem WebGPU.
    async _bgLib() {
        if (!this._bgModule) this._bgModule = await import(BACKGROUND_REMOVAL_CDN);
        return this._bgModule;
    }

    _bgConfig(device, onProgress) {
        return {
            device,
            model: device === 'gpu' ? 'isnet_fp16' : 'isnet_quint8',
            output: { format: 'image/png', quality: 1 },
            progress: onProgress
        };
    }

    // Pré-carrega o modelo em segundo plano quando se seleciona uma foto,
    // para o clique em "Remover fundo" ser rápido.
    _preloadBgRemoval() {
        if (this._bgPreloaded || !('requestIdleCallback' in window)) return;
        this._bgPreloaded = true;
        requestIdleCallback(async () => {
            try {
                const m = await this._bgLib();
                await m.preload?.(this._bgConfig(navigator.gpu ? 'gpu' : 'cpu'));
            } catch { this._bgPreloaded = false; }
        }, { timeout: 4000 });
    }

    // Animação por cima da foto enquanto a IA trabalha (para não parecer parado).
    _aiBusy(el, on) {
        const dom = this.board.getElementDOM(el.id);
        if (!dom) return null;
        dom.querySelector('.ai-busy')?.remove();
        if (!on) return null;
        const o = document.createElement('div');
        o.className = 'ai-busy is-indeterminate';
        o.innerHTML = '<i class="ai-busy-dots"></i><i class="ai-busy-scan"></i><span class="ai-busy-pill"><i class="ai-busy-ring"></i><span class="ai-busy-txt">A preparar a IA…</span></span>';
        const pill = o.querySelector('.ai-busy-pill');
        pill.style.transform = `translate(-50%, -50%) scale(${1 / Math.max(0.05, this.board.getZoom())})`;
        dom.appendChild(o);
        return {
            set: (txt, pct) => {
                o.querySelector('.ai-busy-txt').textContent = txt;
                o.classList.toggle('is-indeterminate', pct == null);
                if (pct != null) o.style.setProperty('--p', Math.round(pct));
            }
        };
    }

    async _removeBackgroundSelected() {
        const el = this._getSelectedImage();
        if (!el || !el.src) {
            this.ui.showToast('Selecione uma imagem.');
            return;
        }
        if (this._bgBusy) { this.ui.showToast('A remoção de fundo já está a correr…'); return; }
        this._bgBusy = true;
        const busy = this._aiBusy(el, true);
        const t0 = performance.now();
        const onProgress = (key, cur, total) => {
            if (String(key).startsWith('fetch') && total) busy?.set(`A descarregar a IA (só da 1.ª vez) ${Math.round(cur / total * 100)}%`, cur / total * 100);
            else if (String(key).startsWith('compute')) busy?.set('A recortar a imagem…', null);
        };
        try {
            const m = await this._bgLib();
            // Otimização: a IA trabalha numa cópia pequena (≤1024 px, o tamanho
            // com que o modelo vê a imagem) e a máscara é aplicada à foto original
            // em tamanho real — muito mais rápido e sem perder qualidade.
            const img = await loadImage(el.src);
            const nw = img.naturalWidth, nh = img.naturalHeight;
            const k = Math.min(1, 1024 / Math.max(nw, nh));
            const small = document.createElement('canvas');
            small.width = Math.max(1, Math.round(nw * k));
            small.height = Math.max(1, Math.round(nh * k));
            small.getContext('2d').drawImage(img, 0, 0, small.width, small.height);
            const input = await new Promise(r => small.toBlob(r, 'image/png'));
            busy?.set('A recortar a imagem…', null);

            let fg;
            const devices = navigator.gpu ? ['gpu', 'cpu'] : ['cpu'];
            let lastErr;
            for (const d of devices) {
                try { fg = await m.removeBackground(input, this._bgConfig(d, onProgress)); break; }
                catch (err) { lastErr = err; console.warn('removeBackground (' + d + ') falhou', err); }
            }
            if (!fg) throw lastErr || new Error('sem resultado');

            busy?.set('Quase…', 95);
            const mask = await createImageBitmap(fg);
            const K = Math.min(1, 2400 / Math.max(nw, nh));
            const out = document.createElement('canvas');
            out.width = Math.round(nw * K);
            out.height = Math.round(nh * K);
            const ctx = out.getContext('2d');
            ctx.drawImage(img, 0, 0, out.width, out.height);
            ctx.globalCompositeOperation = 'destination-in';
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(mask, 0, 0, out.width, out.height);
            mask.close?.();

            const target = this.project && this.project.elementos.find(e => e.id === el.id);
            if (!target) return;
            target.src = await compactarImagem(out.toDataURL('image/png'));
            this._aiBusy(target, false);
            this._renderElement(target);
            const dom = this.board.getElementDOM(target.id);
            dom?.classList.add('ai-done');
            setTimeout(() => dom?.classList.remove('ai-done'), 800);
            this.board.updateSelectionBox();
            this._commitHistory();
            this.isDirty = true;
            this._refreshPanel();
            this.ui.showToast(`Fundo removido! (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
        } catch (aiErr) {
            console.warn('IA indisponível, a usar o método local:', aiErr);
            try {
                busy?.set('A usar o método simples…', null);
                el.src = await compactarImagem(await removeBackgroundManual(el.src));
                this._aiBusy(el, false);
                this._renderElement(el);
                this._commitHistory();
                this.isDirty = true;
                this._refreshPanel();
                this.ui.showToast('Sem ligação ao modelo de IA — fundo removido pelo método simples. Para afinar, usa "Apagar fundo".', 6000);
            } catch (manualErr) {
                console.error(manualErr);
                this.ui.showToast('Não foi possível remover o fundo.');
            }
        } finally {
            this._bgBusy = false;
            this._aiBusy(el, false);
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

        // Só um ouvinte por elemento (antes juntava-se um novo a cada redesenho).
        if (!dom._psBound) {
            dom._psBound = true;
            dom.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                if (e.target.classList.contains('text-content')) this._selectElement(dom.dataset.id);
            });
        }
    }

    /* Modos do rato: Selecionar (normal), Mão (arrasta elementos e o
       quadro, sem editar texto), Redimensionar (puxa para aumentar). */
    setInteractMode(mode) {
        if (!['select', 'move', 'resize'].includes(mode)) mode = 'select';
        this.interactMode = mode;
        document.documentElement.dataset.edMode = mode;
        this.board.handMode = mode === 'move';
        document.querySelectorAll('#ed-modes [data-mode]').forEach(b => {
            const on = b.dataset.mode === mode;
            b.classList.toggle('on', on);
            b.setAttribute('aria-pressed', String(on));
        });
        if (mode !== 'select') {
            // sai da edição de texto se estiver aberta
            const ae = document.activeElement;
            if (ae && ae.classList && ae.classList.contains('text-content')) ae.blur();
        }
    }

    _selectElement(id) {
        this.board.selectElement(id);
        this._refreshPanel();
    }

    _maybePreloadBg() {
        const el = this._getSelectedImage();
        if (el && !el.moldura && !el.elemento) this._preloadBgRemoval();
    }

    _refreshPanel() {
        const selectedId = this.board.getSelectedId();
        const selected = selectedId
            ? this.project.elementos.find(e => e.id === selectedId)
            : null;
        const cbs = this._getPanelCallbacks();
        this.ui.showPanel(this.ui.currentTool, selected, cbs);
        this._renderRight(cbs);
    }

    // Painel fixo da direita (camadas + propriedades). Agrupado num frame.
    _renderRight(cbs) {
        if (!this.project || !this.ui.renderRightPanel) return;
        this.ui.setRightPanelContext(this.project, cbs || this._getPanelCallbacks());
        this.ui.renderRightPanel(this.project, this.board.getSelectedId());
    }

    _scheduleRight() {
        if (this._rightRaf) return;
        this._rightRaf = requestAnimationFrame(() => {
            this._rightRaf = 0;
            if (this.project && this.ui.editorView.classList.contains('active')) this._renderRight();
        });
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
            onShowFormas: () => this._changeTool('shapes'),
            onUpdate: (el, commit = true) => {
                if (commit && this._removeIfOffBoard(el)) return;
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
            onAddImageUrl: (url) => this._addImageFromUrl(url),
            getGrid: () => this.project?.grade || null,
            onGridChange: (mode) => {
                this.project.grade = mode === null ? 'none' : mode;
                this.board.setGrid(mode);
                this._commitHistory();
                this.isDirty = true;
            },
            onAddSticker: (stickerId) => this._addSticker(stickerId),
            onAddFrame: (frameId) => this._addFrame(frameId),
            onCropImage: () => this._openCropImage(),
            onRemoveBackground: () => this._removeBackgroundSelected(),
            onManualBg: () => this._openManualBg?.(),
            onFlipImage: () => {
                const el = this._getSelectedImage();
                if (!el) return;
                el.flipX = !el.flipX;
                this._renderElement(el);
                this._commitHistory();
                this.isDirty = true;
            },
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
                this._rerenderAll();
                this._commitHistory();
                this.isDirty = true;
                this._refreshPanel();
            },
            getPublicInfo: () => ({
                publico: !!(this.project && this.project.publico),
                autor: (this.project && this.project.autor && this.project.autor !== 'Anónimo')
                    ? this.project.autor
                    : ((this.currentUser && this.currentUser.username) || 'Anónimo'),
                server: publicServerAvailable()
            }),
            getAccountInfo: () => ({
                user: this.currentUser,
                descricao: this.project ? this.project.descricao || '' : '',
                perfilPublico: !!(this.project && this.project.perfilPublico),
                syncedAt: this.project && this.project.remoteId ? this.project.cloudSyncedAt : null,
                foreign: !!(this.project && this.project.copiadoDe && !this.project.remoteId)
            }),
            onAccountSave: (opts) => this._saveAccountSettings(opts),
            onShowLogin: () => this.showLoginModal('login', 'Entra para publicar este quadro com o teu nome.'),
            onPublish: (autor) => this._publishProject(autor, false),
            onUpdatePublic: (autor) => this._publishProject(autor, true),
            onUnpublish: () => this._unpublishProject(),
            onOpenPublic: (id) => this._openPublic(id)
        };
    }

    _setBackground(bg) {
        // Mudar a cor/gradiente/imagem não apaga o padrão escolhido.
        if (bg && !('padrao' in bg) && this.project.background && this.project.background.padrao) {
            bg = { ...bg, padrao: this.project.background.padrao };
        }
        this.project.background = bg;
        this.board.applyBackground(bg);
        // Com um padrão (linhas, pontos…) a grelha guia sai, para não ficarem bolinhas por cima.
        if (bg && bg.padrao) { this.project.grade = 'none'; }
        this.board.setGrid(this._gridMode());
        this._commitHistory();
        this.isDirty = true;
    }

    // Grelha guia do editor: desligada por omissão e sempre que o fundo tem padrão.
    _gridMode() {
        const p = this.project;
        if (!p || (p.background && p.background.padrao)) return null;
        return (!p.grade || p.grade === 'none') ? null : p.grade;
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
        }
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
        // Marca a área de transferência para o Ctrl+V saber que é um elemento.
        try { navigator.clipboard?.writeText(CLIP_MARKER).catch(() => {}); } catch { /* ok */ }
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
        this._scheduleRight();
    }

    undo() {
        const state = this.history.undo(captureState(this.project));
        if (!state) return;
        applyState(this.project, state);
        this._rerenderAll();
        this.board.applyBackground(this.project.background);
        this.board.setGrid(this._gridMode());
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
        this.board.setGrid(this._gridMode());
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
    if (types.includes('files')
        || types.includes('text/uri-list')
        || types.some(t => t.includes('image'))) return true;
    // Durante o arrasto o browser esconde o texto; aceitamos e validamos no drop.
    return types.includes('text/plain') || types.includes('text/html');
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

// Lê o arrasto de forma síncrona: ficheiro de imagem e/ou links candidatos,
// do mais provável para o menos (imagem do HTML > link > texto).
function readDropPayload(dt) {
    const out = { file: null, urls: [] };
    if (!dt) return out;
    const files = Array.from(dt.files || []);
    out.file = files.find(f => f.type && f.type.startsWith('image/')) || null;
    if (out.file) return out;
    const get = (t) => { try { return dt.getData(t) || ''; } catch { return ''; } };
    const add = (u) => {
        u = normalizeImageUrl(u);
        if (!u) return;
        // Pinterest: pede a versão grande da imagem
        const big = u.replace(/(i\.pinimg\.com\/)\d+x\//i, '$1736x/');
        for (const v of (big !== u ? [big, u] : [u])) if (!out.urls.includes(v)) out.urls.push(v);
    };
    const html = get('text/html');
    if (html) {
        const m = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
        if (m) add(m[1].replace(/&amp;/g, '&'));
        const ss = html.match(/<img[^>]+srcset\s*=\s*["']([^"']+)["']/i);
        if (ss) { const last = ss[1].split(',').map(x => x.trim().split(/\s+/)[0]).filter(Boolean).pop(); if (last) add(last.replace(/&amp;/g, '&')); }
    }
    get('text/uri-list').split(/\r?\n/).map(x => x.trim()).filter(x => x && !x.startsWith('#')).forEach(add);
    const txt = get('text/plain').trim();
    if (/^(https?:\/\/|data:image\/|www\.)\S+$/i.test(txt)) add(txt);
    return out;
}

async function getDroppedImageFile(dataTransfer) {
    if (!dataTransfer) return null;

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

    const files = Array.from(dataTransfer.files || []);
    const imageFile = files.find(f => f.type && f.type.startsWith('image/'));
    if (imageFile) return imageFile;
    if (files[0]) return files[0];

    try {
        const uriList = dataTransfer.getData('text/uri-list') || '';
        const f = await fileFromUriList(uriList);
        if (f) return f;
    } catch {
        return null;
    }

    try {
        const txt = dataTransfer.getData('text/plain') || '';
        return await fileFromUrl(txt.trim());
    } catch {
        return null;
    }
}

async function fileFromUriList(uriList) {
    if (!uriList) return null;
    const url = uriList
        .replace(/^#.*$/gm, '')
        .split(/\r?\n/)
        .map(s => s.trim())
        .find(u => u.startsWith('http'));
    if (!url) return null;
    return fileFromUrl(url);
}

// Aceita links de pesquisa (Google Imagens, etc.) e devolve o link da imagem.
function normalizeImageUrl(raw) {
    let url = String(raw || '').trim().replace(/^<|>$/g, '');
    if (!url) return null;
    if (/^data:image\//i.test(url)) return url;
    if (/^\/\//.test(url)) url = 'https:' + url;
    if (!/^https?:\/\//i.test(url)) {
        if (/^[\w-]+(\.[\w-]+)+\/\S+$/.test(url)) url = 'https://' + url; else return null;
    }
    try {
        const u = new URL(url);
        const inner = u.searchParams.get('imgurl') || u.searchParams.get('mediaurl') || u.searchParams.get('img_url');
        if (inner && /^https?:/i.test(inner)) return inner;
    } catch { return null; }
    return url;
}

async function _blobToImageFile(blob) {
    if (!blob || !blob.size) return null;
    let type = blob.type || '';
    if (!type.startsWith('image/')) {
        // Alguns servidores não dizem o tipo: confirmamos que o browser a consegue abrir.
        try { const bmp = await createImageBitmap(blob); bmp.close?.(); type = 'image/png'; } catch { return null; }
    }
    const ext = (type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    return new File([blob], 'imagem.' + ext, { type });
}

async function _fetchWithTimeout(url, ms = 12000) {
    const ctrl = 'AbortController' in window ? new AbortController() : null;
    const t = ctrl ? setTimeout(() => ctrl.abort(), ms) : null;
    try {
        const res = await fetch(url, { mode: 'cors', signal: ctrl?.signal, referrerPolicy: 'no-referrer' });
        if (!res.ok) return null;
        return await res.blob();
    } catch { return null; } finally { if (t) clearTimeout(t); }
}

async function fileFromUrl(url) {
    url = normalizeImageUrl(url);
    if (!url) return null;
    if (url.startsWith('data:')) return _blobToImageFile(await (await fetch(url)).blob());
    // 1) direto (sites que permitem CORS, ex.: Pinterest, Unsplash)
    let file = await _blobToImageFile(await _fetchWithTimeout(url));
    if (file) return file;
    // 2) através de um proxy de imagens público (para sites que bloqueiam CORS)
    const proxied = 'https://wsrv.nl/?url=' + encodeURIComponent(url.replace(/^https?:\/\//i, '')) + '&n=-1';
    file = await _blobToImageFile(await _fetchWithTimeout(proxied, 15000));
    return file;
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new PinSpaceApp();
    app.init();
    window.pinspaceApp = app;
});
