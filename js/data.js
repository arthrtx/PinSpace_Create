const STORAGE_KEY = 'pinspace_projects';
const SETTINGS_KEY = 'pinspace_settings';

function getAllProjects() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveAllProjects(projects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function saveProject(project) {
    const projects = getAllProjects();
    const index = projects.findIndex(p => p.id === project.id);

    project.ultimaEdicao = new Date().toISOString();

    if (index >= 0) {
        projects[index] = project;
    } else {
        projects.unshift(project);
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

// Ler é público: a policy só deixa o anon key fazer select.
// Nunca pedimos owner_token, para não expor o token de ninguém.
async function _restGet(path) {
    const res = await fetch(restUrl(path), {
        headers: {
            apikey: window.SUPABASE_CONFIG.anonKey,
            Authorization: 'Bearer ' + window.SUPABASE_CONFIG.anonKey
        }
    });
    if (!res.ok) throw new Error('Não foi possível ler os quadros.');
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
