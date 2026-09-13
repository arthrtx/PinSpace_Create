/**
 * ideas.js — Painel "Ideias": busca de feeds Pinterest por tema + ligar feed de um perfil
 */

const PINTEREST_API = 'https://api.pinterest.com/v3/pidgets/users/';

let pinterestActive = null;
let pinterestCacheItems = null;
let pinterestSearch = { q: '', status: '', handle: '', label: '', items: null };

/* ===== Feeds de tópicos do Pinterest (perfis dedicados, verificados como ativos) ===== */

const PINTEREST_CHIPS = ['Praia', 'Comida', 'Gatos', 'Cães', 'Viagens', 'Montanha', 'Casa', 'Moda', 'Carros', 'Espaço', 'Motivação', 'Natal'];

const PINTEREST_TOPICS = [
    { g: 'mar', nome: 'Praia', q: ['praia', 'praias', 'mar', 'oceano', 'litoral'], user: 'beach' },
    { g: 'mar', nome: 'Praias', q: ['praias'], user: 'beaches' },
    { g: 'mar', nome: 'Malha de sol', q: ['nascer do sol', 'pou sol', 'sunset'], user: 'sunrises' },
    { g: 'mar', nome: 'Vela', q: ['velejar', 'vela', 'iate'], user: 'sailing' },
    { g: 'mar', nome: 'Surf', q: ['surf', 'ondas', 'prancha'], user: 'surfboards' },
    { g: 'aventura', nome: 'Montanha', q: ['montanha', 'montanhas', 'pico', 'picos'], user: 'mountains' },
    { g: 'aventura', nome: 'Caminhadas', q: ['caminhada', 'caminhar', 'trilho', 'trilha'], user: 'hiking' },
    { g: 'aventura', nome: 'Acampamento', q: ['acampamento', 'acampar', 'campismo'], user: 'camping' },
    { g: 'viagens', nome: 'Viagens', q: ['viagem', 'viagens', 'viajar', 'turismo', 'destino', 'hotel', 'mochila'], user: 'travel' },
    { g: 'viagens', nome: 'Dicas de viagem', q: ['dicas de viagem', 'travelhacks'], user: 'travelhacks' },
    { g: 'viagens', nome: 'Paris', q: ['paris'], user: 'paris' },
    { g: 'viagens', nome: 'Japão', q: ['japao', 'japones', 'japonesa'], user: 'japan' },
    { g: 'viagens', nome: 'Tóquio', q: ['toquio'], user: 'tokyo' },
    { g: 'viagens', nome: 'Nova Iorque', q: ['nova iorque', 'new york', 'novayork'], user: 'newyork' },
    { g: 'cozinha', nome: 'Comida', q: ['comida', 'cozinha', 'cozinhar', 'receita', 'receitas', 'culinaria'], user: 'foodnetwork' },
    { g: 'cozinha', nome: 'Receitas fáceis', q: ['receitas faceis', 'delish'], user: 'delish' },
    { g: 'cozinha', nome: 'Pizza', q: ['pizza'], user: 'pizza' },
    { g: 'cozinha', nome: 'Pastelaria', q: ['pastelaria', 'bolos', 'bolo', 'padaria', 'doces'], user: 'bakery' },
    { g: 'cozinha', nome: 'Chocolate', q: ['chocolate'], user: 'chocolate' },
    { g: 'cozinha', nome: 'Vinho', q: ['vinho', 'tintos'], user: 'wine' },
    { g: 'cozinha', nome: 'Cocktails', q: ['cocktail', 'cocktails', 'coquetel'], user: 'cocktails' },
    { g: 'cozinha', nome: 'Sopas', q: ['sopa', 'sopas'], user: 'soups' },
    { g: 'cozinha', nome: 'Churrasco', q: ['churrasco', 'grelhados', 'bbq'], user: 'bbq' },
    { g: 'cozinha', nome: 'Vegetariano', q: ['vegetariano', 'vegetariana', 'vegano', 'vegana'], user: 'veganfood' },
    { g: 'cozinha', nome: 'Restaurante', q: ['restaurante', 'restaurantes'], user: 'restaurant' },
    { g: 'cozinha', nome: 'Café', q: ['cafe', 'cafes', 'coffee', 'espresso'], user: 'coffeelovers' },
    { g: 'animais', nome: 'Gatos', q: ['gato', 'gatos'], user: 'cats' },
    { g: 'animais', nome: 'Gatinhos', q: ['gatinho', 'gatinhos'], user: 'kittens' },
    { g: 'animais', nome: 'Cães', q: ['cao', 'caes', 'cachorro', 'cachorros'], user: 'dogs' },
    { g: 'animais', nome: 'Cachorrinhos', q: ['cachorrinho', 'puppies'], user: 'puppies' },
    { g: 'animais', nome: 'Animais selvagens', q: ['animal', 'animais', 'selvagem', 'wildlife', 'fauna'], user: 'wildlife' },
    { g: 'animais', nome: 'Vida na quinta', q: ['quinta', 'fazenda', 'rural'], user: 'farmlife' },
    { g: 'plantas', nome: 'Plantas', q: ['planta', 'plantas'], user: 'plants' },
    { g: 'plantas', nome: 'Flores', q: ['flor', 'flores', 'ramo'], user: 'flowers' },
    { g: 'plantas', nome: 'Jardim', q: ['jardim', 'jardinagem', 'horta'], user: 'gardening' },
    { g: 'plantas', nome: 'Bonsai', q: ['bonsai'], user: 'bonsai' },
    { g: 'casa', nome: 'Decoração', q: ['decoracao', 'decorar', 'casa', 'lar'], user: 'housebeautiful' },
    { g: 'casa', nome: 'Interior', q: ['interior', 'interiores'], user: 'interiordesign' },
    { g: 'casa', nome: 'Arquitetura', q: ['arquitetura', 'arca'], user: 'architecture' },
    { g: 'casa', nome: 'Micro-casas', q: ['micro-casas', 'tinyhouse', 'tiny houses'], user: 'tinyhouses' },
    { g: 'casa', nome: 'Cabanas', q: ['cabana', 'cabanas', 'madeira', 'rustico'], user: 'logcabin' },
    { g: 'moda', nome: 'Moda', q: ['moda', 'roupa', 'roupas', 'estilo', 'look', 'sapatos', 'sapatilhas'], user: 'fashion' },
    { g: 'moda', nome: 'Tendências', q: ['tendencia', 'tendencias', 'instyle'], user: 'instyle' },
    { g: 'saude', nome: 'Corrida', q: ['corrida', 'correr', 'jogging', 'maratona'], user: 'running' },
    { g: 'saude', nome: 'Ciclismo', q: ['ciclismo', 'bicicleta', 'bike', 'pedalar'], user: 'cycling' },
    { g: 'saude', nome: 'Saúde', q: ['saude', 'bem estar', 'bem-estar', 'wellness'], user: 'health' },
    { g: 'motivacao', nome: 'Motivação', q: ['motivacao', 'frases', 'citacoes', 'inspiracao', 'positividade'], user: 'motivational' },
    { g: 'motivacao', nome: 'Reflexão', q: ['reflexao', 'brainpickings'], user: 'brainpickings' },
    { g: 'celebracoes', nome: 'Casamento', q: ['casamento', 'noiva', 'noivas', 'boda'], user: 'weddings' },
    { g: 'celebracoes', nome: 'Natal', q: ['natal', 'presepio', 'consoada'], user: 'christmas' },
    { g: 'celebracoes', nome: 'Páscoa', q: ['pascoa', 'ovos de pascoa'], user: 'easter' },
    { g: 'carros', nome: 'Carros', q: ['carro', 'carros', 'automovel', 'automoveis', 'desportivo'], user: 'tesla' },
    { g: 'espaco', nome: 'Espaço', q: ['espaco', 'astronomia', 'foguetes', 'planetas', 'universo', 'nasa'], user: 'nasa' },
    { g: 'tech', nome: 'Tecnologia', q: ['tecnologia', 'gadgets', 'telemovel', 'computador', 'computadores'], user: 'gearpatrol' },
    { g: 'estilo', nome: 'Minimalismo', q: ['minimalismo', 'minimalista', 'zen'], user: 'minimalism' },
    { g: 'diy', nome: 'DIY', q: ['diy', 'artesanato', 'manualidades', 'reciclar'], user: 'diy' },
    { g: 'foto', nome: 'Fotografia', q: ['fotografia', 'fotos', 'fotografo'], user: 'photography' },
    { g: 'design', nome: 'Design', q: ['design', 'designer'], user: 'design' }
];

function _normText(str) {
    return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function matchPinterestTopic(query) {
    const q = _normText(query);
    if (!q) return null;
    const hits = [];
    PINTEREST_TOPICS.forEach(t => {
        t.q.forEach(kw => {
            const k = _normText(kw);
            if (q.includes(k)) hits.push({ topic: t, len: k.length });
        });
    });
    if (!hits.length) return null;
    hits.sort((a, b) => b.len - a.len);
    const best = hits[0].topic;
    const related = PINTEREST_TOPICS.filter(x => x.g === best.g && x !== best);
    return { best, related };
}

/* ===== Painel ===== */

function getIdeiasPanelHTML() {
    return `
        <div class="panel-section ideias-search-section">
            <div class="ico-field">
                <span class="search-ico">🔎</span>
                <form id="form-pesquisa-ideias">
                    <input type="text" id="pesquisa-query" placeholder="Pesquisar tema ou perfil…" autocomplete="off">
                    <button class="btn btn-primary btn-ico" id="btn-pesquisar" type="submit">Buscar</button>
                </form>
            </div>
            <div class="ideias-chips" id="ideias-chips"></div>
            <p class="panel-hint" id="pesquisa-status" style="margin-top:10px"></p>
            <div class="feed-related" id="pesquisa-relacionados"></div>
            <div id="pesquisa-feed" style="margin-top:4px"></div>
        </div>
        <div class="panel-divider"></div>
        <div class="panel-section">
            <div class="section-title"><span class="sec-ico">📌</span><h4>Feed do Pinterest</h4></div>
            <p class="panel-hint">Ligue um perfil para ver o feed público de pins. Contas com tabuleiros privados não são mostradas.</p>
            <div class="form-group" style="margin-bottom:8px">
                <input type="text" id="pin-user" placeholder="Utilizador ou link do perfil…" autocomplete="off">
            </div>
            <button class="btn btn-primary" id="btn-ligar-pinterest" style="width:100%">🔗 Ligar perfil</button>
            <button class="btn btn-secondary" id="btn-desligar-pinterest" style="width:100%;margin-top:8px;display:none">✖ Sair do feed</button>
            <p class="panel-hint" id="pin-status" style="margin-top:8px"></p>
            <div id="pinterest-feed" style="margin-top:8px"></div>
        </div>
    `;
}

function bindIdeiasPanelEvents(panel, callbacks) {
    bindPinterestSearchEvents(panel, callbacks);
    bindPinterestEvents(panel, panel.querySelector('#pinterest-feed'), callbacks);
}

/* ===== Pesquisa por tema (feed do perfil dedicado) ===== */

async function searchPinterest(query, statusEl, feedEl, relatedEl, callbacks) {
    const q = String(query || '').trim();
    if (feedEl) feedEl.innerHTML = '';
    if (relatedEl) relatedEl.innerHTML = '';
    if (!q) {
        if (statusEl) statusEl.textContent = 'Escreva um tema ou o nome de um perfil de Pinterest.';
        return;
    }
    if (statusEl) statusEl.textContent = 'A pesquisar "' + q + '"…';

    let user = null;
    let nome = null;
    let special = null;
    const match = matchPinterestTopic(q);
    if (match) {
        user = match.best.user;
        nome = match.best.nome;
        special = match;
    } else if (/^[A-Za-z0-9_.-]+$/.test(q)) {
        user = q;
        nome = null;
    } else {
        if (statusEl) statusEl.textContent = 'Não encontrei um tema com o nome "' + q + '". Escolha um chip em destaque ou escreva o nome de um perfil (ex.: nasa, disney).';
        if (feedEl) feedEl.innerHTML = '';
        return;
    }

    if (statusEl) statusEl.textContent = 'A carregar o feed de @' + user + '…';
    try {
        const pins = await fetchPinterestFeed(user);
        if (!pins || !pins.length) throw new Error('feed vazio');
        const handle = '@' + user;
        const label = nome ? nome + ' · feed Pinterest' : (nome || 'Feed do Pinterest');
        const items = pins.map(pin => ({
            id: pin.id,
            thumb: pinThumbUrl(pin),
            full: pinFullUrl(pin),
            bak: pinThumbUrl(pin),
            label: pinDesc(pin, label)
        }));
        renderFeedGrid(feedEl, items, callbacks, handle, label);
        pinterestSearch = { q, status: 'Feed de ' + handle + ' · ' + items.length + ' pins', handle, label, items };
        if (statusEl) statusEl.textContent = pinterestSearch.status;

        if (special && special.related.length && relatedEl) {
            relatedEl.innerHTML = 'Outros feeds: ' + special.related.slice(0, 5).map(r =>
                '<button type="button" class="idea-chip" data-user="' + escapeHTML(r.user) + '">@' + escapeHTML(r.user) + '</button>'
            ).join('');
            relatedEl.querySelectorAll('[data-user]').forEach(ch => {
                ch.addEventListener('click', () => {
                    if (statusEl) statusEl.textContent = 'A carregar o feed de @' + ch.dataset.user + '…';
                    searchPinterest('@' + ch.dataset.user, statusEl, feedEl, relatedEl, callbacks);
                });
            });
        }
    } catch (err) {
        console.warn('Pesquisa Pinterest:', err);
        if (statusEl) statusEl.textContent = 'Sem resultados para "' + q + '". Verifique o termo e a ligação à internet.';
        if (feedEl) feedEl.innerHTML = '';
    }
}

function bindPinterestSearchEvents(panel, callbacks) {
    const input = panel.querySelector('#pesquisa-query');
    const form = panel.querySelector('#form-pesquisa-ideias');
    const status = panel.querySelector('#pesquisa-status');
    const feed = panel.querySelector('#pesquisa-feed');
    const related = panel.querySelector('#pesquisa-relacionados');
    const chips = panel.querySelector('#ideias-chips');

    const run = () => searchPinterest(input ? input.value : '', status, feed, related, callbacks);

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        run();
    });
    if (chips) {
        chips.innerHTML = PINTEREST_CHIPS.map(c => '<button type="button" class="idea-chip">' + escapeHTML(c) + '</button>').join('');
        chips.querySelectorAll('.idea-chip').forEach(ch => {
            ch.addEventListener('click', () => {
                if (input) input.value = ch.textContent;
                run();
            });
        });
    }

    if (pinterestSearch.items && feed) {
        renderFeedGrid(feed, pinterestSearch.items, callbacks, pinterestSearch.handle, pinterestSearch.label);
        if (status) status.textContent = pinterestSearch.status;
    }
}

/* ===== Ligar feed de um perfil ===== */

function bindPinterestEvents(panel, feedEl, callbacks) {
    const input = panel.querySelector('#pin-user');
    const btn = panel.querySelector('#btn-ligar-pinterest');
    const btnOut = panel.querySelector('#btn-desligar-pinterest');
    const status = panel.querySelector('#pin-status');

    const connect = () => {
        if (feedEl) feedEl.innerHTML = '';
        connectPinterest(input, feedEl, callbacks, status, btnOut);
    };
    btn?.addEventListener('click', connect);
    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') connect();
    });
    btnOut?.addEventListener('click', () => {
        pinterestActive = null;
        pinterestCacheItems = null;
        btnOut.style.display = 'none';
        if (status) status.textContent = '';
        if (input) input.value = '';
        if (feedEl) feedEl.innerHTML = '';
    });

    if (pinterestActive && pinterestCacheItems && feedEl) {
        renderFeedGrid(feedEl, pinterestCacheItems, callbacks, '@' + pinterestActive, 'Feed do Pinterest');
        if (btnOut) btnOut.style.display = 'block';
        if (status) status.textContent = 'Feed de @' + pinterestActive + ' · ' + pinterestCacheItems.length + ' pins.';
    }
}

async function connectPinterest(input, feedEl, callbacks, status, btnOut) {
    const user = pinterestUsername(input ? input.value : '');
    if (!user) {
        if (status) status.textContent = 'Indique um utilizador ou link de perfil. Ex.: pinterest.com/meunome';
        return;
    }
    if (status) status.textContent = 'A ligar ao feed de @' + user + '…';
    if (feedEl) feedEl.innerHTML = '<p class="empty-state">A carregar o feed…</p>';
    try {
        const pins = await fetchPinterestFeed(user);
        if (!pins || !pins.length) throw new Error('feed vazio');
        const handle = '@' + user;
        const items = pins.map(pin => ({
            id: pin.id,
            thumb: pinThumbUrl(pin),
            full: pinFullUrl(pin),
            bak: pinThumbUrl(pin),
            label: pinDesc(pin, handle)
        }));
        renderFeedGrid(feedEl, items, callbacks, handle, 'Feed do Pinterest');
        pinterestActive = user;
        pinterestCacheItems = items;
        if (btnOut) btnOut.style.display = 'block';
        if (status) status.textContent = 'Feed de ' + handle + ' · ' + items.length + ' pins. Clique numa imagem para a adicionar.';
    } catch (err) {
        console.warn('Pinterest:', err);
        if (status) status.textContent = 'Não foi possível ligar o feed. Verifique o utilizador e a ligação à internet.';
        if (feedEl) feedEl.innerHTML = '';
    }
}

function pinterestUsername(input) {
    let s = String(input || '').trim().replace(/\/+$/, '');
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) {
        const m = s.match(/pinterest\.[a-z.]+(?::\d+)?\/([^/?#]+)/i);
        return m ? m[1] : null;
    }
    return /^[A-Za-z0-9_.-]+$/.test(s) ? s : null;
}

async function fetchPinterestFeed(user) {
    const res = await fetch(PINTEREST_API + encodeURIComponent(user) + '/pins/?limit=100');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.status !== 'success') throw new Error(json.message || 'erro');
    return (json.data && json.data.pins) || [];
}

function pinThumbUrl(pin) {
    const imgs = pin.images || {};
    return (imgs['236x'] && imgs['236x'].url) || (imgs['564x'] && imgs['564x'].url) || '';
}

function pinFullUrl(pin) {
    const imgs = pin.images || {};
    const keys = ['564x', '237x', '236x'];
    for (const k of keys) {
        const u = imgs[k] && imgs[k].url;
        if (u) return toOriginalUrl(u);
    }
    return '';
}

function toOriginalUrl(u) {
    return u.replace(/\/(\d+[a-z]?x(?:_RS)?)\//i, '/originals/');
}

function pinDesc(pin, label) {
    return (pin.description || '').trim() || label;
}

/* ===== Renderização do feed ===== */

function toShort(s) {
    s = String(s || '');
    return s.length > 70 ? s.slice(0, 67) + '…' : s;
}

function renderFeedGrid(container, items, callbacks, handle, label) {
    if (!container) return;
    const cards = items.map(it => `
        <button class="idea-card" data-url="${escapeHTML(it.full)}" data-bak="${escapeHTML(it.bak || it.full)}" data-label="${escapeHTML(toShort(it.label))}" title="Adicionar esta imagem">
            <img src="${escapeHTML(it.thumb)}" loading="lazy" alt="" onerror="this.closest('.idea-card').classList.add('broken')">
            <span class="idea-card-author">${escapeHTML(toShort(it.label))}</span>
            <span class="idea-card-badge pin">P</span>
        </button>
    `).join('');
    const initial = String(handle || '?').replace('@', '').charAt(0).toUpperCase() || '?';
    container.innerHTML = `
        <div class="feed-head">
            <span class="feed-avatar">${escapeHTML(initial)}</span>
            <div class="feed-meta">
                <span class="feed-handle">${escapeHTML(handle || '')}</span>
                <span class="feed-name">${escapeHTML(label || 'Feed do Pinterest')}</span>
            </div>
            <span class="feed-count">${items.length} pins</span>
        </div>
        <div class="ideas-grid">${cards}</div>
    `;
    container.querySelectorAll('.idea-card').forEach(card => {
        card.addEventListener('click', () => {
            if (card.classList.contains('broken')) {
                callbacks.onImportImage?.();
                return;
            }
            callbacks.onAddIdeaImage?.(card.dataset.url, card.dataset.label, card.dataset.bak || card.dataset.url);
        });
    });
}

/* ===== Auxiliares de imagem ===== */

function downscaleImageToDataURL(url, maxDim = 1400) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            const scale = Math.min(1, maxDim / Math.max(nw, nh));
            const w = Math.max(1, Math.round(nw * scale));
            const h = Math.max(1, Math.round(nh * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.92));
        };
        img.onerror = () => reject(new Error('Falha ao carregar imagem (' + url + ')'));
        img.src = url;
    });
}

function weservProxy(url, maxDim) {
    const passthrough = String(url).replace(/^https?:\/\//i, '');
    return 'https://images.weserv.nl/?url=' + encodeURIComponent(passthrough) + '&w=' + maxDim;
}

function fetchImageDataURL(urls, maxDim = 1400) {
    const list = Array.isArray(urls) ? urls : [urls];
    const attempts = [];
    list.forEach(u => {
        if (u) {
            attempts.push(downscaleImageToDataURL(u, maxDim));
            attempts.push(downscaleImageToDataURL(weservProxy(u, maxDim), maxDim));
        }
    });
    if (!attempts.length) return Promise.reject(new Error('sem URL'));
    return attempts.reduce((prev, p) => prev.catch(() => p), Promise.reject());
}