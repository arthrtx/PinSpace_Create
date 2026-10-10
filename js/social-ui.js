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
    userCheck: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 11l2 2 4-4"/>'
};

function ghIcon(name, size = 16, extraClass = '') {
    return `<svg class="ps-icon ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GH_ICONS[name] || ''}</svg>`;
}

function safeImgSrc(src) {
    const s = String(src || '');
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml)[;,]/i.test(s)) return s;
    if (/^https:\/\//i.test(s)) return s;
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
        this._bindProfileModal();
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
            const q = form.querySelector('input').value.trim();
            window.location.hash = '#explore' + (q ? '?q=' + encodeURIComponent(q) : '');
        });

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
                this.topbarUser.innerHTML = `
                    <button type="button" class="ms-nav-link" data-act="login">Entrar</button>
                    <button type="button" class="ms-nav-cta ps-cta" data-act="register"><span>Criar conta</span>
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
                                <strong>@${escapeHTML(u.username || '')}</strong>
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
                        <span class="ed-user-name"><strong>@${escapeHTML(u.username || '')}</strong><small>O meu perfil</small></span>
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
                case 'retry': e.preventDefault(); if (this.route) this.render(this.route); break;
            }
            el.closest('details.ps-menu')?.removeAttribute('open');
        });
    }

    /* ---------------- Router ---------------- */

    async render(route) {
        this.route = route;
        const token = ++this._renderToken;
        this._setActiveNav(route.name);
        if (this.scroller) this.scroller.scrollTop = 0;

        const searchInput = document.querySelector('#ps-search-form input');
        if (searchInput && route.name !== 'explore') searchInput.value = '';

        this.main.innerHTML = '<div class="ps-loading"><span class="ps-spinner"></span><em>a carregar…</em></div>';
        await this.app.authReady;
        if (token !== this._renderToken) return;

        if (!authAvailable() && route.name !== 'explore') {
            this.main.innerHTML = this._errorBlock('O Supabase não carregou, por isso as contas estão indisponíveis. Verifica a ligação e recarrega a página.');
            return;
        }

        try {
            switch (route.name) {
                case 'explore': await this._renderExplore(token, route.q || ''); break;
                case 'notifications': await this._renderNotifications(token); break;
                case 'profile': await this._renderProfile(token, route.username, route.tab || 'boards'); break;
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
                <button type="button" class="ms-nav-cta ps-cta" data-act="register"><span>Criar conta</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
                <button type="button" class="ps-btn" data-act="login">Já tenho conta</button>
            </div>
        </div>`;
    }

    /* ---------------- Explorar ---------------- */

    async _renderExplore(token, q) {
        const [explore, people] = await Promise.all([
            getExploreAll(q, 60),
            q && authAvailable() ? searchProfiles(q, 12).catch(() => []) : Promise.resolve([])
        ]);
        const boards = explore.items;
        await this._loadInteractions(boards.filter(b => !b.legacy));
        if (token !== this._renderToken) return;

        const searchInput = document.querySelector('#ps-search-form input');
        if (searchInput) searchInput.value = q;

        const peopleHTML = q
            ? `<section class="ps-section">
                ${this._sectionHead('Pessoas', `${people.length} ${people.length === 1 ? 'resultado' : 'resultados'}`, 'sky')}
                ${people.length ? `<div class="ps-people">${people.map(p => this.personRow(p)).join('')}</div>` : '<p class="ps-empty">Ninguém com esse nome.</p>'}
               </section>`
            : '';

        this.main.innerHTML = `
            ${this._pageHead('Comunidade', 'Explorar', q ? `resultados para <em>“${escapeHTML(q)}”</em>` : '<em>quadros públicos</em> — abre um, copia, faz teu', `
                <form class="home-search ps-explore-search" id="explore-form">
                    <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <input type="search" name="q" value="${escapeHTML(q)}" placeholder="Procurar quadros e pessoas…" aria-label="Procurar">
                </form>`)}
            ${peopleHTML}
            <section class="ps-section">
                ${this._sectionHead('Quadros públicos', `${boards.length} ${boards.length === 1 ? 'quadro' : 'quadros'} · da comunidade e da galeria`)}
                ${this._grid(boards, q ? 'Nenhum quadro com esse título.' : 'Ainda não há quadros públicos. Sê o primeiro!')}
            </section>`;

        this.main.querySelector('#explore-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const v = e.currentTarget.q.value.trim();
            window.location.hash = '#explore' + (v ? '?q=' + encodeURIComponent(v) : '');
        });
    }

    /* ---------------- Perfil ---------------- */

    async _renderProfile(token, username, tab) {
        if (!username) {
            if (!this.user) {
                const local = getAllProjects();
                this.main.innerHTML = `${this._pageHead('Perfil', 'O teu perfil', '<em>um espaço só teu</em> — com todos os teus quadros')}
                    ${this._loginBlankslate('Ainda não tens perfil', 'Entra ou cria uma conta para teres um perfil com os teus quadros.')}
                    ${this._localSection(local)}`;
                this._fillLocal(local);
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
            this.main.innerHTML = `<div class="ps-blank ps-blank-hero"><h3><em>Ninguém por aqui</em></h3><p>Não existe nenhum perfil @${escapeHTML(username)}.</p><a class="ps-btn" href="#explore">Explorar</a></div>`;
            return;
        }

        const isMe = !!(this.user && this.user.id === profile.id);
        const [stats, following] = await Promise.all([
            profile._offline ? Promise.resolve({ boards: 0, followers: 0, following: 0 }) : getProfileStats(profile.id, profile).catch(() => ({ boards: 0, followers: 0, following: 0 })),
            this.user && !isMe ? isFollowing(this.user.id, profile.id).catch(() => false) : Promise.resolve(false)
        ]);
        if (!isMe) this.state.followState[profile.id] = following ? 'following' : 'none';

        let content = '';
        let localOnly = null;
        if (tab === 'followers' || tab === 'following') {
            const res = tab === 'followers' ? await getFollowers(profile.id) : await getFollowing(profile.id);
            if (res.error) throw res.error;
            if (this.user) {
                const ids = await getFollowingIds(this.user.id);
                res.data.forEach(p => { this.state.followState[p.id] = ids.includes(p.id) ? 'following' : 'none'; });
            }
            content = res.data.length
                ? `<div class="ps-people">${res.data.map(p => this.personRow(p)).join('')}</div>`
                : `<p class="ps-empty-simple">${tab === 'followers' ? 'Ainda não tem nenhum seguidor.' : 'Ainda não segue ninguém.'}</p>`;
        } else if (tab === 'reposts') {
            const reposts = await getUserReposts(profile.id);
            await this._loadInteractions(reposts);
            content = this._grid(reposts, isMe ? 'Ainda não repostaste nenhum quadro.' : 'Ainda não tem nenhum repost.');
        } else {
            const res = profile._offline ? { data: [], error: null } : await getUserBoards(profile.id);
            if (res.error && !isMe) throw res.error;
            if (res.error) res.data = [];
            if (isMe) this.state.userBoards = res.data;
            await this._loadInteractions(res.data).catch(() => {});
            if (isMe) {
                // Rascunhos: quadros guardados neste navegador (o "Continuar a
                // editar" do início) que ainda não estão na conta — aparecem primeiro.
                const cloudIds = new Set(res.data.map(b => b.id));
                localOnly = getAllProjects()
                    .filter(p => !p.remoteId || !cloudIds.has(p.remoteId))
                    .sort((a, b) => String(b.ultimaEdicao || '').localeCompare(String(a.ultimaEdicao || '')));
                const pub = res.data.filter(b => b.is_public), priv = res.data.filter(b => !b.is_public);
                const cloudPart = res.data.length
                    ? (pub.length ? this._sectionHead('Publicados', `${pub.length} ${pub.length === 1 ? 'quadro público' : 'quadros públicos'}`) + this._grid(pub) : '')
                      + (priv.length ? this._sectionHead('Guardados na conta', `${priv.length} privado${priv.length === 1 ? '' : 's'} · só tu vês`, 'sky') + this._grid(priv) : '')
                    : (localOnly.length ? '' : '<p class="ps-empty-simple">Ainda não tens nenhum quadro. Cria um em “Novo quadro”.</p>');
                content = this._localSection(localOnly) + cloudPart;
            } else {
                content = this._grid(res.data, 'Ainda não tem nenhum quadro.');
            }
        }
        if (token !== this._renderToken) return;

        const base = '#profile/' + encodeURIComponent(profile.username);
        const tabLink = (id, label, count) => `
            <a href="${base}${id === 'boards' ? '' : '/' + id}" class="ps-tab ${tab === id ? 'selected' : ''}" ${tab === id ? 'aria-current="page"' : ''}>
                ${label}${count !== null ? `<sup>${_fmtCount(count)}</sup>` : ''}
            </a>`;

        const actionBtn = isMe
            ? `<button type="button" class="ps-btn" data-act="edit-profile">${ghIcon('edit', 13)} Editar perfil</button>
               <button type="button" class="ms-nav-cta ps-cta" data-act="new-board">${ghIcon('plus', 15)}<span>Novo quadro</span></button>`
            : this.followButton(profile.id, 'ps-follow-lg', 'profile-follow-btn');

        const since = new Date(profile.created_at).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

        this.main.innerHTML = `
            <section class="ps-profile">
                <div class="ps-profile-card">
                    <div class="ps-avatar"><img id="profile-avatar" src="${avatarSrc(profile)}" alt="Avatar de ${escapeHTML(profile.username)}"></div>
                    <div class="ps-profile-main">
                        <span class="ms-kicker ps-kicker">→ ${isMe ? 'O teu perfil' : 'Perfil'} · desde ${escapeHTML(since)}</span>
                        <h1 class="ps-profile-name" id="profile-username">${escapeHTML(profile.display_name || profile.username)}</h1>
                        <p class="ps-handle"><em>@${escapeHTML(profile.username)}</em></p>
                        ${profile.bio
                            ? `<p class="ps-bio" id="profile-bio">${escapeHTML(profile.bio)}</p>`
                            : (isMe ? '<p class="ps-bio ps-bio-empty">Ainda sem bio. <a href="#" data-act="edit-profile">Escreve uma →</a></p>' : '')}
                        <div class="ps-profile-actions">${actionBtn}</div>
                    </div>
                    <div class="ps-stats">
                        <a class="ps-stat" href="${base}"><b>${_fmtCount(stats.boards)}</b><span>quadros</span></a>
                        <a class="ps-stat" href="${base}/followers"><b id="profile-followers-count">${_fmtCount(stats.followers)}</b><span>${stats.followers === 1 ? 'seguidor' : 'seguidores'}</span></a>
                        <a class="ps-stat" href="${base}/following"><b id="profile-following-count">${_fmtCount(stats.following)}</b><span>a seguir</span></a>
                    </div>
                </div>

                <nav class="ps-tabs" aria-label="Secções do perfil">
                    ${tabLink('boards', 'Quadros', stats.boards)}
                    ${tabLink('reposts', 'Reposts', null)}
                    ${tabLink('followers', 'Seguidores', stats.followers)}
                    ${tabLink('following', 'A seguir', stats.following)}
                </nav>
                <div class="ps-tab-body profile-tab-body">${content}</div>
            </section>`;
        if (localOnly) this._fillLocal(localOnly);
    }

    // Secção "Neste dispositivo" (antiga "Recent boards" da landing).
    _localSection(projects) {
        if (!projects || !projects.length) return '';
        return `<section class="ps-local">
            ${this._sectionHead('Rascunhos', `${projects.length} ${projects.length === 1 ? 'quadro' : 'quadros'} · guardados neste navegador${this.user ? ' — publica-os no editor (Publicar)' : ' — entra para os publicares'}`, 'sky')}
            <div id="lista-projetos" class="projects-grid ps-grid ps-local-grid"></div>
        </section>`;
    }

    _fillLocal(projects) {
        if (!projects || !projects.length) return;
        this.app.ui.renderProjectsList(projects, 'lista-projetos', { publish: !!this.user });
    }

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
            const who = `<a href="#profile/${encodeURIComponent(n.user.username)}" class="ps-strong">@${escapeHTML(n.user.username)}</a>`;
            const board = n.board ? `<a href="#" data-act="open" data-board-id="${escapeHTML(n.board.id)}" class="ps-strong ps-board-name">${escapeHTML(n.board.title || 'Sem título')}</a>` : '';
            const text = n.type === 'like'
                ? `${who} gostou de ${board}`
                : n.type === 'repost'
                    ? `${who} repostou ${board}${n.comment ? `<span class="ps-quote">“${escapeHTML(n.comment)}”</span>` : ''}`
                    : `${who} começou a seguir-te`;
            const icon = n.type === 'like' ? 'heart' : n.type === 'repost' ? 'repeat' : 'userPlus';
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
        return `<div class="projects-grid ps-grid ${extraClass}">${boards.map(b => this.boardCard(b)).join('')}</div>`;
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
                <a href="#profile/${encodeURIComponent(b.repost.by.username)}">@${escapeHTML(b.repost.by.username)}</a> repostou · ${timeAgo(b.repost.created_at)}
                ${b.repost.comment ? `<p><em>“${escapeHTML(b.repost.comment)}”</em></p>` : ''}
            </div>` : '';

        const authorHTML = b.legacy
            ? `<span class="ps-card-author">${escapeHTML(author.username || 'Anónimo')}</span>`
            : `<a href="#profile/${encodeURIComponent(author.username || '')}" class="ps-card-author"><img src="${avatarSrc(author)}" alt="">@${escapeHTML(author.username || '?')}</a>`;

        let actions;
        if (b.legacy) {
            actions = `<button type="button" class="ps-act" data-act="open-legacy" data-board-id="${id}">Abrir cópia</button>`;
        } else {
            const liked = this.state.likeState[b.id] === 'liked';
            const rted = this.state.retweetState[b.id] === 'retweeted';
            const counts = this.state.counts[b.id] || { likes: b.likes_count || 0, retweets: b.retweets_count || 0 };
            const extra = isMine
                ? `<button type="button" class="ps-act ps-act-icon ps-act-danger" data-act="delete-board" data-board-id="${id}" title="Apagar da conta" aria-label="Apagar da conta">${ghIcon('trash', 13)}</button>`
                : (author.id ? this.followButton(author.id, 'ps-act follow-btn') : '');
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
                <a href="#profile/${encodeURIComponent(p.username)}" class="ps-person-name">@${escapeHTML(p.username)}</a>
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
        if (!modal.open) modal.showModal();
        setTimeout(() => btn.focus(), 30);
    }

    _bindAuthModal() {
        const modal = document.getElementById('modal-auth');
        if (!modal) return;
        const btn = modal.querySelector('#btn-google-login');
        const errEl = modal.querySelector('.auth-error');
        const label = btn.querySelector('span');

        btn.addEventListener('click', async () => {
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

    openProfileEditor() {
        if (this._needLogin()) return;
        const modal = document.getElementById('modal-perfil');
        const form = modal.querySelector('#form-perfil');
        const u = this.user;
        form.username.value = u.username || '';
        form.bio.value = u.bio || '';
        form.display_name.value = u.display_name || '';
        this._pendingAvatar = undefined;
        modal.querySelector('#perfil-avatar-preview').src = avatarSrc(u);
        modal.querySelector('.auth-error').hidden = true;
        modal.showModal();
    }

    _bindProfileModal() {
        const modal = document.getElementById('modal-perfil');
        if (!modal) return;
        const form = modal.querySelector('#form-perfil');
        const preview = modal.querySelector('#perfil-avatar-preview');
        const file = modal.querySelector('#perfil-avatar-file');
        const err = modal.querySelector('.auth-error');

        modal.querySelector('#perfil-avatar-pick').addEventListener('click', () => file.click());
        modal.querySelector('#perfil-avatar-remove').addEventListener('click', () => {
            this._pendingAvatar = null;
            preview.src = identicon(form.username.value || (this.user && this.user.username));
        });
        file.addEventListener('change', async () => {
            const f = file.files[0];
            file.value = '';
            if (!f) return;
            try {
                // Avatar pequeno guardado como data URL na coluna profiles.image.
                const src = await compactarFicheiroImagem(f, { maxLado: 512, maxBytes: 200000 });
                if (!src) throw new Error('Imagem inválida');
                this._pendingAvatar = src;
                preview.src = src;
            } catch {
                err.textContent = 'Não foi possível ler essa imagem.';
                err.hidden = false;
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
                const updated = await updateMyProfile(patch);
                const oldName = this.user.username;
                Object.assign(this.app.currentUser, { username: updated.username, bio: updated.bio, image: updated.image, display_name: updated.display_name });
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
