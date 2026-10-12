/* =====================================================================
   PinSpace — editor mais completo
   1. Arrastar do menu para o quadro (texto, elementos, molduras, formas
      e elementos dos templates) — além de clicar.
   2. Várias páginas: botão "+ Adicionar página" por baixo do quadro;
      os elementos arrastam-se livremente de uma página para outra.
   3. Barra rápida por cima do elemento selecionado, com menus que abrem
      no ecrã (sombra, rodar/virar, filtros, fonte, cor, efeitos).
   4. Painel muda sozinho para o tipo do elemento selecionado.
   5. Templates: abre uma página com os quadros públicos e os elementos
      de cada um, prontos a arrastar para o teu quadro.
   Carregado depois de js/app.js (estende PinSpaceApp sem a reescrever).
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. Arrastar do menu para o quadro (pointer events, funciona em tudo)
   --------------------------------------------------------------------- */
const PSDrag = (() => {
    const registry = new Map();
    let seq = 0;
    let st = null;
    let ghost = null;

    function register(obj) {
        const k = 'e' + (++seq);
        registry.set(k, obj);
        return k;
    }

    function overBoard(x, y) {
        const vp = document.getElementById('board-viewport');
        if (!vp || !document.getElementById('editor-view')?.classList.contains('active')) return false;
        const r = vp.getBoundingClientRect();
        if (x < r.left || x > r.right || y < r.top || y > r.bottom) return false;
        const el = document.elementFromPoint(x, y);
        if (!el) return false;
        if (el.closest('.tpl-drawer, .tool-panel, .fx-pop, .ed-zoom, .ed-music, .ed-modes, .ps-quickbar, .board-pages-ui')) return false;
        return vp.contains(el);
    }

    function cleanup() {
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', up, true);
        window.removeEventListener('pointercancel', cancel, true);
    }

    function down(e) {
        if (e.button !== 0) return;
        const item = e.target.closest('[data-ps-drag]');
        if (!item || e.target.closest('input, textarea, select')) return;
        st = { item, x: e.clientX, y: e.clientY, started: false, payload: item.dataset.psDrag };
        window.addEventListener('pointermove', move, true);
        window.addEventListener('pointerup', up, true);
        window.addEventListener('pointercancel', cancel, true);
    }

    function start() {
        ghost = document.createElement('div');
        ghost.className = 'ps-ghost';
        const src = st.item.querySelector('.tpl-el-prev, .el-thumb, .frame-thumb, .text-add-sample, .shape-preview, svg, img') || st.item;
        const clone = src.cloneNode(true);
        clone.removeAttribute('id');
        ghost.appendChild(clone);
        document.body.appendChild(ghost);
        document.body.classList.add('ps-dragging');
        try { window.getSelection()?.removeAllRanges(); } catch { /* ok */ }
    }

    function move(e) {
        if (!st) return;
        if (!st.started) {
            if (Math.hypot(e.clientX - st.x, e.clientY - st.y) < 6) return;
            st.started = true;
            start();
        }
        e.preventDefault();
        ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        const over = overBoard(e.clientX, e.clientY);
        document.body.classList.toggle('ps-drag-over-board', over);
        ghost.classList.toggle('over', over);
    }

    function finish() {
        ghost?.remove();
        ghost = null;
        document.body.classList.remove('ps-dragging', 'ps-drag-over-board');
    }

    function up(e) {
        cleanup();
        const s = st;
        st = null;
        if (!s || !s.started) return;
        const onBoard = overBoard(e.clientX, e.clientY);
        finish();
        // O clique que vem a seguir ao largar não deve adicionar outra vez.
        s.item._psDragged = true;
        const eat = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
        window.addEventListener('click', eat, true);
        setTimeout(() => { window.removeEventListener('click', eat, true); s.item._psDragged = false; }, 0);
        if (onBoard) window.pinspaceApp?.psDropItem(s.payload, e.clientX, e.clientY);
    }

    function cancel() {
        cleanup();
        st = null;
        finish();
    }

    document.addEventListener('pointerdown', down, true);
    return { register, get: (k) => registry.get(k) };
})();

/* ---------------------------------------------------------------------
   Extensões da app
   --------------------------------------------------------------------- */
(function () {
    if (typeof PinSpaceApp === 'undefined') return;
    const P = PinSpaceApp.prototype;

    /* ---------- Páginas: geometria ---------- */
    P._psPageStep = function () {
        return (this.project.boardWidth || 3000) + this.board.pageGap;
    };
    P._psElPage = function (el) {
        return this.board.pageOf(el.x + el.width / 2);
    };
    // Página que está no meio do ecrã (onde entram os elementos novos).
    P._psActivePage = function () {
        if (!this.board || this.board.pages <= 1) return 0;
        const vp = this.board.viewport;
        const z = this.board.getZoom();
        const x = (vp.scrollLeft + vp.clientWidth / 2 - this.board.canvas.offsetLeft) / z;
        return this.board.pageOf(x);
    };

    P._isOffBoard = function (el) {
        const W = this.project.boardWidth || 3000, H = this.project.boardHeight || 3000;
        const a = (el.rotation || 0) * Math.PI / 180;
        const cos = Math.abs(Math.cos(a)), sin = Math.abs(Math.sin(a));
        const w = el.width * cos + el.height * sin, h = el.width * sin + el.height * cos;
        const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
        if (cy + h / 2 <= 0 || cy - h / 2 >= H) return true;
        const pages = Math.max(1, this.board.pages || 1);
        for (let k = 0; k < pages; k++) {
            const l = this.board.pageLeft(k);
            if (cx + w / 2 > l && cx - w / 2 < l + W) return false;
        }
        return true;
    };

    // Mantém o elemento dentro da página onde está (ou da página ativa,
    // quando é um elemento novo criado por clique).
    P._clampElementBounds = function (el) {
        const W = this.project.boardWidth || 3000;
        const H = this.project.boardHeight || 3000;
        let page = this._psForcePage;
        this._psForcePage = null;
        if (page != null && page > 0 && el.x + el.width / 2 < W + this.board.pageGap / 2) {
            el.x += this.board.pageLeft(page);
        }
        if (page == null) page = this.board.pageOf(el.x + el.width / 2);
        const left = this.board.pageLeft(page);
        el.x = clamp(el.x, left, Math.max(left, left + W - el.width));
        el.y = clamp(el.y, 0, Math.max(0, H - el.height));
        if (el.width > 20) el.width = Math.min(el.width, Math.max(20, left + W - el.x));
        if (el.height > 20) el.height = Math.min(el.height, Math.max(20, H - el.y));
        return el;
    };

    // Elementos novos (por clique) entram na página que está à vista.
    ['_addText', '_addTextPreset', '_addShape', '_addSticker'].forEach(name => {
        const orig = P[name];
        if (!orig) return;
        P[name] = function (...args) {
            if (this.board && this.board.pages > 1) this._psForcePage = this._psActivePage();
            try { return orig.apply(this, args); } finally { this._psForcePage = null; }
        };
    });
    const origAddImage = P._addImage;
    P._addImage = function (file, x, y) {
        if (x == null && this.board && this.board.pages > 1) this._psForcePage = this._psActivePage();
        return origAddImage.call(this, file, x, y);
    };
    const origAddFrame = P._addFrame;
    P._addFrame = function (frameId) {
        const before = new Set((this.project?.elementos || []).map(e => e.id));
        origAddFrame.call(this, frameId);
        const page = this._psActivePage();
        if (!page || !this.project) return;
        const el = this.project.elementos.find(e => !before.has(e.id));
        if (!el) return;
        el.x += this.board.pageLeft(page);
        this._renderElement(el);
        this._commitHistory();
    };

    /* ---------- Páginas: ações ---------- */
    const origLoad = P._loadProjectIntoEditor;
    P._loadProjectIntoEditor = function () {
        // Quadros vindos de fora (públicos, cópias, antigos) passam sempre pela limpeza.
        if (typeof psSanitizeProject === 'function') psSanitizeProject(this.project);
        this.board.pages = Math.max(1, this.project.numPaginas || 1);
        origLoad.call(this);
        this._psHideQuickbar();
    };

    P._psSyncPages = function () {
        const n = Math.max(1, this.project.numPaginas || 1);
        if (this.board.pages === n) return;
        this.board.setBoardSize(this.project.boardWidth || 3000, this.project.boardHeight || 3000, n);
        this.brush.syncSize();
        this.board.centerBoard();
    };
    ['undo', 'redo'].forEach(name => {
        const orig = P[name];
        P[name] = function () {
            orig.call(this);
            if (this.project) this._psSyncPages();
        };
    });

    P._psScrollToPage = function (k) {
        const vp = this.board.viewport;
        const z = this.board.getZoom();
        const pageW = this.board.boardWidth * z;
        const x = this.board.canvas.offsetLeft + this.board.pageLeft(k) * z - (vp.clientWidth - pageW) / 2;
        vp.scrollTo({ left: Math.max(0, x), behavior: 'smooth' });
    };

    P._psPageAction = function (act, k) {
        if (!this.project) return;
        this._syncAllFromDOM();
        const step = this._psPageStep();
        let n = Math.max(1, this.project.numPaginas || 1);
        const els = this.project.elementos;
        const inPage = (el, p) => this._psElPage(el) === p;
        let scrollTo = null;

        if (act === 'add') {
            n += 1;
            scrollTo = n - 1;
            this.ui.showToast(`Página ${n} adicionada — fica ao lado — arrasta elementos entre páginas.`);
        } else if (act === 'del') {
            if (n <= 1) { this.ui.showToast('É a única página do quadro.'); return; }
            const count = els.filter(el => inPage(el, k)).length;
            if (count && !confirm(`Apagar a página ${k + 1} e ${count === 1 ? 'o elemento que tem' : `os ${count} elementos que tem`}?`)) return;
            this.project.elementos = els.filter(el => !inPage(el, k));
            this.project.elementos.forEach(el => { if (this._psElPage(el) > k) el.x -= step; });
            n -= 1;
            this.ui.showToast('Página apagada. (Ctrl+Z para desfazer)');
        } else if (act === 'dup') {
            const copies = els.filter(el => inPage(el, k)).map(el => {
                const c = deepClone(el);
                c.id = generateId();
                c.x += step;
                return c;
            });
            els.forEach(el => { if (this._psElPage(el) > k) el.x += step; });
            let layer = getNextLayer(els);
            copies.forEach(c => { c.layer = layer++; els.push(c); });
            n += 1;
            scrollTo = k + 1;
        } else if (act === 'up' || act === 'down') {
            const j = act === 'up' ? k - 1 : k + 1;
            if (j < 0 || j >= n) return;
            const a = els.filter(el => inPage(el, k));
            const b = els.filter(el => inPage(el, j));
            a.forEach(el => { el.x += (j - k) * step; });
            b.forEach(el => { el.x += (k - j) * step; });
            scrollTo = j;
        } else {
            return;
        }

        this.project.numPaginas = n;
        this.board.selectElement(null);
        this.board.setBoardSize(this.project.boardWidth || 3000, this.project.boardHeight || 3000, n);
        this.brush.syncSize();
        this.board.centerBoard();
        this._rerenderAll();
        this._commitHistory();
        this.isDirty = true;
        this._refreshPanel();
        if (scrollTo != null) requestAnimationFrame(() => this._psScrollToPage(scrollTo));
    };

    /* ---------- Largar itens do menu no quadro ---------- */
    P.psDropItem = function (payload, clientX, clientY) {
        if (!this.project || !payload) return;
        const i = payload.indexOf(':');
        const kind = payload.slice(0, i);
        const arg = payload.slice(i + 1);
        const W = this.project.boardWidth || 3000, H = this.project.boardHeight || 3000;
        const pos = this._dropToCanvasCoords(clientX, clientY);
        const page = this.board.pageOf(pos.x);
        const els = this.project.elementos;
        let el = null;
        switch (kind) {
            case 'text': el = createTextPreset(arg, els); break;
            case 'sticker': el = createStickerElement(arg, els, W, H); break;
            case 'shape': el = createShape(arg, 0, 0, getNextLayer(els)); break;
            case 'frame':
                el = createFrameElement(arg, W, H, els);
                el.x = (el.x || 0) + this.board.pageLeft(page);
                break;
            case 'tpl': {
                const t = PSDrag.get(arg);
                if (!t) return;
                el = deepClone(t.el);
                el.id = generateId();
                if (typeof psSanitizeElement === 'function' && !psSanitizeElement(el)) return;
                el.layer = getNextLayer(els);
                el.bloqueada = false;
                el.visivel = true;
                const s = t.scale || 1;
                if (s !== 1) {
                    el.width *= s; el.height *= s;
                    if (el.tamanho) el.tamanho = Math.max(6, Math.round(el.tamanho * s * 10) / 10);
                    if (el.raio) el.raio = Math.round(el.raio * s);
                    if (el.espessura) el.espessura = Math.max(1, Math.round(el.espessura * s));
                    if (el.letterSpacing) el.letterSpacing *= s;
                }
                // Imagens muito grandes ficam com 60% da largura da página.
                if (el.width > W * 0.9) {
                    const f = (W * 0.6) / el.width;
                    el.width *= f; el.height *= f;
                    if (el.tamanho) el.tamanho = Math.max(6, Math.round(el.tamanho * f));
                }
                break;
            }
            default: return;
        }
        if (!el) return;
        if (kind !== 'frame') {
            el.x = pos.x - el.width / 2;
            el.y = pos.y - el.height / 2;
            this._clampElementBounds(el);
        }
        els.push(el);
        this._renderElement(el);
        if (!el.moldura) this._selectElement(el.id);
        this._commitHistory();
        this.isDirty = true;
        const dom = this.board.getElementDOM(el.id);
        if (dom) { dom.classList.add('ps-dropped'); setTimeout(() => dom.classList.remove('ps-dropped'), 500); }
    };

    /* ---------- Ligar tudo ao arrancar ---------- */
    const origInitBoard = P._initBoard;
    P._initBoard = function () {
        origInitBoard.call(this);
        const board = this.board;
        board.onPageAction = (act, k) => this._psPageAction(act, k);

        // Painel muda para o tipo do elemento escolhido (imagem → Imagem…).
        const origSel = board.onSelectionChange;
        board.onSelectionChange = (id) => {
            if (id && this.project) {
                const el = this.project.elementos.find(e => e.id === id);
                const map = { imagem: 'image', texto: 'text', forma: 'shapes' };
                const want = el && map[el.tipo];
                const cur = this.ui.currentTool || 'select';
                if (want && want !== cur && ['select', 'image', 'text', 'shapes'].includes(cur)) {
                    this.ui.setActiveTool(want);
                    this.brush.setActive(false);
                }
            }
            origSel?.(id);
            this._psBuildQuickbar(id);
        };

        const origUpd = board._updateSelectionBox.bind(board);
        board._updateSelectionBox = () => {
            origUpd();
            this._psPlaceQuickbar();
        };

        // A barra rápida esconde-se enquanto se arrasta/redimensiona.
        board.viewport.addEventListener('mousedown', (e) => {
            if (e.target.closest('.board-element, .handle')) this._psQuickbar?.classList.add('qb-hide');
        });
        window.addEventListener('mouseup', () => {
            if (!this._psQuickbar) return;
            this._psQuickbar.classList.remove('qb-hide');
            this._psPlaceQuickbar();
        });
        board.viewport.addEventListener('scroll', () => this._psPlaceQuickbar(), { passive: true });

        document.getElementById('btn-templates')?.addEventListener('click', () => this.openTemplates());
        // Escolher outra opção do menu fecha os Templates (em vez de ficarem por cima).
        document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.addEventListener('click', () => this._tplClose()));
    };

    /* ---------------------------------------------------------------------
       3. Barra rápida do elemento selecionado
       --------------------------------------------------------------------- */
    const QB_ICON = {
        shadow: FX_ICON.shadow,
        rotate: FX_ICON.rotate,
        filter: FX_ICON.filter,
        fx: FX_ICON.sparkle,
        color: FX_ICON.palette,
        font: FX_ICON.type,
        crop: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>',
        dup: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
        del: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 6V4a2 2 0 0 1 4 0v2"/></svg>',
        more: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
        bold: '<b style="font-size:14px">B</b>'
    };

    P._psHideQuickbar = function () {
        this._psQuickbar?.remove();
        this._psQuickbar = null;
        document.querySelector('.qb-pop')?.remove();
    };

    P._psBuildQuickbar = function (id) {
        // A barra rápida foi retirada: o menu do botão direito já tem estas opções.
        this._psHideQuickbar();
        return;
        // eslint-disable-next-line no-unreachable
        document.querySelector('.qb-pop')?.remove();
        const el = id && this.project ? this.project.elementos.find(e => e.id === id) : null;
        if (!el || el.moldura) { this._psHideQuickbar(); return; }
        let bar = this._psQuickbar;
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'ps-quickbar';
            bar.addEventListener('mousedown', (e) => e.stopPropagation());
            bar.addEventListener('click', (e) => {
                const b = e.target.closest('[data-qb]');
                if (b) this._psQuickAction(b.dataset.qb, b);
            });
            this.board.viewport.appendChild(bar);
            this._psQuickbar = bar;
        }
        const btn = (k, label, opts = {}) => `<button type="button" class="qb-btn ${opts.icon ? 'qb-icon' : ''} ${opts.on ? 'on' : ''}" data-qb="${k}" title="${label}">${QB_ICON[k] || ''}${opts.icon ? '' : `<span>${label}</span>`}${opts.menu ? '<svg class="qb-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m6 9 6 6 6-6"/></svg>' : ''}</button>`;
        let html = '';
        if (el.tipo === 'imagem') {
            html = btn('shadow', 'Sombra', { menu: true, on: !!(el.sombra && el.sombra.preset) })
                + btn('rotate', 'Rodar', { menu: true })
                + (el.elemento ? '' : btn('filter', 'Filtros', { menu: true }))
                + (el.elemento ? '' : btn('crop', 'Recortar'));
        } else if (el.tipo === 'texto') {
            const fx = textEffectOf(el).tipo;
            html = `<button type="button" class="qb-btn qb-font" data-qb="font" title="Fonte" style="font-family:'${fxEsc(el.fonte || 'Segoe UI')}'"><span>${fxEsc(el.fonte || 'Segoe UI')}</span><svg class="qb-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m6 9 6 6 6-6"/></svg></button>`
                + `<button type="button" class="qb-btn qb-icon qb-color" data-qb="color" title="Cor do texto"><i style="background:${fxEsc(el.cor || '#000')}"></i></button>`
                + btn('bold', 'Negrito', { icon: true, on: !!el.negrito })
                + btn('fx', 'Efeitos', { menu: true, on: fx && fx !== 'nenhum' })
                + btn('rotate', 'Rodar', { menu: true, icon: true });
        } else {
            html = btn('rotate', 'Rodar', { menu: true });
        }
        html += '<span class="qb-sep"></span>' + btn('dup', 'Duplicar', { icon: true }) + btn('del', 'Apagar', { icon: true }) + btn('more', 'Mais opções no painel', { icon: true });
        bar.innerHTML = html;
        bar.classList.remove('qb-hide');
        this._psPlaceQuickbar();
    };

    P._psPlaceQuickbar = function () {
        const bar = this._psQuickbar;
        if (!bar) return;
        const sel = this.board.selectionBox;
        if (!this.board.getSelectedId() || sel.classList.contains('hidden')) { bar.style.display = 'none'; return; }
        bar.style.display = '';
        const vp = this.board.viewport;
        const left = parseFloat(sel.style.left) || 0;
        const top = parseFloat(sel.style.top) || 0;
        const w = parseFloat(sel.style.width) || 0;
        const h = parseFloat(sel.style.height) || 0;
        const bw = bar.offsetWidth || 300;
        const bh = bar.offsetHeight || 44;
        let x = left + w / 2 - bw / 2;
        x = Math.max(vp.scrollLeft + 8, Math.min(x, vp.scrollLeft + vp.clientWidth - bw - 8));
        let y = top - bh - 34;
        if (y < vp.scrollTop + 60) y = top + h + 16;
        if (y + bh > vp.scrollTop + vp.clientHeight - 80) y = Math.max(vp.scrollTop + 60, top - bh - 34);
        bar.style.left = x + 'px';
        bar.style.top = y + 'px';
    };

    P._psQuickCallbacks = function () {
        const base = this._getPanelCallbacks();
        return {
            ...base,
            onUpdate: (el, commit = true) => {
                base.onUpdate(el, commit);
                if (commit) this._psSoftRefresh();
            }
        };
    };

    // Atualiza o painel sem o fazer saltar para o topo.
    P._psSoftRefresh = function () {
        clearTimeout(this._psRefreshT);
        this._psRefreshT = setTimeout(() => {
            const pc = document.getElementById('panel-content');
            const y = pc ? pc.scrollTop : 0;
            this._refreshPanel();
            if (pc) pc.scrollTop = y;
            const id = this.board.getSelectedId();
            if (id) this._psBuildQuickbar(id);
        }, 160);
    };

    P._psQuickAction = function (act, anchor) {
        const id = this.board.getSelectedId();
        const el = id && this.project.elementos.find(e => e.id === id);
        if (!el) return;
        const cbs = this._psQuickCallbacks();
        const pop = (title, html, bind) => {
            const open = document.querySelector('.qb-pop');
            const same = open && open.dataset.for === act;
            open?.remove();
            if (same) return;
            const p = document.createElement('div');
            p.className = 'fx-pop qb-pop';
            p.dataset.for = act;
            p.innerHTML = `<div class="fx-pop-title">${title}</div>${html}`;
            p.addEventListener('mousedown', (e) => e.stopPropagation());
            p.addEventListener('keydown', (e) => e.stopPropagation());
            fxPopHost().appendChild(p);
            fxPlacePop(p, anchor);
            bind(p);
            fxAutoClose(p, anchor);
        };
        switch (act) {
            case 'shadow':
                pop('Sombra', imgShadowTilesHTML(el) + `<div data-fx-host="img-shadow">${imgShadowControlsHTML(el)}</div>`, (p) => imgShadowBind(p, el, cbs));
                break;
            case 'rotate':
                pop('Rodar e virar', fxRotateHTML(el, el.tipo === 'imagem'), (p) => fxBindRotate(p, el, cbs));
                break;
            case 'filter':
                pop('Filtros', `<div class="fx-grid fx-grid-3">${Object.entries(FILTROS).map(([k, f]) => `
                    <button type="button" class="fx-tile fx-tile-img ${(el.filtro || 'none') === k ? 'on' : ''}" data-img-filter="${k}">
                        <span class="fx-img-demo"><img src="${fxEsc(el.src)}" alt="" style="filter:${f.css}" draggable="false"></span><span>${f.label}</span>
                    </button>`).join('')}</div>`, (p) => {
                    p.querySelectorAll('[data-img-filter]').forEach(b => b.addEventListener('click', () => {
                        el.filtro = b.dataset.imgFilter;
                        p.querySelectorAll('[data-img-filter]').forEach(x => x.classList.toggle('on', x === b));
                        cbs.onUpdate(el);
                    }));
                });
                break;
            case 'crop': cbs.onCropImage?.(); break;
            case 'font':
                document.querySelector('.qb-pop')?.remove();
                fxOpenFontPicker(anchor, el.fonte, (f) => { el.fonte = f; cbs.onUpdate(el); });
                break;
            case 'color':
                pop('Cor do texto', fxSwatchesHTML('qb-color', el.cor), (p) => fxBindSwatches(p, 'qb-color', (c) => {
                    el.cor = c || '#000000';
                    anchor.querySelector('i').style.background = el.cor;
                    cbs.onUpdate(el);
                }));
                break;
            case 'bold':
                el.negrito = !el.negrito;
                cbs.onUpdate(el);
                break;
            case 'fx':
                pop('Efeitos de texto', textEffectTilesHTML(el) + `<div data-fx-host="text-fx">${textEffectControlsHTML(el)}</div>`, (p) => textEffectBind(p, el, cbs));
                break;
            case 'dup': this._duplicateElement(el); break;
            case 'del': this._deleteElement(el.id); this._psHideQuickbar(); break;
            case 'more': {
                const map = { imagem: 'image', texto: 'text', forma: 'shapes' };
                this._changeTool(map[el.tipo] || 'select');
                document.getElementById('tool-panel')?.classList.remove('collapsed');
                break;
            }
        }
    };

    /* ---------------------------------------------------------------------
       5. Templates (elementos dos quadros públicos)
       --------------------------------------------------------------------- */
    const TPL = { items: null, cache: new Map(), view: 'boards', board: null, q: '' };

    P.openTemplates = async function () {
        if (!this.project) return;
        let d = document.getElementById('tpl-drawer');
        if (d && d.classList.contains('open')) { this._tplClose(true); return; }
        // Os Templates ocupam o lugar do painel do menu (não ficam um por cima do outro).
        const panel = document.getElementById('tool-panel');
        this._tplPanelWasOpen = panel ? !panel.classList.contains('collapsed') : false;
        panel?.classList.add('collapsed');
        document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.qb-pop, .fx-pop').forEach(x => x.remove());
        if (d) d.classList.add('open');
        else {
            d = document.createElement('section');
            d.id = 'tpl-drawer';
            d.className = 'tpl-drawer';
            d.setAttribute('aria-label', 'Templates');
            d.innerHTML = `
                <header class="tpl-head">
                    <div class="tpl-titles">
                        <h3>Templates</h3>
                        <p>Quadros públicos da comunidade — arrasta os elementos para o teu quadro (ou clica para adicionar).</p>
                    </div>
                    <button type="button" class="tpl-close" data-tpl="close" aria-label="Fechar templates">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                </header>
                <div class="tpl-bar">
                    <label class="tpl-search">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                        <input type="search" placeholder="Procurar quadros…" autocomplete="off">
                    </label>
                </div>
                <div class="tpl-body" id="tpl-body"></div>`;
            fxPopHost().appendChild(d);
            d.addEventListener('keydown', (e) => e.stopPropagation());
            d.addEventListener('click', (e) => this._tplClick(e));
            const input = d.querySelector('.tpl-search input');
            input.addEventListener('input', debounce(() => { TPL.q = input.value.trim().toLowerCase(); this._tplRender(); }, 150));
            requestAnimationFrame(() => d.classList.add('open'));
        }
        document.getElementById('btn-templates')?.classList.add('active');
        if (!TPL.items) {
            this._tplBody('<div class="tpl-loading"><span class="ps-spinner"></span>A carregar quadros públicos…</div>');
            try {
                const res = await getExploreAll('', 60);
                TPL.items = (res.items || []).filter(b => b && b.id);
            } catch (err) {
                console.warn('Templates:', err);
                TPL.items = null;
                this._tplBody('<p class="tpl-empty">Não foi possível carregar os quadros públicos. Verifica a ligação e tenta outra vez.</p>');
                return;
            }
        }
        this._tplRender();
    };

    P._tplBody = function (html) {
        const b = document.getElementById('tpl-body');
        if (b) b.innerHTML = html;
    };

    // restore = fechar no X / no botão Templates: volta a mostrar o menu que estava aberto.
    P._tplClose = function (restore = false) {
        const d = document.getElementById('tpl-drawer');
        const wasOpen = !!(d && d.classList.contains('open'));
        d?.classList.remove('open');
        document.getElementById('btn-templates')?.classList.remove('active');
        if (wasOpen && restore) {
            if (this._tplPanelWasOpen) document.getElementById('tool-panel')?.classList.remove('collapsed');
            this.ui.setActiveTool(this.ui.currentTool || 'select');
        }
    };

    P._tplClick = function (e) {
        const t = e.target;
        if (t.closest('[data-tpl="close"]')) { this._tplClose(true); return; }
        const tab = t.closest('[data-tpl-view]');
        if (tab) {
            TPL.view = tab.dataset.tplView;
            TPL.board = null;
            document.querySelectorAll('[data-tpl-view]').forEach(b => b.classList.toggle('on', b === tab));
            this._tplRender();
            return;
        }
        if (t.closest('[data-tpl="back"]')) { TPL.board = null; this._tplRender(); return; }
        const card = t.closest('[data-tpl-board]');
        if (card) { TPL.board = card.dataset.tplBoard; this._tplRender(); return; }
        const all = t.closest('[data-tpl="page"]');
        if (all) { this._tplAddAllAsPage(all.dataset.board); return; }
        const tile = t.closest('[data-ps-drag^="tpl:"]');
        if (tile && !tile._psDragged) {
            // Clique: adiciona no centro da página que está à vista.
            const vp = this.board.viewport;
            const r = vp.getBoundingClientRect();
            const tplLeft = document.getElementById('tpl-drawer').getBoundingClientRect().right;
            const cx = Math.max(r.left, tplLeft) + (r.right - Math.max(r.left, tplLeft)) / 2;
            this.psDropItem(tile.dataset.psDrag, cx, r.top + r.height / 2);
        }
    };

    P._tplLoadBoard = async function (id) {
        if (TPL.cache.has(id)) return TPL.cache.get(id);
        const item = (TPL.items || []).find(b => String(b.id) === String(id));
        let base = null;
        if (item && item.legacy) base = await getPublicCollage(item.id);
        else {
            const row = await getCloudBoardProject(id);
            base = row && row.projeto;
        }
        const data = {
            boardWidth: (base && base.boardWidth) || 3000,
            boardHeight: (base && base.boardHeight) || 3000,
            elementos: (base && Array.isArray(base.elementos) ? base.elementos : [])
                .filter(el => el && el.visivel !== false && !el.moldura)
                .map(el => (typeof psSanitizeElement === 'function' ? psSanitizeElement(deepClone(el)) : el))
                .filter(Boolean)
        };
        TPL.cache.set(id, data);
        return data;
    };

    P._tplRender = async function () {
        const items = (TPL.items || []).filter(b => !TPL.q || String(b.title || '').toLowerCase().includes(TPL.q) || String(b.author?.username || '').toLowerCase().includes(TPL.q));
        if (TPL.board) return this._tplRenderBoard(TPL.board);
        if (!items.length) {
            this._tplBody(`<p class="tpl-empty">${TPL.q ? 'Nenhum quadro com esse nome.' : 'Ainda não há quadros públicos.'}</p>`);
            return;
        }
        this._tplBody(`<div class="tpl-boards">${items.map(b => {
            const th = typeof safeImgSrc === 'function' ? safeImgSrc(b.image_url) : b.image_url;
            return `<button type="button" class="tpl-board" data-tpl-board="${fxEsc(b.id)}">
                <span class="tpl-board-thumb">${th ? `<img src="${fxEsc(th)}" alt="" loading="lazy">` : '<span>📌</span>'}</span>
                <span class="tpl-board-title">${fxEsc(b.title || 'Sem título')}</span>
                <span class="tpl-board-author">@${fxEsc(b.author?.username || 'anónimo')}</span>
            </button>`;
        }).join('')}</div>`);
    };

    // Pré-visualização de um elemento usando os mesmos desenhos do quadro.
    P._tplTile = function (el, boardW) {
        const scale = (this.project.boardWidth || 3000) / (boardW || 3000);
        const key = PSDrag.register({ el, scale });
        const box = 108;
        const f = Math.min(box / Math.max(1, el.width), box / Math.max(1, el.height), 1.6);
        const label = el.tipo === 'texto' ? String(el.conteudo || 'Texto').slice(0, 24) : (el.nome || (el.tipo === 'imagem' ? 'Imagem' : 'Forma'));
        return `<button type="button" class="tpl-el" data-ps-drag="tpl:${key}" title="${fxEsc(label)} — arrasta para o quadro">
            <span class="tpl-el-prev"><span class="tpl-el-inner" data-tpl-el="${key}" style="width:${el.width}px;height:${el.height}px;transform:translate(-50%,-50%) scale(${f})"></span></span>
            <span class="tpl-el-name">${fxEsc(label)}</span>
        </button>`;
    };

    P._tplPaintTiles = function (root) {
        root.querySelectorAll('[data-tpl-el]').forEach(box => {
            const t = PSDrag.get(box.dataset.tplEl);
            if (!t) return;
            const el = t.el;
            box.classList.add('board-element');
            box.style.position = 'absolute';
            try {
                if (el.tipo === 'imagem') renderImageElement(box, el);
                else if (el.tipo === 'texto') { box.dataset.editing = '0'; renderTextElement(box, { ...el }); box.querySelector('.text-content')?.setAttribute('contenteditable', 'false'); }
                else if (el.tipo === 'forma') renderShapeElement(box, el);
                box.style.transform += ` rotate(${el.rotation || 0}deg)`;
                box.style.opacity = el.opacidade ?? 1;
            } catch { /* ok */ }
        });
    };

    P._tplRenderBoard = async function (id) {
        const item = (TPL.items || []).find(b => String(b.id) === String(id)) || {};
        this._tplBody(`<div class="tpl-board-head">
                <button type="button" class="tpl-back" data-tpl="back">← Quadros</button>
                <strong>${fxEsc(item.title || 'Quadro')}</strong>
            </div>
            <div class="tpl-loading"><span class="ps-spinner"></span>A abrir elementos…</div>`);
        let data;
        try { data = await this._tplLoadBoard(id); } catch (err) {
            this._tplBody(`<div class="tpl-board-head"><button type="button" class="tpl-back" data-tpl="back">← Quadros</button></div><p class="tpl-empty">${fxEsc(err.message || 'Não foi possível abrir este quadro.')}</p>`);
            return;
        }
        if (TPL.board !== id) return;
        const els = sortByLayer(data.elementos);
        this._tplBody(`<div class="tpl-board-head">
                <button type="button" class="tpl-back" data-tpl="back">← Quadros</button>
                <strong>${fxEsc(item.title || 'Quadro')}</strong>
                <span class="tpl-count">${els.length} ${els.length === 1 ? 'elemento' : 'elementos'}</span>
                ${els.length ? `<button type="button" class="tpl-page-btn" data-tpl="page" data-board="${fxEsc(id)}">+ Tudo numa página nova</button>` : ''}
            </div>
            ${els.length ? `<div class="tpl-els">${els.map(el => this._tplTile(el, data.boardWidth)).join('')}</div>` : '<p class="tpl-empty">Este quadro não tem elementos.</p>'}`);
        this._tplPaintTiles(document.getElementById('tpl-body'));
    };

    P._tplRenderAll = async function (items) {
        const token = (TPL._allToken = (TPL._allToken || 0) + 1);
        this._tplBody('<div class="tpl-els" id="tpl-all"></div><div class="tpl-loading" id="tpl-all-more"><span class="ps-spinner"></span>A juntar elementos…</div>');
        const host = document.getElementById('tpl-all');
        const list = items.slice(0, 16);
        let added = 0;
        for (let i = 0; i < list.length; i += 3) {
            const chunk = list.slice(i, i + 3);
            const results = await Promise.allSettled(chunk.map(b => this._tplLoadBoard(b.id)));
            if (token !== TPL._allToken || !document.getElementById('tpl-all')) return;
            results.forEach(r => {
                if (r.status !== 'fulfilled') return;
                const html = sortByLayer(r.value.elementos).slice(0, 18).map(el => this._tplTile(el, r.value.boardWidth)).join('');
                if (!html) return;
                const tmp = document.createElement('div');
                tmp.innerHTML = html;
                this._tplPaintTiles(tmp);
                while (tmp.firstChild) { host.appendChild(tmp.firstChild); added++; }
            });
        }
        document.getElementById('tpl-all-more')?.remove();
        if (!added && document.getElementById('tpl-all')) this._tplBody('<p class="tpl-empty">Não há elementos para mostrar.</p>');
    };

    // Copia todos os elementos de um quadro público para uma página nova.
    P._tplAddAllAsPage = async function (id) {
        const data = await this._tplLoadBoard(id).catch(() => null);
        if (!data || !data.elementos.length) return;
        this._syncAllFromDOM();
        const W = this.project.boardWidth || 3000;
        const n = Math.max(1, this.project.numPaginas || 1) + 1;
        this.project.numPaginas = n;
        this.board.setBoardSize(W, this.project.boardHeight || 3000, n);
        this.brush.syncSize();
        this.board.centerBoard();
        const left = this.board.pageLeft(n - 1);
        const H = this.project.boardHeight || 3000;
        const sx = W / (data.boardWidth || 3000);
        const sy = H / (data.boardHeight || 3000);
        const s = Math.min(sx, sy);
        const offX = left + (W - (data.boardWidth || 3000) * s) / 2;
        const offY = (H - (data.boardHeight || 3000) * s) / 2;
        let layer = getNextLayer(this.project.elementos);
        sortByLayer(data.elementos).forEach(src => {
            const el = deepClone(src);
            el.id = generateId();
            el.layer = layer++;
            el.x = el.x * s + offX;
            el.y = el.y * s + offY;
            el.width *= s; el.height *= s;
            if (el.tamanho) el.tamanho = Math.max(6, Math.round(el.tamanho * s * 10) / 10);
            if (el.raio) el.raio = Math.round(el.raio * s);
            this.project.elementos.push(el);
        });
        this._rerenderAll();
        this._commitHistory();
        this.isDirty = true;
        this._refreshPanel();
        this.ui.showToast(`Página ${n} criada com os elementos do quadro.`);
        requestAnimationFrame(() => this._psScrollToPage(n - 1));
    };
})();
