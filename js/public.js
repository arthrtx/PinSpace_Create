/**
 * public.js — Comunicação com o servidor de quadros públicos (server.py)
 * Endpoints same-origin: /api/public (lista), /api/public/<id> (GET/DELETE), /api/public (POST publicar)
 */

function publicApiBase() {
    return '/api';
}

async function _publicFetch(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
}

async function getPublicCollages() {
    return _publicFetch(publicApiBase() + '/public');
}

async function getPublicCollage(id) {
    return _publicFetch(publicApiBase() + '/public/' + encodeURIComponent(id));
}

async function publishPublicCollage(payload) {
    return _publicFetch(publicApiBase() + '/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

async function deletePublicCollage(id) {
    return _publicFetch(publicApiBase() + '/public/' + encodeURIComponent(id), { method: 'DELETE' });
}

function publicServerAvailable() {
    return !!window.PUBLIC_API_OK;
}