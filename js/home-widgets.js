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
        this._renderPalette();
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

    /* ---------- Paleta (enfeite, copia o hex) ---------- */
    _renderPalette() {
        const box = this.$('w-palette');
        if (!box) return;
        box.innerHTML = HW_PALETTE.map(c => `
            <button type="button" class="gw-swatch" style="--sw:${c.hex}" data-hex="${c.hex}" title="${c.name} · ${c.hex}" aria-label="Copiar ${c.name} ${c.hex}"></button>`).join('');
        box.addEventListener('click', async (e) => {
            const b = e.target.closest('[data-hex]');
            if (!b) return;
            try {
                await navigator.clipboard.writeText(b.dataset.hex);
                this.app.ui.showToast(`Copiado ${b.dataset.hex}`);
            } catch {
                this.app.ui.showToast(b.dataset.hex);
            }
            b.classList.remove('copied');
            void b.offsetWidth;
            b.classList.add('copied');
        });
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
        sc.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }

    _bindDock() {
        document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-dock]');
            if (!el || !document.getElementById('home-view')?.contains(el)) return;
            const act = el.dataset.dock;
            if (act === 'top') { this._scroller()?.scrollTo({ top: 0, behavior: 'smooth' }); }
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
        // 1) reduz a foto a 20 px de largura (isto já é o "desfoque")
        const tiny = document.createElement('canvas');
        tiny.width = 20;
        tiny.height = Math.max(8, Math.round(20 * img.naturalHeight / img.naturalWidth));
        const t = tiny.getContext('2d');
        t.imageSmoothingQuality = 'high';
        t.drawImage(img, 0, 0, tiny.width, tiny.height);

        canvases.forEach((c) => {
            // 2) amplia para 96 px com suavização (bilinear duas vezes ≈ desfoque suave)
            const w = 96;
            const host = c.parentElement;
            const isFixed = host.classList.contains('ps-app');
            const ratio = isFixed
                ? window.innerHeight / Math.max(1, window.innerWidth)
                : host.offsetHeight / Math.max(1, host.offsetWidth);
            c.width = w;
            c.height = Math.max(24, Math.round(w * Math.min(ratio, 3)));
            const ctx = c.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            // "cover": corta a foto ao formato do canvas
            const sr = tiny.width / tiny.height, dr = c.width / c.height;
            let sw = tiny.width, sh = tiny.height, sx = 0, sy = 0;
            if (sr > dr) { sw = tiny.height * dr; sx = (tiny.width - sw) / 2; }
            else { sh = tiny.width / dr; sy = (tiny.height - sh) / 2; }
            ctx.drawImage(tiny, sx, sy, sw, sh, 0, 0, c.width, c.height);
            // escurece (em vez de filter: brightness)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
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
