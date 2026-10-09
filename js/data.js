const STORAGE_KEY = 'pinspace_projects';
const SETTINGS_KEY = 'pinspace_settings';

// Os quadros guardados neste navegador ficam no IndexedDB (centenas de MB),
// não no localStorage (só ~5 MB): com fotos, o localStorage enchia, a
// gravação falhava em silêncio e ao voltar ao quadro faltavam as últimas
// alterações. Em memória fica uma cópia para leituras rápidas e síncronas.
let _projectsCache = null;
let _idb = null;
const IDB_NAME = 'pinspace';
const IDB_STORE = 'projects';

function _idbOpen() {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) return reject(new Error('sem IndexedDB'));
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('IndexedDB bloqueado'));
    });
}

function _idbTx(mode, fn) {
    return new Promise((resolve, reject) => {
        const tx = _idb.transaction(IDB_STORE, mode);
        const store = tx.objectStore(IDB_STORE);
        let result;
        Promise.resolve(fn(store)).then(r => { result = r; });
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('gravação cancelada'));
    });
}

function _byLastEdit(a, b) {
    return String(b.ultimaEdicao || '').localeCompare(String(a.ultimaEdicao || ''));
}

// Chamada uma vez no arranque (antes de mostrar o site). Passa para o
// IndexedDB os quadros que estavam no localStorage.
async function initProjectStore() {
    let fromLS = [];
    try { fromLS = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') || []; } catch { fromLS = []; }
    try {
        _idb = await _idbOpen();
        const all = await _idbTx('readonly', (st) => new Promise((res, rej) => {
            const r = st.getAll();
            r.onsuccess = () => res(r.result || []);
            r.onerror = () => rej(r.error);
        }));
        const byId = new Map(all.map(p => [p.id, p]));
        const migrate = fromLS.filter(p => p && p.id && (!byId.has(p.id) || String(p.ultimaEdicao || '') > String(byId.get(p.id).ultimaEdicao || '')));
        if (migrate.length) {
            await _idbTx('readwrite', (st) => migrate.forEach(p => st.put(p)));
            migrate.forEach(p => byId.set(p.id, p));
        }
        if (fromLS.length) localStorage.removeItem(STORAGE_KEY);   // já estão no IndexedDB
        _projectsCache = [...byId.values()].sort(_byLastEdit);
    } catch (err) {
        console.warn('IndexedDB indisponível, a usar o localStorage:', err);
        _idb = null;
        _projectsCache = fromLS;
    }
    return _projectsCache;
}

function getAllProjects() {
    if (_projectsCache) return _projectsCache;
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        _projectsCache = data ? JSON.parse(data) : [];
    } catch {
        _projectsCache = [];
    }
    return _projectsCache;
}

function _persistError(err) {
    console.error('Não foi possível guardar neste navegador:', err);
    window.dispatchEvent(new CustomEvent('pinspace:save-error', { detail: err }));
}

function saveAllProjects(projects) {
    _projectsCache = projects;
    if (_idb) {
        _idbTx('readwrite', (st) => { st.clear(); projects.forEach(p => st.put(p)); }).catch(_persistError);
        return;
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (err) {
        _persistError(err);
        throw err;
    }
}

function saveProject(project) {
    const projects = getAllProjects().slice();
    const index = projects.findIndex(p => p.id === project.id);

    project.ultimaEdicao = new Date().toISOString();
    // Guardamos uma cópia: o editor continua a alterar o objeto original e
    // essas alterações (ainda não guardadas) não podem entrar na cache.
    const copy = deepClone(project);

    if (index >= 0) projects.splice(index, 1);
    projects.unshift(copy);           // o mais recente primeiro ("Continuar a editar")
    _projectsCache = projects;

    if (_idb) {
        _idbTx('readwrite', (st) => st.put(copy)).catch(_persistError);
    } else {
        saveAllProjects(projects);
    }
    return project;
}

function deleteProject(id) {
    const projects = getAllProjects().filter(p => p.id !== id);
    _projectsCache = projects;
    if (_idb) _idbTx('readwrite', (st) => st.delete(id)).catch(_persistError);
    else saveAllProjects(projects);
}

function searchProjects(query) {
    const q = query.toLowerCase().trim();
    if (!q) return getAllProjects();
    return getAllProjects().filter(p =>
        p.titulo.toLowerCase().includes(q)
    );
}

function createEmptyProject(id, titulo = 'Sem título', boardWidth = 3000, boardHeight = 3000) {
    return {
        id,
        titulo,
        dataCriacao: new Date().toISOString(),
        ultimaEdicao: new Date().toISOString(),
        thumbnail: null,
        publico: false,
        publicKey: null,
        ownerToken: null,
        autor: 'Anónimo',
        publicadoAt: null,
        background: {
            tipo: 'cor',
            valor: '#e8e8e8'
        },
        grade: 'none',
        elementos: [],
        boardWidth,
        boardHeight
    };
}

function getSettings() {
    try {
        const data = localStorage.getItem(SETTINGS_KEY);
        return data ? JSON.parse(data) : { theme: 'light' };
    } catch {
        return { theme: 'light' };
    }
}

function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

window.SUPABASE_CONFIG = {
    url: 'https://bvhinutatusriwkywywh.supabase.co',
    anonKey: 'sb_publishable_om5YO7UDKoYezI5YQt8tAQ_fP27cR-E'
};

function supabaseConfigured() {
    const c = window.SUPABASE_CONFIG || {};
    return !!(c.url && c.anonKey);
}

function apiUrl(path) {
    return window.SUPABASE_CONFIG.url + '/functions/v1/quadros' + (path || '');
}

function restUrl(path) {
    return window.SUPABASE_CONFIG.url + '/rest/v1/' + path;
}

// Chaves novas (sb_publishable_...) vão só no apikey; JWTs legados vão nos dois.
function supabaseHeaders(extra) {
    const key = (window.SUPABASE_CONFIG || {}).anonKey || '';
    const headers = { apikey: key };
    if (/^eyJ/.test(key)) headers.Authorization = 'Bearer ' + key;
    return Object.assign(headers, extra || {});
}

// Ler é público: a policy só deixa o anon key fazer select.
// Nunca pedimos owner_token, para não expor o token de ninguém.
async function _restGet(path) {
    const res = await fetch(restUrl(path), { headers: supabaseHeaders() });
    if (!res.ok) {
        let body = '';
        try { body = await res.text(); } catch {}
        if (/permission denied/i.test(body)) {
            throw new Error('A base de dados não permite ler a tabela quadros (falta GRANT SELECT ... TO anon).');
        }
        if (res.status === 401) {
            throw new Error('Chave do Supabase rejeitada. Usa a chave publishable (sb_publishable_...) de Settings → API keys em js/data.js.');
        }
        throw new Error('Não foi possível ler os quadros (servidor respondeu ' + res.status + ').');
    }
    return await res.json();
}

// Escrever passa pela Edge Function, que tem a service_role.
async function _apiFetch(method, path, body) {
    const res = await fetch(apiUrl(path), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) {
        let msg;
        if (res.status === 404) {
            msg = 'A função do servidor ainda não foi publicada (404). Corre "supabase functions deploy quadros".';
        } else {
            msg = data && data.error ? data.error : 'Servidor respondeu ' + res.status;
        }
        const err = new Error(msg);
        err.status = res.status;
        throw err;
    }
    return data;
}

const COLUNAS_PUBLICAS = 'id,titulo,autor,thumb,publicado,atualizado';

async function supabaseListQuadros() {
    return await _restGet('quadros?select=' + COLUNAS_PUBLICAS + '&order=publicado.desc&limit=60');
}

async function supabaseGetQuadro(id) {
    const rows = await _restGet('quadros?select=' + COLUNAS_PUBLICAS + ',projeto&id=eq.' + encodeURIComponent(id));
    return rows && rows[0] ? rows[0] : null;
}

async function supabasePublicarQuadro(payload, publicId, ownerToken) {
    const check = validateAuthorName(payload.autor);
    if (!check.ok) throw new Error(check.error);
    return await _apiFetch('POST', '/', {
        termosAceitos: payload.termosAceitos,
        publicId: publicId || null,
        ownerToken: ownerToken || null,
        titulo: payload.titulo,
        autor: check.value,
        thumb: payload.thumb,
        projeto: payload.projeto || {}
    });
}

async function supabaseApagarQuadro(id, ownerToken) {
    await _apiFetch('DELETE', '/', { id, ownerToken: ownerToken || null });
    return true;
}

function _toLocalView(collages, remoto) {
    return {
        remoto: !!remoto,
        collages: (collages || []).map(c => ({
            id: c.id,
            titulo: c.titulo || 'Sem título',
            autor: c.autor || 'Anónimo',
            thumb: c.thumb || '',
            atualizado: c.atualizado || c.publicado
        }))
    };
}

// Galeria do início: quadros públicos das contas (com autor) + a galeria
// antiga, se ainda tiver alguma coisa. Os das contas abrem com "b:<id>".
async function getPublicCollages() {
    if (!supabaseConfigured() && !authAvailable()) return { remoto: false, collages: [] };
    const { items } = await getExploreAll('', 30);
    return {
        remoto: true,
        collages: items.map(b => ({
            id: b.legacy ? b.id : 'b:' + b.id,
            titulo: b.title || 'Sem título',
            autor: (b.author && b.author.username) || 'Anónimo',
            thumb: b.image_url || '',
            atualizado: b.updated_at || b.created_at
        }))
    };
}

async function getPublicCollage(id) {
    if (supabaseConfigured()) {
        const row = await supabaseGetQuadro(id);
        if (!row) throw new Error('Este quadro já não existe no servidor.');

        const projeto = row.projeto;
        if (!projeto || !Array.isArray(projeto.elementos) || projeto.elementos.length === 0) {
            // A lista publica mostra a miniatura, por isso o cartao aparece
            // mesmo sem conteudo. Dizer isso evita o "botao nao faz nada".
            throw new Error('Este quadro foi publicado sem conteúdo (só a miniatura). Reabre-o no editor e volta a publicar.');
        }
        return projeto;
    }
    throw new Error('Quadro não encontrado');
}

async function publishPublicCollage(payload) {
    if (!supabaseConfigured()) {
        throw new Error('Base de dados (Supabase) não está configurada.');
    }
    return await supabasePublicarQuadro(payload, payload.publicId || null, payload.ownerToken || null);
}

async function deletePublicCollage(id, ownerToken) {
    if (!supabaseConfigured()) {
        throw new Error('Base de dados (Supabase) não está configurada.');
    }
    await supabaseApagarQuadro(id, ownerToken);
    return true;
}

function publicServerAvailable() {
    return supabaseConfigured();
}

/* =====================================================================
   CONTAS E REDE SOCIAL (Supabase Auth + tabelas profiles/boards/likes/
   retweets/follows). O SQL está em supabase/social.sql.

   O cliente fica em window.sb — NÃO em "const supabase", porque o script
   do CDN já ocupa window.supabase e "const supabase = supabase.createClient"
   rebenta com ReferenceError.
   ===================================================================== */

const USER_KEY = 'pinspace_user';
const LAST_EMAIL_KEY = 'pinspace_last_email';
let _sb = null;

function getSupabase() {
    if (_sb) return _sb;
    if (!supabaseConfigured()) return null;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') return null;

    _sb = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce', // o regresso do Google vem em ?code=… e não mexe no #hash das rotas
            storageKey: 'pinspace_auth'
        }
    });
    window.sb = _sb;

    // Guarda um resumo do utilizador no localStorage (leitura síncrona rápida)
    // e avisa a app sempre que o estado muda.
    _sb.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            const cached = getCachedUser();
            const u = session.user;
            const summary = {
                id: u.id,
                email: u.email,
                username: (cached && cached.id === u.id && cached.username) || (u.user_metadata && u.user_metadata.username) || null,
                image: (cached && cached.id === u.id && cached.image) || null
            };
            localStorage.setItem(USER_KEY, JSON.stringify(summary));
            // Lembra a conta Google usada, para o próximo login ser de um clique.
            if (u.email) { try { localStorage.setItem(LAST_EMAIL_KEY, u.email); } catch {} }
        } else if (event === 'SIGNED_OUT') {
            localStorage.removeItem(USER_KEY);
        }
        // setTimeout: chamar o Supabase dentro deste callback pode bloquear (deadlock).
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('pinspace:auth', { detail: { event, session } }));
        }, 0);
    });
    return _sb;
}

function authAvailable() {
    return !!getSupabase();
}

function getCachedUser() {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function setCachedUser(patch) {
    const cur = getCachedUser();
    if (!cur) return;
    localStorage.setItem(USER_KEY, JSON.stringify({ ...cur, ...patch }));
}

function _requireSb() {
    const sb = getSupabase();
    if (!sb) throw new Error('Contas indisponíveis: o Supabase não carregou (verifica a ligação à internet).');
    return sb;
}

function _requireUser() {
    const user = getCachedUser();
    if (!user) {
        const err = new Error('Faça login para continuar.');
        err.code = 'AUTH_REQUIRED';
        throw err;
    }
    return user;
}

function _ptAuthError(error) {
    if (!error) return null;
    const m = String(error.message || error);
    if (/invalid login credentials/i.test(m)) return 'Email ou palavra-passe errados.';
    if (/email not confirmed/i.test(m)) return 'Confirma o teu email antes de entrar (vê a caixa de entrada).';
    if (/already registered|already been registered/i.test(m)) return 'Já existe uma conta com este email.';
    if (/password should be at least/i.test(m)) return 'A palavra-passe tem de ter pelo menos 6 caracteres.';
    if (/rate limit|too many/i.test(m)) return 'Demasiadas tentativas. Espera um pouco e tenta de novo.';
    if (/unable to validate email|invalid email/i.test(m)) return 'Esse email não é válido.';
    if (/provider is not enabled|unsupported provider/i.test(m)) return 'O login com Google ainda não está ativo no Supabase (Authentication → Providers → Google).';
    if (/database error saving new user/i.test(m)) return 'O servidor não conseguiu criar o perfil. Confirma que correste supabase/social.sql.';
    return m;
}

function validateUsername(username) {
    const value = String(username || '').trim();
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(value)) {
        return { ok: false, error: 'O username deve ter 3–30 caracteres: letras, números, "_" ou "-".' };
    }
    if (typeof findBadWords === 'function' && findBadWords(value).length) {
        return { ok: false, error: 'Esse username contém linguagem ofensiva. Escolhe outro.' };
    }
    return { ok: true, value };
}

/* ---------- Auth ---------- */

// Login único: conta Google (OAuth). Sem palavra-passe nem código de verificação —
// a conta é criada automaticamente no primeiro login (trigger handle_new_user).
const AUTH_RETURN_KEY = 'pinspace_auth_return';

async function signInWithGoogle() {
    const sb = _requireSb();
    // Lembra onde a pessoa estava para voltar lá depois do Google.
    try { sessionStorage.setItem(AUTH_RETURN_KEY, window.location.hash || ''); } catch {}
    // Sem "prompt: select_account": se o navegador já tem a conta Google
    // guardada, o Google entra logo, sem pedir para escolher a conta outra vez.
    let lastEmail = null;
    try { lastEmail = localStorage.getItem(LAST_EMAIL_KEY); } catch {}
    const { data, error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + window.location.pathname,
            queryParams: lastEmail ? { login_hint: lastEmail } : {}
        }
    });
    if (error) return { data, error: { message: _ptAuthError(error) } };
    return { data, error: null };
}

function takeAuthReturnHash() {
    try {
        const h = sessionStorage.getItem(AUTH_RETURN_KEY);
        sessionStorage.removeItem(AUTH_RETURN_KEY);
        return h;
    } catch { return null; }
}

async function signOut() {
    const sb = getSupabase();
    localStorage.removeItem(USER_KEY);
    if (!sb) return { error: null };
    // Termina a sessão só neste navegador e não fica à espera da rede para sempre.
    let error = null;
    try {
        const res = await Promise.race([
            sb.auth.signOut({ scope: 'local' }),
            new Promise(resolve => setTimeout(() => resolve({ error: new Error('timeout') }), 2500))
        ]);
        error = res && res.error ? res.error : null;
    } catch (err) { error = err; }
    // Garante que a sessão guardada desaparece mesmo que o pedido falhe.
    try { localStorage.removeItem('pinspace_auth'); localStorage.removeItem('pinspace_auth-code-verifier'); } catch { /* ok */ }
    return { error };
}

function _waitForSession(sb, ms) {
    return new Promise((resolve) => {
        const end = Date.now() + ms;
        const tick = async () => {
            let s = null;
            try { s = (await sb.auth.getSession()).data.session; } catch {}
            if (s && s.user) return resolve(s);
            if (Date.now() >= end) return resolve(null);
            setTimeout(tick, 250);
        };
        tick();
    });
}

// Lê a sessão guardada (sem ida à rede) e completa com o perfil.
async function getCurrentUser() {
    const sb = getSupabase();
    if (!sb) return null;
    let { data: { session } } = await sb.auth.getSession();
    // Regresso do Google (?code=…): às vezes a troca do código ainda não acabou
    // quando a app pergunta pela sessão, e era preciso entrar uma segunda vez.
    // Espera um pouco por ela e, se não chegar, troca o código aqui.
    if ((!session || !session.user) && /[?&]code=/.test(window.location.search)) {
        session = await _waitForSession(sb, 4000);
        if (!session) {
            try {
                const code = new URLSearchParams(window.location.search).get('code');
                const res = await sb.auth.exchangeCodeForSession(code);
                session = (res && res.data && res.data.session) || null;
            } catch (err) { console.warn('Login Google:', err); }
            if (!session) session = (await sb.auth.getSession()).data.session;
        }
    }
    if (!session || !session.user) {
        localStorage.removeItem(USER_KEY);
        return null;
    }
    const u = session.user;
    let profile = null;
    let profileErr = null;
    try { profile = await getProfileById(u.id); } catch (err) { profileErr = err; console.warn('Perfil indisponível:', err); }
    // Conta criada antes do trigger que cria perfis: cria agora o perfil em falta.
    if (!profile && !profileErr) {
        try {
            const raw = String((u.user_metadata && u.user_metadata.username) || (u.email || '').split('@')[0] || 'user').replace(/[^A-Za-z0-9_-]/g, '');
            const name = (raw.length >= 3 ? raw : raw + 'user').slice(0, 24);
            const meta = u.user_metadata || {};
            const row = { id: u.id, username: name };
            if (meta.full_name || meta.name) row.display_name = String(meta.full_name || meta.name).slice(0, 50);
            if (meta.avatar_url || meta.picture) row.image = meta.avatar_url || meta.picture;
            const { data } = await sb.from('profiles').insert(row).select(PROFILE_COLS).maybeSingle();
            profile = data || null;
        } catch (err) { console.warn('Não foi possível criar o perfil:', err); }
    }
    const user = {
        id: u.id,
        email: u.email,
        username: (profile && profile.username) || (u.user_metadata && u.user_metadata.username) || null,
        image: (profile && profile.image) || null,
        bio: (profile && profile.bio) || '',
        display_name: (profile && profile.display_name) || ''
    };
    localStorage.setItem(USER_KEY, JSON.stringify({ id: user.id, email: user.email, username: user.username, image: user.image }));
    if (profile) touchSession().catch(() => {});
    return user;
}

/* ---------- Perfis ---------- */

const PROFILE_COLS = 'id,username,display_name,bio,image,cover_image,created_at,boards_count,public_boards_count,followers_count,following_count,likes_received,last_active_at';

async function getProfileById(id) {
    const { data, error } = await _requireSb().from('profiles').select(PROFILE_COLS).eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
}

function _escapeLike(s) {
    return String(s).replace(/[\\%_]/g, m => '\\' + m);
}

async function getProfileByUsername(username) {
    const { data, error } = await _requireSb()
        .from('profiles')
        .select(PROFILE_COLS)
        .ilike('username', _escapeLike(username))
        .limit(1);
    if (error) throw error;
    return data && data[0] ? data[0] : null;
}

async function isUsernameAvailable(username) {
    try {
        return !(await getProfileByUsername(username));
    } catch {
        return true; // o trigger trata colisões
    }
}

async function updateMyProfile(patch) {
    const user = _requireUser();
    const clean = {};
    if (patch.bio !== undefined) clean.bio = String(patch.bio || '').slice(0, 300);
    if (patch.image !== undefined) {
        clean.image = patch.image || null;
        // Foto nova (data:…) → vai para o Storage; na tabela fica só o link.
        if (clean.image && clean.image.startsWith('data:')) {
            try { clean.image = await uploadAvatar(clean.image); } catch (err) { console.warn('Avatar no Storage falhou, fica na tabela:', err); }
        }
    }
    if (patch.cover_image !== undefined) {
        clean.cover_image = patch.cover_image || null;
        // Banner novo (data:…) → Storage, na mesma pasta do avatar.
        if (clean.cover_image && clean.cover_image.startsWith('data:')) {
            try { clean.cover_image = await uploadCover(clean.cover_image); } catch (err) { console.warn('Banner no Storage falhou, fica na tabela:', err); }
        }
    }
    if (patch.display_name !== undefined) clean.display_name = String(patch.display_name || '').trim().slice(0, 60) || null;
    if (patch.username !== undefined) {
        const check = validateUsername(patch.username);
        if (!check.ok) throw new Error(check.error);
        if (check.value.toLowerCase() !== String(user.username || '').toLowerCase()) {
            if (!(await isUsernameAvailable(check.value))) throw new Error('Esse username já está ocupado.');
        }
        clean.username = check.value;
    }
    const { data, error } = await _requireSb().from('profiles').update(clean).eq('id', user.id).select(PROFILE_COLS).single();
    if (error) throw error;
    setCachedUser({ username: data.username, image: data.image });
    return data;
}

async function searchProfiles(query, limit = 12) {
    const q = String(query || '').trim();
    if (!q) return [];
    const { data, error } = await _requireSb()
        .from('profiles')
        .select(PROFILE_COLS)
        .ilike('username', '%' + _escapeLike(q) + '%')
        .limit(limit);
    if (error) throw error;
    return data || [];
}

/* ---------- Quadros com dono ---------- */

// Sem a coluna "projeto" (pesada) — só o necessário para os cartões.
const BOARD_SELECT = 'id,title,description,image_url,image_full,author_id,is_public,created_at,updated_at,' +
    'author:profiles!boards_author_id_fkey(id,username,display_name,image),likes(count),retweets(count)';

function _normalizeBoard(row) {
    if (!row) return null;
    const cnt = (v) => Array.isArray(v) && v[0] && typeof v[0].count === 'number' ? v[0].count : 0;
    return {
        id: row.id,
        title: row.title || 'Sem título',
        description: row.description || '',
        image_url: row.image_url || '',
        image_full: row.image_full || '',
        author_id: row.author_id,
        author: row.author || null,
        is_public: !!row.is_public,
        created_at: row.created_at,
        updated_at: row.updated_at,
        likes_count: cnt(row.likes),
        retweets_count: cnt(row.retweets)
    };
}

function _newUuid() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// Envia (insert ou update) um projeto local para a tabela boards.
// O projeto local guarda o id remoto em project.remoteId e o dono em
// project.authorId. Os IDs locais (generateId) não são UUID, por isso
// não podem ser usados diretamente na coluna boards.id.
async function saveBoardToCloud(project) {
    const user = _requireUser();
    const sb = _requireSb();

    if (project.authorId && project.authorId !== user.id) {
        // Quadro de outra pessoa (cópia aberta) → passa a ser um quadro novo meu.
        project.remoteId = null;
    }
    if (!project.remoteId) project.remoteId = _newUuid();
    project.authorId = user.id;

    const projeto = JSON.parse(JSON.stringify({
        ...project,
        thumbnail: undefined,
        publicKey: undefined,
        ownerToken: undefined
    }));

    const row = {
        id: project.remoteId,
        title: String(project.titulo || 'Sem título').slice(0, 120),
        description: String(project.descricao || '').slice(0, 500),
        image_url: project.thumbnail || null,
        author_id: user.id,
        is_public: !!project.perfilPublico,
        projeto,
        // dados úteis para listas e estatísticas (sem abrir o quadro todo)
        board_width: Math.round(project.boardWidth || 0) || null,
        board_height: Math.round(project.boardHeight || 0) || null,
        elements_count: Array.isArray(project.elementos) ? project.elementos.length : 0,
        copied_from: project.copiadoDe && /^[0-9a-f-]{36}$/i.test(project.copiadoDe.remoteId || '') ? project.copiadoDe.remoteId : null
    };

    const { error } = await sb.from('boards').upsert(row, { onConflict: 'id' });
    if (error) {
        if (/payload too large|413/i.test(error.message || '')) {
            throw new Error('O quadro é demasiado grande para guardar na conta. Reduz o número ou tamanho das imagens.');
        }
        throw error;
    }
    project.cloudSyncedAt = new Date().toISOString();
    return project.remoteId;
}

// Versão do pedido original: cria um quadro a partir do título/descrição.
async function createBoard(title, description, isPublic = false, projectData = null) {
    const user = getCachedUser();
    const id = generateId();
    const project = {
        ...createEmptyProject(id, title || 'Sem título'),
        ...(projectData || {}),
        id,
        titulo: title || 'Sem título',
        descricao: description || '',
        perfilPublico: !!isPublic,
        autor: user ? user.username : 'Anónimo'
    };
    saveProject(project);
    if (user && authAvailable()) {
        try {
            await saveBoardToCloud(project);
            saveProject(project);
        } catch (err) {
            console.error('Erro Supabase board:', err);
        }
    }
    return id;
}

/* ---------- Imagem completa dos quadros públicos (Supabase Storage) ----------
   Ficheiro: bucket "quadros", <id do utilizador>/<id do quadro>.jpg
   O URL público fica em boards.image_full. */
async function _uploadImage(bucket, path, blob) {
    const sb = _requireSb();
    const { error } = await sb.storage.from(bucket).upload(path, blob, { upsert: true, contentType: blob.type || 'image/jpeg', cacheControl: '60' });
    if (error) {
        if (/bucket not found/i.test(error.message || '')) {
            throw new Error('A pasta de imagens ainda não existe no Supabase — corre supabase/social.sql.');
        }
        throw error;
    }
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    return data && data.publicUrl ? data.publicUrl + '?v=' + Date.now() : null;
}

function _canvasToBlob(canvas, maxSide, quality = 0.9) {
    let c = canvas;
    const k = Math.min(1, maxSide / Math.max(canvas.width, canvas.height));
    if (k < 1) {
        c = document.createElement('canvas');
        c.width = Math.round(canvas.width * k);
        c.height = Math.round(canvas.height * k);
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, c.width, c.height);
    }
    return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('Não foi possível criar a imagem do quadro.')), 'image/jpeg', quality));
}

// Guarda a imagem do quadro público no Storage (pasta "quadros"): UM ficheiro
// por quadro, <utilizador>/<quadro>.jpg (até 1600 px). Serve de imagem grande
// (boards.image_full) e de miniatura (boards.image_url). Ao voltar a publicar
// o mesmo quadro o ficheiro é substituído, não duplicado.
async function uploadBoardImage(project) {
    const user = _requireUser();
    const sb = _requireSb();
    if (!project.remoteId || !sb.storage) return null;
    const full = await renderToCanvas(project);
    const blob = await _canvasToBlob(full, 1600, 0.86);
    const base = `${user.id}/${project.remoteId}`;
    const url = await _uploadImage('quadros', base + '.jpg', blob);
    // versões antigas guardavam também uma miniatura à parte
    sb.storage.from('quadros').remove([base + '-thumb.jpg']).catch(() => {});
    const { error } = await sb.from('boards').update({ image_full: url, image_url: url }).eq('id', project.remoteId);
    if (error) throw error;
    project.imageFull = url;
    return url;
}

async function removeBoardImage(project) {
    const user = _requireUser();
    const sb = _requireSb();
    if (!project.remoteId || !sb.storage) return;
    const base = `${user.id}/${project.remoteId}`;
    await sb.storage.from('quadros').remove([base + '.jpg', base + '-thumb.jpg']).catch(() => {});
    const thumb = project.thumbnail && String(project.thumbnail).startsWith('data:') ? project.thumbnail : null;
    await sb.from('boards').update({ image_full: null, image_url: thumb }).eq('id', project.remoteId);
    project.imageFull = null;
}

// Arruma a minha pasta de imagens: apaga miniaturas antigas (-thumb) e imagens
// de quadros que já não existem ou deixaram de ser públicos. Uma vez por visita.
async function cleanupMyBoardImages() {
    const user = getCachedUser();
    const sb = getSupabase();
    if (!user || !sb || !sb.storage) return 0;
    try { if (sessionStorage.getItem('ps_cleanup')) return 0; sessionStorage.setItem('ps_cleanup', '1'); } catch { /* ok */ }
    const { data: files, error } = await sb.storage.from('quadros').list(user.id, { limit: 1000 });
    if (error || !Array.isArray(files) || !files.length) return 0;
    const { data: boards } = await sb.from('boards').select('id,is_public').eq('author_id', user.id);
    const keep = new Set((boards || []).filter(b => b.is_public).map(b => b.id + '.jpg'));
    const remove = files.map(f => f.name).filter(n => n && !keep.has(n));
    if (!remove.length) return 0;
    const { error: e2 } = await sb.storage.from('quadros').remove(remove.map(n => `${user.id}/${n}`));
    if (e2) { console.warn('Limpeza das imagens:', e2); return 0; }
    return remove.length;
}

// Quadros públicos meus que ainda não têm imagem no Storage (ex.: vindos
// da galeria antiga) → gera e envia a imagem. Corre uma vez por visita.
async function backfillMyBoardImages(limit = 6) {
    const user = getCachedUser();
    const sb = getSupabase();
    if (!user || !sb || !sb.storage) return 0;
    try { if (sessionStorage.getItem('ps_backfill')) return 0; sessionStorage.setItem('ps_backfill', '1'); } catch { /* ok */ }
    const { data, error } = await sb.from('boards').select('id,projeto').eq('author_id', user.id).eq('is_public', true).is('image_full', null).limit(limit);
    if (error || !Array.isArray(data)) return 0;
    let n = 0;
    for (const row of data) {
        if (!row.projeto || !Array.isArray(row.projeto.elementos)) continue;
        try {
            await uploadBoardImage({ ...row.projeto, remoteId: row.id });
            n++;
        } catch (err) { console.warn('Imagem do quadro ' + row.id + ' não foi enviada:', err); }
    }
    return n;
}

// Foto de perfil no Storage (pasta "avatars") em vez de texto gigante na tabela.
async function uploadAvatar(dataUrl) {
    const user = _requireUser();
    const blob = await (await fetch(dataUrl)).blob();
    return _uploadImage('avatars', `${user.id}/avatar.jpg`, blob);
}

async function uploadCover(dataUrl) {
    const user = _requireUser();
    const blob = await (await fetch(dataUrl)).blob();
    return _uploadImage('avatars', `${user.id}/cover.jpg`, blob);
}

// Último acesso, idioma, fuso horário, tema e navegador (uma vez por visita).
async function touchSession() {
    const sb = getSupabase();
    if (!sb) return;
    try { if (sessionStorage.getItem('ps_touch')) return; sessionStorage.setItem('ps_touch', '1'); } catch { /* ok */ }
    let tz = null;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { /* ok */ }
    const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const { error } = await sb.rpc('touch_session', {
        p_language: navigator.language || null,
        p_timezone: tz,
        p_theme: theme,
        p_user_agent: navigator.userAgent || null
    });
    if (error) console.warn('touch_session:', error.message);
}

async function registerBoardView(boardId) {
    const sb = getSupabase();
    if (!sb || !boardId) return;
    const { error } = await sb.rpc('register_view', { p_board: boardId });
    if (error) console.warn('register_view:', error.message);
}

async function deleteCloudBoard(remoteId) {
    const user = _requireUser();
    const { error } = await _requireSb().from('boards').delete().eq('id', remoteId);
    if (error) throw error;
    // a imagem do quadro sai também do Storage
    _requireSb().storage?.from('quadros').remove([`${user.id}/${remoteId}.jpg`, `${user.id}/${remoteId}-thumb.jpg`]).catch(() => {});
    return true;
}

async function getCloudBoardProject(remoteId) {
    const { data, error } = await _requireSb()
        .from('boards')
        .select('id,title,description,author_id,is_public,projeto,author:profiles!boards_author_id_fkey(username)')
        .eq('id', remoteId)
        .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Este quadro já não existe ou é privado.');
    return data;
}

async function getUserBoards(userId) {
    const { data, error } = await _requireSb()
        .from('boards')
        .select(BOARD_SELECT)
        .eq('author_id', userId)
        .order('updated_at', { ascending: false })
        .limit(100);
    return { data: (data || []).map(_normalizeBoard), error };
}

async function getMyBoards() {
    const user = getCachedUser();
    if (user) return await getUserBoards(user.id);
    return { data: [], error: null };
}

async function getExploreBoards(query, limit = 60) {
    let q = _requireSb()
        .from('boards')
        .select(BOARD_SELECT)
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(limit);
    const term = String(query || '').trim();
    if (term) {
        // Procura no título e na descrição (onde ficam as #tags).
        const t = _escapeLike(term.replace(/^#/, '')).replace(/[,()"]/g, ' ');
        q = q.or(`title.ilike.%${t}%,description.ilike.%${t}%`);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(_normalizeBoard);
}

// Reposts feitos por um utilizador (para o separador "Reposts" do perfil).
async function getUserReposts(userId) {
    const { data, error } = await _requireSb()
        .from('retweets')
        .select('id,comment,created_at,user:profiles!retweets_user_id_fkey(id,username,display_name,image),board:boards!retweets_board_id_fkey(' + BOARD_SELECT + ')')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(60);
    if (error) throw error;
    return (data || []).filter(r => r.board).map(r => ({
        ..._normalizeBoard(r.board),
        repost: { id: r.id, comment: r.comment || '', created_at: r.created_at, by: r.user }
    }));
}

// Feed: quadros de quem sigo + os meus + reposts de quem sigo.
// Se ainda não sigo ninguém, completa com quadros públicos recentes.
async function getFeed() {
    const user = _requireUser();
    const sb = _requireSb();
    const followingIds = await getFollowingIds(user.id);
    const authors = [user.id, ...followingIds];

    const [boardsRes, repostsRes] = await Promise.all([
        sb.from('boards').select(BOARD_SELECT)
            .in('author_id', authors)
            .order('updated_at', { ascending: false })
            .limit(60),
        followingIds.length
            ? sb.from('retweets')
                .select('id,comment,created_at,user:profiles!retweets_user_id_fkey(id,username,image),board:boards!retweets_board_id_fkey(' + BOARD_SELECT + ')')
                .in('user_id', followingIds)
                .order('created_at', { ascending: false })
                .limit(40)
            : Promise.resolve({ data: [], error: null })
    ]);
    if (boardsRes.error) throw boardsRes.error;
    if (repostsRes.error) throw repostsRes.error;

    const items = (boardsRes.data || []).map(b => ({ ..._normalizeBoard(b), _sort: b.updated_at }));
    (repostsRes.data || []).forEach(r => {
        if (!r.board) return;
        items.push({
            ..._normalizeBoard(r.board),
            repost: { id: r.id, comment: r.comment || '', created_at: r.created_at, by: r.user },
            _sort: r.created_at
        });
    });

    let suggested = [];
    if (followingIds.length === 0) {
        const seen = new Set(items.map(i => i.id));
        suggested = (await getExploreBoards('', 24)).filter(b => !seen.has(b.id));
    }

    items.sort((a, b) => String(b._sort).localeCompare(String(a._sort)));
    return { items, suggested, followingCount: followingIds.length };
}

/* ---------- Follows ---------- */

async function followUser(followerId, followingId) {
    const { error } = await _requireSb().from('follows').insert({ follower_id: followerId, following_id: followingId });
    // 23505 = já seguia (duplo clique) → tratamos como sucesso.
    if (error && error.code !== '23505') return { error };
    return { error: null };
}

async function unfollowUser(followerId, followingId) {
    const { error } = await _requireSb()
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
    return { error };
}

async function isFollowing(followerId, followingId) {
    // maybeSingle: .single() devolve erro quando não há linha.
    const { data, error } = await _requireSb()
        .from('follows')
        .select('follower_id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle();
    return !error && !!data;
}

async function getFollowingIds(userId) {
    const { data, error } = await _requireSb().from('follows').select('following_id').eq('follower_id', userId);
    if (error) throw error;
    return (data || []).map(r => r.following_id);
}

async function getFollowers(userId) {
    const { data, error } = await _requireSb()
        .from('follows')
        .select('created_at,user:profiles!follows_follower_id_fkey(' + PROFILE_COLS + ')')
        .eq('following_id', userId)
        .order('created_at', { ascending: false });
    return { data: (data || []).map(r => r.user).filter(Boolean), error };
}

async function getFollowing(userId) {
    const { data, error } = await _requireSb()
        .from('follows')
        .select('created_at,user:profiles!follows_following_id_fkey(' + PROFILE_COLS + ')')
        .eq('follower_id', userId)
        .order('created_at', { ascending: false });
    return { data: (data || []).map(r => r.user).filter(Boolean), error };
}

async function getProfileStats(userId, profile) {
    // Com a base de dados nova os contadores já vêm no perfil (mantidos por triggers).
    if (profile && typeof profile.followers_count === 'number') {
        const mine = getCachedUser() && getCachedUser().id === userId;
        return {
            boards: mine ? (profile.boards_count || 0) : (profile.public_boards_count || 0),
            followers: profile.followers_count || 0,
            following: profile.following_count || 0
        };
    }
    const sb = _requireSb();
    const head = { count: 'exact', head: true };
    const [boards, followers, following] = await Promise.all([
        sb.from('boards').select('id', head).eq('author_id', userId),
        sb.from('follows').select('follower_id', head).eq('following_id', userId),
        sb.from('follows').select('following_id', head).eq('follower_id', userId)
    ]);
    return {
        boards: boards.count || 0,
        followers: followers.count || 0,
        following: following.count || 0
    };
}

/* ---------- Likes ---------- */

async function likeBoard(boardId) {
    const user = getCachedUser();
    if (!user) return { error: 'Faça login para dar like' };
    const sb = _requireSb();

    const { data: existing, error: readErr } = await sb
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('board_id', boardId)
        .maybeSingle();
    if (readErr) return { error: readErr.message };

    if (existing) {
        const { error } = await sb.from('likes').delete().eq('id', existing.id);
        return error ? { error: error.message } : { unlike: true };
    }
    const { error } = await sb.from('likes').insert({ user_id: user.id, board_id: boardId });
    if (error && error.code !== '23505') return { error: error.message };
    return { liked: true };
}

async function getLikesCount(boardId) {
    const { count } = await _requireSb()
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('board_id', boardId);
    return count || 0;
}

/* ---------- Reposts ("retweets") ---------- */

async function retweetBoard(boardId, comment) {
    const user = getCachedUser();
    if (!user) return { error: 'Faça login' };
    const sb = _requireSb();

    const { data: existing, error: readErr } = await sb
        .from('retweets')
        .select('id')
        .eq('user_id', user.id)
        .eq('board_id', boardId)
        .maybeSingle();
    if (readErr) return { error: readErr.message };

    if (existing) {
        const { error } = await sb.from('retweets').delete().eq('id', existing.id);
        return error ? { error: error.message } : { unretweeted: true };
    }
    const text = String(comment || '').trim().slice(0, 280) || null;
    const { error } = await sb.from('retweets').insert({ user_id: user.id, board_id: boardId, comment: text });
    if (error && error.code !== '23505') return { error: error.message };
    return { retweeted: true };
}

async function getRetweetsCount(boardId) {
    const { count } = await _requireSb()
        .from('retweets')
        .select('id', { count: 'exact', head: true })
        .eq('board_id', boardId);
    return count || 0;
}

// Que quadros desta lista é que eu já curti / repostei? (1 pedido cada)
async function getMyInteractions(boardIds) {
    const user = getCachedUser();
    const empty = { liked: new Set(), retweeted: new Set() };
    if (!user || !boardIds || !boardIds.length) return empty;
    const sb = _requireSb();
    const ids = [...new Set(boardIds)];
    const [l, r] = await Promise.all([
        sb.from('likes').select('board_id').eq('user_id', user.id).in('board_id', ids),
        sb.from('retweets').select('board_id').eq('user_id', user.id).in('board_id', ids)
    ]);
    return {
        liked: new Set((l.data || []).map(x => x.board_id)),
        retweeted: new Set((r.data || []).map(x => x.board_id))
    };
}

/* ---------- Notificações ---------- */

const NOTIF_KEEP_DAYS = 60;

async function getNotifications(limit = 40, markRead = false) {
    const user = _requireUser();
    const sb = _requireSb();
    // Só os últimos 60 dias (as mais antigas são apagadas pela base de dados).
    const since = new Date(Date.now() - NOTIF_KEEP_DAYS * 864e5).toISOString();
    // Base de dados nova: notificações guardadas (criadas pelos triggers).
    const saved = await sb.from('notifications')
        .select('id,type,comment,created_at,read_at,user:profiles!notifications_actor_id_fkey(id,username,display_name,image),board:boards(id,title,author_id,image_url)')
        .eq('user_id', user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (!saved.error && Array.isArray(saved.data)) {
        const unread = (saved.data || []).filter(n => !n.read_at).map(n => n.id);
        if (markRead && unread.length) sb.from('notifications').update({ read_at: new Date().toISOString() }).in('id', unread).then(() => {}, () => {});
        return (saved.data || []).filter(n => n.user).map(n => ({ type: n.type, created_at: n.created_at, user: n.user, board: n.board, comment: n.comment, unread: !n.read_at }));
    }
    // Base de dados antiga (sem a tabela notifications): calcula a partir dos likes, reposts e seguidores.
    const [likes, reposts, follows] = await Promise.all([
        sb.from('likes')
            .select('created_at,user:profiles!likes_user_id_fkey(id,username,image),boards!inner(id,title,author_id)')
            .eq('boards.author_id', user.id)
            .neq('user_id', user.id)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(limit),
        sb.from('retweets')
            .select('created_at,comment,user:profiles!retweets_user_id_fkey(id,username,image),boards!inner(id,title,author_id)')
            .eq('boards.author_id', user.id)
            .neq('user_id', user.id)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(limit),
        sb.from('follows')
            .select('created_at,user:profiles!follows_follower_id_fkey(id,username,image)')
            .eq('following_id', user.id)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(limit)
    ]);
    const err = likes.error || reposts.error || follows.error;
    if (err) throw err;

    const items = [
        ...(likes.data || []).map(n => ({ type: 'like', created_at: n.created_at, user: n.user, board: n.boards })),
        ...(reposts.data || []).map(n => ({ type: 'repost', created_at: n.created_at, user: n.user, board: n.boards, comment: n.comment })),
        ...(follows.data || []).map(n => ({ type: 'follow', created_at: n.created_at, user: n.user }))
    ].filter(n => n.user);
    items.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return items.slice(0, limit);
}

/* ---------- Explorar: quadros das contas + galeria pública antiga ---------- */

// A galeria anónima (tabela "quadros") não tem dono nem likes, mas é
// pública — por isso também aparece em Explorar, marcada como "legacy".
async function getExploreAll(query, limit = 60) {
    const term = String(query || '').trim().toLowerCase();
    const [boardsRes, legacyRes] = await Promise.allSettled([
        authAvailable() ? getExploreBoards(query, limit) : Promise.resolve([]),
        supabaseConfigured() ? supabaseListQuadros() : Promise.resolve([])
    ]);
    if (boardsRes.status === 'rejected' && legacyRes.status === 'rejected') throw boardsRes.reason;

    const boards = boardsRes.status === 'fulfilled' ? boardsRes.value : [];
    const legacy = (legacyRes.status === 'fulfilled' ? legacyRes.value : [])
        .map(q => ({
            id: q.id,
            legacy: true,
            title: q.titulo || 'Sem título',
            description: '',
            image_url: q.thumb || '',
            author_id: null,
            author: { id: null, username: q.autor || 'Anónimo', image: null },
            is_public: true,
            created_at: q.publicado,
            updated_at: q.atualizado || q.publicado,
            likes_count: 0,
            retweets_count: 0
        }))
        .filter(q => !term || q.title.toLowerCase().includes(term) || q.author.username.toLowerCase().includes(term));

    const all = [...boards, ...legacy];
    all.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    return {
        items: all.slice(0, limit * 2),
        boardsError: boardsRes.status === 'rejected' ? boardsRes.reason : null
    };
}
