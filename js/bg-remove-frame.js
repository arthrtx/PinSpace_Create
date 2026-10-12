// Corre dentro de bg-remove.html (iframe escondido). A biblioteca de remoção de
// fundo precisa de "eval", por isso fica isolada aqui e o site principal mantém
// as regras de segurança completas. Só responde à página do próprio site.
const LIB = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.7/+esm';
const ORIGIN = location.origin;
let modPromise = null;
const lib = () => modPromise || (modPromise = import(LIB));

function cleanConfig(c, id) {
    c = c && typeof c === 'object' ? c : {};
    const device = c.device === 'gpu' ? 'gpu' : 'cpu';
    const model = ['isnet', 'isnet_fp16', 'isnet_quint8'].includes(c.model) ? c.model : 'isnet_quint8';
    return {
        device,
        model,
        output: { format: 'image/png', quality: 1 },
        progress: (key, cur, total) => parent.postMessage({ id, progress: [String(key), +cur || 0, +total || 0] }, ORIGIN)
    };
}

window.addEventListener('message', async (e) => {
    if (e.origin !== ORIGIN || e.source !== parent) return;
    const msg = e.data || {};
    if (typeof msg.id !== 'number' || !['preload', 'remove'].includes(msg.op)) return;
    const cfg = cleanConfig(msg.config, msg.id);
    try {
        const m = await lib();
        if (msg.op === 'preload') {
            if (m.preload) await m.preload(cfg);
            parent.postMessage({ id: msg.id, ok: true }, ORIGIN);
        } else {
            if (!(msg.blob instanceof Blob) || msg.blob.size > 40 * 1024 * 1024) throw new Error('Imagem inválida');
            const out = await m.removeBackground(msg.blob, cfg);
            parent.postMessage({ id: msg.id, ok: true, blob: out }, ORIGIN);
        }
    } catch (err) {
        parent.postMessage({ id: msg.id, error: String((err && err.message) || err) }, ORIGIN);
    }
});

parent.postMessage({ bgReady: true }, ORIGIN);
