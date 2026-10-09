/* =====================================================================
   PinSpace — widgets da galeria (landing)
   Relógio, "Continuar a editar", paleta, dicas, cartão "Em destaque"
   em carrossel, chips de secção e doca de atalhos.
   ===================================================================== */

const HW_PALETTE = [
    { name: 'Terracota', hex: '#E60023' },
    { name: 'Musgo', hex: '#6E7F47' },
    { name: 'Mostarda', hex: '#D8A33B' },
    { name: 'Céu', hex: '#5D8296' },
    { name: 'Índigo', hex: '#1E2A42' },
    { name: 'Creme', hex: '#F6F5F1' }
];

const HW_TIPS = [
    'Arrasta imagens diretamente do computador (ou de outra página) para o quadro.',
    'Ctrl + D duplica o elemento selecionado; Ctrl + Z desfaz.',
    'Usa a roda do rato sobre um texto para mudar o tamanho da letra.',
    'Em Ferramentas → Colagem automática, as imagens organizam-se sozinhas.',
    'Seleciona uma imagem e usa “Remover fundo” para recortes limpos.',
    'Torna um quadro público em Ajustes → Conta e perfil para aparecer no teu perfil.',
    'Shift + setas move o elemento 10 px de cada vez.',
    'Exporta em PNG para máxima qualidade, ou em PDF para imprimir.'
];

class HomeWidgets {
    constructor(app) {
        this.app = app;
        this.featured = [];
        this.featIndex = 0;
        this._featTimer = null;
        this._featLoadedAt = 0;
        this._tipIndex = Math.floor(Math.random() * HW_TIPS.length);
    }

    $(id) { return document.getElementById(id); }

    init() {
        this._startClock();
        this._renderWeather();
        this._renderTip();
        this._bindDock();
        this._bindChips();
        this._bindFeatured();
    }

    // Chamado sempre que a landing é mostrada.
    refresh() {
        this.refreshLocal();
        if (Date.now() - this._featLoadedAt > 15000) this.loadFeatured();
        else this._startAutoplay();
    }

    /* ---------- Relógio (enfeite útil) ---------- */
    _startClock() {
        const tick = () => {
            const now = new Date();
            const t = this.$('w-clock-time');
            const d = this.$('w-clock-date');
            if (t) t.textContent = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' });
            if (d) d.textContent = now.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Lisbon' });
        };
        tick();
        setInterval(tick, 15000);
    }

    /* ---------- Continuar a editar ---------- */
    refreshLocal() {
        const projects = getAllProjects()
            .slice()
            .sort((a, b) => String(b.ultimaEdicao || '').localeCompare(String(a.ultimaEdicao || '')));
        const stat = this.$('w-stat-local');
        if (stat) stat.textContent = projects.length;

        const list = this.$('w-continue');
        if (!list) return;
        if (!projects.length) {
            list.innerHTML = `<li class="gw-list-empty">Ainda não tens nenhum quadro.
                <button type="button" class="gw-mini" data-dock="new">começar →</button></li>`;
            return;
        }
        list.innerHTML = projects.slice(0, 4).map(p => `
            <li>
                <button type="button" class="gw-list-item" data-open-local="${escapeHTML(p.id)}">
                    <span class="gw-list-thumb">${p.thumbnail ? `<img src="${p.thumbnail}" alt="">` : '📌'}</span>
                    <span class="gw-list-text">
                        <strong>${escapeHTML(p.titulo || 'Sem título')}</strong>
                        <small>editado ${typeof timeAgo === 'function' ? timeAgo(p.ultimaEdicao) : formatDate(p.ultimaEdicao)}</small>
                    </span>
                    <span class="gw-play" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg></span>
                </button>
            </li>`).join('');
        list.querySelectorAll('[data-open-local]').forEach(btn => {
            btn.addEventListener('click', () => this.app.openProject(btn.dataset.openLocal));
        });
    }

    /* ---------- Previsão do tempo (Lisboa, Open-Meteo, sem chave) ---------- */
    async _renderWeather() {
        const box = this.$('w-weather');
        if (!box) return;
        const KEY = 'ps_weather_lx';
        let data = null;
        try {
            const c = JSON.parse(sessionStorage.getItem(KEY) || 'null');
            if (c && Date.now() - c.t < 30 * 60 * 1000) data = c.d;
        } catch { /* sem cache */ }
        if (!data) {
            try {
                const url = 'https://api.open-meteo.com/v1/forecast?latitude=38.72&longitude=-9.14'
                    + '&current=temperature_2m,weather_code,is_day'
                    + '&daily=weather_code,temperature_2m_max,temperature_2m_min'
                    + '&timezone=Europe%2FLisbon&forecast_days=5';
                const r = await fetch(url);
                if (!r.ok) throw new Error(r.status);
                data = await r.json();
                try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: data })); } catch { /* ok */ }
            } catch {
                this.$('w-weather-desc').textContent = 'previsão indisponível';
                return;
            }
        }
        const W = (code, day = 1) => {
            const c = Number(code);
            if (c === 0) return [day ? '☀️' : '🌙', 'Céu limpo'];
            if (c <= 2) return [day ? '🌤️' : '☁️', 'Pouco nublado'];
            if (c === 3) return ['☁️', 'Nublado'];
            if (c <= 48) return ['🌫️', 'Nevoeiro'];
            if (c <= 57) return ['🌦️', 'Chuvisco'];
            if (c <= 67) return ['🌧️', 'Chuva'];
            if (c <= 77) return ['❄️', 'Neve'];
            if (c <= 82) return ['🌦️', 'Aguaceiros'];
            if (c <= 86) return ['🌨️', 'Neve'];
            return ['⛈️', 'Trovoada'];
        };
        const cur = data.current || {};
        const d = data.daily || {};
        const [ico, desc] = W(cur.weather_code, cur.is_day);
        const temp = Math.round(cur.temperature_2m);
        this.$('w-weather-icon').textContent = ico;
        this.$('w-weather-temp').textContent = `${temp}°`;
        this.$('w-weather-desc').textContent = desc;
        if (d.temperature_2m_max) {
            this.$('w-weather-hl').textContent = `↑${Math.round(d.temperature_2m_max[0])}° ↓${Math.round(d.temperature_2m_min[0])}°`;
        }
        const fmt = new Intl.DateTimeFormat('pt-PT', { weekday: 'short', timeZone: 'Europe/Lisbon' });
        this.$('w-weather-days').innerHTML = (d.time || []).slice(1, 5).map((t, k) => {
            const i = k + 1;
            const [di, dd] = W(d.weather_code[i]);
            const nome = fmt.format(new Date(t + 'T12:00:00')).replace('.', '').slice(0, 3);
            return `<li title="${dd}"><span>${nome}</span><i aria-hidden="true">${di}</i><b>${Math.round(d.temperature_2m_max[i])}°</b></li>`;
        }).join('');
        // o "22°C · Lisboa" do topo passa a mostrar a temperatura real
        const heroStat = [...document.querySelectorAll('.ms-stat')].find(s => /lisboa/i.test(s.textContent));
        if (heroStat && Number.isFinite(temp)) heroStat.querySelector('b').textContent = `${temp}°C`;
    }

    /* ---------- Dicas ---------- */
    _renderTip() {
        const p = this.$('w-tip');
        if (p) p.textContent = HW_TIPS[this._tipIndex % HW_TIPS.length];
        this.$('w-tip-next')?.addEventListener('click', () => {
            this._tipIndex++;
            const el = this.$('w-tip');
            if (!el) return;
            el.classList.remove('gw-fade');
            void el.offsetWidth;
            el.textContent = HW_TIPS[this._tipIndex % HW_TIPS.length];
            el.classList.add('gw-fade');
        });
    }

    /* ---------- Doca e chips ---------- */
    _scroller() { return document.querySelector('.home-container'); }

    _scrollTo(el) {
        const sc = this._scroller();
        if (!sc || !el) return;
        const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 24;
        if (window.psScrollTo) window.psScrollTo(Math.max(0, top));
        else sc.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }

    _bindDock() {
        document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-dock]');
            if (!el || !document.getElementById('home-view')?.contains(el)) return;
            const act = el.dataset.dock;
            if (act === 'top') {
                e.preventDefault();
                const sc = this._scroller();
                if (window.psScrollTo) window.psScrollTo(0);
                else if (sc) sc.scrollTo({ top: 0, behavior: 'smooth' });
            }
            else if (act === 'new') { this.app.ui.openNewProjectModal(this.app.ui.sizePresets()); }
            else if (act === 'open') { this.app._showOpenModal(); }
            else if (act === 'profile') {
                e.preventDefault();
                const u = this.app.currentUser;
                window.location.hash = u ? '#profile/' + encodeURIComponent(u.username || '') : '#profile';
            }
        });
    }

    _bindChips() {
        document.querySelectorAll('.gw-chip[data-chip]').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.gw-chip[data-chip]').forEach(c => c.classList.toggle('active', c === chip));
                const target = chip.dataset.chip === 'all'
                    ? document.querySelector('.glass-window')
                    : document.getElementById(chip.dataset.chip);
                this._scrollTo(target);
            });
        });
    }

    /* ---------- Em destaque (carrossel) ---------- */
    _bindFeatured() {
        this.$('w-featured-prev')?.addEventListener('click', () => { this._go(-1); this._startAutoplay(); });
        this.$('w-featured-next')?.addEventListener('click', () => { this._go(1); this._startAutoplay(); });
        this.$('w-featured-open')?.addEventListener('click', () => {
            const item = this.featured[this.featIndex];
            if (!item) return;
            if (item.legacy) this.app._openPublic(item.id);
            else this.app.openCloudBoard(item.id);
        });
        const card = this.$('w-featured');
        card?.addEventListener('mouseenter', () => this._stopAutoplay());
        card?.addEventListener('mouseleave', () => this._startAutoplay());
        this.$('w-featured-dots')?.addEventListener('click', (e) => {
            const d = e.target.closest('[data-dot]');
            if (!d) return;
            this.featIndex = +d.dataset.dot;
            this._renderFeatured();
            this._startAutoplay();
        });
    }

    async loadFeatured() {
        this._featLoadedAt = Date.now();
        try {
            const { items } = await getExploreAll('', 12);
            const stat = this.$('w-stat-public');
            if (stat) stat.textContent = items.length;
            // Os que têm miniatura primeiro, para o cartão ficar bonito.
            this.featured = [...items.filter(i => safeImgSrc(i.image_url)), ...items.filter(i => !safeImgSrc(i.image_url))].slice(0, 6);
        } catch (err) {
            console.warn('Destaques indisponíveis:', err);
            this.featured = [];
        }
        this.featIndex = 0;
        this._renderFeatured();
        this._startAutoplay();
    }

    _go(step) {
        if (!this.featured.length) return;
        this.featIndex = (this.featIndex + step + this.featured.length) % this.featured.length;
        this._renderFeatured();
    }

    _renderFeatured() {
        const item = this.featured[this.featIndex];
        const title = this.$('w-featured-title');
        const meta = this.$('w-featured-meta');
        const tags = this.$('w-featured-tags');
        const bg = this.$('w-featured-bg');
        const open = this.$('w-featured-open');
        const dots = this.$('w-featured-dots');
        if (!title) return;

        const multi = this.featured.length > 1;
        this.$('w-featured-prev')?.toggleAttribute('hidden', !multi);
        this.$('w-featured-next')?.toggleAttribute('hidden', !multi);

        if (!item) {
            title.textContent = 'Ainda não há quadros em destaque';
            meta.textContent = 'Publica o teu quadro e ele pode aparecer aqui.';
            tags.innerHTML = '';
            bg.style.backgroundImage = '';
            open.disabled = true;
            dots.innerHTML = '';
            return;
        }

        const src = safeImgSrc(item.image_full) || safeImgSrc(item.image_url);
        bg.classList.remove('gw-swap');
        void bg.offsetWidth;
        bg.classList.add('gw-swap');
        bg.style.backgroundImage = src ? `url("${src.replace(/"/g, '%22')}")` : '';

        tags.innerHTML = `
            <span class="gw-pill">${item.legacy ? 'Galeria' : 'Comunidade'}</span>
            ${item.likes_count ? `<span class="gw-pill">♥ ${item.likes_count}</span>` : ''}`;
        title.textContent = item.title || 'Sem título';
        const who = item.author ? (item.legacy ? item.author.username : '@' + item.author.username) : 'Anónimo';
        meta.textContent = `por ${who} · ${typeof timeAgo === 'function' ? timeAgo(item.updated_at) : ''}`;
        open.disabled = false;
        dots.innerHTML = multi
            ? this.featured.map((_, i) => `<button type="button" class="gw-dot ${i === this.featIndex ? 'active' : ''}" data-dot="${i}" aria-label="Destaque ${i + 1}"></button>`).join('')
            : '';
    }

    _startAutoplay() {
        this._stopAutoplay();
        if (this.featured.length < 2) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        this._featTimer = setInterval(() => {
            if (document.getElementById('home-view')?.classList.contains('active')) this._go(1);
        }, 7000);
    }

    _stopAutoplay() {
        if (this._featTimer) clearInterval(this._featTimer);
        this._featTimer = null;
    }
}

/* =====================================================================
   Fundo de vidro: desfoca a foto UMA vez num canvas pequeno, que o CSS
   estica. Muito mais leve do que filter: blur() (que repintava a cada
   frame de scroll). O canvas pode ficar "tainted" pela foto externa —
   não faz mal, só o mostramos, nunca lemos os píxeis.
   ===================================================================== */
const GLASS_PHOTO_URL = 'https://i.pinimg.com/originals/a8/be/00/a8be002065390491cd1c67a3902333d5.jpg';

function paintGlassBackgrounds() {
    const hosts = [...document.querySelectorAll('.ms-glass-zone, .ps-app')];
    if (!hosts.length) return;

    const canvases = hosts.map(host => {
        let c = host.querySelector(':scope > .glass-bg-canvas');
        if (!c) {
            c = document.createElement('canvas');
            c.className = 'glass-bg-canvas';
            c.setAttribute('aria-hidden', 'true');
            host.prepend(c);
        }
        return c;
    });

    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
        // Desfoque feito UMA vez com qualidade (canvas maior + filter blur),
        // em vez de ampliar 20 px → 96 px, que deixava o fundo "pixelado".
        canvases.forEach((c) => {
            const host = c.parentElement;
            const isFixed = host.classList.contains('ps-app');
            const ratio = isFixed
                ? window.innerHeight / Math.max(1, window.innerWidth)
                : host.offsetHeight / Math.max(1, host.offsetWidth);
            const w = 640;
            c.width = w;
            c.height = Math.max(120, Math.round(w * Math.min(ratio, 3)));
            const ctx = c.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            // "cover": corta a foto ao formato do canvas
            const sr = img.naturalWidth / img.naturalHeight, dr = c.width / c.height;
            let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
            if (sr > dr) { sw = img.naturalHeight * dr; sx = (img.naturalWidth - sw) / 2; }
            else { sh = img.naturalWidth / dr; sy = (img.naturalHeight - sh) / 2; }
            const pad = 40; // margem para o desfoque não escurecer as bordas
            if ('filter' in ctx) ctx.filter = 'blur(22px)';
            ctx.drawImage(img, sx, sy, sw, sh, -pad, -pad, c.width + pad * 2, c.height + pad * 2);
            ctx.filter = 'none';
            // escurece (em vez de filter: brightness)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, c.width, c.height);
            // grão muito fino por cima: evita "degraus" de cor ao esticar no ecrã
            // (desenhado à parte, sem ler os píxeis da foto)
            const grain = document.createElement('canvas');
            grain.width = 128; grain.height = 128;
            const g = grain.getContext('2d');
            const gd = g.createImageData(128, 128);
            for (let k = 0; k < gd.data.length; k += 4) {
                const v = Math.random() * 255;
                gd.data[k] = gd.data[k + 1] = gd.data[k + 2] = v;
                gd.data[k + 3] = 10;
            }
            g.putImageData(gd, 0, 0);
            ctx.fillStyle = ctx.createPattern(grain, 'repeat');
            ctx.fillRect(0, 0, c.width, c.height);
            c.classList.add('ready');
        });
    };
    img.onerror = () => canvases.forEach(c => c.classList.add('fallback'));
    img.src = GLASS_PHOTO_URL;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paintGlassBackgrounds);
} else {
    paintGlassBackgrounds();
}
