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
            // Desfoque que funciona em todos os browsers (o ctx.filter não existe
            // no Safari do iPhone, e aí o fundo ficava nítido): reduz a foto a um
            // canvas minúsculo e volta a ampliá-la em passos, com suavização.
            const small = document.createElement('canvas');
            small.width = Math.max(8, Math.round(c.width / 22));
            small.height = Math.max(8, Math.round(c.height / 22));
            const sctx = small.getContext('2d');
            sctx.imageSmoothingEnabled = true;
            sctx.imageSmoothingQuality = 'high';
            sctx.drawImage(img, sx, sy, sw, sh, 0, 0, small.width, small.height);
            let src = small;
            for (const k of [5, 2.2]) {
                const mid = document.createElement('canvas');
                mid.width = Math.round(c.width / k);
                mid.height = Math.round(c.height / k);
                const m = mid.getContext('2d');
                m.imageSmoothingEnabled = true;
                m.imageSmoothingQuality = 'high';
                m.drawImage(src, 0, 0, mid.width, mid.height);
                src = mid;
            }
            ctx.drawImage(src, 0, 0, c.width, c.height);
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
