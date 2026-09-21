/**
 * supabase.js — Quadros públicos numa base na nuvem (Supabase REST, sem SDK).
 * Usa o contrato de js/public.js para o resto do app não saber
 * (nem precisar de saber) os detalhes da base de dados.
 *
 * Tabela esperada: public.quadros  (ver supabase-config.js para o SQL setup).
 */

function supabaseConfigured() {
    const c = window.SUPABASE_CONFIG || {};
    return !!(c.url && c.anonKey);
}

async function _supabaseFetch(method, table, query, body) {
    const c = window.SUPABASE_CONFIG;
    const headers = {
        'apikey': c.anonKey,
        'Authorization': 'Bearer ' + c.anonKey,
        'Content-Type': 'application/json'
    };
    const res = await fetch(c.url + '/rest/v1/' + table + (query || ''), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
        let extra = '';
        try { extra = ' — ' + (await res.text()).slice(0, 200); } catch {}
        throw new Error('Supabase HTTP ' + res.status + extra);
    }
    if (method === 'GET') return await res.json();
    return null;
}

async function supabaseListQuadros() {
    // ordena por publicação mais recente primeiro
    return _supabaseFetch('GET', 'quadros', '?select=*&order=publicado.desc');
}

async function supabaseGetQuadro(id) {
    const rows = await _supabaseFetch('GET', 'quadros', '?id=eq.' + encodeURIComponent(id) + '&select=*');
    return rows && rows[0] ? rows[0] : null;
}

async function supabasePublicarQuadro(payload, publicId) {
    if (payload.termosAceitos !== true) {
        throw new Error('É necessário aceitar os termos e condições para publicar.');
    }
    const check = validateAuthorName(payload.autor);
    if (!check.ok) throw new Error(check.error);
    const id = publicId || ('pub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
    const row = {
        id,
        titulo: String(payload.titulo || 'Sem título'),
        autor: check.value,
        thumb: String(payload.thumb || ''),
        projeto: payload.projeto || {},
        publicado: new Date().toISOString()
    };
    const UPSEARCH = '?on_conflict=id';
    await _supabaseFetch('POST', 'quadros' + UPSEARCH, '', row);
    return { id };
}

async function supabaseApagarQuadro(id) {
    await _supabaseFetch('DELETE', 'quadros', '?id=eq.' + encodeURIComponent(id));
    return true;
}
