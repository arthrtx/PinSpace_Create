/* =====================================================================
   PinSpace — Música (SoundCloud)
   - Leitor: Widget API oficial do SoundCloud (iframe escondido). Não
     precisa de chaves para tocar faixas e playlists públicas.
   - Antes de ligar: feed genérico (playlist pública configurável).
   - Ligar pelo link do perfil: carrega os likes (ou as faixas) do perfil
     público. Funciona já, sem registo de app.
   - Entrar com SoundCloud (OAuth 2.1 + PKCE): segue o feed real da
     pessoa (/me/followings/tracks). Precisa de uma app registada no
     SoundCloud e da Edge Function supabase/functions/soundcloud-token
     (o client_secret não pode ficar no browser). Ver supabase/LEIA-ME.md.
   ===================================================================== */

window.SOUNDCLOUD_CONFIG = Object.assign({
    // Preenche depois de registares a app em https://soundcloud.com/you/apps
    clientId: '',
    // Edge Function que troca o "code" por tokens (guarda o client_secret)
    tokenFunction: (window.SUPABASE_CONFIG ? window.SUPABASE_CONFIG.url : '') + '/functions/v1/soundcloud-token',
    // Tem de ser igual ao "Redirect URI" registado na app do SoundCloud
    redirectUri: window.location.origin + window.location.pathname,
    // Feed genérico antes de ligar (qualquer playlist pública)
    genericPlaylist: 'https://soundcloud.com/fresh-pressed/sets/fresh-pressed-tracks',
    genericFallback: 'https://soundcloud.com/buzzing-playlists/sets/buzzing-r-b'
}, window.SOUNDCLOUD_CONFIG || {});

const MUSIC_KEY = 'pinspace_music';
const SC_API = 'https://api.soundcloud.com';

class MusicPlayer {
    constructor(app) {
        this.app = app;
        this.cfg = window.SOUNDCLOUD_CONFIG;
        this.tracks = [];          // { id, title, artist, artwork, url, partial }
        this.mode = 'playlist';    // 'playlist' (widget.skip) | 'list' (widget.load)
        this.focus = 0;            // cartão em destaque no coverflow
        this.current = -1;         // faixa a tocar
        this.playing = false;
        this.widget = null;
        this.duration = 0;
        this.volume = 70;
        this.muted = false;
        this.session = this._loadSession();
        this._booted = false;
        this._fillTries = 0;
    }

    $(id) { return document.getElementById(id); }

    init() {
        if (!this.$('musica')) return;
        this._bindUI();
        this._renderConnect();
        this._handleOAuthReturn();
        this._bootWhenVisible();
    }

    /* ------------------------------------------------------------
       Sessão (guardada só neste browser)
       ------------------------------------------------------------ */
    _loadSession() {
        try { return JSON.parse(localStorage.getItem(MUSIC_KEY) || 'null'); } catch { return null; }
    }
    _saveSession(s) {
        this.session = s;
        try {
            if (s) localStorage.setItem(MUSIC_KEY, JSON.stringify(s));
            else localStorage.removeItem(MUSIC_KEY);
        } catch { /* sem storage */ }
    }
    get oauthEnabled() { return !!this.cfg.clientId; }

    /* ------------------------------------------------------------
       Só carrega o leitor (≈1 MB do SoundCloud) quando a secção se
       aproxima do ecrã — não pesa no arranque do site.
       ------------------------------------------------------------ */
    _bootWhenVisible() {
        const section = this.$('musica');
        const boot = () => { if (!this._booted) this.ensureBooted(); };
        if (!('IntersectionObserver' in window)) return boot();
        const io = new IntersectionObserver((entries) => {
            if (entries.some(e => e.isIntersecting)) { io.disconnect(); boot(); }
        }, { root: document.querySelector('.home-container'), rootMargin: '600px 0px' });
        io.observe(section);
    }

    _loadWidgetApi() {
        if (window.SC && window.SC.Widget) return Promise.resolve();
        if (this._apiPromise) return this._apiPromise;
        this._apiPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://w.soundcloud.com/player/api.js';
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Não foi possível carregar o leitor do SoundCloud.'));
            document.head.appendChild(s);
        });
        return this._apiPromise;
    }

    _embedSrc(url, autoPlay = false) {
        const p = new URLSearchParams({
            url, auto_play: autoPlay ? 'true' : 'false', visual: 'false', show_artwork: 'true',
            hide_related: 'true', show_comments: 'false', show_user: 'true', show_reposts: 'false', show_teaser: 'false'
        });
        return 'https://w.soundcloud.com/player/?' + p.toString();
    }

    // Cria (ou reutiliza) o iframe e liga os eventos uma única vez.
    async _ensureWidget(url) {
        await this._loadWidgetApi();
        const host = this.$('music-iframe-host');
        if (!this.widget) {
            const iframe = document.createElement('iframe');
            iframe.id = 'music-sc-iframe';
            iframe.title = 'Leitor SoundCloud';
            iframe.allow = 'autoplay; encrypted-media';
            iframe.loading = 'eager';
            iframe.src = this._embedSrc(url);
            host.appendChild(iframe);
            this.widget = SC.Widget(iframe);
            this._bindWidgetEvents();
            return this._readyOrTimeout((ok, fail) => { this._onReadyOnce = ok; this._onError = fail; });
        }
        return this._readyOrTimeout((ok, fail) => {
            this._onReadyOnce = ok;
            this._onError = fail;
            this.widget.load(url, { auto_play: false, visual: false, show_artwork: true, hide_related: true, show_comments: false, show_teaser: false, callback: () => { const r = this._onReadyOnce; this._onReadyOnce = null; r && r(); } });
        });
    }

    // Devolve true quando o leitor carregou a lista, false se o SoundCloud
    // respondeu com erro (≈0,2 s) ou não respondeu em 6 s. Antes ignorávamos
    // o erro e esperávamos sempre 10 s — era isso que tornava a ligação lenta.
    _readyOrTimeout(setup) {
        return new Promise((resolve) => {
            let done = false;
            const ok = () => { if (!done) { done = true; this._onError = null; resolve(true); } };
            const fail = () => { if (!done) { done = true; this._onReadyOnce = null; resolve(false); } };
            setup(ok, fail);
            setTimeout(fail, 6000);
        });
    }

    _bindWidgetEvents() {
        const E = SC.Widget.Events;
        this.widget.bind(E.READY, () => {
            this.widget.setVolume(this.muted ? 0 : this.volume);
            const r = this._onReadyOnce; this._onReadyOnce = null; r && r();
        });
        this.widget.bind(E.PLAY, () => {
            this.playing = true;
            this._paintPlayState();
            this.widget.getCurrentSound((s) => this._absorbSound(s));
            if (this.mode === 'playlist') {
                this.widget.getCurrentSoundIndex((i) => {
                    if (typeof i === 'number' && i >= 0) { this.current = i; this._setFocus(i, false); this._paintNow(); }
                });
            }
            this.widget.getDuration((d) => { this.duration = d || 0; });
        });
        this.widget.bind(E.PAUSE, () => { this.playing = false; this._paintPlayState(); });
        this.widget.bind(E.PLAY_PROGRESS, (e) => {
            const pct = (e && typeof e.relativePosition === 'number') ? e.relativePosition * 100 : 0;
            document.querySelectorAll('#music-progress-fill, [data-music-progress-fill]').forEach(f => { f.style.transform = `scaleX(${pct / 100})`; });
            this.$('music-progress')?.setAttribute('aria-valuenow', Math.round(pct));
        });
        this.widget.bind(E.FINISH, () => {
            this.playing = false;
            this._paintPlayState();
            // Em modo playlist o próprio widget avança; em modo lista avançamos nós.
            if (this.mode === 'list') this.playIndex(this.current + 1);
        });
        this.widget.bind(E.ERROR, () => {
            if (this._onError) { const f = this._onError; this._onError = null; f(); }
        });
    }

    /* ------------------------------------------------------------
       Carregar o feed certo
       ------------------------------------------------------------ */
    async _loadFeed() {
        const s = this.session;
        try {
            if (s && s.mode === 'oauth' && s.accessToken) {
                await this._loadOAuthFeed();
            } else if (s && s.mode === 'profile' && s.profile) {
                if (!s.profile.id) {
                    const p = await this._resolveProfile(s.profile.url || s.profile.user);
                    if (!p) throw new Error('Não consegui voltar a ligar o teu SoundCloud. Liga de novo pelo link do perfil.');
                    s.profile = p;
                }
                await this._loadProfileFeed(s.profile);
                // guarda o ID/fonte descobertos (ligações antigas não os tinham)
                this._saveSession({ ...s, profile: s.profile });
                this._renderConnect();
            } else {
                await this._loadPlaylist(this.cfg.genericPlaylist, this.cfg.genericFallback);
            }
        } catch (err) {
            console.warn('Música:', err);
            this._showFlowMessage(err && err.message ? err.message : 'Não foi possível carregar as músicas.');
        }
    }

    // Playlist / perfil / likes: tudo o que o widget sabe carregar por URL.
    async _loadPlaylist(url, fallbackUrl) {
        this.mode = 'playlist';
        await this._ensureWidget(url);
        let sounds = await this._getSounds();
        if (!sounds.length && fallbackUrl) {
            await this._ensureWidget(fallbackUrl);
            sounds = await this._getSounds();
        }
        if (!sounds.length) throw new Error('Esta lista está vazia ou é privada.');
        this.tracks = sounds.slice(0, 30).map(s => this._mapSound(s));
        this.focus = 0;
        this.current = -1;
        this._renderFlow();
        this._renderQueue();
        this._paintNow();
        this._fillPartial();
    }

    _getSounds() {
        return new Promise((resolve) => {
            let done = false;
            const t = setTimeout(() => { if (!done) { done = true; resolve([]); } }, 5000);
            this.widget.getSounds((list) => {
                if (done) return;
                done = true; clearTimeout(t);
                resolve(Array.isArray(list) ? list : []);
            });
        });
    }

    // O widget só traz os dados completos das primeiras faixas; as outras
    // chegam aos poucos. Voltamos a perguntar algumas vezes.
    _fillPartial() {
        if (this.mode !== 'playlist') return;
        if (!this.tracks.some(t => t.partial)) return;
        if (this._fillTries++ > 6) return;
        setTimeout(async () => {
            const list = await this._getSounds();
            list.slice(0, this.tracks.length).forEach((s, i) => {
                const m = this._mapSound(s);
                if (!m.partial && this.tracks[i] && this.tracks[i].partial) this.tracks[i] = m;
            });
            this._renderFlow();
            this._renderQueue();
            this._fillPartial();
        }, 1500 * this._fillTries);
    }

    _art(url, fallback) {
        const u = url || fallback || '';
        return u ? u.replace('-large.', '-t500x500.') : '';
    }

    _mapSound(s) {
        s = s || {};
        const partial = !s.title;
        return {
            id: s.id,
            title: s.title || 'A carregar…',
            artist: (s.user && s.user.username) || '',
            artwork: this._art(s.artwork_url, s.user && s.user.avatar_url),
            url: s.permalink_url || '',
            partial
        };
    }

    _absorbSound(s) {
        if (!s) return;
        const m = this._mapSound(s);
        const i = this.mode === 'playlist'
            ? this.tracks.findIndex(t => t.id === s.id)
            : this.current;
        if (i >= 0 && this.tracks[i]) {
            this.tracks[i] = { ...this.tracks[i], ...m, partial: false };
            this._updateCard(i);
        }
        this._paintNow();
    }

    /* ---------- Ligar pelo link do perfil ----------
       Testado no SoundCloud real:
       - o oEmbed público (soundcloud.com/oembed) devolve o ID e o nome do
         perfil em ~0,15 s, também com o site aberto a partir do disco;
       - o leitor aceita api.soundcloud.com/users/ID/favorites (likes) e
         api.soundcloud.com/users/ID (uploads); "…/likes" dá erro. */
    _profileInputToUrl(input) {
        let v = String(input || '').trim();
        if (!v) return null;
        v = v.replace(/^@/, '');
        if (!/^https?:\/\//i.test(v)) {
            if (/^(www\.|m\.|on\.)?soundcloud\.com\//i.test(v)) v = 'https://' + v;
            else if (/^[a-z0-9_-]+$/i.test(v)) v = 'https://soundcloud.com/' + v;
            else return null;
        }
        let u;
        try { u = new URL(v); } catch { return null; }
        if (!/(^|\.)soundcloud\.com$/i.test(u.hostname) && u.hostname !== 'snd.sc') return null;
        return u.href;
    }

    _withTimeout(promise, ms) {
        return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
    }

    async _oembed(url) {
        const q = 'url=' + encodeURIComponent(url);
        try {
            const res = await this._withTimeout(fetch('https://soundcloud.com/oembed?format=json&' + q), 5000);
            if (res.status === 404) return null;
            if (res.ok) return await res.json();
        } catch { /* tenta JSONP */ }
        return this._withTimeout(new Promise((resolve, reject) => {
            const cb = '__scOembed' + Math.random().toString(36).slice(2);
            const sc = document.createElement('script');
            const cleanup = () => { delete window[cb]; sc.remove(); };
            window[cb] = (data) => { cleanup(); resolve(data || null); };
            sc.onerror = () => { cleanup(); reject(new Error('oembed')); };
            sc.src = 'https://soundcloud.com/oembed?format=js&callback=' + cb + '&' + q;
            document.head.appendChild(sc);
        }), 5000).catch(() => null);
    }

    // Link (perfil, faixa, link de partilha on.soundcloud.com, m.soundcloud.com)
    // → { user, name, id, url } do perfil.
    async _resolveProfile(input) {
        const url = this._profileInputToUrl(input);
        if (!url) return null;
        let data = await this._oembed(url);
        if (!data) return null;
        // Lê o ID sem descodificar o HTML todo (títulos com "%" rebentavam o decodeURIComponent).
        const idFrom = (d) => ((String((d && d.html) || '')).match(/users(?:%2F|\/)(\d+)/i) || [])[1];
        let id = idFrom(data);
        const authorUrl = data.author_url;
        // Link de uma faixa: o oEmbed traz o autor; pedimos o perfil do autor.
        if (!id && authorUrl) {
            const d2 = await this._oembed(authorUrl);
            id = idFrom(d2);
        }
        if (!id || !authorUrl) return null;
        const user = new URL(authorUrl).pathname.split('/').filter(Boolean)[0] || '';
        return { user, name: data.author_name || user, id: String(id), url: 'https://soundcloud.com/' + user };
    }

    _onlyOwnUploads(sounds, profile) {
        const full = sounds.filter(x => x && x.user);
        if (!full.length) return false;
        return full.every(x => String(x.user.id) === String(profile.id));
    }

    async _loadProfileFeed(profile) {
        this.mode = 'playlist';
        let sounds = [];
        let source = 'likes';

        this._showFlowMessage('a carregar as tuas curtidas…', true);
        if (await this._ensureWidget(`https://api.soundcloud.com/users/${profile.id}/favorites`)) {
            sounds = await this._getSounds();
        }
        // Sem likes públicos → mostra os uploads da pessoa (e explica porquê).
        if (!sounds.length) {
            source = 'uploads';
            if (await this._ensureWidget(`https://api.soundcloud.com/users/${profile.id}`)) {
                sounds = await this._getSounds();
            }
        }
        if (!sounds.length) {
            throw new Error(`O perfil @${profile.user} não tem curtidas nem faixas públicas. No SoundCloud, em Definições → Privacidade, torna as curtidas públicas e tenta de novo.`);
        }

        profile.source = source;
        this.tracks = sounds.slice(0, 30).map(x => this._mapSound(x));
        this.focus = 0;
        this.current = -1;
        this._renderFlow();
        this._renderQueue();
        this._paintNow();
        this._fillTries = 0;
        this._fillPartial();
    }

    async connectProfile(input) {
        if (!this._profileInputToUrl(input)) {
            return this._connectError('Cola o link do teu perfil, por exemplo soundcloud.com/o-teu-nome (ou só o teu nome de utilizador).');
        }
        const btn = this.$('music-link-form')?.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'A ligar…'; }
        this._connectError('');
        this._showFlowMessage('a procurar o teu perfil…', true);
        try {
            const profile = await this._resolveProfile(input);
            if (!profile) throw new Error('Não encontrei esse perfil no SoundCloud. Confirma o link (abre o teu perfil no SoundCloud e copia o endereço).');
            await this._loadProfileFeed(profile);
            this._saveSession({ mode: 'profile', profile, user: { username: profile.user, name: profile.name } });
            this._renderConnect();
            this.app.ui.showToast(profile.source === 'likes'
                ? `A tocar as músicas curtidas de ${profile.name}.`
                : `${profile.name} ligado — as curtidas não estão públicas, a tocar as tuas faixas.`);
        } catch (err) {
            this._connectError(err.message);
            this._loadFeed(); // volta ao feed anterior
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Ligar'; }
        }
    }

    disconnect() {
        this._saveSession(null);
        this._renderConnect();
        this._fillTries = 0;
        this._loadPlaylist(this.cfg.genericPlaylist, this.cfg.genericFallback).catch(() => {});
        this.app.ui.showToast('SoundCloud desligado.');
    }

    /* ---------- OAuth 2.1 + PKCE (login oficial) ---------- */
    async startOAuth() {
        if (!this.oauthEnabled) {
            // Sem app registada: ligamos pelo link público do perfil.
            this._toggleLinkForm(true);
            return;
        }
        const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const rand = crypto.getRandomValues(new Uint8Array(48));
        const verifier = b64url(rand);
        const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
        const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
        sessionStorage.setItem('sc_pkce', JSON.stringify({ verifier, state }));
        const q = new URLSearchParams({
            client_id: this.cfg.clientId,
            redirect_uri: this.cfg.redirectUri,
            response_type: 'code',
            code_challenge: challenge,
            code_challenge_method: 'S256',
            state
        });
        window.location.href = 'https://secure.soundcloud.com/authorize?' + q.toString();
    }

    async _handleOAuthReturn() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        if (!code || !state) return;
        let saved = null;
        try { saved = JSON.parse(sessionStorage.getItem('sc_pkce') || 'null'); } catch { /* ok */ }
        if (!saved || saved.state !== state) return; // não é nosso
        sessionStorage.removeItem('sc_pkce');
        // limpa ?code=… do endereço
        history.replaceState(null, '', window.location.pathname + window.location.hash);
        try {
            const tok = await this._tokenRequest({ grant_type: 'authorization_code', code, code_verifier: saved.verifier, redirect_uri: this.cfg.redirectUri });
            const me = await this._api('/me', tok.access_token);
            this._saveSession({
                mode: 'oauth',
                accessToken: tok.access_token,
                refreshToken: tok.refresh_token || null,
                expiresAt: Date.now() + (tok.expires_in || 3600) * 1000,
                user: { username: me.username, avatar: me.avatar_url, url: me.permalink_url }
            });
            this._renderConnect();
            this.app.ui.showToast(`Olá, ${me.username}! O teu feed do SoundCloud está pronto.`);
            this._booted = true;
            await this._loadOAuthFeed();
            setTimeout(() => this._scrollIntoView(), 400);
        } catch (err) {
            console.error('SoundCloud OAuth:', err);
            this._connectError('Não foi possível entrar com o SoundCloud: ' + err.message);
        }
    }

    async _tokenRequest(body) {
        const res = await fetch(this.cfg.tokenFunction, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.access_token) throw new Error(data.error_description || data.error || ('servidor respondeu ' + res.status));
        return data;
    }

    async _validToken() {
        const s = this.session;
        if (!s || !s.accessToken) throw new Error('Sem sessão do SoundCloud.');
        if (Date.now() < (s.expiresAt || 0) - 60000 || !s.refreshToken) return s.accessToken;
        const tok = await this._tokenRequest({ grant_type: 'refresh_token', refresh_token: s.refreshToken });
        this._saveSession({ ...s, accessToken: tok.access_token, refreshToken: tok.refresh_token || s.refreshToken, expiresAt: Date.now() + (tok.expires_in || 3600) * 1000 });
        return tok.access_token;
    }

    async _api(path, token) {
        const res = await fetch(SC_API + path, { headers: { Accept: 'application/json; charset=utf-8', Authorization: 'OAuth ' + token } });
        if (res.status === 401) throw Object.assign(new Error('sessão expirada'), { status: 401 });
        if (!res.ok) throw new Error('SoundCloud respondeu ' + res.status);
        return res.json();
    }

    async _loadOAuthFeed() {
        let token;
        try { token = await this._validToken(); } catch (err) {
            this._saveSession(null); this._renderConnect();
            throw new Error('A sessão do SoundCloud terminou. Volta a entrar.');
        }
        const pick = (d) => Array.isArray(d) ? d : (d && Array.isArray(d.collection) ? d.collection : []);
        // Feed de quem a pessoa segue; se vier vazio, os likes dela.
        let list = pick(await this._api('/me/followings/tracks?limit=30&linked_partitioning=true', token).catch(() => []));
        if (!list.length) list = pick(await this._api('/me/likes/tracks?limit=30&linked_partitioning=true', token).catch(() => []));
        list = list.map(x => x.track || x).filter(t => t && t.permalink_url && t.streamable !== false);
        if (!list.length) throw new Error('O teu feed do SoundCloud está vazio — segue artistas ou dá likes para veres músicas aqui.');

        this.mode = 'list';
        this.tracks = list.map(t => ({ ...this._mapSound(t), partial: false }));
        this.focus = 0;
        this.current = -1;
        await this._ensureWidget(this.tracks[0].url);
        this._renderFlow();
        this._renderQueue();
        this._paintNow();
    }

    /* ------------------------------------------------------------
       Controlo de reprodução
       ------------------------------------------------------------ */
    playIndex(i) {
        if (!this.widget || !this.tracks.length) return;
        i = (i + this.tracks.length) % this.tracks.length;
        this.current = i;
        this._setFocus(i, false);
        this._paintNow();
        if (this.mode === 'playlist') {
            this.widget.skip(i);
            this.widget.play();
        } else {
            const t = this.tracks[i];
            this.widget.load(t.url, {
                auto_play: true, visual: false, show_artwork: true, hide_related: true, show_comments: false, show_teaser: false,
                callback: () => { this.widget.setVolume(this.muted ? 0 : this.volume); this.widget.play(); }
            });
        }
    }

    // O editor pode ser aberto antes de a secção de música ter carregado.
    async ensureBooted() {
        if (this._booted && this._bootPromise) return this._bootPromise;
        if (this._booted && this.widget) return;
        this._booted = true;
        this._bootPromise = this._loadFeed();
        return this._bootPromise;
    }

    async togglePlay() {
        if (!this.widget || !this.tracks.length) {
            await this.ensureBooted();
            if (this.widget && this.tracks.length) this.playIndex(this.focus);
            return;
        }
        if (this.current < 0 || this.current !== this.focus) { this.playIndex(this.focus); return; }
        this.widget.toggle();
    }

    next() { this.current < 0 ? this._setFocus(this.focus + 1) : this.playIndex(this.current + 1); }
    prev() { this.current < 0 ? this._setFocus(this.focus - 1) : this.playIndex(this.current - 1); }

    /* ------------------------------------------------------------
       Interface
       ------------------------------------------------------------ */
    _bindUI() {
        this.$('music-login')?.addEventListener('click', () => {
            if (this.session) return this.disconnect();
            this.startOAuth();
        });
        this.$('music-link-toggle')?.addEventListener('click', () => this._toggleLinkForm());
        this.$('music-link-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.connectProfile(this.$('music-link-input').value);
        });

        this.$('music-play')?.addEventListener('click', () => this.togglePlay());
        this.$('music-next')?.addEventListener('click', () => this.next());
        this.$('music-prev')?.addEventListener('click', () => this.prev());
        this.$('music-flow-next')?.addEventListener('click', () => this._setFocus(this.focus + 1));
        this.$('music-flow-prev')?.addEventListener('click', () => this._setFocus(this.focus - 1));

        const flow = this.$('music-flow');
        flow?.addEventListener('click', (e) => {
            const card = e.target.closest('[data-i]');
            if (!card) return;
            const i = +card.dataset.i;
            if (i === this.focus) this.playIndex(i);
            else this._setFocus(i);
        });
        flow?.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); this._setFocus(this.focus + 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); this._setFocus(this.focus - 1); }
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.playIndex(this.focus); }
        });
        // Deslizar no telemóvel
        let sx = null;
        flow?.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
        flow?.addEventListener('touchend', (e) => {
            if (sx === null) return;
            const dx = e.changedTouches[0].clientX - sx;
            if (Math.abs(dx) > 40) this._setFocus(this.focus + (dx < 0 ? 1 : -1));
            sx = null;
        });

        const bar = this.$('music-progress');
        const seek = (clientX) => {
            if (!this.widget || this.current < 0) return;
            const r = bar.getBoundingClientRect();
            const rel = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
            this.widget.getDuration((d) => this.widget.seekTo(rel * d));
        };
        bar?.addEventListener('click', (e) => seek(e.clientX));
        bar?.addEventListener('keydown', (e) => {
            if (!this.widget) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                this.widget.getPosition((p) => this.widget.seekTo(Math.max(0, p + (e.key === 'ArrowRight' ? 5000 : -5000))));
            }
        });

        const vol = this.$('music-volume');
        vol?.addEventListener('input', () => {
            this.volume = +vol.value;
            this.muted = this.volume === 0;
            this.widget?.setVolume(this.volume);
            this._paintVolume();
        });
        this.$('music-mute')?.addEventListener('click', () => this.toggleMute());
        this._bindEditorBar();

        const qBtn = this.$('music-queue-toggle');
        qBtn?.addEventListener('click', () => {
            const q = this.$('music-queue');
            const open = q.hidden;
            q.hidden = !open;
            qBtn.setAttribute('aria-expanded', String(open));
            qBtn.classList.toggle('active', open);
        });
        this.$('music-queue-list')?.addEventListener('click', (e) => {
            const li = e.target.closest('[data-i]');
            if (li) this.playIndex(+li.dataset.i);
        });
    }

    toggleMute() {
        this.muted = !this.muted;
        if (!this.muted && this.volume === 0) this.volume = 70;
        this.widget?.setVolume(this.muted ? 0 : this.volume);
        this._paintVolume();
    }

    /* ---------- Mini leitor no editor ---------- */
    _bindEditorBar() {
        const bar = this.$('ed-music');
        if (!bar) return;
        let collapsed = false;
        try { collapsed = localStorage.getItem('pinspace_edmusic') === 'min'; } catch { /* ok */ }
        bar.classList.toggle('is-min', collapsed);
        const setMin = (on) => {
            bar.classList.toggle('is-min', on);
            try { localStorage.setItem('pinspace_edmusic', on ? 'min' : 'open'); } catch { /* ok */ }
        };
        this.$('ed-music-disc')?.addEventListener('click', () => setMin(false));
        this.$('ed-music-hide')?.addEventListener('click', () => setMin(true));

        bar.addEventListener('click', (e) => {
            const b = e.target.closest('[data-music-act]');
            if (!b) return;
            const act = b.dataset.musicAct;
            if (act === 'toggle') this.togglePlay();
            else if (act === 'next') this.widget && this.tracks.length ? this.next() : this.togglePlay();
            else if (act === 'prev') this.widget && this.tracks.length ? this.prev() : this.togglePlay();
            else if (act === 'mute') this.toggleMute();
        });
        const prog = bar.querySelector('[data-music-progress]');
        prog?.addEventListener('click', (e) => {
            if (!this.widget || this.current < 0) return;
            const r = prog.getBoundingClientRect();
            const rel = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
            this.widget.getDuration((d) => this.widget.seekTo(rel * d));
        });
        // Teclas não chegam ao editor (atalhos do quadro) quando se usa a barra.
        bar.addEventListener('keydown', (e) => e.stopPropagation());
        this._syncMini();
    }

    _syncMini() {
        // Barra do editor + widget do perfil ([data-music-mini]).
        const bars = [this.$('ed-music'), ...document.querySelectorAll('[data-music-mini]')].filter(Boolean);
        if (!bars.length) return;
        const t = this.tracks[this.current >= 0 ? this.current : this.focus];
        const title = t ? t.title : 'Música';
        const artist = t ? (this.current >= 0 ? t.artist : 'carrega em ▶ para ouvir') : 'carrega em ▶ para ouvir';
        const src = t && t.artwork && typeof safeImgSrc === 'function' ? safeImgSrc(t.artwork) : '';
        bars.forEach(bar => {
            bar.querySelectorAll('[data-music-title]').forEach(el => { el.textContent = title; });
            bar.querySelectorAll('[data-music-artist]').forEach(el => { el.textContent = artist; });
            if (bar.dataset.art !== src) {
                bar.dataset.art = src;
                bar.querySelectorAll('[data-music-art]').forEach(el => { el.innerHTML = src ? `<img src="${src}" alt="">` : ''; });
            }
            bar.classList.toggle('is-playing', this.playing);
            bar.classList.toggle('has-track', !!t);
            bar.querySelectorAll('[data-music-act="toggle"]').forEach(b => b.setAttribute('aria-label', this.playing ? 'Pausa' : 'Tocar'));
            const mute = bar.querySelector('[data-music-act="mute"]');
            mute?.classList.toggle('is-muted', this.muted);
            mute?.setAttribute('aria-label', this.muted ? 'Ativar som' : 'Silenciar');
        });
    }

    _toggleLinkForm(force) {
        const form = this.$('music-link-form');
        if (!form) return;
        const show = force !== undefined ? force : form.hidden;
        form.hidden = !show;
        this.$('music-link-toggle').hidden = show;
        if (show) setTimeout(() => this.$('music-link-input')?.focus(), 30);
    }

    _connectError(msg) {
        const el = this.$('music-connect-error');
        if (!el) return;
        el.textContent = msg || '';
        el.hidden = !msg;
    }

    _renderConnect() {
        const s = this.session;
        const box = this.$('music-connect');
        const title = this.$('music-connect-title');
        const sub = this.$('music-connect-sub');
        const label = this.$('music-login-label');
        const toggle = this.$('music-link-toggle');
        if (!box) return;
        box.classList.toggle('is-connected', !!s);
        if (s) {
            const name = (s.user && s.user.username) || 'SoundCloud';
            title.textContent = `@${name}`;
            sub.textContent = s.mode === 'oauth'
                ? 'A tocar o teu feed: músicas novas de quem segues no SoundCloud.'
                : (s.profile && s.profile.source === 'uploads'
                    ? 'Os teus likes não estão públicos, por isso a tocar os teus uploads. No SoundCloud, em Definições → Privacidade, torna os likes públicos e volta a ligar.'
                    : 'A tocar as músicas que curtiste no SoundCloud.');
            label.textContent = 'Desligar';
            toggle.hidden = true;
            this._toggleLinkForm(false);
            toggle.hidden = true;
        } else {
            title.textContent = 'Liga o teu SoundCloud';
            sub.textContent = 'Até lá, ouve as novidades da semana. Depois de ligares, segue o teu feed.';
            label.textContent = this.oauthEnabled ? 'Entrar com SoundCloud' : 'Ligar SoundCloud';
            // Sem login oficial, o botão laranja já abre o campo do link.
            toggle.hidden = !this.oauthEnabled;
            this._toggleLinkForm(false);
        }
        this._connectError('');
    }

    _showFlowMessage(msg, loading = false) {
        const flow = this.$('music-flow');
        if (!flow) return;
        flow.innerHTML = `<div class="music-flow-empty">${loading ? '<span class="ps-spinner"></span>' : ''} ${escapeHTML(msg)}</div>`;
    }

    _cardHTML(t, i) {
        const art = t.artwork && typeof safeImgSrc === 'function' ? safeImgSrc(t.artwork) : '';
        return `<button type="button" class="music-card" data-i="${i}" role="option" aria-label="${escapeHTML(t.title)} — ${escapeHTML(t.artist)}">
            <span class="music-card-art">${art ? `<img src="${art}" alt="" loading="lazy" decoding="async">` : '<span class="music-card-ph">♪</span>'}</span>
            <span class="music-card-text">
                <strong>${escapeHTML(t.title)}</strong>
                <small>${escapeHTML(t.artist || ' ')}</small>
            </span>
        </button>`;
    }

    _renderFlow() {
        const flow = this.$('music-flow');
        if (!flow) return;
        if (!this.tracks.length) return this._showFlowMessage('Sem músicas para mostrar.');
        flow.innerHTML = this.tracks.map((t, i) => this._cardHTML(t, i)).join('');
        this._layoutFlow();
    }

    _updateCard(i) {
        const old = this.$('music-flow')?.querySelector(`[data-i="${i}"]`);
        if (!old) return;
        const tmp = document.createElement('div');
        tmp.innerHTML = this._cardHTML(this.tracks[i], i);
        old.replaceWith(tmp.firstElementChild);
        this._layoutFlow();
        this._renderQueue();
    }

    _setFocus(i, animate = true) {
        if (!this.tracks.length) return;
        this.focus = (i + this.tracks.length) % this.tracks.length;
        this._layoutFlow();
        this._paintAmbient();
        // Em modo playlist, cartões parciais ficam completos quando o widget os carrega.
        if (animate && this.tracks[this.focus]?.partial) this._fillPartial();
    }

    // Coverflow: só transform/opacity → animado pela GPU.
    _layoutFlow() {
        const cards = this.$('music-flow')?.querySelectorAll('.music-card');
        if (!cards || !cards.length) return;
        const n = this.tracks.length;
        const narrow = window.matchMedia('(max-width: 720px)').matches;
        const step = narrow ? 34 : 58;   // % da largura do cartão
        cards.forEach((card) => {
            const i = +card.dataset.i;
            let o = i - this.focus;
            if (o > n / 2) o -= n;
            if (o < -n / 2) o += n;
            const a = Math.abs(o);
            const visible = a <= (narrow ? 1 : 2);
            const scale = a === 0 ? 1 : a === 1 ? 0.82 : 0.68;
            card.style.transform = `translate(-50%, -50%) translateX(${o * step}%) scale(${scale})`;
            card.style.zIndex = String(10 - a);
            card.style.opacity = visible ? (a === 0 ? '1' : a === 1 ? '0.78' : '0.5') : '0';
            card.style.pointerEvents = visible ? 'auto' : 'none';
            card.classList.toggle('is-active', a === 0);
            card.classList.toggle('is-playing', i === this.current && this.playing);
            card.setAttribute('aria-selected', String(a === 0));
            card.tabIndex = -1;
        });
    }

    _renderQueue() {
        const ol = this.$('music-queue-list');
        if (!ol) return;
        ol.innerHTML = this.tracks.map((t, i) => `
            <li data-i="${i}" class="${i === this.current ? 'is-current' : ''}">
                <span class="music-q-num">${i + 1}</span>
                <span class="music-q-text"><strong>${escapeHTML(t.title)}</strong><small>${escapeHTML(t.artist)}</small></span>
            </li>`).join('');
    }

    _paintNow() {
        const t = this.tracks[this.current >= 0 ? this.current : this.focus];
        const title = this.$('music-now-title');
        const artist = this.$('music-now-artist');
        const art = this.$('music-now-art');
        if (!title) return;
        if (!t) { title.textContent = 'Nada a tocar'; artist.textContent = 'escolhe uma faixa'; art.innerHTML = ''; return; }
        title.textContent = t.title;
        artist.textContent = this.current >= 0 ? t.artist : 'carrega em ▶ para ouvir';
        const src = t.artwork && typeof safeImgSrc === 'function' ? safeImgSrc(t.artwork) : '';
        art.innerHTML = src ? `<img src="${src}" alt="">` : '';
        const link = this.$('music-open-sc');
        if (link && t.url) link.href = t.url;
        this._renderQueue();
        this._paintAmbient();
        this._syncMini();
    }

    _paintPlayState() {
        this.$('musica')?.classList.toggle('is-playing', this.playing);
        const btn = this.$('music-play');
        if (btn) btn.setAttribute('aria-label', this.playing ? 'Pausa' : 'Tocar');
        this._layoutFlow();
        this._syncMini();
    }

    _paintVolume() {
        const vol = this.$('music-volume');
        if (vol) vol.value = this.muted ? 0 : this.volume;
        this.$('music-mute')?.classList.toggle('is-muted', this.muted);
        this.$('music-mute')?.setAttribute('aria-label', this.muted ? 'Ativar som' : 'Silenciar');
        this._syncMini();
    }

    // Brilho ambiente com a capa da faixa (como o laranja da referência).
    // Desenhado uma vez num canvas pequeno — sem filter: blur() por frame.
    _paintAmbient() {
        const t = this.tracks[this.focus];
        const canvas = this.$('music-ambient');
        if (!canvas || !t || !t.artwork || this._ambientFor === t.artwork) return;
        this._ambientFor = t.artwork;
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
            if (this._ambientFor !== t.artwork) return;
            canvas.width = 32; canvas.height = 20;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, 8, 5);              // reduz muito = desfoca
            ctx.drawImage(canvas, 0, 0, 8, 5, 0, 0, 32, 20);
            canvas.classList.add('ready');
        };
        img.src = t.artwork;
    }

    _scrollIntoView() {
        const sc = document.querySelector('.home-container');
        const el = this.$('musica');
        if (!sc || !el) return;
        sc.scrollTo({ top: el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 40, behavior: 'smooth' });
    }
}
