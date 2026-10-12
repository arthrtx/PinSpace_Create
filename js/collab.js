/* =====================================================================
   Edição em grupo em tempo real (Supabase Realtime)

   - O anfitrião começa uma sessão e partilha um link com uma chave
     aleatória de 128 bits (#collab/<chave>). Só quem tem o link entra,
     e é preciso ter conta.
   - Cada pessoa vê os cursores e as alterações das outras ao vivo.
   - Tudo o que chega de outra pessoa passa pela mesma limpeza dos quadros
     públicos (psSanitizeElement / psSanitizeProject) antes de ser usado.
   - Imagens grandes (data:) sobem para o Storage do próprio utilizador e
     viaja só o link, porque as mensagens em tempo real têm limite de tamanho.
   ===================================================================== */

const PSC_ROOM_RE = /^[0-9a-f]{32}$/;
const PSC_ID_RE = /^[\w-]{1,64}$/;
const PSC_MAX_ELEMENTS = 800;
const PSC_CHUNK_BYTES = 160000;
const PSC_INLINE_SRC = 60000;          // imagens pequenas vão diretamente na mensagem
const PSC_COLORS = ['#E60023', '#2A9D8F', '#E9C46A', '#8E7DBE', '#F4A261', '#3A86FF', '#06D6A0', '#EF476F'];
const PSC_PENDING_KEY = 'ps_collab_pending';

function pscRandomKey() {
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

function pscColor(key) {
    let h = 0;
    for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return PSC_COLORS[h % PSC_COLORS.length];
}

// Assinatura barata de um elemento (as data URLs grandes entram só pelo tamanho e pontas).
function pscSig(el) {
    if (!el) return '';
    const { src, ...rest } = el;
    const s = typeof src === 'string' ? src.length + ':' + src.slice(0, 48) + src.slice(-48) : '';
    return JSON.stringify(rest) + '|' + s;
}

function pscBgSig(bg) {
    if (!bg) return '';
    const { valor, ...rest } = bg;
    const v = typeof valor === 'string' && valor.length > 200 ? valor.length + ':' + valor.slice(-64) : valor;
    return JSON.stringify(rest) + '|' + JSON.stringify(v);
}

async function pscSha(text) {
    try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf).slice(0, 12), b => b.toString(16).padStart(2, '0')).join('');
    } catch {
        return pscRandomKey().slice(0, 24);
    }
}

class PSCollab {
    constructor(app) {
        this.app = app;
        this.room = null;
        this.ch = null;
        this.isHost = false;
        this.ready = false;
        this.clientId = pscRandomKey().slice(0, 16);
        this.peers = new Map();
        this.wire = new Map();        // id do elemento -> assinatura já sincronizada
        this.srcCache = new Map();    // data URL local -> link no Storage
        this.bgSig = '';
        this.metaSig = '';
        this.cursors = new Map();
        this._stateParts = null;
        this._buildUI();
        this._hookApp();
        window.addEventListener('hashchange', () => this._checkInvite());
        setTimeout(() => this._checkInvite(), 400);
    }

    /* ------------------------------------------------------------ UI */
    _buildUI() {
        const publish = document.getElementById('btn-publicar');
        if (publish && !document.getElementById('btn-collab')) {
            const btn = document.createElement('button');
            btn.id = 'btn-collab';
            btn.type = 'button';
            btn.className = 'topbar-btn psc-btn';
            btn.title = 'Editar em grupo';
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 20a6.5 6.5 0 0 0-3-5.5"/></svg>
                <span class="psc-btn-label">Grupo</span><span class="psc-faces" aria-hidden="true"></span>`;
            publish.parentNode.insertBefore(btn, publish);
            btn.addEventListener('click', (e) => { e.stopPropagation(); this.togglePop(); });
        }
        const pop = document.createElement('div');
        pop.className = 'psc-pop';
        pop.id = 'psc-pop';
        pop.hidden = true;
        pop.innerHTML = `
            <div class="psc-pop-head">
                <b>Edição em grupo</b>
                <span class="psc-live" hidden><i></i>ao vivo</span>
                <button type="button" class="psc-x" data-psc="close" aria-label="Fechar">✕</button>
            </div>
            <div class="psc-idle">
                <p>Convida pessoas para editarem este quadro contigo <b>ao mesmo tempo</b>. Cada um vê as alterações e o cursor dos outros.</p>
                <button type="button" class="psc-primary" data-psc="start">Começar sessão em grupo</button>
            </div>
            <div class="psc-on" hidden>
                <div class="psc-people"></div>
                <label class="psc-label" for="psc-link">Link de convite</label>
                <div class="psc-link">
                    <input id="psc-link" readonly>
                    <button type="button" data-psc="copy">Copiar</button>
                </div>
                <p class="psc-note">Quem tiver o link (e conta) entra. Para tirar alguém, termina e começa uma sessão nova — o link antigo deixa de funcionar.</p>
                <button type="button" class="psc-danger" data-psc="end">Terminar sessão</button>
            </div>`;
        document.body.appendChild(pop);
        this.pop = pop;
        pop.addEventListener('click', (e) => {
            e.stopPropagation();
            const b = e.target.closest('[data-psc]');
            if (!b) return;
            const a = b.dataset.psc;
            if (a === 'close') this.togglePop(false);
            if (a === 'start') this.start();
            if (a === 'end') this.leave(true);
            if (a === 'copy') this._copyLink();
        });
        document.addEventListener('click', (e) => {
            if (!pop.hidden && !e.target.closest('#psc-pop, #btn-collab')) this.togglePop(false);
        });
    }

    togglePop(force) {
        const open = force ?? this.pop.hidden;
        this.pop.hidden = !open;
        if (open) {
            const btn = document.getElementById('btn-collab');
            if (btn) {
                const r = btn.getBoundingClientRect();
                this.pop.style.top = Math.round(r.bottom + 10) + 'px';
                this.pop.style.right = Math.max(12, Math.round(window.innerWidth - r.right)) + 'px';
            }
            this._renderPop();
        }
    }

    _renderPop() {
        const on = !!this.room;
        this.pop.querySelector('.psc-idle').hidden = on;
        this.pop.querySelector('.psc-on').hidden = !on;
        this.pop.querySelector('.psc-live').hidden = !(on && this.ready);
        this.pop.querySelector('[data-psc="end"]').textContent = this.isHost ? 'Terminar sessão' : 'Sair da sessão';
        this.pop.querySelector('.psc-note').hidden = !this.isHost;
        const input = this.pop.querySelector('#psc-link');
        if (on) input.value = this._inviteUrl();
        const box = this.pop.querySelector('.psc-people');
        box.innerHTML = '';
        for (const p of this._peopleList()) {
            const row = document.createElement('div');
            row.className = 'psc-person';
            const img = document.createElement('img');
            img.alt = '';
            img.src = p.avatar || (typeof identicon === 'function' ? identicon(p.name) : '');
            img.style.borderColor = p.color;
            const name = document.createElement('span');
            name.textContent = p.name + (p.me ? ' (tu)' : '');
            row.append(img, name);
            if (p.host) {
                const tag = document.createElement('em');
                tag.textContent = 'anfitrião';
                row.appendChild(tag);
            }
            box.appendChild(row);
        }
    }

    _renderFaces() {
        const btn = document.getElementById('btn-collab');
        if (!btn) return;
        btn.classList.toggle('is-live', !!this.room);
        const faces = btn.querySelector('.psc-faces');
        faces.innerHTML = '';
        if (!this.room) return;
        const list = this._peopleList();
        list.slice(0, 4).forEach(p => {
            const img = document.createElement('img');
            img.alt = '';
            img.src = p.avatar || (typeof identicon === 'function' ? identicon(p.name) : '');
            img.style.borderColor = p.color;
            faces.appendChild(img);
        });
        if (list.length > 4) {
            const more = document.createElement('b');
            more.textContent = '+' + (list.length - 4);
            faces.appendChild(more);
        }
    }

    _peopleList() {
        const out = [];
        for (const [key, p] of this.peers) out.push({ ...p, me: key === this.clientId });
        out.sort((a, b) => (b.host - a.host) || (b.me - a.me));
        return out;
    }

    _inviteUrl() {
        return window.location.origin + window.location.pathname + '#collab/' + this.room;
    }

    _copyLink() {
        const url = this._inviteUrl();
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
            .then(() => this._toast('Link copiado. Envia-o a quem quiseres convidar.'))
            .catch(() => { const i = this.pop.querySelector('#psc-link'); i.select(); });
    }

    _toast(t) { this.app.ui && this.app.ui.showToast(t); }

    /* ------------------------------------------------------------ App */
    _hookApp() {
        const app = this.app;
        const self = this;
        const origLoad = app._loadProjectIntoEditor.bind(app);
        app._loadProjectIntoEditor = function (...args) {
            // Abrir outro quadro a meio de uma sessão = sair da sessão.
            if (self.room && !self._loadingRemote) self.leave(self.isHost, true);
            return origLoad(...args);
        };
        const origBack = app._backToHome.bind(app);
        app._backToHome = function (...args) {
            if (self.room) self.leave(self.isHost, true);
            return origBack(...args);
        };
        window.addEventListener('beforeunload', () => { if (this.ch) try { this.ch.unsubscribe(); } catch { /* ok */ } });
    }

    _user() {
        return this.app.currentUser || null;
    }

    _sb() {
        return typeof getSupabase === 'function' ? getSupabase() : null;
    }

    _checkInvite() {
        let room = null;
        const m = /^#collab\/([0-9a-f]{32})$/.exec(window.location.hash || '');
        if (m) {
            room = m[1];
            history.replaceState(null, '', window.location.pathname + window.location.search);
        } else {
            try {
                const saved = JSON.parse(localStorage.getItem(PSC_PENDING_KEY) || 'null');
                if (saved && PSC_ROOM_RE.test(saved.room) && Date.now() - saved.t < 15 * 60 * 1000) room = saved.room;
            } catch { /* ok */ }
        }
        if (room && room !== this.room) this._joinWhenReady(room);
    }

    async _joinWhenReady(room) {
        // Espera pela sessão (o login pode ainda estar a ser restaurado).
        for (let i = 0; i < 40 && !this._user(); i++) await new Promise(r => setTimeout(r, 150));
        if (!this._user()) {
            try { localStorage.setItem(PSC_PENDING_KEY, JSON.stringify({ room, t: Date.now() })); } catch { /* ok */ }
            this._toast('Entra com a tua conta para editares em grupo.');
            this.app.social && this.app.social.openAuth && this.app.social.openAuth('login', 'Foste convidado para editar um quadro em grupo. Entra para continuar.');
            return;
        }
        try { localStorage.removeItem(PSC_PENDING_KEY); } catch { /* ok */ }
        this.join(room);
    }

    /* ------------------------------------------------------- Sessão */
    start() {
        if (!this._user()) {
            this._toast('Entra com a tua conta para editares em grupo.');
            this.app.social && this.app.social.openAuth && this.app.social.openAuth('login');
            return;
        }
        if (!this.app.project) { this._toast('Abre um quadro primeiro.'); return; }
        if (!this._sb()) { this._toast('Sem ligação ao servidor.'); return; }
        this.isHost = true;
        this._resetWire();
        this._connect(pscRandomKey());
        this._copyLink();
    }

    join(room) {
        if (!PSC_ROOM_RE.test(room)) return;
        if (!this._sb()) { this._toast('Sem ligação ao servidor.'); return; }
        if (this.room) this.leave(this.isHost, true);
        this.isHost = false;
        this._stateParts = { parts: null, got: new Map(), shell: null };
        this._connect(room);
        this._toast('A entrar na sessão em grupo…');
        clearTimeout(this._stateTimer);
        this._stateTimer = setTimeout(() => {
            if (this._stateParts) {
                this._toast('Não encontrei a sessão. O anfitrião tem de estar com o quadro aberto.');
                this.leave(false, true);
            }
        }, 15000);
    }

    _connect(room) {
        const sb = this._sb();
        this.room = room;
        this.ready = false;
        const u = this._user();
        const me = {
            name: String(u.display_name || u.username || 'Alguém').slice(0, 40),
            avatar: typeof safeImgSrc === 'function' ? safeImgSrc(u.image) : '',
            color: pscColor(this.clientId),
            host: this.isHost
        };
        this.peers = new Map([[this.clientId, me]]);
        const ch = sb.channel('pscollab:' + room, { config: { broadcast: { self: false }, presence: { key: this.clientId } } });
        this.ch = ch;
        ch.on('broadcast', { event: 'm' }, ({ payload }) => this._onMsg(payload));
        ch.on('presence', { event: 'sync' }, () => this._onPresence());
        ch.subscribe(async (status) => {
            if (this.ch !== ch) return;
            if (status === 'SUBSCRIBED') {
                this.ready = true;
                try { await ch.track(me); } catch { /* ok */ }
                if (!this.isHost) this._send({ t: 'hello' });
                else this._toast('Sessão em grupo aberta — o link de convite foi copiado.');
                this._startLoop();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                this._toast('A ligação em tempo real falhou. A tentar outra vez…');
            }
            this._renderPop();
            this._renderFaces();
        });
        this._bindCursor();
        this._renderPop();
        this._renderFaces();
    }

    leave(endForAll = false, silent = false) {
        if (!this.room) return;
        if (endForAll && this.isHost && this.ready) this._send({ t: 'end' });
        clearInterval(this._loop);
        clearTimeout(this._stateTimer);
        const ch = this.ch;
        this.ch = null;
        if (ch) setTimeout(() => { try { this._sb().removeChannel(ch); } catch { /* ok */ } }, 150);
        this.room = null;
        this.ready = false;
        this.isHost = false;
        this._stateParts = null;
        this.peers = new Map();
        this._clearCursors();
        this._renderPop();
        this._renderFaces();
        if (!silent) this._toast('Saíste da sessão em grupo. O quadro continua contigo.');
    }

    _resetWire() {
        const p = this.app.project;
        this.wire = new Map((p ? p.elementos : []).map(el => [el.id, pscSig(el)]));
        this.bgSig = pscBgSig(p && p.background);
        this.metaSig = this._metaSig();
    }

    _metaSig() {
        const p = this.app.project;
        return p ? [p.boardWidth, p.boardHeight, p.numPaginas || 1].join('x') : '';
    }

    _onPresence() {
        if (!this.ch) return;
        const st = this.ch.presenceState();
        const next = new Map();
        let hostHere = false;
        for (const [key, metas] of Object.entries(st)) {
            const m = metas && metas[0];
            if (!m || typeof key !== 'string' || key.length > 40) continue;
            const p = {
                name: String(m.name || 'Alguém').slice(0, 40),
                avatar: typeof safeImgSrc === 'function' ? safeImgSrc(m.avatar) : '',
                color: PSC_COLORS.includes(m.color) ? m.color : pscColor(key),
                host: !!m.host
            };
            if (p.host) hostHere = true;
            next.set(key, p);
        }
        if (!next.has(this.clientId) && this.peers.get(this.clientId)) next.set(this.clientId, this.peers.get(this.clientId));
        const before = new Set(this.peers.keys());
        for (const [key, p] of next) if (!before.has(key) && key !== this.clientId && this.ready) this._toast(p.name + ' entrou na sessão.');
        for (const key of before) if (!next.has(key) && key !== this.clientId) this._removeCursor(key);
        this.peers = next;
        if (!this.isHost && this.ready && !hostHere && !this._stateParts && !this._hostGoneShown) {
            this._hostGoneShown = true;
            this._toast('O anfitrião saiu. Continuas com a tua cópia do quadro.');
        }
        if (hostHere) this._hostGoneShown = false;
        this._renderPop();
        this._renderFaces();
    }

    /* --------------------------------------------------- Mensagens */
    _send(payload) {
        if (!this.ch || !this.ready) return;
        try {
            this.ch.send({ type: 'broadcast', event: 'm', payload: { ...payload, from: this.clientId } });
        } catch (err) { console.warn('collab send', err); }
    }

    _onMsg(p) {
        if (!p || typeof p !== 'object' || p.from === this.clientId || typeof p.t !== 'string') return;
        const from = String(p.from || '').slice(0, 40);
        switch (p.t) {
            case 'hello':
                if (this.isHost) this._sendState(from);
                break;
            case 'state':
                if (p.to === this.clientId) this._onStatePart(p);
                break;
            case 'ops':
                if (!this._stateParts) this._applyOps(p);
                break;
            case 'live':
                if (!this._stateParts) this._applyLive(p);
                break;
            case 'cursor':
                this._showCursor(from, p.x, p.y);
                break;
            case 'end':
                if (!this.isHost && this.peers.get(from) && this.peers.get(from).host) {
                    this.leave(false, true);
                    this._toast('O anfitrião terminou a sessão. O quadro fica contigo como rascunho.');
                }
                break;
        }
    }

    // Prepara um elemento para viajar (imagens grandes → link do Storage).
    async _wireElement(el) {
        const out = JSON.parse(JSON.stringify(el));
        if (out.tipo === 'imagem' && typeof out.src === 'string') {
            const src = await this._wireSrc(out.src);
            if (!src) return null;
            out.src = src;
        }
        return out;
    }

    async _wireSrc(src) {
        if (!src || !src.startsWith('data:') || src.length <= PSC_INLINE_SRC) return src;
        const key = src.length + ':' + src.slice(-96);
        if (this.srcCache.has(key)) return this.srcCache.get(key);
        const task = (async () => {
            try {
                const u = this._user();
                let blob = await (await fetch(src)).blob();
                if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) {
                    const bmp = await createImageBitmap(blob);
                    const c = document.createElement('canvas');
                    c.width = bmp.width; c.height = bmp.height;
                    c.getContext('2d').drawImage(bmp, 0, 0);
                    blob = await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('imagem')), 'image/png'));
                }
                const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
                const name = await pscSha(src);
                return await _uploadImage('quadros', `${u.id}/collab/${name}.${ext}`, blob);
            } catch (err) {
                console.warn('collab upload', err);
                if (src.length < 220000) return src;
                if (!this._uploadWarned) { this._uploadWarned = true; this._toast('Uma imagem grande não pôde ser partilhada com o grupo.'); }
                return null;
            }
        })();
        this.srcCache.set(key, task);
        const url = await task;
        this.srcCache.set(key, url);
        return url;
    }

    async _wireBackground(bg) {
        if (!bg) return bg;
        const out = JSON.parse(JSON.stringify(bg));
        if (out.tipo === 'imagem' && typeof out.valor === 'string') out.valor = await this._wireSrc(out.valor) || '';
        return out;
    }

    // Divide uma lista de elementos em mensagens que cabem no limite.
    _chunks(list) {
        const out = [];
        let cur = [], size = 0;
        for (const el of list) {
            const n = JSON.stringify(el).length;
            if (cur.length && size + n > PSC_CHUNK_BYTES) { out.push(cur); cur = []; size = 0; }
            cur.push(el);
            size += n;
        }
        if (cur.length || !out.length) out.push(cur);
        return out;
    }

    async _sendState(to) {
        const p = this.app.project;
        if (!p) return;
        this.app._syncAllFromDOM && this.app._syncAllFromDOM();
        const els = (await Promise.all(p.elementos.slice(0, PSC_MAX_ELEMENTS).map(el => this._wireElement(el)))).filter(Boolean);
        const shell = {
            titulo: p.titulo,
            boardWidth: p.boardWidth,
            boardHeight: p.boardHeight,
            numPaginas: p.numPaginas || 1,
            background: await this._wireBackground(p.background)
        };
        const chunks = this._chunks(els);
        chunks.forEach((part, i) => this._send({ t: 'state', to, part: i, parts: chunks.length, shell: i === 0 ? shell : undefined, els: part }));
    }

    _onStatePart(p) {
        const st = this._stateParts;
        if (!st) return;
        const parts = Math.round(Number(p.parts));
        const part = Math.round(Number(p.part));
        if (!(parts >= 1 && parts <= 200 && part >= 0 && part < parts)) return;
        st.parts = parts;
        if (p.shell && typeof p.shell === 'object') st.shell = p.shell;
        if (Array.isArray(p.els)) st.got.set(part, p.els.slice(0, PSC_MAX_ELEMENTS));
        if (st.got.size < st.parts || !st.shell) return;

        clearTimeout(this._stateTimer);
        const els = [];
        for (let i = 0; i < st.parts; i++) els.push(...(st.got.get(i) || []));
        this._stateParts = null;

        const shell = st.shell;
        const base = createEmptyProject('collab-' + this.room, '', 3000, 3000);
        const project = psSanitizeProject(Object.assign(base, {
            titulo: String(shell.titulo || 'Sem título').slice(0, 100),
            boardWidth: shell.boardWidth,
            boardHeight: shell.boardHeight,
            numPaginas: shell.numPaginas,
            background: shell.background,
            elementos: els.slice(0, PSC_MAX_ELEMENTS)
        })) || base;
        project.titulo = ('Em grupo · ' + project.titulo).slice(0, 120);

        const app = this.app;
        app.project = project;
        app.history.clear();
        app.isDirty = false;
        this._loadingRemote = true;
        try { app._loadProjectIntoEditor(); } finally { this._loadingRemote = false; }
        this._resetWire();
        this._toast('Entraste na sessão. As alterações aparecem para todos ao vivo.');
        this._renderPop();
    }

    _findIndex(id) {
        return this.app.project ? this.app.project.elementos.findIndex(e => e.id === id) : -1;
    }

    _applyOps(p) {
        const app = this.app;
        const project = app.project;
        if (!project) return;
        let changed = false;
        const selId = app.board.getSelectedId();

        if (Array.isArray(p.up)) {
            for (const raw of p.up.slice(0, 500)) {
                let el;
                try { el = psSanitizeElement(JSON.parse(JSON.stringify(raw))); } catch { el = null; }
                if (!el) continue;
                const idx = this._findIndex(el.id);
                // Não mexe no elemento que estou a arrastar neste momento.
                if (el.id === selId && (app.board.isDragging || app.board.isResizing || app.board.isRotating)) continue;
                if (idx >= 0) project.elementos[idx] = el;
                else if (project.elementos.length < PSC_MAX_ELEMENTS) project.elementos.push(el);
                else continue;
                app._renderElement(el);
                this.wire.set(el.id, pscSig(el));
                changed = true;
            }
        }
        if (Array.isArray(p.del)) {
            for (const id of p.del.slice(0, 500)) {
                if (typeof id !== 'string' || !PSC_ID_RE.test(id)) continue;
                const idx = this._findIndex(id);
                if (idx < 0) continue;
                project.elementos.splice(idx, 1);
                app.board.removeElementDOM(id);
                this.wire.delete(id);
                if (id === selId) app.board.selectElement(null);
                changed = true;
            }
        }
        if (p.bg && typeof p.bg === 'object') {
            const bg = psSanitizeBackground(JSON.parse(JSON.stringify(p.bg)));
            project.background = bg;
            app.board.applyBackground(bg);
            app.board.setGrid && app._gridMode && app.board.setGrid(app._gridMode());
            this.bgSig = pscBgSig(bg);
            changed = true;
        }
        if (p.meta && typeof p.meta === 'object') {
            const w = Math.round(psSafeNum(p.meta.w, project.boardWidth, 50, 12000));
            const h = Math.round(psSafeNum(p.meta.h, project.boardHeight, 50, 12000));
            const n = Math.round(psSafeNum(p.meta.pages, project.numPaginas || 1, 1, 30));
            if (w !== project.boardWidth || h !== project.boardHeight || n !== (project.numPaginas || 1)) {
                project.boardWidth = w;
                project.boardHeight = h;
                project.numPaginas = n;
                app.board.setBoardSize(w, h, n);
                app.brush && app.brush.syncSize && app.brush.syncSize();
                app._rerenderAll();
            }
            this.metaSig = this._metaSig();
            changed = true;
        }
        if (changed) {
            if (selId && this._findIndex(selId) >= 0) app.board.updateSelectionBox && app.board.updateSelectionBox();
            app.isDirty = true;
            app._scheduleRight && app._scheduleRight();
            app._scheduleLocalSave && app._scheduleLocalSave();
        }
    }

    // Arrastar/redimensionar ao vivo (só posição e tamanho).
    _applyLive(p) {
        if (typeof p.id !== 'string' || !PSC_ID_RE.test(p.id) || !p.g || typeof p.g !== 'object') return;
        const app = this.app;
        const idx = this._findIndex(p.id);
        if (idx < 0) return;
        if (p.id === app.board.getSelectedId() && (app.board.isDragging || app.board.isResizing || app.board.isRotating)) return;
        const el = app.project.elementos[idx];
        el.x = psSafeNum(p.g.x, el.x, -50000, 50000);
        el.y = psSafeNum(p.g.y, el.y, -50000, 50000);
        el.width = psSafeNum(p.g.width, el.width, 1, 50000);
        el.height = psSafeNum(p.g.height, el.height, 1, 50000);
        el.rotation = psSafeNum(p.g.rotation, el.rotation || 0, -3600, 3600);
        app._renderElement(el);
        this.wire.set(el.id, pscSig(el));
        if (p.id === app.board.getSelectedId()) app.board.updateSelectionBox && app.board.updateSelectionBox();
    }

    /* ------------------------------------------- Ciclo de sincronização */
    _startLoop() {
        clearInterval(this._loop);
        this._loop = setInterval(() => this._tick(), 140);
    }

    async _tick() {
        const app = this.app;
        if (!this.ch || !this.ready || !app.project || this._stateParts || this._busy) return;
        const board = app.board;

        // Durante um arrasto envia só a geometria (leve e rápido).
        if (board.isDragging || board.isResizing || board.isRotating) {
            const id = board.getSelectedId();
            const el = id && app.project.elementos.find(e => e.id === id);
            if (el) {
                const g = board.syncElementFromDOM(id, { x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation || 0 });
                const sig = JSON.stringify(g);
                if (sig !== this._liveSig) { this._liveSig = sig; this._send({ t: 'live', id, g }); }
            }
            return;
        }
        this._liveSig = null;

        const changed = [];
        const seen = new Set();
        for (const el of app.project.elementos) {
            seen.add(el.id);
            const s = pscSig(el);
            if (this.wire.get(el.id) !== s) changed.push([el, s]);
        }
        const del = [];
        for (const id of this.wire.keys()) if (!seen.has(id)) del.push(id);
        const bgSig = pscBgSig(app.project.background);
        const metaSig = this._metaSig();
        if (!changed.length && !del.length && bgSig === this.bgSig && metaSig === this.metaSig) return;

        this._busy = true;
        try {
            const up = [];
            for (const [el, s] of changed.slice(0, 300)) {
                const w = await this._wireElement(el);
                this.wire.set(el.id, s);
                if (w) up.push(w);
            }
            del.forEach(id => this.wire.delete(id));
            const extra = {};
            if (bgSig !== this.bgSig) { extra.bg = await this._wireBackground(app.project.background); this.bgSig = bgSig; }
            if (metaSig !== this.metaSig) {
                extra.meta = { w: app.project.boardWidth, h: app.project.boardHeight, pages: app.project.numPaginas || 1 };
                this.metaSig = metaSig;
            }
            const chunks = this._chunks(up);
            chunks.forEach((part, i) => this._send(i === 0 ? { t: 'ops', up: part, del, ...extra } : { t: 'ops', up: part }));
        } finally {
            this._busy = false;
        }
    }

    /* ------------------------------------------------------ Cursores */
    _bindCursor() {
        if (this._cursorBound) return;
        this._cursorBound = true;
        const vp = document.getElementById('board-viewport');
        const canvas = document.getElementById('board-canvas');
        if (!vp || !canvas) return;
        let last = 0;
        vp.addEventListener('pointermove', (e) => {
            if (!this.ready) return;
            const now = performance.now();
            if (now - last < 50) return;
            last = now;
            const r = canvas.getBoundingClientRect();
            const z = (this.app.board && this.app.board.getZoom && this.app.board.getZoom()) || 1;
            this._send({ t: 'cursor', x: Math.round((e.clientX - r.left) / z), y: Math.round((e.clientY - r.top) / z) });
        });
        vp.addEventListener('pointerleave', () => { if (this.ready) this._send({ t: 'cursor', x: null, y: null }); });
    }

    _cursorLayer() {
        const canvas = document.getElementById('board-canvas');
        if (!canvas) return null;
        let layer = canvas.querySelector('.psc-cursors');
        if (!layer) {
            layer = document.createElement('div');
            layer.className = 'psc-cursors';
            canvas.appendChild(layer);
        }
        return layer;
    }

    _showCursor(key, x, y) {
        const peer = this.peers.get(key);
        if (!peer) return;
        if (x === null || y === null || !Number.isFinite(x) || !Number.isFinite(y)) { this._removeCursor(key); return; }
        const layer = this._cursorLayer();
        if (!layer) return;
        let c = this.cursors.get(key);
        if (!c) {
            c = document.createElement('div');
            c.className = 'psc-cursor';
            c.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 2l7.5 19 2.6-7.9L21 10.5z" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg><span></span>';
            layer.appendChild(c);
            this.cursors.set(key, c);
        }
        c.style.setProperty('--c', peer.color);
        c.querySelector('span').textContent = peer.name;
        c.style.left = Math.max(-5000, Math.min(60000, x)) + 'px';
        c.style.top = Math.max(-5000, Math.min(60000, y)) + 'px';
    }

    _removeCursor(key) {
        const c = this.cursors.get(key);
        if (c) c.remove();
        this.cursors.delete(key);
    }

    _clearCursors() {
        for (const key of [...this.cursors.keys()]) this._removeCursor(key);
    }
}

(function initCollab() {
    const go = () => {
        if (window.pinspaceApp && window.pinspaceApp.board) {
            if (!window.pinspaceApp.collab) window.pinspaceApp.collab = new PSCollab(window.pinspaceApp);
        } else {
            setTimeout(go, 120);
        }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
})();
