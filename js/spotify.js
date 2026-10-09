/* =====================================================================
   PinSpace — Spotify na secção de música (mesmo layout do SoundCloud)
   - "Ligar Spotify": login oficial (OAuth + PKCE, sem segredo no browser)
     e carrega as músicas curtidas (/me/tracks).
   - Toca com a Spotify iFrame API (leitor escondido, como o do SoundCloud):
     com sessão do Spotify iniciada no browser tocam as faixas completas;
     sem sessão, o Spotify só deixa ouvir 30 s de cada faixa.
   - Com o Spotify ligado o laranja passa a verde (secção e mini leitor).
   Precisa de um Client ID de uma app em developer.spotify.com — ver
   supabase/LEIA-ME.md.
   ===================================================================== */

window.SPOTIFY_CONFIG = Object.assign({
    // Preenche com o Client ID da tua app (developer.spotify.com/dashboard)
    clientId: '',
    // Tem de ser IGUAL a um "Redirect URI" registado na app do Spotify
    redirectUri: window.location.origin + window.location.pathname,
    scopes: 'user-library-read'
}, window.SPOTIFY_CONFIG || {});

const SP_ACCOUNTS = 'https://accounts.spotify.com';
const SP_API = 'https://api.spotify.com/v1';

/* Motor de som com a mesma "forma" do widget do SoundCloud, para o resto
   do leitor (coverflow, mini leitor do editor, fila) funcionar igual. */
class SpotifyEngine {
    constructor(player) {
        this.p = player;
        this.ctrl = null;
        this.state = { paused: true, position: 0, duration: 0 };
        this._loaded = null;
        this._ended = false;
    }

    _api() {
        if (window.__spIframeApi) return Promise.resolve(window.__spIframeApi);
        if (this._apiP) return this._apiP;
        this._apiP = new Promise((resolve, reject) => {
            window.onSpotifyIframeApiReady = (api) => { window.__spIframeApi = api; resolve(api); };
            const s = document.createElement('script');
            s.src = 'https://open.spotify.com/embed/iframe-api/v1';
            s.async = true;
            s.onerror = () => reject(new Error('Não foi possível carregar o leitor do Spotify.'));
            document.head.appendChild(s);
            setTimeout(() => reject(new Error('O leitor do Spotify não respondeu.')), 12000);
        });
        return this._apiP;
    }

    async _ensure(uri) {
        if (this.ctrl) return;
        const api = await this._api();
        const host = document.getElementById('music-iframe-host') || document.body;
        const el = document.createElement('div');
        host.appendChild(el);
        await new Promise((resolve) => {
            let done = false;
            const finish = () => { if (!done) { done = true; resolve(); } };
            api.createController(el, { uri, width: 300, height: 152 }, (ctrl) => {
                this.ctrl = ctrl;
                this._loaded = uri;
                ctrl.addListener('ready', finish);
                ctrl.addListener('playback_update', (e) => this._onUpdate(e && e.data));
                setTimeout(finish, 4000);
            });
        });
    }

    _onUpdate(d) {
        if (!d) return;
        const p = this.p;
        this.state = { paused: !!d.isPaused, position: d.position || 0, duration: d.duration || 0 };
        const playing = !d.isPaused;
        if (playing !== p.playing) { p.playing = playing; p._paintPlayState(); }
        const pct = d.duration ? Math.min(1, d.position / d.duration) : 0;
        document.querySelectorAll('#music-progress-fill, [data-music-progress-fill]').forEach(f => { f.style.transform = `scaleX(${pct})`; });
        // Fim da faixa → seguinte
        if (!this._ended && d.duration > 0 && d.position >= d.duration - 700 && d.position > 0) {
            this._ended = true;
            setTimeout(() => p.playIndex(p.current + 1), 300);
        }
    }

    // ---- API igual à do widget do SoundCloud (só o que o leitor usa) ----
    async load(uri, opts = {}) {
        await this._ensure(uri);
        if (this._loaded !== uri) { this.ctrl.loadUri(uri); this._loaded = uri; }
        this._ended = false;
        if (opts.callback) setTimeout(opts.callback, 250);
    }
    play() { this._ended = false; this.ctrl?.play(); }
    pause() { this.ctrl?.pause(); }
    toggle() { this.ctrl?.togglePlay(); }
    seekTo(ms) { this.ctrl?.seek(Math.max(0, ms) / 1000); }
    getDuration(cb) { cb(this.state.duration); }
    getPosition(cb) { cb(this.state.position); }
    setVolume() { /* o leitor do Spotify não deixa mudar o volume */ }
    skip() { }
    getCurrentSound(cb) { cb && cb(null); }
    bind() { }
    destroy() { try { this.ctrl?.destroy(); } catch { /* ok */ } this.ctrl = null; this._loaded = null; }
}

(function () {
    if (typeof MusicPlayer === 'undefined') return;
    const P = MusicPlayer.prototype;
    const spCfg = () => window.SPOTIFY_CONFIG;
    const isSp = (self) => !!(self.session && self.session.provider === 'spotify');

    const SP_LOGO = '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm5.5 17.3a.75.75 0 0 1-1 .25c-2.85-1.74-6.43-2.13-10.66-1.17a.75.75 0 1 1-.33-1.46c4.62-1.06 8.6-.6 11.74 1.33.36.21.47.68.25 1.05zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.26-2-8.23-2.58-12.08-1.41a.94.94 0 1 1-.55-1.8c4.4-1.33 9.88-.69 13.61 1.6.44.27.58.85.31 1.3zm.13-3.4C15.2 8.3 8.8 8.1 5.1 9.2a1.13 1.13 0 1 1-.65-2.16C8.7 5.75 15.77 6 20.2 8.64a1.13 1.13 0 0 1-1.16 1.94z"/></svg>';

    /* ---------- Tema verde ---------- */
    P._setProviderTheme = function (sp) {
        this.$('musica')?.classList.toggle('is-spotify', sp);
        this.$('ed-music')?.classList.toggle('is-spotify', sp);
        document.documentElement.classList.toggle('music-spotify', sp);
        const credit = document.querySelector('#musica .music-credit');
        if (credit) {
            credit.innerHTML = sp
                ? 'Música via <a href="https://open.spotify.com" target="_blank" rel="noopener">Spotify</a> — continua a tocar enquanto editas.'
                : 'Música via <a href="https://soundcloud.com" target="_blank" rel="noopener">SoundCloud</a> — continua a tocar enquanto editas.';
        }
        const logo = document.querySelector('#musica .music-sc-logo');
        if (logo) {
            if (!logo.dataset.scLogo) logo.dataset.scLogo = logo.innerHTML;
            logo.innerHTML = sp ? SP_LOGO : logo.dataset.scLogo;
        }
        const open = this.$('music-open-sc');
        if (open) {
            const label = sp ? 'Abrir no Spotify' : 'Abrir no SoundCloud';
            open.setAttribute('aria-label', label);
            open.title = label;
        }
    };

    /* ---------- Botão "Ligar Spotify" ---------- */
    const origBind = P._bindUI;
    P._bindUI = function () {
        origBind.call(this);
        this.$('music-spotify')?.addEventListener('click', () => {
            if (isSp(this)) return this.disconnect();
            this.startSpotify();
        });
    };

    const origRender = P._renderConnect;
    P._renderConnect = function () {
        origRender.call(this);
        const sp = isSp(this);
        const btn = this.$('music-spotify');
        if (btn) {
            btn.hidden = sp;
            const lbl = btn.querySelector('span');
            if (lbl) lbl.textContent = this.session && !sp ? 'Trocar para Spotify' : 'Ligar Spotify';
        }
        if (sp) {
            const s = this.session;
            this.$('music-connect-title').textContent = (s.user && s.user.name) ? s.user.name : 'Spotify';
            this.$('music-connect-sub').textContent = 'A tocar as músicas que curtiste no Spotify.';
            this.$('music-login-label').textContent = 'Desligar';
        }
        this._setProviderTheme(sp);
    };

    /* ---------- Login (OAuth + PKCE) ---------- */
    const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    P.startSpotify = async function () {
        const cfg = spCfg();
        if (!cfg.clientId) {
            this._connectError('Para ligar o Spotify falta o Client ID da app do Spotify (é grátis, demora 2 min). Vê os passos em supabase/LEIA-ME.md → "Spotify".');
            return;
        }
        if (!window.crypto || !crypto.subtle) {
            this._connectError('O login do Spotify só funciona com o site aberto em https://.');
            return;
        }
        const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
        const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
        const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
        sessionStorage.setItem('sp_pkce', JSON.stringify({ verifier, state }));
        const q = new URLSearchParams({
            client_id: cfg.clientId,
            response_type: 'code',
            redirect_uri: cfg.redirectUri,
            code_challenge_method: 'S256',
            code_challenge: challenge,
            scope: cfg.scopes,
            state
        });
        window.location.href = SP_ACCOUNTS + '/authorize?' + q.toString();
    };

    P._spTokenRequest = async function (params) {
        const res = await fetch(SP_ACCOUNTS + '/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ client_id: spCfg().clientId, ...params })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.access_token) throw new Error(data.error_description || data.error || ('Spotify respondeu ' + res.status));
        return data;
    };

    P._spToken = async function () {
        const s = this.session;
        if (!s || !s.accessToken) throw new Error('Sem sessão do Spotify.');
        if (Date.now() < (s.expiresAt || 0) - 60000 || !s.refreshToken) return s.accessToken;
        const tok = await this._spTokenRequest({ grant_type: 'refresh_token', refresh_token: s.refreshToken });
        this._saveSession({ ...s, accessToken: tok.access_token, refreshToken: tok.refresh_token || s.refreshToken, expiresAt: Date.now() + (tok.expires_in || 3600) * 1000 });
        return tok.access_token;
    };

    P._spApi = async function (path) {
        const token = await this._spToken();
        const res = await fetch(SP_API + path, { headers: { Authorization: 'Bearer ' + token } });
        if (res.status === 401) throw Object.assign(new Error('A sessão do Spotify terminou. Volta a ligar.'), { status: 401 });
        if (res.status === 403) throw new Error('O Spotify recusou o acesso. Se a app estiver em "Development mode", adiciona o teu email em Users Management no painel do Spotify.');
        if (!res.ok) throw new Error('Spotify respondeu ' + res.status);
        return res.json();
    };

    P._handleSpotifyReturn = async function () {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const err = params.get('error');
        let saved = null;
        try { saved = JSON.parse(sessionStorage.getItem('sp_pkce') || 'null'); } catch { /* ok */ }
        if (!saved || saved.state !== state || (!code && !err)) return;
        sessionStorage.removeItem('sp_pkce');
        history.replaceState(null, '', window.location.pathname + window.location.hash);
        if (err) { this._connectError('O Spotify não deu acesso (' + err + ').'); return; }
        try {
            const tok = await this._spTokenRequest({ grant_type: 'authorization_code', code, redirect_uri: spCfg().redirectUri, code_verifier: saved.verifier });
            this._saveSession({
                provider: 'spotify',
                mode: 'oauth',
                accessToken: tok.access_token,
                refreshToken: tok.refresh_token || null,
                expiresAt: Date.now() + (tok.expires_in || 3600) * 1000,
                user: {}
            });
            const me = await this._spApi('/me').catch(() => ({}));
            this._saveSession({ ...this.session, user: { username: me.id || '', name: me.display_name || me.id || 'Spotify' } });
            this._renderConnect();
            this._booted = true;
            await this._loadSpotifyFeed();
            this.app.ui.showToast(`Spotify ligado — a tocar as tuas músicas curtidas.`);
            setTimeout(() => this._scrollIntoView(), 400);
        } catch (e) {
            console.error('Spotify:', e);
            this._saveSession(null);
            this._renderConnect();
            this._connectError('Não foi possível ligar o Spotify: ' + e.message);
        }
    };

    const origInit = P.init;
    P.init = function () {
        origInit.call(this);
        if (!this.$('musica')) return;
        this._handleSpotifyReturn();
    };

    /* ---------- Carregar as curtidas ---------- */
    P._loadSpotifyFeed = async function () {
        this._showFlowMessage('a carregar as tuas curtidas do Spotify…', true);
        const data = await this._spApi('/me/tracks?limit=50');
        const items = (data && data.items) || [];
        const tracks = items.map(x => x && x.track).filter(t => t && t.id).map(t => ({
            id: t.id,
            title: t.name,
            artist: (t.artists || []).map(a => a.name).join(', '),
            artwork: (t.album && t.album.images && t.album.images[0] && t.album.images[0].url) || '',
            url: 'spotify:track:' + t.id,
            web: (t.external_urls && t.external_urls.spotify) || ('https://open.spotify.com/track/' + t.id),
            partial: false
        }));
        if (!tracks.length) throw new Error('Ainda não tens músicas curtidas no Spotify. Dá ♥ a umas faixas e volta aqui.');

        // Pára o SoundCloud e passa a usar o motor do Spotify.
        if (this.widget && !(this.widget instanceof SpotifyEngine)) {
            try { this.widget.pause(); } catch { /* ok */ }
            this._scWidget = this.widget;
        }
        if (!this._sp) this._sp = new SpotifyEngine(this);
        this.widget = this._sp;
        this.mode = 'list';
        this.tracks = tracks;
        this.focus = 0;
        this.current = -1;
        this.playing = false;
        this._renderFlow();
        this._renderQueue();
        this._paintNow();
        this._paintPlayState();
        this._setProviderTheme(true);
    };

    const origLoadFeed = P._loadFeed;
    P._loadFeed = async function () {
        if (isSp(this)) {
            try {
                await this._loadSpotifyFeed();
            } catch (err) {
                console.warn('Spotify:', err);
                if (err.status === 401) { this._saveSession(null); this._renderConnect(); }
                this._showFlowMessage(err.message || 'Não foi possível carregar as músicas do Spotify.');
            }
            return;
        }
        return origLoadFeed.call(this);
    };

    // Antes de o SoundCloud voltar a carregar uma lista, devolvemos-lhe o leitor dele.
    const origEnsureWidget = P._ensureWidget;
    P._ensureWidget = function (url) {
        if (this.widget instanceof SpotifyEngine) {
            try { this.widget.pause(); } catch { /* ok */ }
            this.widget = this._scWidget || null;
        }
        return origEnsureWidget.call(this, url);
    };

    const origDisconnect = P.disconnect;
    P.disconnect = function () {
        if (!isSp(this)) return origDisconnect.call(this);
        try { this._sp?.pause(); } catch { /* ok */ }
        this.playing = false;
        this._saveSession(null);
        this.widget = this._scWidget || null;
        this._renderConnect();
        this._fillTries = 0;
        this._paintPlayState();
        this._loadPlaylist(this.cfg.genericPlaylist, this.cfg.genericFallback).catch(() => {});
        this.app.ui.showToast('Spotify desligado.');
    };

    // Ligar o SoundCloud depois do Spotify: tira o tema verde.
    const origConnectProfile = P.connectProfile;
    P.connectProfile = async function (input) {
        if (this.widget instanceof SpotifyEngine) { try { this.widget.pause(); } catch { /* ok */ } }
        return origConnectProfile.call(this, input);
    };

    // "Abrir no Spotify" leva à faixa no site do Spotify.
    const origPaintNow = P._paintNow;
    P._paintNow = function () {
        origPaintNow.call(this);
        if (!isSp(this)) return;
        const t = this.tracks[this.current >= 0 ? this.current : this.focus];
        const link = this.$('music-open-sc');
        if (link && t && t.web) link.href = t.web;
    };
})();
