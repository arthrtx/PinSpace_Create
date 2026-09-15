/**
 * public.js — Como o feed de quadros públicos fala com o mundo.
 *
 * Camadas (tenta por ordem, primeiro que funcionar):
 *   1. Supabase  → funções de js/supabase.js (base na nuvem, receive via Supabase)
 *   2. server.py → /api/public (modo desenvolvimento, corrido localmente)
 *   3. Seed      → assets/quadros-publicos.json (SEMPRE no site, mesmo em estático)
 *
 * O resto da app só conhece ESTE ficheiro. Assim quem abrir o site publicado
 * (sem app, sem pasta data/, sem servidor) já VÊ os quadros públicos.
 */

function publicApiBase() {
    return '/api';
}

async function _publicFetch(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
}

/* Seed estático — sempre disponível, carregado do que o 76 ficar guardado
 * em assets/quadros-publicos.json (gerado pelo server.py no arranque). */
let _seedCache = null;

async function _loadSeed() {
    if (_seedCache) return _seedCache;
    const res = await fetch('assets/quadros-publicos.json');
    if (!res.ok) return null;
    _seedCache = await res.json();
    return _seedCache;
}

/* Converte para o formato que ui.renderPublicList espera:
 * { collages: [{id, titulo, autor, thumb, atualizado}], remoto } */
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
    // 1. Supabase (nuvem) — lê os quadros públicos lá guardados
    if (supabaseConfigured()) {
        try {
            return _toLocalView(await supabaseListQuadros(), true);
        } catch (_) { /* cai para a camada seguinte */ }
    }
    // 2. Server local (projeto completo só está ali)
    try {
        const data = await _publicFetch(publicApiBase() + '/public');
        return _toLocalView(data.collages || [], true);
    } catch (_) { /* cai para o seed */ }
    // 3. Seed estático (SEMPRE disponível — quem abre o site publicado vê isto)
    const seed = await _loadSeed();
    if (seed && Array.isArray(seed)) {
        return _toLocalView(seed, false);
    }
    return { remoto: false, collages: [] };
}

async function getPublicCollage(id) {
    // 1. Supabase
    if (supabaseConfigured()) {
        try {
            const row = await supabaseGetQuadro(id);
            if (row) return { collage: row.projeto || {} };
        } catch (_) {}
    }
    // 2. Server local
    try {
        const data = await _publicFetch(publicApiBase() + '/public/' + encodeURIComponent(id));
        if (data.collage && data.collage.projeto) return { collage: data.collage.projeto };
        if (data.collage) return { collage: data.collage };
    } catch (_) {}
    // 3. Seed — só temos os metadados guardados em assets/
    const seed = await _loadSeed();
    const item = Array.isArray(seed) && seed.find(x => x.id === id);
    if (item) return { collage: item.projeto || {} };
    throw new Error('Quadro não encontrado');
}

async function publishPublicCollage(payload) {
    const publicId = payload.publicId || null;
    // 1. Supabase (se tiveres configurado)
    if (supabaseConfigured()) {
        try {
            const res = await supabasePublicarQuadro(publicId, payload);
            return res;
        } catch (_) { /* cai para o server local */ }
    }
    // 2. Server local
    const data = await _publicFetch(publicApiBase() + '/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return { id: data.id };
}

async function deletePublicCollage(id) {
    // 1. Supabase
    if (supabaseConfigured()) {
        try {
            await supabaseApagarQuadro(id);
            return true;
        } catch (_) {}
    }
    // 2. Server local
    await _publicFetch(publicApiBase() + '/public/' + encodeURIComponent(id), { method: 'DELETE' });
    return true;
}

function publicServerAvailable() {
    return supabaseConfigured() || !!window.PUBLIC_API_OK;
}
