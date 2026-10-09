/* =====================================================================
   PinSpace — apagar o fundo à mão (sem IA), diretamente no quadro.
   - Varinha: clica numa cor do fundo e apaga a zona parecida à volta.
   - Borracha: pinta para apagar.
   - Restaurar: pinta para trazer de volta o que foi apagado.
   Desfazer dentro da ferramenta, Aplicar (Enter) ou Cancelar (Esc).
   Funciona com imagens rodadas e espelhadas.
   ===================================================================== */

(function () {
    const P = PinSpaceApp.prototype;
    const MAX_SIDE = 2000;

    P._openManualBg = function () {
        const el = this._getSelectedImage();
        if (!el || !el.src) { this.ui.showToast('Selecione uma imagem.'); return; }
        if (el.bloqueada) { this.ui.showToast('Desbloqueie a imagem primeiro.'); return; }
        this._startManualBg(el);
    };

    P._startManualBg = async function (el) {
        this._cancelInlineCrop?.();
        this._cancelManualBg();
        const dom = this.board.getElementDOM(el.id);
        if (!dom) return;
        let img;
        try { img = await loadImage(el.src); } catch { this.ui.showToast('Não foi possível abrir esta imagem.'); return; }

        const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        const W = Math.max(1, Math.round(img.naturalWidth * k));
        const H = Math.max(1, Math.round(img.naturalHeight * k));
        const orig = document.createElement('canvas');
        orig.width = W; orig.height = H;
        orig.getContext('2d').drawImage(img, 0, 0, W, H);
        const work = document.createElement('canvas');
        work.width = W; work.height = H;
        work.className = 'mbg-canvas';
        const wctx = work.getContext('2d', { willReadFrequently: true });
        wctx.drawImage(orig, 0, 0);
        work.style.transform = `scale(${el.flipX ? -1 : 1}, ${el.flipY ? -1 : 1})`;

        const st = { id: el.id, el, dom, orig, work, wctx, W, H, tool: 'wand', size: 40, tol: 32, undo: [], changed: false };
        this._mbg = st;
        dom.classList.add('mbg-editing');
        dom.appendChild(work);
        this.board.viewport.classList.add('is-cropping');

        const bar = document.createElement('div');
        bar.className = 'ed-crop-bar ed-mbg-bar';
        bar.innerHTML = `
            <div class="mbg-tools" role="group" aria-label="Ferramenta">
                <button type="button" data-mbg-tool="wand" class="on" title="Varinha: clica numa cor do fundo">${uiIcon('wand', 15)}<span>Varinha</span></button>
                <button type="button" data-mbg-tool="erase" title="Borracha: pinta para apagar">${uiIcon('eraser', 15)}<span>Apagar</span></button>
                <button type="button" data-mbg-tool="restore" title="Restaurar: pinta para recuperar">${uiIcon('undoBrush', 15)}<span>Restaurar</span></button>
            </div>
            <label class="mbg-range" data-for="wand" title="Tolerância (quanto mais alto, mais cores parecidas apaga)"><span>Tolerância</span><input type="range" min="4" max="120" value="${st.tol}" data-mbg="tol"></label>
            <label class="mbg-range" data-for="brush" hidden title="Tamanho do pincel"><span>Tamanho</span><input type="range" min="6" max="160" value="${st.size}" data-mbg="size"></label>
            <button type="button" data-mbg="undo" title="Desfazer (Ctrl+Z)" disabled>${uiIcon('undo', 15)}</button>
            <button type="button" data-mbg="cancel">Cancelar</button>
            <button type="button" data-mbg="apply" class="is-primary">Aplicar</button>`;
        document.querySelector('#editor-view .board-area')?.appendChild(bar);
        st.bar = bar;

        const setTool = (t) => {
            st.tool = t;
            bar.querySelectorAll('[data-mbg-tool]').forEach(b => b.classList.toggle('on', b.dataset.mbgTool === t));
            bar.querySelector('[data-for="wand"]').hidden = t !== 'wand';
            bar.querySelector('[data-for="brush"]').hidden = t === 'wand';
            work.style.cursor = t === 'wand' ? 'crosshair' : 'none';
        };
        setTool('wand');
        bar.addEventListener('click', (e) => {
            const tool = e.target.closest('[data-mbg-tool]')?.dataset.mbgTool;
            if (tool) return setTool(tool);
            const a = e.target.closest('button[data-mbg]')?.dataset.mbg;
            if (a === 'apply') this._applyManualBg();
            if (a === 'cancel') this._cancelManualBg();
            if (a === 'undo') undo();
        });
        bar.addEventListener('input', (e) => {
            if (e.target.dataset.mbg === 'tol') st.tol = +e.target.value;
            if (e.target.dataset.mbg === 'size') { st.size = +e.target.value; paintCursor(); }
        });
        bar.addEventListener('keydown', (e) => e.stopPropagation());

        // Círculo que mostra o tamanho do pincel
        const cursor = document.createElement('div');
        cursor.className = 'mbg-cursor';
        dom.appendChild(cursor);
        st.cursor = cursor;
        const paintCursor = (lx, ly) => {
            const d = st.size / this.board.getZoom() * (el.width / el.width); // em px do quadro
            cursor.style.width = cursor.style.height = (st.size / this.board.getZoom()) + 'px';
            if (lx !== undefined) { cursor.style.left = lx + 'px'; cursor.style.top = ly + 'px'; }
            cursor.hidden = st.tool === 'wand';
            return d;
        };

        const snapshot = () => {
            st.undo.push(wctx.getImageData(0, 0, W, H));
            if (st.undo.length > 12) st.undo.shift();
            bar.querySelector('[data-mbg="undo"]').disabled = false;
        };
        const undo = () => {
            const d = st.undo.pop();
            if (d) wctx.putImageData(d, 0, 0);
            bar.querySelector('[data-mbg="undo"]').disabled = !st.undo.length;
        };
        st.undoFn = undo;

        // Ecrã → píxel da imagem (zoom, rotação e espelho)
        const toLocal = (cx, cy) => {
            const r = dom.getBoundingClientRect();
            const mx = cx - (r.left + r.width / 2), my = cy - (r.top + r.height / 2);
            const a = -(el.rotation || 0) * Math.PI / 180, z = this.board.getZoom();
            const lx = (mx * Math.cos(a) - my * Math.sin(a)) / z + el.width / 2;
            const ly = (mx * Math.sin(a) + my * Math.cos(a)) / z + el.height / 2;
            let px = lx / el.width * W, py = ly / el.height * H;
            if (el.flipX) px = W - px;
            if (el.flipY) py = H - py;
            return { lx, ly, px, py };
        };
        const brushPx = () => st.size / this.board.getZoom() * (W / el.width);

        const dab = (from, to) => {
            const r = brushPx() / 2;
            wctx.save();
            wctx.lineCap = 'round';
            wctx.lineJoin = 'round';
            wctx.lineWidth = r * 2;
            if (st.tool === 'erase') {
                wctx.globalCompositeOperation = 'destination-out';
                wctx.beginPath(); wctx.moveTo(from.px, from.py); wctx.lineTo(to.px + 0.01, to.py); wctx.stroke();
            } else {
                // restaurar: copia da imagem original só dentro do traço
                wctx.beginPath(); wctx.moveTo(from.px, from.py); wctx.lineTo(to.px + 0.01, to.py);
                const path = new Path2D();
                const steps = Math.max(1, Math.ceil(Math.hypot(to.px - from.px, to.py - from.py) / (r / 2)));
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    path.moveTo(from.px + (to.px - from.px) * t + r, from.py + (to.py - from.py) * t);
                    path.arc(from.px + (to.px - from.px) * t, from.py + (to.py - from.py) * t, r, 0, Math.PI * 2);
                }
                wctx.clip(path);
                wctx.globalCompositeOperation = 'source-over';
                wctx.clearRect(0, 0, W, H);
                wctx.drawImage(orig, 0, 0);
            }
            wctx.restore();
        };

        const wand = (pt) => {
            const x0 = Math.floor(pt.px), y0 = Math.floor(pt.py);
            if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return;
            const id = wctx.getImageData(0, 0, W, H);
            const d = id.data;
            const i0 = (y0 * W + x0) * 4;
            if (d[i0 + 3] === 0) return;
            const r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2];
            const tol = st.tol, tol2 = tol * tol * 3;
            const seen = new Uint8Array(W * H);
            const stack = [y0 * W + x0];
            seen[y0 * W + x0] = 1;
            const edge = [];
            while (stack.length) {
                const p = stack.pop();
                const j = p * 4;
                d[j + 3] = 0;
                const x = p % W, y = (p / W) | 0;
                const nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
                for (const q of nb) {
                    if (q < 0 || seen[q]) continue;
                    const k = q * 4;
                    if (d[k + 3] === 0) { seen[q] = 1; continue; }
                    const dr = d[k] - r0, dg = d[k + 1] - g0, db = d[k + 2] - b0;
                    if (dr * dr + dg * dg + db * db <= tol2) { seen[q] = 1; stack.push(q); }
                    else edge.push(q);
                }
            }
            // suaviza a borda: píxeis da fronteira ficam meio transparentes
            for (const q of edge) { const k = q * 4 + 3; if (d[k] > 0) d[k] = Math.min(d[k], 150); }
            wctx.putImageData(id, 0, 0);
        };

        const stopAll = (e) => { e.stopPropagation(); e.preventDefault(); };
        work.addEventListener('mousedown', stopAll);
        work.addEventListener('dblclick', stopAll);
        work.addEventListener('pointermove', (e) => {
            const p = toLocal(e.clientX, e.clientY);
            paintCursor(p.lx, p.ly);
        });
        work.addEventListener('pointerleave', () => { cursor.hidden = true; });
        work.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const p = toLocal(e.clientX, e.clientY);
            snapshot();
            st.changed = true;
            if (st.tool === 'wand') { wand(p); return; }
            let last = p;
            dab(last, p);
            work.setPointerCapture?.(e.pointerId);
            const move = (ev) => { const q = toLocal(ev.clientX, ev.clientY); paintCursor(q.lx, q.ly); dab(last, q); last = q; };
            const up = () => { work.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
            work.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
        });

        st.onKey = (e) => {
            const ctrl = e.ctrlKey || e.metaKey;
            if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); this._applyManualBg(); }
            else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this._cancelManualBg(); }
            else if (ctrl && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.stopPropagation(); undo(); }
            else if (['Delete', 'Backspace'].includes(e.key) || e.key.startsWith('Arrow')) e.stopPropagation();
        };
        document.addEventListener('keydown', st.onKey, true);

        this.ui.showToast('Clica no fundo com a varinha, ou usa a borracha. Enter aplica, Esc cancela.', 4000);
    };

    P._endManualBg = function () {
        const st = this._mbg;
        if (!st) return null;
        this._mbg = null;
        document.removeEventListener('keydown', st.onKey, true);
        st.work.remove();
        st.cursor?.remove();
        st.bar?.remove();
        st.dom.classList.remove('mbg-editing');
        this.board.viewport.classList.remove('is-cropping');
        return st;
    };

    P._cancelManualBg = function () {
        const st = this._endManualBg();
        if (st) this.board.updateSelectionBox();
    };

    P._applyManualBg = async function () {
        const st = this._endManualBg();
        if (!st) return;
        const el = this.project && this.project.elementos.find(e => e.id === st.id);
        if (!el || !st.changed) { this.board.updateSelectionBox(); return; }
        el.src = await compactarImagem(st.work.toDataURL('image/png'));
        this._renderElement(el);
        this._selectElement(el.id);
        this._commitHistory();
        this.isDirty = true;
        this.ui.showToast('Fundo apagado!');
    };

    for (const name of ['_changeTool', '_loadProjectIntoEditor', 'undo', 'redo', '_backToHome', '_openCropImage']) {
        const orig = P[name];
        if (typeof orig !== 'function') continue;
        P[name] = function (...args) {
            if (this._mbg) this._cancelManualBg();
            return orig.apply(this, args);
        };
    }
})();
