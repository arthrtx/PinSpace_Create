/**
 * public.js — Como o feed de quadros públicos fala com o mundo.
 *
 * Base de dados única: Supabase (js/supabase.js). O resto da app só conhece
 * ESTE ficheiro.
 */

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
    if (!supabaseConfigured()) return { remoto: false, collages: [] };
    return _toLocalView(await supabaseListQuadros(), true);
}

async function getPublicCollage(id) {
    if (supabaseConfigured()) {
        const row = await supabaseGetQuadro(id);
        if (row) return { collage: row.projeto || {} };
    }
    throw new Error('Quadro não encontrado');
}

async function publishPublicCollage(payload) {
    if (!supabaseConfigured()) {
        throw new Error('Base de dados (Supabase) não está configurada.');
    }
    return await supabasePublicarQuadro(payload, payload.publicId || null);
}

async function deletePublicCollage(id) {
    if (!supabaseConfigured()) {
        throw new Error('Base de dados (Supabase) não está configurada.');
    }
    await supabaseApagarQuadro(id);
    return true;
}

function publicServerAvailable() {
    return supabaseConfigured();
}
