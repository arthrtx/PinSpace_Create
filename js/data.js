const STORAGE_KEY = 'pinspace_projects';
const SETTINGS_KEY = 'pinspace_settings';

// Os projetos têm imagens em base64 (vários MB). Ler e fazer JSON.parse
// a cada chamada custava milissegundos de cada vez e era chamado muitas
// vezes seguidas, por isso guardamos a versão já lida em memória.
let _projectsCache = null;

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

function saveAllProjects(projects) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        _projectsCache = projects;
    } catch (err) {
        _projectsCache = null; // volta a ler o que está mesmo guardado
        throw err;
    }
}

// Outro separador alterou os projetos → esquece a cópia em memória.
window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === null) _projectsCache = null;
});

function saveProject(project) {
    const projects = getAllProjects().slice();
    const index = projects.findIndex(p => p.id === project.id);

    project.ultimaEdicao = new Date().toISOString();
    // Guardamos uma cópia: o editor continua a alterar o objeto original e
    // essas alterações (ainda não guardadas) não podem entrar na cache.
    const copy = deepClone(project);

    if (index >= 0) {
        projects[index] = copy;
    } else {
        projects.unshift(copy);
    }

    saveAllProjects(projects);
    return project;
}

function deleteProject(id) {
    const projects = getAllProjects().filter(p => p.id !== id);
    saveAllProjects(projects);
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
        grade: 'pontos',
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

async function getPublicCollages() {
    if (!supabaseConfigured()) return { remoto: false, collages: [] };
    return _toLocalView(await supabaseListQuadros(), true);
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

async function signUp(email, password, username) {
    const sb = _requireSb();
    const check = validateUsername(username);
    if (!check.ok) return { data: null, error: { message: check.error } };

    const free = await isUsernameAvailable(check.value);
    if (!free) return { data: null, error: { message: 'Esse username já está ocupado.' } };

    const { data, error } = await sb.auth.signUp({
        email: String(email || '').trim(),
        password,
        options: {
            data: { username: check.value },
            emailRedirectTo: window.location.origin + window.location.pathname + '#profile'
        }
    });
    if (error) return { data, error: { message: _ptAuthError(error) } };
    // Com "Confirm email" ligado no Supabase, não há sessão até confirmar.
    return { data, error: null, needsConfirmation: !data.session };
}

async function signIn(email, password) {
    const sb = _requireSb();
    const { data, error } = await sb.auth.signInWithPassword({
        email: String(email || '').trim(),
        password
    });
    if (error) return { data, error: { message: _ptAuthError(error) } };
    return { data, error: null };
}

async function signOut() {
    const sb = getSupabase();
    localStorage.removeItem(USER_KEY);
    if (!sb) return { error: null };
    const { error } = await sb.auth.signOut();
    return { error };
}

// Lê a sessão guardada (sem ida à rede) e completa com o perfil.
async function getCurrentUser() {
    const sb = getSupabase();
    if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    if (!session || !session.user) {
        localStorage.removeItem(USER_KEY);
        return null;
    }
    const u = session.user;
    let profile = null;
    try { profile = await getProfileById(u.id); } catch (err) { console.warn('Perfil indisponível:', err); }
    const user = {
        id: u.id,
        email: u.email,
        username: (profile && profile.username) || (u.user_metadata && u.user_metadata.username) || null,
        image: (profile && profile.image) || null,
        bio: (profile && profile.bio) || ''
    };
    localStorage.setItem(USER_KEY, JSON.stringify({ id: user.id, email: user.email, username: user.username, image: user.image }));
    return user;
}

/* ---------- Perfis ---------- */

const PROFILE_COLS = 'id,username,bio,image,created_at';

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
    if (patch.image !== undefined) clean.image = patch.image || null;
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
const BOARD_SELECT = 'id,title,description,image_url,author_id,is_public,created_at,updated_at,' +
    'author:profiles!boards_author_id_fkey(id,username,image),likes(count),retweets(count)';

function _normalizeBoard(row) {
    if (!row) return null;
    const cnt = (v) => Array.isArray(v) && v[0] && typeof v[0].count === 'number' ? v[0].count : 0;
    return {
        id: row.id,
        title: row.title || 'Sem título',
        description: row.description || '',
        image_url: row.image_url || '',
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
        projeto
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

async function deleteCloudBoard(remoteId) {
    _requireUser();
    const { error } = await _requireSb().from('boards').delete().eq('id', remoteId);
    if (error) throw error;
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
    if (term) q = q.ilike('title', '%' + _escapeLike(term) + '%');
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(_normalizeBoard);
}

// Reposts feitos por um utilizador (para o separador "Reposts" do perfil).
async function getUserReposts(userId) {
    const { data, error } = await _requireSb()
        .from('retweets')
        .select('id,comment,created_at,user:profiles!retweets_user_id_fkey(id,username,image),board:boards!retweets_board_id_fkey(' + BOARD_SELECT + ')')
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

async function getProfileStats(userId) {
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

async function getNotifications(limit = 40) {
    const user = _requireUser();
    const sb = _requireSb();
    const [likes, reposts, follows] = await Promise.all([
        sb.from('likes')
            .select('created_at,user:profiles!likes_user_id_fkey(id,username,image),boards!inner(id,title,author_id)')
            .eq('boards.author_id', user.id)
            .neq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit),
        sb.from('retweets')
            .select('created_at,comment,user:profiles!retweets_user_id_fkey(id,username,image),boards!inner(id,title,author_id)')
            .eq('boards.author_id', user.id)
            .neq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit),
        sb.from('follows')
            .select('created_at,user:profiles!follows_follower_id_fkey(id,username,image)')
            .eq('following_id', user.id)
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
