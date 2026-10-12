/* =====================================================================
   PinSpace — comunidade (explorar, perfil, notificações)
   Segue a linguagem visual da landing: vidro, preto/creme, terracota.
   Explorar, Perfil, Notificações, cartões de quadros com like /
   repost / seguir, modais de login/registo, repost e editar perfil.

   Fica separado de ui.js (que trata do editor) para não misturar as duas
   coisas. Usa as funções de dados de js/data.js e escapeHTML de js/ui.js.
   ===================================================================== */

const GH_ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    explore: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14a6.5 6.5 0 0 1 3 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
    board: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 6V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    sidebar: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    open: '<path d="M7 17 17 7M8 7h9v9"/>',
    userPlus: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/>',
    userCheck: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 11l2 2 4-4"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="m21 15-5-5L5 21"/>',
    arrowDown: '<path d="M12 4v16M5 13l7 7 7-7"/>',
    more: '<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',
    send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    sort: '<path d="M3 6h18M6 12h12M10 18h4"/>',
    flag: '<path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/>',
    palette: '<path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4-4-7.2-9-7.2z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="14.5" cy="7" r="1.2"/>'
};

// Ícones cheios (leitor de música).
const PS_PLAY = '<svg class="i-play" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
const PS_PAUSE = '<svg class="i-pause" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
const PS_PREV = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11 6v12L2.5 12zM21 6v12l-8.5-6z"/></svg>';
const PS_NEXT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 6v12l8.5-6zM3 6v12l8.5-6z"/></svg>';

// Username com pontos de quebra depois de "_", "." e "-" (nada fica cortado).
function unameHTML(name) {
    return escapeHTML(String(name || '')).replace(/([_.\-])/g, '$1<wbr>');
}

function psLoc() {
    return typeof window.psLocale === 'function' ? window.psLocale() : 'pt-PT';
}

// Texto com #hashtags realçadas (já escapado).
function _richText(text) {
    return escapeHTML(text || '').replace(/(^|\s)#([\p{L}\p{N}_-]{1,40})/gu, '$1<a class="fd-tag" href="#explore?q=$2">#$2</a>');
}

function ghIcon(name, size = 16, extraClass = '') {
    return `<svg class="ps-icon ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GH_ICONS[name] || ''}</svg>`;
}

// Só aceita imagens https:// ou data:image — e nunca caracteres que permitam
// sair do atributo/CSS onde o link é escrito (aspas, <, >, espaços, parênteses…).
function safeImgSrc(src) {
    const s = String(src || '').trim();
    if (!s || s.length > 3000000) return '';
    if (/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(s)) return s.replace(/\s+/g, '');
    if (/^data:image\/svg\+xml[;,]/i.test(s)) return /["'<>`\\\s]/.test(s.replace(/^data:image\/svg\+xml;charset=utf-8,/i, '')) ? '' : s;
    if (/^https:\/\//i.test(s)) {
        if (/["'<>`\\\s()]/.test(s)) return '';
        try { return new URL(s).href; } catch { return ''; }
    }
    return '';
}

function _hashStr(str, seed = 2166136261) {
    let h = seed >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
}

// Avatar de fallback gerado a partir do username, com as cores do site
// (terracota, musgo, mostarda, céu, índigo) sobre creme.
const PS_AVATAR_COLORS = ['#E60023', '#6E7F47', '#D8A33B', '#5D8296', '#1E2A42', '#F4465C'];
const _identiconCache = new Map();
function identicon(seed) {
    const key = String(seed || '?').toLowerCase();
    if (_identiconCache.has(key)) return _identiconCache.get(key);
    const bits = _hashStr(key);
    const fg = PS_AVATAR_COLORS[_hashStr(key, 99991) % PS_AVATAR_COLORS.length];
    let rects = '';
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 3; x++) {
            if ((bits >> (y * 3 + x)) & 1) {
                rects += `<rect x="${x + 0.5}" y="${y + 0.5}" width="1" height="1"/>`;
                if (x < 2) rects += `<rect x="${4 - x + 0.5}" y="${y + 0.5}" width="1" height="1"/>`;
            }
        }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 6" shape-rendering="crispEdges"><rect width="6" height="6" fill="#F6F5F1"/><g fill="${fg}">${rects}</g></svg>`;
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    _identiconCache.set(key, url);
    return url;
}

function avatarSrc(profile) {
    if (!profile) return identicon('?');
    return safeImgSrc(profile.image) || identicon(profile.username || profile.id || '?');
}

function timeAgo(iso) {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'agora mesmo';
    const units = [[60, 'min', 'min'], [3600, 'h', 'h'], [86400, 'dia', 'dias'], [2592000, 'mês', 'meses'], [31536000, 'ano', 'anos']];
    let pick = units[0];
    for (const u of units) if (diff >= u[0]) pick = u;
    const n = Math.floor(diff / pick[0]);
    return 'há ' + n + ' ' + (n === 1 ? pick[1] : pick[2]);
}

function _fmtCount(n) {
    n = Number(n) || 0;
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '') + 'k';
    return String(n);
}

function _socialErrMsg(err) {
    const m = String((err && (err.message || err.error_description)) || err || '');
    const code = err && err.code;
    if (code === '42P01' || code === 'PGRST205' || /relation .* does not exist|could not find the table/i.test(m)) {
        return 'As tabelas sociais ainda não existem. Corre supabase/social.sql no SQL Editor do Supabase.';
    }
    if (code === 'PGRST200' || /could not find a relationship/i.test(m)) {
        return 'Faltam as relações entre tabelas. Volta a correr supabase/social.sql (inclui "notify pgrst, \'reload schema\'").';
    }
    if (/failed to fetch|networkerror/i.test(m)) return 'Sem ligação ao servidor. Verifica a internet.';
    return m || 'Algo correu mal.';
}

class SocialUI {
    constructor(app) {
        this.app = app;
        this.root = document.getElementById('social-view');
        this.scroller = document.getElementById('ps-scroll');
        this.main = document.getElementById('ps-main');
        this.topbarUser = document.getElementById('ps-user');
        this.landingAuth = document.getElementById('landing-auth');

        // Estados (ponto 11 do pedido)
        this.state = {
            userBoards: [],
            feedBoards: [],
            likeState: {},       // boardId -> 'liked' | 'none'
            retweetState: {},    // boardId -> 'retweeted' | 'none'
            followState: {},     // userId  -> 'following' | 'none'
            counts: {}           // boardId -> { likes, retweets }
        };
        this.route = null;
        this._renderToken = 0;
        this._repostTarget = null;
        this._busy = new Set();
        this._notifTimer = null;
    }

    get user() {
        return this.app.currentUser;
    }

    init() {
        this._bindDelegation(this.root);
        if (this.landingAuth) this._bindDelegation(this.landingAuth);
        this._bindTopbar();
        this._bindAuthModal();
        this._bindRepostModal();
        this._bindReportModal();
        this._bindProfileModal();
        this._bindNotifPopup();
        this.renderAuthAreas();
    }

    /* ---------------- Navegação ---------------- */

    _setActiveNav(name) {
        this.root?.querySelectorAll('.ps-link[data-route]').forEach(a => {
            const on = a.dataset.route === name;
            a.classList.toggle('active', on);
            if (on) a.setAttribute('aria-current', 'page');
            else a.removeAttribute('aria-current');
        });
    }

    _bindTopbar() {
        const form = document.getElementById('ps-search-form');
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this._liveSearch(form.querySelector('input').value, true);
        });
        form?.querySelector('input')?.addEventListener('input', (e) => this._liveSearch(e.target.value));

        // "/" foca a pesquisa.
        document.addEventListener('keydown', (e) => {
            if (e.key !== '/' || !this.root?.classList.contains('active')) return;
            const t = e.target;
            if (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
            e.preventDefault();
            form?.querySelector('input')?.focus();
        });

        // Nav ganha fundo mais sólido quando se faz scroll.
        this.scroller?.addEventListener('scroll', () => {
            this.root.classList.toggle('is-scrolled', this.scroller.scrollTop > 12);
        }, { passive: true });

        document.addEventListener('click', (e) => {
            document.querySelectorAll('details.ps-menu[open]').forEach(d => {
                if (!d.contains(e.target)) d.removeAttribute('open');
            });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') document.querySelectorAll('details.ps-menu[open]').forEach(d => d.removeAttribute('open'));
        });
    }

    // Área de conta na nav da comunidade e na nav do hero da landing.
    renderAuthAreas() {
        const state = this.app.authState;
        const u = this.user;

        if (this.topbarUser) {
            if (state === 'loading') {
                this.topbarUser.innerHTML = '<span class="ps-skeleton-avatar" aria-label="A carregar sessão"></span>';
            } else if (!u) {
                // Entrar e Criar conta faziam o mesmo (login com Google): fica um só botão.
                this.topbarUser.innerHTML = `
                    <button type="button" class="ms-nav-cta ps-cta" data-act="login"><span>Entrar</span>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>`;
            } else {
                this.topbarUser.innerHTML = `
                    <button type="button" class="ms-nav-cta ps-cta" data-act="new-board" title="Criar quadro">
                        ${ghIcon('plus', 15)}<span class="ps-cta-label">Novo quadro</span>
                    </button>
                    <details class="ps-menu">
                        <summary class="ps-avatar-btn" aria-label="Menu da conta">
                            <img src="${avatarSrc(u)}" alt="">
                            <i class="ps-dot" id="ps-notif-dot" hidden></i>
                        </summary>
                        <div class="ps-menu-panel" role="menu">
                            <div class="ps-menu-head">
                                <span class="ms-kicker">Sessão iniciada</span>
                                <strong>@${unameHTML(u.username || '')}</strong>
                            </div>
                            <a href="#profile/${encodeURIComponent(u.username || '')}" role="menuitem">${ghIcon('user')} O meu perfil</a>
                            <a href="#notifications" role="menuitem">${ghIcon('bell')} Notificações</a>
                            <button type="button" data-act="edit-profile" role="menuitem">${ghIcon('edit')} Editar perfil</button>
                            <div class="ps-menu-sep"></div>
                            <button type="button" data-act="logout" role="menuitem">${ghIcon('logout')} Sair</button>
                        </div>
                    </details>`;
            }
        }

        if (this.landingAuth) {
            if (state === 'loading') {
                this.landingAuth.innerHTML = '';
            } else if (!u) {
                this.landingAuth.innerHTML = `
                    <a href="#explore" class="ms-nav-link">Comunidade</a>
                    <button type="button" class="ms-nav-link" data-act="login">Entrar</button>`;
            } else {
                this.landingAuth.innerHTML = `
                    <a href="#explore" class="ms-nav-link">Explorar</a>
                    <a href="#profile/${encodeURIComponent(u.username || '')}" class="ms-nav-avatar" title="@${escapeHTML(u.username || '')}"><img src="${avatarSrc(u)}" alt="O meu perfil"></a>`;
            }
        }

        // Topo do editor: avatar + @utilizador (ou "Entrar").
        const edUser = document.getElementById('ed-user');
        if (edUser) {
            if (state === 'loading') {
                edUser.innerHTML = '<span class="ed-user-skel" aria-hidden="true"></span>';
            } else if (!u) {
                edUser.innerHTML = `<button type="button" class="ed-user-login" data-ed-act="login">${ghIcon('user', 15)}<span>Entrar</span></button>`;
            } else {
                edUser.innerHTML = `<a class="ed-user-chip" href="#profile/${encodeURIComponent(u.username || '')}" title="Ver o meu perfil">
                        <img src="${avatarSrc(u)}" alt="">
                        <span class="ed-user-name"><strong>@${unameHTML(u.username || '')}</strong><small>O meu perfil</small></span>
                    </a>`;
            }
            if (!edUser._bound) {
                edUser._bound = true;
                edUser.addEventListener('click', (e) => {
                    if (e.target.closest('[data-ed-act="login"]')) { e.preventDefault(); this.openAuth('login'); }
                });
            }
        }

        const profileLink = this.root?.querySelector('.ps-link[data-route="profile"]');
        if (profileLink) profileLink.setAttribute('href', u ? '#profile/' + encodeURIComponent(u.username || '') : '#profile');
    }

    /* ---------------- Delegação de cliques ---------------- */

    _bindDelegation(container) {
        container.addEventListener('submit', (e) => {
            const f = e.target.closest('[data-comment-form]');
            if (!f) return;
            e.preventDefault();
            this._submitComment(f);
        });
        container.addEventListener('keydown', (e) => {
            const ta = e.target.closest('.fd-c-form textarea');
            if (ta && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._submitComment(ta.form); }
        });
        container.addEventListener('input', (e) => {
            const ta = e.target.closest('.fd-c-form textarea');
            if (!ta) return;
            ta.style.height = 'auto';
            ta.style.height = Math.min(140, ta.scrollHeight) + 'px';
        });
        container.addEventListener('click', (e) => {
            // Links normais (perfil do autor, etc.) dentro de um cartão clicável seguem o href.
            const link = e.target.closest('a[href]');
            if (link && !link.dataset.act && container.contains(link)) return;

            const el = e.target.closest('[data-act]');
            if (!el || !container.contains(el)) return;
            const act = el.dataset.act;
            switch (act) {
                case 'login': e.preventDefault(); this.openAuth('login'); break;
                case 'register': e.preventDefault(); this.openAuth('register'); break;
                case 'logout': e.preventDefault(); this.app.logout(); break;
                case 'edit-profile': e.preventDefault(); this.openProfileEditor(); break;
                case 'new-board': e.preventDefault(); this.app.ui.openNewProjectModal(this.app.ui.sizePresets()); break;
                case 'open': e.preventDefault(); this.app.openCloudBoard(el.dataset.boardId); break;
                case 'open-legacy': e.preventDefault(); this.app._openPublic(el.dataset.boardId); break;
                case 'like': e.preventDefault(); e.stopPropagation(); this.toggleLike(el.dataset.boardId); break;
                case 'repost': e.preventDefault(); e.stopPropagation(); this.toggleRepost(el.dataset.boardId); break;
                case 'follow': e.preventDefault(); e.stopPropagation(); this.toggleFollow(el.dataset.userId); break;
                case 'delete-board': e.preventDefault(); e.stopPropagation(); this.deleteBoard(el.dataset.boardId); break;
                case 'report-board': e.preventDefault(); e.stopPropagation(); this.openReport({ boardId: el.dataset.boardId }); break;
                case 'comments': e.preventDefault(); e.stopPropagation(); this.toggleComments(el.dataset.boardId); break;
                case 'draft-open': e.preventDefault(); this.app.ui.callbacks.onOpenProject?.(el.dataset.draftId); break;
                case 'draft-publish': e.preventDefault(); e.stopPropagation(); this.app.ui.callbacks.onPublishDraft?.(el.dataset.draftId); break;
                case 'draft-delete':
                    e.preventDefault(); e.stopPropagation();
                    if (confirm('Apagar este rascunho deste dispositivo?')) {
                        this.app.ui.callbacks.onDeleteProject?.(el.dataset.draftId);
                        el.closest('.is-draft')?.remove();
                    }
                    break;
                case 'comment-del': e.preventDefault(); e.stopPropagation(); this._deleteComment(el.dataset.commentId, el); break;
                case 'comment-report': e.preventDefault(); e.stopPropagation(); this.openReport({ commentId: el.dataset.commentId }); break;
                case 'report-profile': e.preventDefault(); e.stopPropagation(); this.openReport({ profileId: el.dataset.userId }); break;
                case 'retry': e.preventDefault(); if (this.route) this.render(this.route); break;
            }
            el.closest('details.ps-menu')?.removeAttribute('open');
        });
    }

    /* ---------------- Router ---------------- */

    async render(route) {
        const prev = this.route;
        this.route = route;
        const token = ++this._renderToken;
        this._setActiveNav(route.name);
        // Trocar de separador no mesmo perfil (Quadros / Seguidores / A seguir / Reposts):
        // não volta ao topo nem pisca — desce suavemente até ao conteúdo.
        const sameProfile = prev && prev.name === 'profile' && route.name === 'profile'
            && String(prev.username || (this.user && this.user.username) || '').toLowerCase() === String(route.username || (this.user && this.user.username) || '').toLowerCase();
        const tabSwitch = !!(sameProfile && (prev.tab || 'boards') !== (route.tab || 'boards')) || (route.name === 'profile' && this._scrollAfterRender);
        this._scrollAfterRender = false;
        if (this.scroller && !tabSwitch) this.scroller.scrollTop = 0;

        const searchInput = document.querySelector('#ps-search-form input');
        if (searchInput && route.name !== 'explore') searchInput.value = '';

        if (tabSwitch && this.main.querySelector('#pf-content')) {
            this.main.querySelector('#pf-content').classList.add('is-loading');
        } else {
            this.main.classList.remove('is-feed', 'is-profile');
            this.main.innerHTML = '<div class="ps-loading"><span class="ps-spinner"></span><em>a carregar…</em></div>';
        }
        await this.app.authReady;
        if (token !== this._renderToken) return;

        if (!authAvailable() && route.name !== 'explore') {
            this.main.innerHTML = this._errorBlock('O Supabase não carregou, por isso as contas estão indisponíveis. Verifica a ligação e recarrega a página.');
            return;
        }

        try {
            switch (route.name) {
                case 'explore': await this._renderExplore(token, route.q || ''); break;
                case 'notifications':
                    // Já não há página de notificações: abre o pop-up por cima de Explorar.
                    history.replaceState(history.state, '', window.location.pathname + window.location.search + '#explore');
                    this._setActiveNav('explore');
                    await this._renderExplore(token, '');
                    this.openNotifPopup(this.root?.querySelector('.ps-link[data-route="notifications"]'));
                    break;
                case 'profile':
                    await this._renderProfile(token, route.username, route.tab || 'boards');
                    if (tabSwitch && token === this._renderToken) requestAnimationFrame(() => this._scrollToProfileContent());
                    break;
                default: await this._renderExplore(token, '');
            }
        } catch (err) {
            console.error('Erro ao carregar vista social:', err);
            if (token === this._renderToken) this.main.innerHTML = this._errorBlock(_socialErrMsg(err));
        }
    }

    // Cabeçalho de página ao estilo da secção "Public Gallery" da landing.
    _pageHead(kicker, title, sub, extra = '') {
        return `<header class="ps-head">
            <span class="ms-kicker ps-kicker">→ ${escapeHTML(kicker)}</span>
            <h1 class="ps-title">${escapeHTML(title)}</h1>
            ${sub ? `<p class="ps-sub">${sub}</p>` : ''}
            ${extra}
        </header>`;
    }

    _sectionHead(title, sub = '', accent = 'terracotta') {
        return `<div class="section-header ps-section-head ps-accent-${accent}">
            <h4>${escapeHTML(title)}</h4>
            ${sub ? `<span class="section-subtitle">${sub}</span>` : ''}
        </div>`;
    }

    _errorBlock(msg) {
        return `<div class="ps-blank">
            <h3><em>Algo não correu bem</em></h3>
            <p>${escapeHTML(msg)}</p>
            <button type="button" class="ps-btn" data-act="retry">Tentar de novo</button>
        </div>`;
    }

    _loginBlankslate(title, text) {
        return `<div class="ps-blank ps-blank-hero">
            <span class="ms-kicker ps-kicker">→ Comunidade</span>
            <h3><em>${escapeHTML(title)}</em></h3>
            <p>${escapeHTML(text)}</p>
            <div class="ps-blank-actions">
                <button type="button" class="ms-nav-cta ps-cta" data-act="login"><span>Entrar</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
            </div>
        </div>`;
    }

    /* ---------------- Explorar ---------------- */

    async _renderExplore(token, q) {
        const me = this.user;
        const [explore, people, notifs, myStats] = await Promise.all([
            getExploreAll(q, 60),
            q && authAvailable() ? searchProfiles(q, 8).catch(() => []) : Promise.resolve([]),
            me ? getNotifications(6).catch(() => []) : Promise.resolve([]),
            me ? getProfileStats(me.id).catch(() => null) : Promise.resolve(null)
        ]);
        const boards = explore.items;
        await this._loadInteractions(boards.filter(b => !b.legacy)).catch(() => {});
        if (me && notifs.some(n => n.type === 'follow')) {
            const ids = await getFollowingIds(me.id).catch(() => []);
            notifs.filter(n => n.type === 'follow').forEach(n => { this.state.followState[n.user.id] = ids.includes(n.user.id) ? 'following' : 'none'; });
        }
        if (people.length && me) {
            const ids = await getFollowingIds(me.id).catch(() => []);
            people.forEach(p => { this.state.followState[p.id] = ids.includes(p.id) ? 'following' : 'none'; });
        }
        if (token !== this._renderToken) return;

        const searchInput = document.querySelector('#ps-search-form input');
        if (searchInput) searchInput.value = q;

        this._exploreItems = boards;
        this._exploreSort = this._exploreSort || 'recent';

        // Sugestões: autores do feed que ainda não sigo.
        const seen = new Set();
        const suggestions = [];
        boards.forEach(b => {
            const a = b.author;
            if (!a || !a.id || b.legacy || seen.has(a.id) || (me && a.id === me.id)) return;
            seen.add(a.id);
            if (this.state.followState[a.id] !== 'following') suggestions.push(a);
        });

        this.main.classList.add('is-feed');
        this.main.innerHTML = `
            <div class="fd">
                <aside class="fd-side fd-left">
                    ${this._feedMeCard(me, myStats)}
                    ${this._feedShortcuts(me)}
                </aside>

                <section class="fd-center" aria-label="Feed">
                    ${this._feedComposer(me, q)}
                    <div class="fd-sortbar">
                        <span class="fd-sort-line"></span>
                        <div class="fd-sort" role="group" aria-label="Ordenar">
                            <span>Ordenar:</span>
                            <button type="button" data-sort="recent" class="${this._exploreSort === 'recent' ? 'on' : ''}">Recentes</button>
                            <button type="button" data-sort="popular" class="${this._exploreSort === 'popular' ? 'on' : ''}">Populares</button>
                        </div>
                    </div>
                    <div class="fd-posts" id="fd-posts">${this._feedPosts(q)}</div>
                </section>

                <aside class="fd-side fd-right">
                    <div id="fd-people-slot">${q ? this._feedPeople('Pessoas', people, 'Ninguém com esse nome.') : ''}</div>
                    ${me ? this._feedActivity(notifs) : this._feedJoin()}
                    ${suggestions.length ? this._feedPeople('Sugestões para ti', suggestions.slice(0, 5)) : ''}
                </aside>
            </div>`;

        this.main.querySelectorAll('.fd-sort [data-sort]').forEach(btn => btn.addEventListener('click', () => {
            this._exploreSort = btn.dataset.sort;
            this.main.querySelectorAll('.fd-sort [data-sort]').forEach(b => b.classList.toggle('on', b === btn));
            const list = this.main.querySelector('#fd-posts');
            if (list) list.innerHTML = this._feedPosts(q);
        }));
        const fdForm = this.main.querySelector('#fd-search');
        fdForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this._liveSearch(fdForm.q.value, true);
        });
        // Resultados aparecem enquanto se escreve (sem carregar em Enter).
        fdForm?.q.addEventListener('input', () => this._liveSearch(fdForm.q.value));
    }

    // Pesquisa ao vivo: atualiza só a lista de posts e as pessoas, sem
    // redesenhar a página (o cursor fica na caixa de pesquisa).
    _liveSearch(value, now = false) {
        const v = String(value || '').trim();
        clearTimeout(this._liveSearchTimer);
        const run = async () => {
            if (!this.route || this.route.name !== 'explore') {
                window.location.hash = '#explore' + (v ? '?q=' + encodeURIComponent(v) : '');
                return;
            }
            const seq = (this._liveSearchSeq = (this._liveSearchSeq || 0) + 1);
            const list = this.main.querySelector('#fd-posts');
            list?.classList.add('is-searching');
            try {
                const [explore, people] = await Promise.all([
                    getExploreAll(v, 60),
                    v && authAvailable() ? searchProfiles(v, 8).catch(() => []) : Promise.resolve([])
                ]);
                if (seq !== this._liveSearchSeq) return;   // chegou uma pesquisa mais recente
                await this._loadInteractions(explore.items.filter(b => !b.legacy)).catch(() => {});
                if (seq !== this._liveSearchSeq) return;
                this._exploreItems = explore.items;
                this.route.q = v;
                history.replaceState(null, '', '#explore' + (v ? '?q=' + encodeURIComponent(v) : ''));
                const box = this.main.querySelector('#fd-posts');
                if (box) box.innerHTML = this._feedPosts(v);
                const slot = this.main.querySelector('#fd-people-slot');
                if (slot) slot.innerHTML = v ? this._feedPeople('Pessoas', people, 'Ninguém com esse nome.') : '';
                const top = document.querySelector('#ps-search-form input');
                if (top && document.activeElement !== top) top.value = v;
                const mine = this.main.querySelector('#fd-search input[name="q"]');
                if (mine && document.activeElement !== mine) mine.value = v;
            } catch (err) {
                console.warn('Pesquisa falhou', err);
            } finally {
                if (seq === this._liveSearchSeq) this.main.querySelector('#fd-posts')?.classList.remove('is-searching');
            }
        };
        if (now) run(); else this._liveSearchTimer = setTimeout(run, 220);
    }

    _feedMeCard(me, stats) {
        if (!me) {
            return `<div class="fd-card fd-me fd-me-guest">
                <div class="fd-me-cover"></div>
                <div class="fd-me-body">
                    <h3 class="fd-me-title">Junta-te à comunidade</h3>
                    <p class="fd-muted">Publica quadros, segue pessoas e guarda o que gostas.</p>
                    <button type="button" class="fd-btn fd-btn-red" data-act="login">Entrar com Google</button>
                </div>
            </div>`;
        }
        const cover = psSafeImageUrl(me.cover_image);
        const st = stats || { boards: 0, followers: 0, following: 0 };
        const base = '#profile/' + encodeURIComponent(me.username || '');
        return `<div class="fd-card fd-me">
            <div class="fd-me-cover" ${cover ? `style="background-image:url('${cover}')"` : ''}></div>
            <a href="${base}" class="fd-me-avatar"><img src="${avatarSrc(me)}" alt=""></a>
            <div class="fd-me-body">
                <a href="${base}" class="fd-me-name ps-uname">${unameHTML(me.display_name || me.username || '')}</a>
                <span class="fd-me-handle ps-uname">@${unameHTML(me.username || '')}</span>
                <div class="fd-me-stats">
                    <a href="${base}"><b>${_fmtCount(st.boards)}</b><span>Quadros</span></a>
                    <a href="${base}/followers"><b>${_fmtCount(st.followers)}</b><span>Seguidores</span></a>
                    <a href="${base}/following"><b>${_fmtCount(st.following)}</b><span>A seguir</span></a>
                </div>
                <a href="${base}" class="fd-btn fd-btn-red">O meu perfil</a>
            </div>
        </div>`;
    }

    _feedShortcuts(me) {
        const item = (href, icon, label, act = '') => `<a href="${href}" class="fd-short" ${act ? `data-act="${act}"` : ''}><span class="fd-short-ic">${ghIcon(icon, 16)}</span><span>${label}</span></a>`;
        return `<div class="fd-card fd-shortcuts">
            <div class="fd-card-head"><h4>Atalhos</h4></div>
            ${item('#', 'plus', 'Novo quadro', 'new-board')}
            ${me ? item('#profile/' + encodeURIComponent(me.username || ''), 'board', 'Os meus quadros') : item('#', 'user', 'Entrar', 'login')}
            ${item('#notifications', 'bell', 'Notificações')}
            ${item('#', 'home', 'Página inicial')}
            <p class="fd-legal"><a href="privacidade.html">Privacidade</a> · <a href="termos.html">Termos</a></p>
        </div>`;
    }

    _feedComposer(me, q) {
        return `<div class="fd-card fd-composer">
            <form class="fd-compose-row" id="fd-search" role="search">
                <img class="fd-avatar" src="${me ? avatarSrc(me) : identicon('pinspace')}" alt="">
                <label class="fd-compose-input">
                    ${ghIcon('search', 16)}
                    <input type="search" name="q" value="${escapeHTML(q)}" placeholder="Procurar quadros, #tags e pessoas…" aria-label="Procurar">
                </label>
            </form>
            <div class="fd-compose-actions">
                <button type="button" class="fd-chip" data-act="new-board">${ghIcon('image', 16)}<span>Novo quadro</span></button>
                <a class="fd-chip" href="${me ? '#profile/' + encodeURIComponent(me.username || '') : '#profile'}">${ghIcon('board', 16)}<span>Rascunhos</span></a>
                <a class="fd-chip" href="#notifications">${ghIcon('heart', 16)}<span>Atividade</span></a>
                ${q ? `<a class="fd-chip fd-chip-end" href="#explore">✕ <span>Limpar pesquisa</span></a>` : `<span class="fd-chip fd-chip-end fd-chip-static">${ghIcon('globe', 15)}<span>Público</span></span>`}
            </div>
        </div>`;
    }

    _feedPosts(q) {
        let items = (this._exploreItems || []).slice();
        if (this._exploreSort === 'popular') {
            const score = (b) => {
                const c = this.state.counts[b.id] || { likes: b.likes_count || 0, retweets: b.retweets_count || 0 };
                return (c.likes || 0) + 2 * (c.retweets || 0);
            };
            items.sort((a, b) => score(b) - score(a));
        }
        if (!items.length) {
            return `<div class="fd-card fd-empty">${q ? 'Nenhum quadro encontrado.' : 'Ainda não há quadros públicos. Sê o primeiro!'}</div>`;
        }
        setTimeout(() => this._fillCommentCounts(items), 0);
        return items.map(b => this.feedPost(b)).join('');
    }

    /* ---------------- Comentários ---------------- */
    async _fillCommentCounts(items) {
        const ids = items.filter(b => !b.legacy).map(b => b.id);
        if (!ids.length) return;
        const counts = await getCommentCounts(ids);
        this.state.commentCounts = Object.assign(this.state.commentCounts || {}, counts);
        Object.entries(counts).forEach(([id, n]) => {
            document.querySelectorAll(`[data-comment-count="${CSS.escape(id)}"]`).forEach(el => { el.textContent = n ? _fmtCount(n) : ''; });
        });
    }

    async toggleComments(boardId) {
        const box = this.main.querySelector(`[data-comments-for="${CSS.escape(boardId)}"]`);
        if (!box) return;
        const btn = this.main.querySelector(`.comment-btn[data-board-id="${CSS.escape(boardId)}"]`);
        if (!box.hidden) { box.hidden = true; btn?.setAttribute('aria-expanded', 'false'); return; }
        box.hidden = false;
        btn?.setAttribute('aria-expanded', 'true');
        box.innerHTML = '<p class="fd-c-empty">A carregar comentários…</p>';
        try {
            const list = await getComments(boardId);
            this._renderComments(box, boardId, list);
            if (this.user) box.querySelector('textarea')?.focus();
        } catch (err) {
            box.innerHTML = `<p class="fd-c-empty">${escapeHTML(_socialErrMsg(err))}</p>`;
        }
    }

    _commentHTML(c, boardOwnerId) {
        const a = c.author || { username: '?' };
        const mine = !!(this.user && this.user.id === c.user_id);
        const canDel = mine || !!(this.user && this.user.id === boardOwnerId);
        const href = '#profile/' + encodeURIComponent(a.username || '');
        return `<li class="fd-c" data-comment-id="${escapeHTML(String(c.id))}">
            <a href="${href}" class="fd-c-avatar"><img src="${avatarSrc(a)}" alt=""></a>
            <div class="fd-c-main">
                <div class="fd-c-head">
                    <a href="${href}" class="fd-c-name ps-uname">${unameHTML(a.display_name || a.username || '?')}</a>
                    <span class="fd-c-time">${timeAgo(c.created_at)}</span>
                    <span class="fd-c-tools">
                        ${canDel ? `<button type="button" data-act="comment-del" data-comment-id="${escapeHTML(String(c.id))}" title="Apagar comentário" aria-label="Apagar comentário">${ghIcon('trash', 13)}</button>` : ''}
                        ${!mine && this.user ? `<button type="button" data-act="comment-report" data-comment-id="${escapeHTML(String(c.id))}" title="Denunciar comentário" aria-label="Denunciar comentário">${ghIcon('flag', 13)}</button>` : ''}
                    </span>
                </div>
                <p class="fd-c-body">${escapeHTML(c.body)}</p>
            </div>
        </li>`;
    }

    _renderComments(box, boardId, list) {
        const board = (this._exploreItems || []).find(b => b.id === boardId) || {};
        box._ownerId = board.author_id;
        const form = this.user
            ? `<form class="fd-c-form" data-comment-form="${escapeHTML(boardId)}">
                   <img class="fd-c-me" src="${avatarSrc(this.user)}" alt="">
                   <textarea name="body" rows="2" maxlength="500" placeholder="Escreve um comentário…" aria-label="Escreve um comentário"></textarea>
                   <button type="submit" class="fd-c-send" aria-label="Enviar comentário">${ghIcon('send', 16)}</button>
               </form>`
            : `<button type="button" class="fd-c-login" data-act="login">Entra para comentar</button>`;
        box.innerHTML = `
            <ul class="fd-c-list">${list.length ? list.map(c => this._commentHTML(c, box._ownerId)).join('') : ''}</ul>
            ${list.length ? '' : '<p class="fd-c-empty">Ainda não há comentários. Sê o primeiro!</p>'}
            ${form}`;
    }

    _setCommentCount(boardId, delta) {
        const counts = this.state.commentCounts || (this.state.commentCounts = {});
        counts[boardId] = Math.max(0, (counts[boardId] || 0) + delta);
        document.querySelectorAll(`[data-comment-count="${CSS.escape(boardId)}"]`).forEach(el => { el.textContent = counts[boardId] ? _fmtCount(counts[boardId]) : ''; });
    }

    async _submitComment(form) {
        const boardId = form.dataset.commentForm;
        const ta = form.querySelector('textarea');
        const btn = form.querySelector('button[type="submit"]');
        const text = ta.value;
        if (!text.trim() || btn.disabled) return;
        btn.disabled = true;
        try {
            const c = await addComment(boardId, text);
            const box = form.closest('.fd-comments');
            box.querySelector('.fd-c-empty')?.remove();
            box.querySelector('.fd-c-list').insertAdjacentHTML('beforeend', this._commentHTML(c, box._ownerId));
            ta.value = '';
            ta.style.height = '';
            this._setCommentCount(boardId, +1);
        } catch (err) {
            this.app.ui.showToast(_socialErrMsg(err));
        } finally {
            btn.disabled = false;
            ta.focus();
        }
    }

    async _deleteComment(id, el) {
        const li = el.closest('.fd-c');
        const box = el.closest('.fd-comments');
        if (!li || !box || !confirm('Apagar este comentário?')) return;
        try {
            await deleteComment(id);
            li.remove();
            this._setCommentCount(box.dataset.commentsFor, -1);
            if (!box.querySelector('.fd-c')) box.querySelector('.fd-c-list').insertAdjacentHTML('afterend', '<p class="fd-c-empty">Ainda não há comentários. Sê o primeiro!</p>');
        } catch (err) {
            this.app.ui.showToast(_socialErrMsg(err));
        }
    }

    feedPost(b) {
        const id = escapeHTML(b.id);
        const author = b.author || { username: '?' };
        const isMine = !!(this.user && this.user.id === b.author_id);
        const thumb = safeImgSrc(b.image_full || b.image_url) || safeImgSrc(b.image_url);
        const openAct = b.legacy ? 'open-legacy' : 'open';
        const when = b.updated_at || b.created_at;
        const profileHref = '#profile/' + encodeURIComponent(author.username || '');

        const repostHead = b.repost && b.repost.by ? `
            <div class="fd-repost">${ghIcon('repeat', 13)}
                <a href="#profile/${encodeURIComponent(b.repost.by.username)}" class="ps-uname">@${unameHTML(b.repost.by.username)}</a><span>repostou</span>
            </div>` : '';

        const who = b.legacy
            ? `<span class="fd-post-avatar"><img src="${identicon(author.username || 'anon')}" alt=""></span>
               <div class="fd-post-who"><span class="fd-post-name ps-uname">${unameHTML(author.username || 'Anónimo')}</span><span class="fd-post-sub"><span>Galeria pública</span> · ${timeAgo(when)}</span></div>`
            : `<a href="${profileHref}" class="fd-post-avatar"><img src="${avatarSrc(author)}" alt=""></a>
               <div class="fd-post-who">
                   <a href="${profileHref}" class="fd-post-name ps-uname">${unameHTML(author.display_name || author.username || '?')}</a>
                   <span class="fd-post-sub"><span class="ps-uname">@${unameHTML(author.username || '?')}</span> · ${timeAgo(when)}</span>
               </div>`;

        const headSide = b.legacy ? '' : isMine
            ? `<button type="button" class="fd-icon-btn fd-danger" data-act="delete-board" data-board-id="${id}" title="Apagar da conta" aria-label="Apagar da conta">${ghIcon('trash', 16)}</button>`
            : (author.id ? this.followButton(author.id, 'fd-follow') : '');

        let actions;
        if (b.legacy) {
            actions = `<button type="button" class="fd-act" data-act="open-legacy" data-board-id="${id}">${ghIcon('open', 17)}<span>Abrir e editar</span></button>`;
        } else if (isMine && !b.is_public) {
            // Quadro privado: mesmo cartão, sem likes/reposts/comentários.
            actions = `<span class="fd-badge">${ghIcon('lock', 13)}<span>Privado</span></span>
                <span class="fd-act-spacer"></span>
                <button type="button" class="fd-act" data-act="open" data-board-id="${id}" title="Abrir quadro">${ghIcon('send', 17)}<span>Abrir</span></button>`;
        } else {
            const liked = this.state.likeState[b.id] === 'liked';
            const rted = this.state.retweetState[b.id] === 'retweeted';
            const counts = this.state.counts[b.id] || { likes: b.likes_count || 0, retweets: b.retweets_count || 0 };
            actions = `
                <button type="button" class="fd-act like-btn ${liked ? 'is-on' : ''}" data-act="like" data-board-id="${id}" aria-pressed="${liked}" title="${liked ? 'Remover like' : 'Gostar'}">
                    ${ghIcon('heart', 18)}<span class="repo-stat-count" data-like-count="${id}">${_fmtCount(counts.likes)}</span>
                </button>
                <button type="button" class="fd-act retweet-btn ${rted ? 'is-on' : ''}" data-act="repost" data-board-id="${id}" aria-pressed="${rted}" title="${rted ? 'Desfazer repost' : 'Repostar'}">
                    ${ghIcon('repeat', 18)}<span class="repo-stat-count" data-retweet-count="${id}">${_fmtCount(counts.retweets)}</span>
                </button>
                <button type="button" class="fd-act comment-btn" data-act="comments" data-board-id="${id}" aria-expanded="false" title="Comentários">
                    ${ghIcon('chat', 18)}<span class="repo-stat-count" data-comment-count="${id}">${this.state.commentCounts && this.state.commentCounts[b.id] ? _fmtCount(this.state.commentCounts[b.id]) : ''}</span>
                </button>
                <span class="fd-act-spacer"></span>
                ${isMine ? '' : `<button type="button" class="fd-act fd-act-report" data-act="report-board" data-board-id="${id}" title="Denunciar" aria-label="Denunciar">${ghIcon('flag', 16)}</button>`}
                <button type="button" class="fd-act" data-act="open" data-board-id="${id}" title="Abrir quadro">${ghIcon('send', 17)}<span>Abrir</span></button>`;
        }

        return `<article class="fd-card fd-post" data-board-card="${id}">
            ${repostHead}
            <header class="fd-post-head">${who}<span class="fd-post-side">${headSide}</span></header>
            <div class="fd-post-text">
                <a href="#" class="fd-post-title" data-act="${openAct}" data-board-id="${id}">${escapeHTML(b.title)}</a>
                ${b.description ? `<p>${_richText(b.description)}</p>` : ''}
                ${b.repost && b.repost.comment ? `<blockquote class="fd-quote">“${escapeHTML(b.repost.comment)}”</blockquote>` : ''}
            </div>
            <a href="#" class="fd-post-media" data-act="${openAct}" data-board-id="${id}" aria-label="Abrir ${escapeHTML(b.title)}">
                ${thumb ? `<img src="${thumb}" alt="" loading="lazy" decoding="async">` : '<span class="fd-media-empty">📌</span>'}
            </a>
            <footer class="fd-post-actions">${actions}</footer>
            ${b.legacy || (isMine && !b.is_public) ? '' : `<div class="fd-comments" data-comments-for="${id}" hidden></div>`}
        </article>`;
    }

    // Rascunho guardado neste navegador, no mesmo cartão pequeno dos quadros.
    draftPost(p) {
        const id = escapeHTML(String(p.id));
        const me = this.user || { username: 'tu' };
        const thumb = safeImgSrc(p.thumbnail);
        const title = escapeHTML(p.titulo || 'Sem título');
        return `<article class="fd-card fd-post is-draft" data-draft-id="${id}">
            <header class="fd-post-head">
                <span class="fd-post-avatar"><img src="${avatarSrc(me)}" alt=""></span>
                <div class="fd-post-who">
                    <span class="fd-post-name ps-uname">${unameHTML(me.display_name || me.username || 'tu')}</span>
                    <span class="fd-post-sub"><span>Rascunho</span> · ${timeAgo(p.ultimaEdicao || p.dataCriacao)}</span>
                </div>
                <span class="fd-post-side"><button type="button" class="fd-icon-btn fd-danger" data-act="draft-delete" data-draft-id="${id}" title="Apagar deste dispositivo" aria-label="Apagar deste dispositivo">${ghIcon('trash', 16)}</button></span>
            </header>
            <div class="fd-post-text"><a href="#" class="fd-post-title" data-act="draft-open" data-draft-id="${id}">${title}</a></div>
            <a href="#" class="fd-post-media" data-act="draft-open" data-draft-id="${id}" aria-label="Abrir ${title}">
                ${thumb ? `<img src="${escapeHTML(thumb)}" alt="" loading="lazy" decoding="async">` : '<span class="fd-media-empty">📌</span>'}
            </a>
            <footer class="fd-post-actions">
                <span class="fd-badge">${ghIcon('board', 13)}<span>Neste dispositivo</span></span>
                <span class="fd-act-spacer"></span>
                ${this.user ? `<button type="button" class="fd-act" data-act="draft-publish" data-draft-id="${id}" title="Publicar">${ghIcon('globe', 16)}</button>` : ''}
                <button type="button" class="fd-act" data-act="draft-open" data-draft-id="${id}" title="Abrir">${ghIcon('send', 17)}<span>Abrir</span></button>
            </footer>
        </article>`;
    }

    _feedActivity(items) {
        const row = (n) => {
            const who = `<a href="#profile/${encodeURIComponent(n.user.username)}" class="fd-strong ps-uname">${unameHTML(n.user.display_name || n.user.username)}</a>`;
            const text = n.type === 'like' ? 'gostou do teu quadro' : n.type === 'repost' ? 'repostou o teu quadro' : n.type === 'comment' ? 'comentou o teu quadro' : 'começou a seguir-te';
            const thumb = n.board && safeImgSrc(n.board.image_url);
            const side = n.type === 'follow'
                ? this.followButton(n.user.id, 'fd-follow fd-follow-sm')
                : (thumb ? `<a href="#" class="fd-act-thumb" data-act="open" data-board-id="${escapeHTML(n.board.id)}"><img src="${thumb}" alt=""></a>` : '');
            return `<li class="fd-row">
                <a href="#profile/${encodeURIComponent(n.user.username)}" class="fd-row-avatar"><img src="${avatarSrc(n.user)}" alt=""></a>
                <div class="fd-row-body"><p>${who} <span>${text}</span></p><time>${timeAgo(n.created_at)}</time></div>
                ${side}
            </li>`;
        };
        return `<div class="fd-card fd-activity">
            <div class="fd-card-head"><h4>Atividade</h4><a href="#notifications">Ver tudo</a></div>
            ${items.length ? `<ul class="fd-rows">${items.slice(0, 5).map(row).join('')}</ul>` : '<p class="fd-muted">Ainda sem atividade. Publica um quadro para começar.</p>'}
        </div>`;
    }

    _feedJoin() {
        return `<div class="fd-card fd-activity">
            <div class="fd-card-head"><h4>Atividade</h4></div>
            <p class="fd-muted">Entra para veres quem gostou, repostou ou te seguiu.</p>
            <button type="button" class="fd-btn" data-act="login">Entrar</button>
        </div>`;
    }

    _feedPeople(title, people, emptyText = '') {
        if (!people.length && !emptyText) return '';
        return `<div class="fd-card fd-people">
            <div class="fd-card-head"><h4>${escapeHTML(title)}</h4></div>
            ${people.length ? `<ul class="fd-rows">${people.map(p => `
                <li class="fd-row">
                    <a href="#profile/${encodeURIComponent(p.username)}" class="fd-row-avatar"><img src="${avatarSrc(p)}" alt=""></a>
                    <div class="fd-row-body">
                        <a href="#profile/${encodeURIComponent(p.username)}" class="fd-strong ps-uname">${unameHTML(p.display_name || p.username)}</a>
                        <span class="fd-row-sub ps-uname">@${unameHTML(p.username)}</span>
                    </div>
                    ${this.followButton(p.id, 'fd-follow fd-follow-sm')}
                </li>`).join('')}</ul>` : `<p class="fd-muted">${escapeHTML(emptyText)}</p>`}
        </div>`;
    }

    /* ---------------- Perfil ---------------- */

    async _renderProfile(token, username, tab) {
        if (!username) {
            if (!this.user) {
                // Sem conta: em vez de uma página, mostra Explorar com um pop-up pequeno.
                history.replaceState(history.state, '', window.location.pathname + window.location.search + '#explore');
                this._setActiveNav('explore');
                await this._renderExplore(token, '');
                if (token === this._renderToken) this.openAccountPopup(this.root?.querySelector('.ps-link[data-route="profile"]'));
                return;
            }
            username = this.user.username;
        }

        const meName = this.user && this.user.username;
        const lookingAtMe = !!(meName && String(username).toLowerCase() === String(meName).toLowerCase());
        let profile = null;
        try {
            profile = await getProfileByUsername(username);
        } catch (err) {
            // Sem acesso aos perfis (base de dados por configurar ou sem rede):
            // o meu perfil continua a abrir com os rascunhos deste navegador.
            if (!lookingAtMe) throw err;
            console.warn('Perfil remoto indisponível:', err);
        }
        if (token !== this._renderToken) return;
        if (!profile && lookingAtMe) {
            profile = { id: this.user.id, username: meName, bio: this.user.bio || '', image: this.user.image || null, created_at: new Date().toISOString(), _offline: true };
        }
        if (!profile) {
            this.main.innerHTML = `<div class="ps-blank ps-blank-hero"><h3><em>Ninguém por aqui</em></h3><p>Não existe nenhum perfil @${unameHTML(username)}.</p><a class="ps-btn" href="#explore">Explorar</a></div>`;
            return;
        }

        const isMe = !!(this.user && this.user.id === profile.id);
        const [stats, following] = await Promise.all([
            profile._offline ? Promise.resolve({ boards: 0, followers: 0, following: 0 }) : getProfileStats(profile.id, profile).catch(() => ({ boards: 0, followers: 0, following: 0 })),
            this.user && !isMe ? isFollowing(this.user.id, profile.id).catch(() => false) : Promise.resolve(false)
        ]);
        if (!isMe) this.state.followState[profile.id] = following ? 'following' : 'none';

        // Quadros do perfil: servem o separador "Quadros", o destaque e o widget de data.
        const boardsRes = profile._offline ? { data: [], error: null } : await getUserBoards(profile.id).catch(err => ({ data: [], error: err }));
        const allBoards = boardsRes.data || [];

        let content = '';
        let localOnly = null;
        let sectionTitle = '';
        if (tab === 'followers' || tab === 'following') {
            const res = tab === 'followers' ? await getFollowers(profile.id) : await getFollowing(profile.id);
            if (res.error) throw res.error;
            if (this.user) {
                const ids = await getFollowingIds(this.user.id);
                res.data.forEach(p => { this.state.followState[p.id] = ids.includes(p.id) ? 'following' : 'none'; });
            }
            sectionTitle = tab === 'followers' ? 'Seguidores' : 'A seguir';
            content = res.data.length
                ? `<div class="ps-people">${res.data.map(p => this.personRow(p)).join('')}</div>`
                : `<p class="ps-empty-simple">${tab === 'followers' ? 'Ainda não tem nenhum seguidor.' : 'Ainda não segue ninguém.'}</p>`;
        } else if (tab === 'reposts') {
            const reposts = await getUserReposts(profile.id);
            await this._loadInteractions(reposts);
            content = this._grid(reposts, isMe ? 'Ainda não repostaste nenhum quadro.' : 'Ainda não tem nenhum repost.');
        } else {
            const res = boardsRes;
            if (res.error && !isMe) throw res.error;
            if (isMe) this.state.userBoards = allBoards;
            await this._loadInteractions(allBoards).catch(() => {});
            if (isMe) {
                // Rascunhos: quadros guardados neste navegador (o "Continuar a
                // editar" do início) que ainda não estão na conta — aparecem primeiro.
                const cloudIds = new Set(allBoards.map(b => b.id));
                localOnly = getAllProjects()
                    .filter(p => !p.remoteId || !cloudIds.has(p.remoteId))
                    .sort((a, b) => String(b.ultimaEdicao || '').localeCompare(String(a.ultimaEdicao || '')));
                const pub = allBoards.filter(b => b.is_public), priv = allBoards.filter(b => !b.is_public);
                const cloudPart = allBoards.length
                    ? (pub.length ? this._sectionHead('Publicados', `${pub.length} ${pub.length === 1 ? 'quadro público' : 'quadros públicos'}`) + this._grid(pub) : '')
                      + (priv.length ? this._sectionHead('Guardados na conta', `${priv.length} privado${priv.length === 1 ? '' : 's'} · só tu vês`, 'sky') + this._grid(priv) : '')
                    : (localOnly.length ? '' : '<p class="ps-empty-simple">Ainda não tens nenhum quadro. Cria um em “Novo quadro”.</p>');
                content = this._localSection(localOnly) + cloudPart;
            } else {
                content = this._grid(allBoards, 'Ainda não tem nenhum quadro.');
            }
        }
        if (token !== this._renderToken) return;

        this.main.classList.add('is-profile');
        this.main.innerHTML = `
            <section class="pf">
                ${this._profileHero(profile, stats, isMe, tab, allBoards)}
                <div class="pf-content" id="pf-content">
                    ${sectionTitle ? this._sectionHead(sectionTitle, '', 'sky') : ''}
                    ${content}
                </div>
            </section>`;
        if (localOnly) this._fillLocal(localOnly);
        this._bindProfileHero(profile);
        this.app.music?._syncMini?.();
    }

    _profileHero(profile, stats, isMe, tab, boards) {
        const base = '#profile/' + encodeURIComponent(profile.username);
        const name = profile.display_name || profile.username;
        const cover = safeImgSrc(profile.cover_image);
        const visible = isMe ? boards : boards.filter(b => b.is_public);
        const byDate = visible.slice().sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
        const latest = byDate[0] || null;
        const featured = visible.slice().sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))[0] || latest;

        const loc = psLoc();
        const d = new Date((latest && (latest.updated_at || latest.created_at)) || profile.created_at || Date.now());
        const month = d.toLocaleDateString(loc, { month: 'short' }).replace('.', '').toUpperCase();
        const dateTop = latest ? String(d.getDate()).padStart(2, '0') : month;
        const dateBottom = latest ? month : String(d.getFullYear());

        const tabLink = (id, label) => `<a href="${base}${id === 'boards' ? '' : '/' + id}" class="pf-tab ${tab === id ? 'on' : ''}" ${tab === id ? 'aria-current="page"' : ''}>${label}</a>`;

        const actions = isMe
            ? `<button type="button" class="pf-btn" data-act="edit-profile">${ghIcon('edit', 14)}<span>Editar perfil</span></button>
               <button type="button" class="pf-btn pf-btn-red" data-act="new-board">${ghIcon('plus', 15)}<span>Novo quadro</span></button>`
            : this.followButton(profile.id, 'pf-btn pf-btn-red pf-follow', 'profile-follow-btn');

        const featThumb = featured && safeImgSrc(featured.image_url);
        const featCard = featured
            ? `<span class="pf-label">Destaque</span>
               <a href="#" class="pf-feat-thumb" data-act="open" data-board-id="${escapeHTML(featured.id)}" title="${escapeHTML(featured.title)}">
                   ${featThumb ? `<img src="${featThumb}" alt="">` : '<span>📌</span>'}
               </a>`
            : `<span class="pf-label">${isMe ? 'Criar' : 'Quadros'}</span>
               ${isMe
                   ? `<a href="#" class="pf-feat-thumb pf-feat-empty" data-act="new-board" title="Novo quadro">${ghIcon('plus', 26)}</a>`
                   : `<span class="pf-feat-thumb pf-feat-empty">${ghIcon('image', 26)}</span>`}`;

        const lang = typeof window.psLang === 'function' ? window.psLang() : 'pt';

        return `
        <div class="pf-frame">
            <aside class="pf-rail">
                <div class="pf-rail-group">
                    <nav class="pf-card pf-nav" aria-label="Atalhos">
                        <a href="#" class="pf-nav-ic" title="Página inicial" aria-label="Página inicial">${ghIcon('home', 18)}</a>
                        <a href="${base}/reposts" class="pf-nav-ic ${tab === 'reposts' ? 'on' : ''}" title="Reposts" aria-label="Reposts">${ghIcon('star', 18)}</a>
                        <a href="#explore" class="pf-nav-ic" title="Explorar" aria-label="Explorar">${ghIcon('explore', 18)}</a>
                        <a href="#notifications" class="pf-nav-ic" title="Notificações" aria-label="Notificações">${ghIcon('bell', 18)}</a>
                    </nav>

                    <div class="pf-card pf-me">
                        <button type="button" class="pf-me-avatar" data-pf="view-avatar" title="Ver foto">
                            <img id="profile-avatar" src="${avatarSrc(profile)}" alt="Avatar de ${escapeHTML(profile.username)}">
                        </button>
                        <span class="pf-label">Perfil</span>
                    </div>
                </div>

                <div class="pf-card pf-opts">
                    <div class="pf-opts-ic">
                        <button type="button" class="pf-round" data-pf="copy-link" title="Copiar link do perfil" aria-label="Copiar link do perfil">${ghIcon('link', 16)}</button>
                        ${isMe
                            ? `<button type="button" class="pf-round" data-pf="accent" title="Cor do meu perfil" aria-label="Cor do meu perfil">${ghIcon('palette', 16)}</button>
                               <button type="button" class="pf-round" data-act="logout" title="Sair" aria-label="Sair">${ghIcon('logout', 16)}</button>`
                            : `<a class="pf-round" href="#explore" title="Explorar" aria-label="Explorar">${ghIcon('explore', 16)}</a>
                               ${profile.id && !profile._offline ? `<button type="button" class="pf-round" data-act="report-profile" data-user-id="${escapeHTML(profile.id)}" title="Denunciar perfil" aria-label="Denunciar perfil">${ghIcon('flag', 16)}</button>` : ''}`}
                    </div>
                    <div class="pf-lang no-i18n" role="group" aria-label="Idioma">
                        <button type="button" data-pf-lang="en" class="${lang === 'en' ? 'on' : ''}">EN</button>
                        <button type="button" data-pf-lang="pt" class="${lang !== 'en' ? 'on' : ''}">PT</button>
                    </div>
                </div>
            </aside>

            <div class="pf-hero ${cover ? 'has-cover' : ''}">
                <div class="pf-cover">${cover ? `<img src="${cover}" alt="">` : ''}</div>
                <div class="pf-bigword no-i18n" aria-hidden="true">${escapeHTML(String(name).toUpperCase())}</div>

                <nav class="pf-notch" aria-label="Secções do perfil">
                    ${tabLink('boards', 'Quadros')}
                    ${tabLink('reposts', 'Reposts')}
                </nav>

                <div class="pf-info">
                    <span class="pf-kicker">${isMe ? 'O teu perfil' : 'Perfil'}</span>
                    <h1 class="pf-name ps-uname" id="profile-username">${unameHTML(name)}</h1>
                    <p class="pf-handle ps-uname">@${unameHTML(profile.username)}</p>
                    ${profile.bio
                        ? `<p class="pf-bio" id="profile-bio">${escapeHTML(profile.bio)}</p>`
                        : (isMe ? '<p class="pf-bio pf-bio-empty"><a href="#" data-act="edit-profile">Escreve uma bio →</a></p>' : '')}
                    <div class="pf-stats">
                        <a href="${base}"><b>${_fmtCount(stats.boards)}</b><span>Quadros</span></a>
                        <a href="${base}/followers"><b id="profile-followers-count">${_fmtCount(stats.followers)}</b><span>Seguidores</span></a>
                        <a href="${base}/following"><b id="profile-following-count">${_fmtCount(stats.following)}</b><span>A seguir</span></a>
                    </div>
                    <div class="pf-actions">${actions}</div>
                </div>

                <div class="pf-date">
                    <span class="pf-label">${latest ? 'Último quadro' : 'Membro desde'}</span>
                    <strong class="no-i18n">${escapeHTML(dateTop)}</strong>
                    <strong class="no-i18n">${escapeHTML(dateBottom)}</strong>
                </div>

                <div class="pf-cover-tools">
                    ${cover ? `<button type="button" class="pf-cover-btn pf-cover-view" data-pf="view-cover" title="Ver banner" aria-label="Ver banner">${ghIcon('open', 15)}</button>` : ''}
                    ${isMe ? `<button type="button" class="pf-cover-btn" data-pf="cover" title="Mudar banner">${ghIcon('image', 15)}<span>Banner</span></button>` : ''}
                </div>

                <div class="pf-cut pf-cut-left">
                    <div class="pf-card pf-feat">${featCard}</div>
                </div>

                <div class="pf-music-float">
                    <div class="pf-music" data-music-mini>
                        <button type="button" class="pf-music-pill" data-music-act="toggle"><span class="pf-when-paused">Ouvir</span><span class="pf-when-playing">Pausa</span></button>
                        <div class="pf-music-card">
                            <span class="pf-music-art" data-music-art></span>
                            <span class="pf-music-meta"><strong data-music-title>Música</strong><small data-music-artist>carrega em ▶ para ouvir</small></span>
                            <button type="button" class="pf-music-play" data-music-act="toggle" aria-label="Tocar">${PS_PLAY}${PS_PAUSE}</button>
                            <span class="pf-music-ctrl">
                                <button type="button" data-music-act="prev" aria-label="Anterior">${PS_PREV}</button>
                                <button type="button" data-music-act="next" aria-label="Seguinte">${PS_NEXT}</button>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    // Recorta a imagem do banner (entalhe dos separadores em cima e canto do
    // "Destaque" em baixo) com uma máscara SVG — os recortes ficam
    // transparentes e mostram o fundo da página, sem moldura por trás.
    _shapeHero() {
        const hero = this.main.querySelector('.pf-hero');
        if (!hero) return;
        const w = hero.clientWidth, h = hero.clientHeight;
        if (!w || !h) return;
        const hb = hero.getBoundingClientRect();
        const cs = getComputedStyle(hero);
        const r = parseFloat(cs.borderTopLeftRadius) || 36;
        const a = Math.min(r, 26);   // cantos convexos dos recortes
        const c = 28;                // cantos côncavos
        const gap = 10;
        const n = (v) => Math.round(v * 10) / 10;
        let d = `M${r} 0`;

        const notch = hero.querySelector('.pf-notch');
        const nb = notch && notch.offsetWidth ? notch.getBoundingClientRect() : null;
        if (nb) {
            const x1 = nb.left - hb.left - gap, x2 = nb.right - hb.left + gap, nh = nb.bottom - hb.top + gap;
            d += ` H${n(x1 - a)} A${a} ${a} 0 0 1 ${n(x1)} ${a} V${n(nh - c)} A${c} ${c} 0 0 0 ${n(x1 + c)} ${n(nh)}`
               + ` H${n(x2 - c)} A${c} ${c} 0 0 0 ${n(x2)} ${n(nh - c)} V${a} A${a} ${a} 0 0 1 ${n(x2 + a)} 0`;
        }
        d += ` H${w - r} A${r} ${r} 0 0 1 ${w} ${r} V${h - r} A${r} ${r} 0 0 1 ${w - r} ${h}`;

        const cut = hero.querySelector('.pf-cut-left');
        const fb = cut && cut.offsetWidth ? cut.getBoundingClientRect() : null;
        if (fb) {
            const fw = fb.right - hb.left + gap, fy = fb.top - hb.top - gap;
            d += ` H${n(fw + a)} A${a} ${a} 0 0 1 ${n(fw)} ${n(h - a)} V${n(fy + c)} A${c} ${c} 0 0 0 ${n(fw - c)} ${n(fy)}`
               + ` H${a} A${a} ${a} 0 0 1 0 ${n(fy - a)} V${r} A${r} ${r} 0 0 1 ${r} 0Z`;
        } else {
            d += ` H${r} A${r} ${r} 0 0 1 0 ${h - r} V${r} A${r} ${r} 0 0 1 ${r} 0Z`;
        }
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${d}"/></svg>`;
        hero.style.setProperty('--pf-mask', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
        hero.classList.add('is-shaped');
    }

    _scrollToProfileContent() {
        const target = this.main.querySelector('#pf-content');
        if (!target || !this.scroller) return;
        const top = target.getBoundingClientRect().top - this.scroller.getBoundingClientRect().top + this.scroller.scrollTop - 90;
        this.scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }

    /* ---------------- Cor do meu perfil (só para mim, neste navegador) ---------------- */
    _accentKey() { return this.user ? 'ps_pf_accent_' + this.user.id : null; }

    _getAccent() {
        try { const v = localStorage.getItem(this._accentKey()); return /^#[0-9a-f]{6}$/i.test(v || '') ? v : null; } catch { return null; }
    }

    _applyAccent(root, color) {
        if (!root) return;
        if (color) {
            root.style.setProperty('--pf-red', color);
            root.style.setProperty('--pf-red-hover', `color-mix(in srgb, ${color} 82%, white)`);
            root.classList.add('has-accent');
        } else {
            root.style.removeProperty('--pf-red');
            root.style.removeProperty('--pf-red-hover');
            root.classList.remove('has-accent');
        }
    }

    _toggleAccentPicker(btn) {
        const root = this.main.querySelector('.pf');
        let pop = this.main.querySelector('.pf-accent-pop');
        if (pop) { pop.remove(); return; }
        const colors = ['#C8372D', '#E60023', '#E76F51', '#E9C46A', '#6B8F71', '#2A9D8F', '#3A86FF', '#5B5BD6', '#8E7DBE', '#D16BA5', '#B08968', '#9AA0A6'];
        const cur = this._getAccent() || '#C8372D';
        pop = document.createElement('div');
        pop.className = 'pf-accent-pop';
        pop.innerHTML = `<b>Cor do meu perfil</b><p>Só tu vês esta cor.</p>
            <div class="pf-accent-grid">${colors.map(c => `<button type="button" data-c="${c}" style="--c:${c}" class="${c.toLowerCase() === cur.toLowerCase() ? 'on' : ''}" aria-label="${c}"></button>`).join('')}</div>
            <div class="pf-accent-row"><label class="pf-accent-custom"><input type="color" value="${cur}" aria-label="Outra cor"><span>Outra cor</span></label><button type="button" data-reset>Repor</button></div>`;
        btn.closest('.pf-opts')?.appendChild(pop);
        const save = (c) => {
            try { if (c) localStorage.setItem(this._accentKey(), c); else localStorage.removeItem(this._accentKey()); } catch { /* ok */ }
            this._applyAccent(root, c);
            pop.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', !!c && b.dataset.c.toLowerCase() === c.toLowerCase()));
        };
        pop.addEventListener('click', (e) => {
            e.stopPropagation();
            const sw = e.target.closest('[data-c]');
            if (sw) save(sw.dataset.c);
            if (e.target.closest('[data-reset]')) save(null);
        });
        pop.querySelector('input[type="color"]').addEventListener('input', (e) => {
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) save(e.target.value);
        });
        setTimeout(() => {
            const close = (e) => { if (!pop.contains(e.target) && !e.target.closest('[data-pf="accent"]')) { pop.remove(); document.removeEventListener('click', close, true); } };
            document.addEventListener('click', close, true);
        }, 0);
    }

    _bindProfileHero(profile) {
        const root = this.main.querySelector('.pf');
        if (!root) return;
        if (this.user && profile && this.user.id === profile.id) this._applyAccent(root, this._getAccent());
        // Quadros / Seguidores / A seguir: mostra o conteúdo descendo suavemente.
        root.querySelectorAll('.pf-stats a, .pf-nav-ic[href*="/reposts"]').forEach(a => a.addEventListener('click', (e) => {
            const href = a.getAttribute('href') || '';
            if (!href.startsWith('#')) return;
            e.preventDefault();
            if (decodeURIComponent(window.location.hash) === decodeURIComponent(href)) { this._scrollToProfileContent(); return; }
            this._scrollAfterRender = true;
            window.location.hash = href;
        }));
        this._pfRO?.disconnect();
        const hero = root.querySelector('.pf-hero');
        if (hero && typeof ResizeObserver === 'function') {
            let raf = 0;
            this._pfRO = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => this._shapeHero()); });
            [hero, hero.querySelector('.pf-notch'), hero.querySelector('.pf-cut-left')].filter(Boolean).forEach(el => this._pfRO.observe(el));
        }
        this._shapeHero();
        document.fonts?.ready?.then(() => this._shapeHero());
        root.addEventListener('click', (e) => {
            const lang = e.target.closest('[data-pf-lang]');
            if (lang) {
                e.preventDefault();
                window.psSetLang?.(lang.dataset.pfLang);
                root.querySelectorAll('[data-pf-lang]').forEach(b => b.classList.toggle('on', b === lang));
                return;
            }
            const m = e.target.closest('[data-music-act]');
            if (m) {
                e.preventDefault();
                const mu = this.app.music;
                if (!mu) return;
                const act = m.dataset.musicAct;
                if (act === 'toggle') mu.togglePlay();
                else if (act === 'next') mu.widget && mu.tracks.length ? mu.next() : mu.togglePlay();
                else if (act === 'prev') mu.widget && mu.tracks.length ? mu.prev() : mu.togglePlay();
                return;
            }
            const el = e.target.closest('[data-pf]');
            if (!el) return;
            e.preventDefault();
            const act = el.dataset.pf;
            if (act === 'scroll') {
                this._scrollToProfileContent();
            } else if (act === 'copy-link') {
                const url = window.location.origin + window.location.pathname + '#profile/' + encodeURIComponent(profile.username);
                (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
                    .then(() => this.app.ui.showToast('Link do perfil copiado.'))
                    .catch(() => window.prompt('Copia o link:', url));
            } else if (act === 'cover') {
                this.openProfileEditor(true);
            } else if (act === 'accent') {
                this._toggleAccentPicker(el);
            } else if (act === 'view-avatar') {
                const isMine = !!(this.user && this.user.id === profile.id);
                if (!safeImgSrc(profile.image)) { if (isMine) this.openProfileEditor(); return; }
                this.openLightbox(profile.image, { round: true, onEdit: isMine ? () => this.openProfileEditor() : null });
            } else if (act === 'view-cover') {
                const isMine = !!(this.user && this.user.id === profile.id);
                this.openLightbox(profile.cover_image, { onEdit: isMine ? () => this.openProfileEditor(true) : null });
            }
        });
    }

    // Secção "Neste dispositivo" (antiga "Recent boards" da landing).
    _localSection(projects) {
        if (!projects || !projects.length) return '';
        return `<section class="ps-local">
            ${this._sectionHead('Rascunhos', `${projects.length} ${projects.length === 1 ? 'quadro' : 'quadros'} · guardados neste navegador${this.user ? ' — publica-os no editor (Publicar)' : ' — entra para os publicares'}`, 'sky')}
            <div class="pf-posts" id="lista-projetos">${projects.map(p => this.draftPost(p)).join('')}</div>
        </section>`;
    }

    _fillLocal() { /* os rascunhos já vêm desenhados em _localSection */ }

    /* ---------------- Notificações ---------------- */

    async _renderNotifications(token) {
        if (!this.user) {
            this.main.innerHTML = `${this._pageHead('Atividade', 'Notificações', '<em>likes, reposts e seguidores</em> — tudo num só sítio')}
                ${this._loginBlankslate('Entra para veres a tua atividade', 'Quando alguém gostar, repostar ou te seguir, aparece aqui.')}`;
            return;
        }
        let items = [];
        try {
            items = await getNotifications(60, true);
        } catch (err) {
            console.warn('Notificações indisponíveis:', err);
            items = [];
        }
        if (token !== this._renderToken) return;

        try { localStorage.setItem('pinspace_notif_seen', new Date().toISOString()); } catch { /* ok */ }
        this._setNotifDot(false);

        const row = (n) => {
            const who = `<a href="#profile/${encodeURIComponent(n.user.username)}" class="ps-strong">@${unameHTML(n.user.username)}</a>`;
            const board = n.board ? `<a href="#" data-act="open" data-board-id="${escapeHTML(n.board.id)}" class="ps-strong ps-board-name">${escapeHTML(n.board.title || 'Sem título')}</a>` : '';
            const text = n.type === 'like'
                ? `${who} gostou de ${board}`
                : n.type === 'repost'
                    ? `${who} repostou ${board}${n.comment ? `<span class="ps-quote">“${escapeHTML(n.comment)}”</span>` : ''}`
                    : n.type === 'comment'
                        ? `${who} comentou ${board}${n.comment ? `<span class="ps-quote">“${escapeHTML(n.comment)}”</span>` : ''}`
                        : `${who} começou a seguir-te`;
            const icon = n.type === 'like' ? 'heart' : n.type === 'repost' ? 'repeat' : n.type === 'comment' ? 'chat' : 'userPlus';
            return `<li class="ps-notif ps-notif-${n.type}">
                <span class="ps-notif-icon">${ghIcon(icon, 15)}</span>
                <img class="ps-avatar-sm" src="${avatarSrc(n.user)}" alt="">
                <div class="ps-notif-body"><p>${text}</p><time datetime="${escapeHTML(n.created_at)}">${timeAgo(n.created_at)}</time></div>
                ${n.type === 'follow' ? this.followButton(n.user.id, 'ps-btn-sm') : ''}
            </li>`;
        };

        // Estado do botão "seguir de volta"
        if (items.some(n => n.type === 'follow')) {
            const ids = await getFollowingIds(this.user.id).catch(() => []);
            items.filter(n => n.type === 'follow').forEach(n => { this.state.followState[n.user.id] = ids.includes(n.user.id) ? 'following' : 'none'; });
        }

        this.main.innerHTML = `
            ${this._pageHead('Atividade', 'Notificações', '<em>quem gostou, repostou</em> ou começou a seguir-te')}
            <div class="ps-narrow">
                ${items.length
                    ? `<ul class="ps-glass ps-notif-list">${items.map(row).join('')}</ul>`
                    : '<p class="ps-empty-simple">Ainda não tens nenhuma notificação.</p>'}
            </div>`;
    }

    /* ---------------- Notificações: pop-up ---------------- */

    _bindNotifPopup() {
        // Qualquer link para #notifications (nav, sino do perfil, menu) abre o pop-up.
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href="#notifications"]');
            if (!a) return;
            e.preventDefault();
            e.stopPropagation();
            a.closest('details.ps-menu')?.removeAttribute('open');
            if (this._notifPop && !this._notifPop.hidden && this._notifAnchor === a) this.closeNotifPopup();
            else this.openNotifPopup(a);
        }, true);
        // Sem sessão: links para "o meu perfil" abrem o pop-up de conta.
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href="#profile"], a[href="#perfil"]');
            if (!a || this.user || this.app.authState !== 'loggedOut') return;
            e.preventDefault();
            e.stopPropagation();
            if (this._notifPop && !this._notifPop.hidden && this._notifAnchor === a) this.closeNotifPopup();
            else this.openAccountPopup(a);
        }, true);
        document.addEventListener('click', (e) => {
            const pop = this._notifPop;
            if (!pop || pop.hidden) return;
            if (pop.contains(e.target)) {
                // Seguir um link dentro do pop-up fecha-o.
                if (e.target.closest('a[href]:not([href="#"]), [data-act="open"], [data-act="login"], [data-act="register"]')) this.closeNotifPopup();
                return;
            }
            this.closeNotifPopup();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeNotifPopup();
        });
        window.addEventListener('resize', () => this._placeNotifPopup());
        this.scroller?.addEventListener('scroll', () => this._placeNotifPopup(), { passive: true });
    }

    _ensureNotifPopup() {
        if (this._notifPop) return this._notifPop;
        const pop = document.createElement('div');
        pop.className = 'ps-notif-pop';
        pop.setAttribute('role', 'dialog');
        pop.setAttribute('aria-label', 'Notificações');
        pop.hidden = true;
        pop.innerHTML = `<div class="ps-notif-pop-head"><strong>Notificações</strong></div><div class="ps-notif-pop-body"></div>`;
        document.body.appendChild(pop);
        this._bindDelegation(pop);
        this._notifPop = pop;
        return pop;
    }

    _placeNotifPopup() {
        const pop = this._notifPop;
        if (!pop || pop.hidden) return;
        const a = this._notifAnchor;
        const r = a && a.isConnected ? a.getBoundingClientRect() : null;
        const w = pop.offsetWidth, vw = window.innerWidth, vh = window.innerHeight, m = 12;
        let left, top;
        if (r && r.width && r.bottom > 0 && r.top < vh) {
            // Ao lado do sino se estiver na coluna da esquerda; senão por baixo.
            if (r.left < vw * 0.25 && r.right + m + w < vw) { left = r.right + m; top = r.top - 10; }
            else { left = r.left + r.width / 2 - w / 2; top = r.bottom + 10; }
        } else {
            left = vw - w - m; top = 90;
        }
        left = Math.max(m, Math.min(left, vw - w - m));
        top = Math.max(m, Math.min(top, vh - 140));
        pop.style.left = left + 'px';
        pop.style.top = top + 'px';
        pop.style.maxHeight = (vh - top - m) + 'px';
    }

    closeNotifPopup() {
        if (this._notifPop) this._notifPop.hidden = true;
        this._notifAnchor = null;
    }

    // Pop-up "ainda não tens conta" (mesmo estilo do das notificações).
    openAccountPopup(anchor) {
        const pop = this._ensureNotifPopup();
        pop.setAttribute('aria-label', 'Perfil');
        pop.querySelector('.ps-notif-pop-head strong').textContent = 'Perfil';
        pop.querySelector('.ps-notif-pop-body').innerHTML = `
            <div class="ps-acc-pop">
                <p class="ps-acc-pop-title">Ainda não tens conta</p>
                <p class="ps-acc-pop-text">Entra com o Google — se for a primeira vez, a conta é criada na hora. Assim tens um perfil com os teus quadros.</p>
                <div class="ps-acc-pop-actions">
                    <button type="button" class="ps-notif-pop-login" data-act="login">Entrar</button>
                </div>
            </div>`;
        this._notifAnchor = anchor || null;
        pop.hidden = false;
        this._placeNotifPopup();
    }

    async openNotifPopup(anchor) {
        const pop = this._ensureNotifPopup();
        pop.setAttribute('aria-label', 'Notificações');
        pop.querySelector('.ps-notif-pop-head strong').textContent = 'Notificações';
        const body = pop.querySelector('.ps-notif-pop-body');
        this._notifAnchor = anchor || null;
        pop.hidden = false;
        this._placeNotifPopup();

        if (!this.user) {
            body.innerHTML = `<p class="ps-notif-pop-empty">Entra para veres quem gostou, repostou ou te seguiu.</p>
                <button type="button" class="ps-notif-pop-login" data-act="login">Entrar</button>`;
            this._placeNotifPopup();
            return;
        }
        body.innerHTML = '<div class="ps-notif-pop-empty"><span class="ps-spinner"></span></div>';
        let items = [];
        try { items = await getNotifications(40, true); } catch (err) { console.warn('Notificações indisponíveis:', err); }
        if (pop.hidden) return;
        if (items.some(n => n.type === 'follow')) {
            const ids = await getFollowingIds(this.user.id).catch(() => []);
            items.filter(n => n.type === 'follow').forEach(n => { this.state.followState[n.user.id] = ids.includes(n.user.id) ? 'following' : 'none'; });
        }
        try { localStorage.setItem('pinspace_notif_seen', new Date().toISOString()); } catch { /* ok */ }
        this._setNotifDot(false);
        body.innerHTML = (items.length
            ? `<ul class="ps-notif-list">${items.map(n => this._notifRow(n)).join('')}</ul>`
            : '<p class="ps-notif-pop-empty">Ainda não tens nenhuma notificação.</p>')
            + '<p class="ps-notif-pop-note">As notificações são apagadas automaticamente ao fim de 60 dias.</p>';
        this._placeNotifPopup();
    }

    _notifRow(n) {
        const who = `<a href="#profile/${encodeURIComponent(n.user.username)}" class="ps-strong">@${unameHTML(n.user.username)}</a>`;
        const board = n.board ? `<a href="#" data-act="open" data-board-id="${escapeHTML(n.board.id)}" class="ps-strong ps-board-name">${escapeHTML(n.board.title || 'Sem título')}</a>` : '';
        const text = n.type === 'like'
            ? `${who} gostou de ${board}`
            : n.type === 'repost'
                ? `${who} repostou ${board}${n.comment ? `<span class="ps-quote">“${escapeHTML(n.comment)}”</span>` : ''}`
                : n.type === 'comment'
                    ? `${who} comentou ${board}${n.comment ? `<span class="ps-quote">“${escapeHTML(n.comment)}”</span>` : ''}`
                    : `${who} começou a seguir-te`;
        const icon = n.type === 'like' ? 'heart' : n.type === 'repost' ? 'repeat' : n.type === 'comment' ? 'chat' : 'userPlus';
        return `<li class="ps-notif ps-notif-${n.type}">
            <span class="ps-notif-icon">${ghIcon(icon, 12)}</span>
            <img class="ps-avatar-sm" src="${avatarSrc(n.user)}" alt="">
            <div class="ps-notif-body"><p>${text}</p><time datetime="${escapeHTML(n.created_at)}">${timeAgo(n.created_at)}</time></div>
            ${n.type === 'follow' ? this.followButton(n.user.id, 'ps-btn-sm') : ''}
        </li>`;
    }

    async refreshNotifDot() {
        if (!this.user || !authAvailable()) return this._setNotifDot(false);
        try {
            const items = await getNotifications(10);
            let seen = '';
            try { seen = localStorage.getItem('pinspace_notif_seen') || ''; } catch { /* ok */ }
            this._setNotifDot(items.some(n => String(n.created_at) > seen));
        } catch { /* silencioso */ }
    }

    _setNotifDot(on) {
        document.getElementById('ps-notif-dot')?.toggleAttribute('hidden', !on);
        this.root?.querySelector('.ps-link[data-route="notifications"] .nav-badge')?.toggleAttribute('hidden', !on);
    }

    startNotifPolling() {
        this.stopNotifPolling();
        this.refreshNotifDot();
        this._notifTimer = setInterval(() => {
            if (document.visibilityState === 'visible') this.refreshNotifDot();
        }, 90000);
    }

    stopNotifPolling() {
        if (this._notifTimer) clearInterval(this._notifTimer);
        this._notifTimer = null;
        this._setNotifDot(false);
    }

    /* ---------------- Cartões ---------------- */

    async _loadInteractions(boards) {
        (boards || []).forEach(b => {
            this.state.counts[b.id] = { likes: b.likes_count || 0, retweets: b.retweets_count || 0 };
        });
        if (!this.user || !authAvailable()) return;
        const ids = (boards || []).map(b => b.id);
        const authorIds = [...new Set((boards || []).map(b => b.author_id).filter(id => id && id !== this.user.id))];
        const [inter, followingIds] = await Promise.all([
            getMyInteractions(ids),
            authorIds.length ? getFollowingIds(this.user.id) : Promise.resolve([])
        ]);
        ids.forEach(id => {
            this.state.likeState[id] = inter.liked.has(id) ? 'liked' : 'none';
            this.state.retweetState[id] = inter.retweeted.has(id) ? 'retweeted' : 'none';
        });
        authorIds.forEach(id => {
            this.state.followState[id] = followingIds.includes(id) ? 'following' : 'none';
        });
    }

    // Grelha em colunas (masonry) igual à da landing.
    _grid(boards, emptyText = 'Nada para mostrar.', extraClass = '') {
        if (!boards || !boards.length) {
            return `<p class="ps-empty-simple">${escapeHTML(emptyText)}</p>`;
        }
        // Perfil: quadros como posts da comunidade, em versão pequena.
        return `<div class="pf-posts ${extraClass}">${boards.map(b => this.feedPost(b)).join('')}</div>`;
    }

    boardCard(b) {
        const id = escapeHTML(b.id);
        const author = b.author || { username: '?' };
        const isMine = !!(this.user && this.user.id === b.author_id);
        const thumb = safeImgSrc(b.image_url);
        const openAct = b.legacy ? 'open-legacy' : 'open';

        const label = b.repost ? 'Repost' : b.legacy ? 'Galeria' : (b.is_public ? 'Quadro público' : 'Privado');

        const repostHead = b.repost && b.repost.by ? `
            <div class="ps-card-repost">
                ${ghIcon('repeat', 13)}
                <a href="#profile/${encodeURIComponent(b.repost.by.username)}">@${unameHTML(b.repost.by.username)}</a> repostou · ${timeAgo(b.repost.created_at)}
                ${b.repost.comment ? `<p><em>“${escapeHTML(b.repost.comment)}”</em></p>` : ''}
            </div>` : '';

        const authorHTML = b.legacy
            ? `<span class="ps-card-author">${unameHTML(author.username || 'Anónimo')}</span>`
            : `<a href="#profile/${encodeURIComponent(author.username || '')}" class="ps-card-author"><img src="${avatarSrc(author)}" alt="">@${unameHTML(author.username || '?')}</a>`;

        let actions;
        if (b.legacy) {
            actions = `<button type="button" class="ps-act" data-act="open-legacy" data-board-id="${id}">Abrir e editar</button>`;
        } else {
            const liked = this.state.likeState[b.id] === 'liked';
            const rted = this.state.retweetState[b.id] === 'retweeted';
            const counts = this.state.counts[b.id] || { likes: b.likes_count || 0, retweets: b.retweets_count || 0 };
            const extra = isMine
                ? `<button type="button" class="ps-act ps-act-icon ps-act-danger" data-act="delete-board" data-board-id="${id}" title="Apagar da conta" aria-label="Apagar da conta">${ghIcon('trash', 13)}</button>`
                : (author.id ? this.followButton(author.id, 'ps-act follow-btn') + `<button type="button" class="ps-act ps-act-icon" data-act="report-board" data-board-id="${id}" title="Denunciar" aria-label="Denunciar">${ghIcon('flag', 13)}</button>` : '');
            actions = `
                <button type="button" class="ps-act like-btn ${liked ? 'is-on' : ''}" data-act="like" data-board-id="${id}" aria-pressed="${liked}" title="${liked ? 'Remover like' : 'Gostar'}">
                    ${ghIcon('heart', 13)}<span class="repo-stat-count" data-like-count="${id}">${_fmtCount(counts.likes)}</span>
                </button>
                <button type="button" class="ps-act retweet-btn ${rted ? 'is-on' : ''}" data-act="repost" data-board-id="${id}" aria-pressed="${rted}" title="${rted ? 'Desfazer repost' : 'Repostar'}">
                    ${ghIcon('repeat', 13)}<span class="repo-stat-count" data-retweet-count="${id}">${_fmtCount(counts.retweets)}</span>
                </button>
                <span class="ps-act-spacer"></span>
                ${extra}`;
        }

        return `
        <article class="project-card ps-card ${b.legacy ? 'is-legacy' : ''}" data-board-card="${id}" data-act="${openAct}" data-board-id="${id}">
            ${repostHead}
            <div class="project-card-thumb">
                ${thumb ? `<img src="${thumb}" alt="" loading="lazy" decoding="async">` : '<span class="placeholder">📌</span>'}
            </div>
            <div class="project-card-info">
                <span class="ps-card-label">${label}</span>
                <h3><a href="#" class="repo-title" data-act="${openAct}" data-board-id="${id}">${escapeHTML(b.title)}</a></h3>
                ${b.description ? `<p class="ps-card-desc">${escapeHTML(b.description)}</p>` : ''}
                <div class="ps-card-meta">${authorHTML}<time>${timeAgo(b.updated_at || b.created_at)}</time></div>
            </div>
            <div class="project-card-actions ps-card-actions">${actions}</div>
        </article>`;
    }

    followButton(userId, extraClass = '', domId = '') {
        if (!userId || (this.user && this.user.id === userId)) return '';
        const on = this.state.followState[userId] === 'following';
        return `<button type="button" ${domId ? `id="${domId}"` : ''} class="ps-follow ${extraClass} ${on ? 'is-following' : ''}" data-act="follow" data-user-id="${escapeHTML(userId)}" data-follow-user="${escapeHTML(userId)}" aria-pressed="${on}">
            <span>${on ? 'A seguir' : 'Seguir'}</span>
        </button>`;
    }

    personRow(p) {
        return `<div class="ps-person">
            <a href="#profile/${encodeURIComponent(p.username)}" class="ps-person-avatar"><img src="${avatarSrc(p)}" alt=""></a>
            <div class="ps-person-body">
                <a href="#profile/${encodeURIComponent(p.username)}" class="ps-person-name">@${unameHTML(p.username)}</a>
                ${p.bio ? `<p>${escapeHTML(p.bio)}</p>` : ''}
            </div>
            ${this.followButton(p.id, 'ps-btn-sm')}
        </div>`;
    }

    /* ---------------- Ações ---------------- */

    _needLogin() {
        if (this.user) return false;
        this.openAuth('login', 'Entra para interagir com os quadros.');
        return true;
    }

    _paintLike(boardId) {
        const on = this.state.likeState[boardId] === 'liked';
        const c = this.state.counts[boardId] || { likes: 0 };
        document.querySelectorAll(`.like-btn[data-board-id="${CSS.escape(boardId)}"]`).forEach(btn => {
            btn.classList.toggle('is-on', on);
            btn.setAttribute('aria-pressed', String(on));
            btn.title = on ? 'Remover like' : 'Gostar';
            const cnt = btn.querySelector('[data-like-count]');
            if (cnt) cnt.textContent = _fmtCount(c.likes);
            if (on) {
                btn.classList.remove('pop');
                void btn.offsetWidth;
                btn.classList.add('pop');
            }
        });
    }

    _paintRepost(boardId) {
        const on = this.state.retweetState[boardId] === 'retweeted';
        const c = this.state.counts[boardId] || { retweets: 0 };
        document.querySelectorAll(`.retweet-btn[data-board-id="${CSS.escape(boardId)}"]`).forEach(btn => {
            btn.classList.toggle('is-on', on);
            btn.setAttribute('aria-pressed', String(on));
            btn.title = on ? 'Desfazer repost' : 'Repostar';
            const cnt = btn.querySelector('[data-retweet-count]');
            if (cnt) cnt.textContent = _fmtCount(c.retweets);
        });
    }

    async toggleLike(boardId) {
        if (this._needLogin() || !boardId) return;
        const key = 'like:' + boardId;
        if (this._busy.has(key)) return;
        this._busy.add(key);

        const counts = this.state.counts[boardId] || (this.state.counts[boardId] = { likes: 0, retweets: 0 });
        const was = this.state.likeState[boardId] === 'liked';
        // Otimista: muda já, corrige se o servidor disser outra coisa.
        this.state.likeState[boardId] = was ? 'none' : 'liked';
        counts.likes = Math.max(0, counts.likes + (was ? -1 : 1));
        this._paintLike(boardId);

        try {
            const result = await likeBoard(boardId);
            if (result.error) throw new Error(result.error);
            const nowLiked = !!result.liked;
            if (nowLiked !== !was) {
                // Estava desatualizado (ex.: like noutro separador) — sincroniza.
                this.state.likeState[boardId] = nowLiked ? 'liked' : 'none';
                counts.likes = await getLikesCount(boardId);
                this._paintLike(boardId);
            }
        } catch (err) {
            this.state.likeState[boardId] = was ? 'liked' : 'none';
            counts.likes = Math.max(0, counts.likes + (was ? 1 : -1));
            this._paintLike(boardId);
            this.app.ui.showToast(_socialErrMsg(err));
        } finally {
            this._busy.delete(key);
        }
    }

    async toggleRepost(boardId) {
        if (this._needLogin() || !boardId) return;
        if (this.state.retweetState[boardId] === 'retweeted') {
            await this._doRepost(boardId, null);
            return;
        }
        this._repostTarget = boardId;
        const modal = document.getElementById('modal-repost');
        const ta = modal.querySelector('#repost-comment');
        ta.value = '';
        modal.querySelector('#repost-count').textContent = '0/280';
        modal.showModal();
        setTimeout(() => ta.focus(), 30);
    }

    async _doRepost(boardId, comment) {
        const key = 'rt:' + boardId;
        if (this._busy.has(key)) return;
        this._busy.add(key);
        const counts = this.state.counts[boardId] || (this.state.counts[boardId] = { likes: 0, retweets: 0 });
        const was = this.state.retweetState[boardId] === 'retweeted';
        this.state.retweetState[boardId] = was ? 'none' : 'retweeted';
        counts.retweets = Math.max(0, counts.retweets + (was ? -1 : 1));
        this._paintRepost(boardId);

        try {
            const result = await retweetBoard(boardId, comment);
            if (result.error) throw new Error(result.error);
            const now = !!result.retweeted;
            if (now !== !was) {
                this.state.retweetState[boardId] = now ? 'retweeted' : 'none';
                counts.retweets = await getRetweetsCount(boardId);
                this._paintRepost(boardId);
            }
            this.app.ui.showToast(now ? 'Repostado no teu perfil.' : 'Repost removido.');
        } catch (err) {
            this.state.retweetState[boardId] = was ? 'retweeted' : 'none';
            counts.retweets = Math.max(0, counts.retweets + (was ? 1 : -1));
            this._paintRepost(boardId);
            this.app.ui.showToast(_socialErrMsg(err));
        } finally {
            this._busy.delete(key);
        }
    }

    updateFollowButton(userId, following) {
        this.state.followState[userId] = following ? 'following' : 'none';
        document.querySelectorAll(`[data-follow-user="${CSS.escape(userId)}"]`).forEach(btn => {
            btn.classList.toggle('is-following', following);
            btn.setAttribute('aria-pressed', String(following));
            btn.innerHTML = `<span>${following ? 'A seguir' : 'Seguir'}</span>`;
        });
    }

    async toggleFollow(userId) {
        if (this._needLogin() || !userId || userId === this.user.id) return;
        const key = 'follow:' + userId;
        if (this._busy.has(key)) return;
        this._busy.add(key);

        const was = this.state.followState[userId] === 'following';
        this.updateFollowButton(userId, !was);
        // Se estamos no perfil desta pessoa, ajusta o contador de seguidores.
        const onProfile = this.route && this.route.name === 'profile' && document.getElementById('profile-follow-btn')?.dataset.userId === userId;
        const countEl = onProfile ? document.getElementById('profile-followers-count') : null;
        const bump = (d) => { if (countEl) countEl.textContent = String(Math.max(0, (parseInt(countEl.textContent, 10) || 0) + d)); };
        bump(was ? -1 : 1);

        try {
            const { error } = was ? await unfollowUser(this.user.id, userId) : await followUser(this.user.id, userId);
            if (error) throw error;
        } catch (err) {
            this.updateFollowButton(userId, was);
            bump(was ? 1 : -1);
            this.app.ui.showToast(_socialErrMsg(err));
        } finally {
            this._busy.delete(key);
        }
    }

    async deleteBoard(boardId) {
        if (this._needLogin()) return;
        if (!confirm('Apagar este quadro da tua conta? Likes e reposts também desaparecem. A cópia guardada neste dispositivo (se existir) mantém-se.')) return;
        try {
            await deleteCloudBoard(boardId);
            this.app.forgetRemoteId(boardId);
            document.querySelectorAll(`[data-board-card="${CSS.escape(boardId)}"]`).forEach(c => c.remove());
            this.app.ui.showToast('Quadro apagado da conta.');
        } catch (err) {
            this.app.ui.showToast(_socialErrMsg(err));
        }
    }

    /* ---------------- Modais ---------------- */

    openAuth(mode = 'login', hint = '') {
        if (!authAvailable()) {
            this.app.ui.showToast('Contas indisponíveis: o Supabase não carregou.');
            return;
        }
        const modal = document.getElementById('modal-auth');
        modal.querySelector('#auth-title').textContent = 'Entrar no PinSpace';
        const hintEl = modal.querySelector('#auth-hint');
        hintEl.textContent = hint || '';
        hintEl.hidden = !hint;
        const errEl = modal.querySelector('.auth-error');
        errEl.hidden = true;
        errEl.textContent = '';
        const btn = modal.querySelector('#btn-google-login');
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Continuar com Google';
        const terms = modal.querySelector('#auth-terms');
        if (terms) {
            let ok = false;
            try { ok = localStorage.getItem('pinspace_terms_ok') === '1'; } catch {}
            terms.checked = ok;
            btn.classList.toggle('is-locked', !ok);
            modal.querySelector('.auth-terms')?.classList.remove('need');
        }
        if (!modal.open) modal.showModal();
        setTimeout(() => btn.focus(), 30);
    }

    _bindAuthModal() {
        const modal = document.getElementById('modal-auth');
        if (!modal) return;
        const btn = modal.querySelector('#btn-google-login');
        const errEl = modal.querySelector('.auth-error');
        const label = btn.querySelector('span');
        const terms = modal.querySelector('#auth-terms');
        const termsRow = modal.querySelector('.auth-terms');
        const detail = modal.querySelector('#auth-terms-detail');
        if (detail && typeof IMAGE_RIGHTS_TERMS !== 'undefined') {
            detail.innerHTML = [
                'Para criar o perfil usamos o nome, o email e a foto da tua conta Google.',
                ...IMAGE_RIGHTS_TERMS
            ].map(t => `<li>${escapeHTML(t)}</li>`).join('');
        }
        modal.querySelector('#auth-terms-toggle')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (detail) detail.hidden = !detail.hidden;
        });
        terms?.addEventListener('change', () => {
            btn.classList.toggle('is-locked', !terms.checked);
            termsRow?.classList.remove('need');
            try {
                if (terms.checked) localStorage.setItem('pinspace_terms_ok', '1');
                else localStorage.removeItem('pinspace_terms_ok');
            } catch {}
        });

        btn.addEventListener('click', async () => {
            if (terms && !terms.checked) {
                // Sem aceitar os termos: só realça a linha, sem mensagens grandes.
                termsRow?.classList.remove('need');
                void termsRow?.offsetWidth;
                termsRow?.classList.add('need');
                return;
            }
            errEl.hidden = true;
            btn.disabled = true;
            label.textContent = 'A abrir o Google…';
            // Guarda o quadro aberto antes de sair da página.
            try {
                if (this.app.project && this.app.ui.editorView.classList.contains('active')) this.app._saveLocalNow();
            } catch {}
            try {
                const { error } = await signInWithGoogle();
                if (error) throw new Error(error.message);
                // Sem erro, o browser segue para o Google; o regresso é tratado em app.js.
            } catch (err) {
                errEl.textContent = _socialErrMsg(err);
                errEl.hidden = false;
                btn.disabled = false;
                label.textContent = 'Continuar com Google';
            }
        });
    }

    /* ---------------- Ajustar imagem (enquadrar + zoom) ---------------- */
    // Devolve um data URL JPEG do tamanho pedido, ou null se cancelar.
    _openCropper(src, { aspect = 1, round = false, outW = 512, outH = 512, title = 'Ajustar' } = {}) {
        const modal = document.getElementById('modal-crop');
        const stage = modal.querySelector('#crop-stage');
        const img = modal.querySelector('#crop-img');
        const zoom = modal.querySelector('#crop-zoom');
        modal.querySelector('#crop-title').textContent = title;
        stage.style.aspectRatio = String(aspect);
        stage.classList.toggle('is-round', !!round);
        return new Promise((resolve) => {
            let iw = 0, ih = 0, s0 = 1, z = 1, ox = 0, oy = 0, drag = null;
            const size = () => ({ w: stage.clientWidth, h: stage.clientHeight });
            const clampPos = () => {
                const { w, h } = size(), sc = s0 * z;
                ox = Math.min(0, Math.max(w - iw * sc, ox));
                oy = Math.min(0, Math.max(h - ih * sc, oy));
            };
            const paint = () => {
                clampPos();
                const sc = s0 * z;
                img.style.width = (iw * sc) + 'px';
                img.style.height = (ih * sc) + 'px';
                img.style.transform = `translate(${ox}px, ${oy}px)`;
            };
            const setZoom = (nz, cx, cy) => {
                const { w, h } = size();
                cx = cx ?? w / 2; cy = cy ?? h / 2;
                const before = s0 * z, after = s0 * nz;
                ox = cx - (cx - ox) * (after / before);
                oy = cy - (cy - oy) * (after / before);
                z = nz;
                zoom.value = String(z);
                paint();
            };
            const onDown = (e) => { drag = { x: e.clientX, y: e.clientY, ox, oy }; stage.setPointerCapture(e.pointerId); stage.classList.add('dragging'); };
            const onMove = (e) => { if (!drag) return; ox = drag.ox + e.clientX - drag.x; oy = drag.oy + e.clientY - drag.y; paint(); };
            const onUp = () => { drag = null; stage.classList.remove('dragging'); };
            const onWheel = (e) => {
                e.preventDefault();
                const r = stage.getBoundingClientRect();
                setZoom(Math.min(4, Math.max(1, z * (e.deltaY < 0 ? 1.08 : 1 / 1.08))), e.clientX - r.left, e.clientY - r.top);
            };
            const onZoom = () => setZoom(parseFloat(zoom.value) || 1);
            const finish = (val) => {
                stage.removeEventListener('pointerdown', onDown);
                stage.removeEventListener('pointermove', onMove);
                stage.removeEventListener('pointerup', onUp);
                stage.removeEventListener('pointercancel', onUp);
                stage.removeEventListener('wheel', onWheel);
                zoom.removeEventListener('input', onZoom);
                modal.removeEventListener('click', onClick);
                modal.removeEventListener('cancel', onCancel);
                if (modal.open) modal.close();
                resolve(val);
            };
            const onClick = (e) => {
                const b = e.target.closest('[data-crop]');
                if (!b) return;
                if (b.dataset.crop === 'cancel') return finish(null);
                const { w } = size(), f = outW / w, sc = s0 * z;
                const c = document.createElement('canvas');
                c.width = outW; c.height = outH;
                const ctx = c.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, outW, outH);
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, ox * f, oy * f, iw * sc * f, ih * sc * f);
                let out = null;
                try { out = c.toDataURL('image/jpeg', 0.9); } catch { /* imagem de outro site */ }
                if (!out) { this.app.ui.showToast('Não foi possível ajustar esta imagem. Escolhe outra do teu computador.'); return finish(null); }
                finish(out);
            };
            const onCancel = (e) => { e.preventDefault(); finish(null); };
            img.onload = () => {
                iw = img.naturalWidth; ih = img.naturalHeight;
                const { w, h } = size();
                s0 = Math.max(w / iw, h / ih);
                z = 1; zoom.value = '1';
                ox = (w - iw * s0) / 2; oy = (h - ih * s0) / 2;
                paint();
            };
            img.onerror = () => { this.app.ui.showToast('Não foi possível abrir a imagem.'); finish(null); };
            stage.addEventListener('pointerdown', onDown);
            stage.addEventListener('pointermove', onMove);
            stage.addEventListener('pointerup', onUp);
            stage.addEventListener('pointercancel', onUp);
            stage.addEventListener('wheel', onWheel, { passive: false });
            zoom.addEventListener('input', onZoom);
            modal.addEventListener('click', onClick);
            modal.addEventListener('cancel', onCancel);
            modal.showModal();
            img.crossOrigin = /^https:/i.test(src) ? 'anonymous' : null;
            img.src = /^https:/i.test(src) ? safeImgSrc(src) : src;
            if (img.complete && img.naturalWidth) img.onload();
        });
    }

    /* ---------------- Ver imagem em grande ---------------- */
    openLightbox(src, { round = false, onEdit = null } = {}) {
        src = safeImgSrc(src);
        if (!src) return;
        const modal = document.getElementById('modal-lightbox');
        const img = modal.querySelector('#lightbox-img');
        const edit = modal.querySelector('[data-lb="edit"]');
        img.src = src;
        img.classList.toggle('is-round', !!round);
        edit.hidden = !onEdit;
        this._lbEdit = onEdit;
        if (!modal._bound) {
            modal._bound = true;
            modal.addEventListener('click', (e) => {
                const b = e.target.closest('[data-lb]');
                if (b && b.dataset.lb === 'edit') { modal.close(); this._lbEdit && this._lbEdit(); return; }
                if (b || e.target === modal) modal.close();
            });
        }
        modal.showModal();
    }

    openReport(target) {
        if (this._needLogin()) return;
        const modal = document.getElementById('modal-report');
        if (!modal) return;
        this._reportTarget = target;
        const form = modal.querySelector('#form-report');
        form.reset();
        modal.querySelector('.auth-error').hidden = true;
        modal.querySelector('#report-title').textContent = target.profileId ? 'Denunciar perfil' : target.commentId ? 'Denunciar comentário' : 'Denunciar quadro';
        modal.showModal();
    }

    _bindReportModal() {
        const modal = document.getElementById('modal-report');
        if (!modal) return;
        const form = modal.querySelector('#form-report');
        const err = modal.querySelector('.auth-error');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const reason = (form.querySelector('input[name="reason"]:checked') || {}).value;
            if (!reason) { err.textContent = 'Escolhe um motivo.'; err.hidden = false; return; }
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            err.hidden = true;
            try {
                const res = await reportContent({ ...this._reportTarget, reason, details: modal.querySelector('#report-details').value });
                modal.close();
                this.app.ui.showToast(res && res.already ? 'Já tinhas denunciado isto. Obrigado.' : 'Denúncia enviada. Obrigado por ajudares.');
            } catch (ex) {
                err.textContent = _socialErrMsg(ex);
                err.hidden = false;
            } finally {
                btn.disabled = false;
            }
        });
    }

    _bindRepostModal() {
        const modal = document.getElementById('modal-repost');
        if (!modal) return;
        const ta = modal.querySelector('#repost-comment');
        ta.addEventListener('input', () => {
            modal.querySelector('#repost-count').textContent = ta.value.length + '/280';
        });
        modal.querySelector('#form-repost').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = this._repostTarget;
            modal.close();
            if (id) await this._doRepost(id, ta.value);
            this._repostTarget = null;
        });
    }

    openProfileEditor(focusCover = false) {
        if (this._needLogin()) return;
        const modal = document.getElementById('modal-perfil');
        const form = modal.querySelector('#form-perfil');
        const u = this.user;
        form.username.value = u.username || '';
        form.bio.value = u.bio || '';
        form.display_name.value = u.display_name || '';
        this._pendingAvatar = undefined;
        this._pendingCover = undefined;
        this._pendingCoverFile = undefined;
        modal.querySelector('#perfil-avatar-preview').src = avatarSrc(u);
        this._paintCoverPreview(safeImgSrc(u.cover_image));
        modal.querySelector('.auth-error').hidden = true;
        const danger = modal.querySelector('.perfil-danger');
        if (danger) { danger.open = false; modal.querySelector('#perfil-delete-confirm').value = ''; modal.querySelector('#perfil-delete-account').disabled = true; }
        modal.showModal();
        if (focusCover) setTimeout(() => modal.querySelector('#perfil-cover-pick')?.focus(), 30);
    }

    _paintCoverPreview(src) {
        const box = document.getElementById('perfil-cover-preview');
        if (!box) return;
        src = /^blob:/.test(String(src || '')) && src === this._coverBlobUrl ? src : psSafeImageUrl(src);
        box.style.backgroundImage = src ? `url("${src}")` : '';
        box.classList.toggle('has-img', !!src);
    }

    _bindProfileModal() {
        const modal = document.getElementById('modal-perfil');
        if (!modal) return;
        const form = modal.querySelector('#form-perfil');
        const preview = modal.querySelector('#perfil-avatar-preview');
        const file = modal.querySelector('#perfil-avatar-file');
        const err = modal.querySelector('.auth-error');

        const coverFile = modal.querySelector('#perfil-cover-file');
        const showErr = (t) => { err.textContent = t; err.hidden = false; };
        const setCoverGif = (fileObj) => {
            if (this._coverBlobUrl) URL.revokeObjectURL(this._coverBlobUrl);
            this._coverBlobUrl = fileObj ? URL.createObjectURL(fileObj) : null;
            this._pendingCoverFile = fileObj || undefined;
        };
        const cropCover = async (src) => {
            const out = await this._openCropper(src, { aspect: 3, outW: 1800, outH: 600, title: 'Ajustar banner' });
            if (!out) return;
            setCoverGif(null);
            this._pendingCover = out;
            this._paintCoverPreview(out);
        };
        modal.querySelector('#perfil-cover-pick')?.addEventListener('click', () => coverFile.click());
        modal.querySelector('#perfil-cover-remove')?.addEventListener('click', () => {
            setCoverGif(null);
            this._pendingCover = null;
            this._paintCoverPreview('');
        });
        modal.querySelector('#perfil-cover-adjust')?.addEventListener('click', async () => {
            err.hidden = true;
            if (this._pendingCoverFile) { showErr('Os GIFs ficam como estão (recortar tirava a animação).'); return; }
            const cur = this._pendingCover !== undefined ? this._pendingCover : (this.user && this.user.cover_image);
            if (!cur) { coverFile.click(); return; }
            if (/\.gif(\?|$)/i.test(cur)) { showErr('Os GIFs ficam como estão (recortar tirava a animação).'); return; }
            await cropCover(cur);
        });
        coverFile?.addEventListener('change', async () => {
            const f = coverFile.files[0];
            coverFile.value = '';
            if (!f) return;
            err.hidden = true;
            // GIF animado: vai tal como está (sem recorte, para não perder a animação).
            if (f.type === 'image/gif') {
                if (f.size > 4 * 1024 * 1024) { showErr('O GIF é grande demais (máx. 4 MB).'); return; }
                setCoverGif(f);
                this._pendingCover = undefined;
                this._paintCoverPreview(this._coverBlobUrl);
                return;
            }
            try {
                const src = await compactarFicheiroImagem(f, { maxLado: 2400, maxBytes: 1500000 });
                if (!src) throw new Error('Imagem inválida');
                await cropCover(src);
            } catch {
                showErr('Não foi possível ler essa imagem.');
            }
        });

        const cropAvatar = async (src) => {
            const out = await this._openCropper(src, { aspect: 1, round: true, outW: 512, outH: 512, title: 'Ajustar foto' });
            if (!out) return;
            this._pendingAvatar = out;
            preview.src = out;
        };
        modal.querySelector('#perfil-avatar-pick').addEventListener('click', () => file.click());
        modal.querySelector('#perfil-avatar-adjust')?.addEventListener('click', async () => {
            err.hidden = true;
            const cur = this._pendingAvatar !== undefined ? this._pendingAvatar : (this.user && this.user.image);
            if (!cur) { file.click(); return; }
            await cropAvatar(cur);
        });
        modal.querySelector('#perfil-avatar-remove').addEventListener('click', () => {
            this._pendingAvatar = null;
            preview.src = identicon(form.username.value || (this.user && this.user.username));
        });
        file.addEventListener('change', async () => {
            const f = file.files[0];
            file.value = '';
            if (!f) return;
            err.hidden = true;
            try {
                const src = await compactarFicheiroImagem(f, { maxLado: 1600, maxBytes: 900000 });
                if (!src) throw new Error('Imagem inválida');
                await cropAvatar(src);
            } catch {
                showErr('Não foi possível ler essa imagem.');
            }
        });

        const delInput = modal.querySelector('#perfil-delete-confirm');
        const delBtn = modal.querySelector('#perfil-delete-account');
        delInput?.addEventListener('input', () => {
            const name = String((this.user && this.user.username) || '');
            delBtn.disabled = !name || delInput.value.trim().toLowerCase() !== name.toLowerCase();
        });
        delBtn?.addEventListener('click', async () => {
            if (delBtn.disabled) return;
            delBtn.disabled = true;
            delBtn.textContent = 'A apagar…';
            err.hidden = true;
            try {
                await deleteMyAccount();
                modal.close();
                window.location.hash = '#';
                window.location.reload();
            } catch (ex) {
                err.textContent = _socialErrMsg(ex);
                err.hidden = false;
                delBtn.disabled = false;
                delBtn.textContent = 'Apagar a minha conta';
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            err.hidden = true;
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'A guardar…';
            try {
                const patch = { username: form.username.value, bio: form.bio.value, display_name: form.display_name.value };
                if (this._pendingAvatar !== undefined) patch.image = this._pendingAvatar;
                if (this._pendingCover !== undefined) patch.cover_image = this._pendingCover;
                if (this._pendingCoverFile) patch.cover_file = this._pendingCoverFile;
                const updated = await updateMyProfile(patch);
                const oldName = this.user.username;
                Object.assign(this.app.currentUser, { username: updated.username, bio: updated.bio, image: updated.image, cover_image: updated.cover_image, display_name: updated.display_name });
                modal.close();
                this.renderAuthAreas();
                this.app.ui.showToast('Perfil atualizado.');
                if (this.route && this.route.name === 'profile' && (!this.route.username || this.route.username.toLowerCase() === String(oldName).toLowerCase())) {
                    window.location.hash = '#profile/' + encodeURIComponent(updated.username);
                    if (updated.username === oldName) this.render({ name: 'profile', username: updated.username, tab: this.route.tab });
                }
            } catch (ex) {
                err.textContent = _socialErrMsg(ex);
                err.hidden = false;
            } finally {
                btn.disabled = false;
                btn.textContent = 'Guardar perfil';
            }
        });
    }
}
