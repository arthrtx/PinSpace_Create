/* =====================================================================
   PinSpace — layout do editor (inspirado nas referências)
   - Painel fixo à direita: Camadas (sempre visível) + Propriedades da
     seleção (posição, tamanho, rotação, opacidade, alinhar, ordem).
   - Botões do topo: tema claro/escuro, Publicar, Camadas (ecrãs estreitos).
   - Animação de entrada dos elementos ao abrir um quadro.
   Estende o UIManager (js/ui.js) sem mexer no que já funcionava.
   ===================================================================== */

const EDL_ICON = {
    eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.9 17.9A10 10 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9 9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22"/></svg>',
    lock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    unlock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>',
    copy: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 6V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2"/></svg>',
    frame: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>'
};

const EDL_ALIGN = [
    ['left', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18"/><rect x="7" y="6" width="14" height="4" rx="1"/><rect x="7" y="14" width="8" height="4" rx="1"/></svg>', 'Alinhar à esquerda'],
    ['hcenter', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18"/><rect x="5" y="6" width="14" height="4" rx="1"/><rect x="7" y="14" width="10" height="4" rx="1"/></svg>', 'Centrar na horizontal'],
    ['right', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 3v18"/><rect x="3" y="6" width="14" height="4" rx="1"/><rect x="9" y="14" width="8" height="4" rx="1"/></svg>', 'Alinhar à direita'],
    ['top', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18"/><rect x="6" y="7" width="4" height="14" rx="1"/><rect x="14" y="7" width="4" height="8" rx="1"/></svg>', 'Alinhar ao topo'],
    ['vcenter', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18"/><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="7" width="4" height="10" rx="1"/></svg>', 'Centrar na vertical'],
    ['bottom', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><rect x="6" y="3" width="4" height="14" rx="1"/><rect x="14" y="9" width="4" height="8" rx="1"/></svg>', 'Alinhar em baixo']
];

function _edlThumb(el) {
    if (el.tipo === 'imagem' && el.src) {
        const src = String(el.src).replace(/"/g, '%22');
        return `<img src="${src}" alt="" loading="lazy" decoding="async">`;
    }
    if (el.tipo === 'texto') {
        const t = String(el.conteudo || 'Aa').trim().slice(0, 2) || 'Aa';
        return `<span class="edl-thumb-text" style="font-family:${escapeHTML(el.fonte || 'inherit')}">${escapeHTML(t)}</span>`;
    }
    return getElementIcon(el.forma || el.tipo);
}

/* ---------------- Painel direito ---------------- */
UIManager.prototype.renderRightPanel = function (project, selectedId, cb) {
    const list = document.getElementById('ed-layers');
    const count = document.getElementById('ed-layers-count');
    if (!list) return;
    const elementos = (project && project.elementos) || [];
    if (count) count.textContent = elementos.length;

    // Não redesenhar enquanto se escreve um nome de camada ou um valor.
    const active = document.activeElement;
    const editing = active && active.closest && active.closest('#ed-right') && /INPUT|TEXTAREA/.test(active.tagName) && active.type !== 'range';

    if (!editing || !list.contains(active)) this._renderLayerItems(list, elementos, selectedId, cb);
    if (!editing || list.contains(active)) this._renderSelectionCard(project, selectedId, cb);
};

UIManager.prototype._renderLayerItems = function (list, elementos, selectedId, cb) {
    const sorted = sortByLayer(elementos).reverse();
    if (!sorted.length) {
        list.innerHTML = '<p class="edl-empty">Ainda não há elementos. Adiciona imagens, texto ou elementos — cada um fica numa camada própria.</p>';
        list._nodes = new Map();
        return;
    }
    // Renderização por chave: só refaz a linha que mudou. As miniaturas das
    // fotos (data URLs grandes) não voltam a ser descodificadas a cada passo.
    if (!list._nodes) list._nodes = new Map();
    list.querySelector('.edl-empty')?.remove();
    const nodes = list._nodes;
    const seen = new Set();
    sorted.forEach((el, i) => {
        seen.add(el.id);
        const label = getElementLabel(el);
        const sig = [el.id === selectedId, el.visivel === false, !!el.bloqueada, label, !!el.moldura, el.tipo, el.conteudo, el.fonte, el.forma].join('|');
        let rec = nodes.get(el.id);
        if (!rec) {
            const node = document.createElement('div');
            node.dataset.id = el.id;
            node.draggable = true;
            node.title = 'Arrasta para mudar a ordem · duplo clique para renomear';
            rec = { node, sig: null, src: null };
            nodes.set(el.id, rec);
        }
        const node = rec.node;
        if (rec.sig !== sig || (el.tipo === 'imagem' && rec.src !== el.src)) {
            const keepThumb = el.tipo === 'imagem' && rec.src === el.src && node.querySelector('.edl-thumb');
            const thumb = keepThumb ? null : _edlThumb(el);
            node.className = `edl-item ${el.id === selectedId ? 'selected' : ''} ${el.visivel === false ? 'is-hidden' : ''} ${el.bloqueada ? 'is-locked' : ''}`;
            const oldThumb = keepThumb ? node.querySelector('.edl-thumb') : null;
            node.innerHTML = `
            <span class="edl-thumb">${thumb || ''}</span>
            <span class="edl-name">${el.moldura ? `<i class="edl-tag">${EDL_ICON.frame}</i>` : ''}${escapeHTML(label)}</span>
            <span class="edl-actions">
                <button type="button" class="edl-btn ${el.visivel === false ? 'on' : ''}" data-a="vis" aria-label="${el.visivel === false ? 'Mostrar' : 'Ocultar'}">${el.visivel === false ? EDL_ICON.eyeOff : EDL_ICON.eye}</button>
                <button type="button" class="edl-btn ${el.bloqueada ? 'on' : ''}" data-a="lock" aria-label="${el.bloqueada ? 'Desbloquear' : 'Bloquear'}">${el.bloqueada ? EDL_ICON.lock : EDL_ICON.unlock}</button>
            </span>`;
            if (oldThumb) node.querySelector('.edl-thumb').replaceWith(oldThumb);
            rec.sig = sig;
            rec.src = el.tipo === 'imagem' ? el.src : null;
        }
        if (list.children[i] !== node) list.insertBefore(node, list.children[i] || null);
    });
    for (const [id, rec] of nodes) {
        if (!seen.has(id)) { rec.node.remove(); nodes.delete(id); }
    }

    if (list._bound) return;
    list._bound = true;
    const find = (id) => (this._edProject && this._edProject.elementos || []).find(e => e.id === id);

    list.addEventListener('click', (e) => {
        const item = e.target.closest('.edl-item');
        if (!item) return;
        const el = find(item.dataset.id);
        if (!el) return;
        const btn = e.target.closest('[data-a]');
        if (btn) {
            e.stopPropagation();
            if (btn.dataset.a === 'vis') el.visivel = el.visivel === false;
            if (btn.dataset.a === 'lock') el.bloqueada = !el.bloqueada;
            this._edCb?.onUpdateElement?.(el, true);
            return;
        }
        this._edCb?.onSelectElement?.(el.id);
    });
    list.addEventListener('dblclick', (e) => {
        const name = e.target.closest('.edl-name');
        const item = e.target.closest('.edl-item');
        if (!name || !item) return;
        const el = find(item.dataset.id);
        if (!el) return;
        const input = document.createElement('input');
        input.className = 'edl-rename';
        input.value = getElementLabel(el);
        name.replaceWith(input);
        input.focus();
        input.select();
        const done = (save) => {
            if (save && input.value.trim()) el.nome = input.value.trim().slice(0, 60);
            const r = list._nodes && list._nodes.get(el.id);
            if (r) r.sig = null;
            input.blur();
            this._edCb?.onUpdateElement?.(el, !!save);
        };
        input.addEventListener('keydown', (k) => {
            k.stopPropagation();
            if (k.key === 'Enter') done(true);
            if (k.key === 'Escape') done(false);
        });
        input.addEventListener('blur', () => { if (input.isConnected) done(true); }, { once: true });
    });

    // Arrastar para reordenar (a primeira da lista é a da frente)
    let dragId = null;
    list.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.edl-item');
        if (!item) return;
        dragId = item.dataset.id;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', dragId); } catch { /* ok */ }
    });
    list.addEventListener('dragover', (e) => {
        const item = e.target.closest('.edl-item');
        if (!item || !dragId) return;
        e.preventDefault();
        const r = item.getBoundingClientRect();
        list.querySelectorAll('.drop-before,.drop-after').forEach(x => x.classList.remove('drop-before', 'drop-after'));
        item.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after');
    });
    list.addEventListener('drop', (e) => {
        const item = e.target.closest('.edl-item');
        if (!item || !dragId) return;
        e.preventDefault();
        const r = item.getBoundingClientRect();
        const pos = e.clientY < r.top + r.height / 2 ? 'before' : 'after';
        const els = this._edProject && this._edProject.elementos;
        const targetId = item.dataset.id;
        if (els && dragId !== targetId) {
            // Ordem visual: a primeira da lista é a da frente.
            const visual = sortByLayer(els).reverse();
            const moving = visual.find(x => x.id === dragId);
            if (moving) {
                visual.splice(visual.indexOf(moving), 1);
                let idx = visual.findIndex(x => x.id === targetId);
                if (pos === 'after') idx += 1;
                visual.splice(idx, 0, moving);
                const n = visual.length;
                visual.forEach((x, i) => { x.layer = n - 1 - i; });
                this._edCb?.onLayersReordered?.();
            }
        }
    });
    list.addEventListener('dragend', () => {
        dragId = null;
        list.querySelectorAll('.dragging,.drop-before,.drop-after').forEach(x => x.classList.remove('dragging', 'drop-before', 'drop-after'));
    });
};

UIManager.prototype._renderSelectionCard = function (project, selectedId, cb) {
    const box = document.getElementById('ed-sel');
    const title = document.getElementById('ed-sel-title');
    if (!box || !project) return;
    const el = selectedId ? project.elementos.find(e => e.id === selectedId) : null;

    if (!el) {
        title.textContent = 'Quadro';
        const bg = project.background || {};
        const bgLabel = bg.tipo === 'gradiente' ? 'Gradiente' : bg.tipo === 'imagem' ? 'Imagem' : 'Cor';
        const pat = bg.padrao && bg.padrao.tipo ? ' · ' + ((BG_PATTERNS.find(p => p[0] === bg.padrao.tipo) || [])[1] || '') : '';
        box.innerHTML = `
            <div class="eds-stats">
                <div class="eds-stat"><b>${project.boardWidth || 3000}</b><span>largura</span></div>
                <div class="eds-stat"><b>${project.boardHeight || 3000}</b><span>altura</span></div>
                <div class="eds-stat"><b>${project.elementos.length}</b><span>elementos</span></div>
            </div>
            <p class="eds-line"><span>Fundo</span><strong>${bgLabel}${pat}</strong></p>
            <p class="eds-hint">Clica num elemento do quadro (ou numa camada) para ver aqui a posição, o tamanho e a opacidade.</p>`;
        return;
    }

    title.textContent = getElementLabel(el);
    const n = (v) => Math.round(Number(v) || 0);
    box.innerHTML = `
        <div class="eds-quick">
            <button type="button" class="eds-btn" data-q="dup" title="Duplicar (Ctrl+D)">${EDL_ICON.copy}</button>
            <button type="button" class="eds-btn ${el.bloqueada ? 'on' : ''}" data-q="lock" title="${el.bloqueada ? 'Desbloquear' : 'Bloquear'}">${el.bloqueada ? EDL_ICON.lock : EDL_ICON.unlock}</button>
            <button type="button" class="eds-btn ${el.visivel === false ? 'on' : ''}" data-q="vis" title="${el.visivel === false ? 'Mostrar' : 'Ocultar'}">${el.visivel === false ? EDL_ICON.eyeOff : EDL_ICON.eye}</button>
            <button type="button" class="eds-btn eds-danger" data-q="del" title="Apagar (Delete)">${EDL_ICON.trash}</button>
        </div>
        <div class="eds-grid">
            <label class="eds-field"><span>X</span><input type="number" data-f="x" value="${n(el.x)}"></label>
            <label class="eds-field"><span>Y</span><input type="number" data-f="y" value="${n(el.y)}"></label>
            <label class="eds-field"><span>L</span><input type="number" data-f="width" min="4" value="${n(el.width)}"></label>
            <label class="eds-field"><span>A</span><input type="number" data-f="height" min="4" value="${n(el.height)}"></label>
            <label class="eds-field eds-wide"><span>↻</span><input type="number" data-f="rotation" value="${n(el.rotation)}"><em>°</em></label>
        </div>
        <label class="eds-slider"><span>Opacidade</span><input type="range" min="5" max="100" data-f="opacidade" value="${Math.round((el.opacidade ?? 1) * 100)}"><output>${Math.round((el.opacidade ?? 1) * 100)}%</output></label>
        <div class="eds-sub">Alinhar ao quadro</div>
        <div class="eds-align">${EDL_ALIGN.map(([a, i, t]) => `<button type="button" class="eds-btn" data-align="${a}" title="${t}">${i}</button>`).join('')}</div>
        <div class="eds-sub">Ordem</div>
        <div class="eds-order">
            <button type="button" class="eds-chip" data-order="front">Frente</button>
            <button type="button" class="eds-chip" data-order="up">Subir</button>
            <button type="button" class="eds-chip" data-order="down">Descer</button>
            <button type="button" class="eds-chip" data-order="back">Atrás</button>
        </div>`;

    const cbs = this._edCb || {};
    box.querySelector('[data-q="dup"]').onclick = () => cbs.onDuplicateElement?.(el.id);
    box.querySelector('[data-q="del"]').onclick = () => cbs.onDeleteElement?.(el.id);
    box.querySelector('[data-q="lock"]').onclick = () => { el.bloqueada = !el.bloqueada; cbs.onUpdateElement?.(el, true); };
    box.querySelector('[data-q="vis"]').onclick = () => { el.visivel = el.visivel === false; cbs.onUpdateElement?.(el, true); };
    box.querySelectorAll('[data-align]').forEach(b => { b.onclick = () => cbs.onAlign?.(b.dataset.align); });
    box.querySelectorAll('[data-order]').forEach(b => { b.onclick = () => cbs.onOrder?.(b.dataset.order); });

    box.querySelectorAll('input[type="number"][data-f]').forEach(inp => {
        inp.addEventListener('keydown', (e) => e.stopPropagation());
        inp.addEventListener('change', () => {
            const f = inp.dataset.f;
            let v = Number(inp.value);
            if (!Number.isFinite(v)) return;
            if (f === 'width' || f === 'height') v = Math.max(4, v);
            if (f === 'rotation') v = ((v % 360) + 360) % 360;
            el[f] = v;
            cbs.onUpdate?.(el, true);
        });
    });
    const op = box.querySelector('input[data-f="opacidade"]');
    const out = box.querySelector('.eds-slider output');
    op.addEventListener('input', () => {
        el.opacidade = Number(op.value) / 100;
        out.textContent = op.value + '%';
        cbs.onUpdate?.(el, false);
    });
    op.addEventListener('change', () => cbs.onUpdate?.(el, true));
};

UIManager.prototype.setRightPanelContext = function (project, cb) {
    this._edProject = project;
    this._edCb = cb;
};

/* ---------------- Botões do topo ---------------- */
UIManager.prototype.bindEditorChrome = function (app) {
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
        const dark = document.documentElement.dataset.theme === 'dark';
        this.callbacks.onThemeChange?.(dark ? 'light' : 'dark');
    });
    document.getElementById('btn-publicar')?.addEventListener('click', () => {
        this.callbacks.onToolChange?.('settings');
        // Só se publica com sessão iniciada.
        if (!document.documentElement.classList.contains('is-logged-in')) {
            app?.showLoginModal?.('login', 'Entra para publicar o teu quadro — fica com o teu nome de utilizador como autor.');
        }
        requestAnimationFrame(() => {
            const target = document.getElementById('settings-conta') || document.getElementById('settings-partilha');
            target?.closest('.panel-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            target?.closest('.panel-section')?.classList.add('ed-flash');
            setTimeout(() => target?.closest('.panel-section')?.classList.remove('ed-flash'), 1400);
        });
    });
    const right = document.getElementById('ed-right');
    const toggle = document.getElementById('btn-layers-toggle');
    const setOpen = (on) => {
        right?.classList.toggle('open', on);
        toggle?.setAttribute('aria-expanded', String(on));
    };
    toggle?.addEventListener('click', () => setOpen(!right.classList.contains('open')));
    document.getElementById('ed-right-close')?.addEventListener('click', () => setOpen(false));
};

/* ---------------- Animação de entrada ---------------- */
function animateBoardEntry(container) {
    if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = [...container.querySelectorAll('.board-element')]
        .sort((a, b) => (+a.style.zIndex || 0) - (+b.style.zIndex || 0));
    const step = Math.max(28, Math.min(70, 900 / Math.max(1, items.length)));
    items.forEach((dom, i) => {
        dom.style.setProperty('--ed-d', Math.round(i * step) + 'ms');
        dom.classList.remove('ed-enter');
        void dom.offsetWidth;
        dom.classList.add('ed-enter');
        dom.addEventListener('animationend', () => dom.classList.remove('ed-enter'), { once: true });
    });
    const canvas = document.getElementById('board-canvas');
    if (canvas) {
        canvas.classList.remove('ed-canvas-enter');
        void canvas.offsetWidth;
        canvas.classList.add('ed-canvas-enter');
        canvas.addEventListener('animationend', () => canvas.classList.remove('ed-canvas-enter'), { once: true });
    }
}
