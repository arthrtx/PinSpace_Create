/* =====================================================================
   PinSpace — recortar imagem diretamente no quadro (sem janela).
   Arrasta a área ou as pegas; Enter / "Aplicar" corta, Esc cancela.
   Funciona com imagens rodadas e espelhadas: a parte cortada fica
   exatamente no mesmo sítio do quadro.
   ===================================================================== */

(function () {
    const P = PinSpaceApp.prototype;
    const MIN = 4; // % mínimo da área de recorte

    P._openCropImage = function () {
        const el = this._getSelectedImage();
        if (!el || !el.src) {
            this.ui.showToast('Selecione uma imagem para recortar.');
            return;
        }
        if (el.bloqueada) {
            this.ui.showToast('Desbloqueie a imagem para a recortar.');
            return;
        }
        this._startInlineCrop(el);
    };

    P._startInlineCrop = function (el) {
        this._cancelInlineCrop();
        const dom = this.board.getElementDOM(el.id);
        if (!dom) return;

        const st = { id: el.id, r: { x: 0, y: 0, w: 100, h: 100 }, dom };
        this._crop = st;
        dom.classList.add('cropping');
        this.board.viewport.classList.add('is-cropping');

        const ui = document.createElement('div');
        ui.className = 'crop-ui';
        ui.innerHTML = `
            <div class="crop-shade"><div class="crop-hole"></div></div>
            <div class="crop-rect">
                <i class="crop-grid"></i>
                ${['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(h => `<span class="crop-h crop-h-${h}" data-h="${h}"></span>`).join('')}
            </div>`;
        dom.appendChild(ui);
        st.ui = ui;

        const bar = document.createElement('div');
        bar.className = 'ed-crop-bar';
        bar.innerHTML = `
            <span class="ed-crop-title">${uiIcon('crop', 15)} Recortar</span>
            <button type="button" data-crop="reset">Repor</button>
            <button type="button" data-crop="cancel">Cancelar</button>
            <button type="button" data-crop="apply" class="is-primary">Aplicar</button>`;
        document.querySelector('#editor-view .board-area')?.appendChild(bar);
        st.bar = bar;
        bar.addEventListener('click', (e) => {
            const a = e.target.closest('[data-crop]')?.dataset.crop;
            if (a === 'apply') this._applyInlineCrop();
            if (a === 'cancel') this._cancelInlineCrop();
            if (a === 'reset') { st.r = { x: 0, y: 0, w: 100, h: 100 }; paint(); }
        });

        const paint = () => {
            const { x, y, w, h } = st.r;
            for (const n of [ui.querySelector('.crop-rect'), ui.querySelector('.crop-hole')]) {
                n.style.left = x + '%';
                n.style.top = y + '%';
                n.style.width = w + '%';
                n.style.height = h + '%';
            }
        };
        paint();

        // Converte o movimento do rato (ecrã) para % da imagem, tendo em conta zoom e rotação.
        const toPct = (dx, dy) => {
            const a = -(el.rotation || 0) * Math.PI / 180;
            const z = this.board.getZoom();
            const lx = (dx * Math.cos(a) - dy * Math.sin(a)) / z;
            const ly = (dx * Math.sin(a) + dy * Math.cos(a)) / z;
            return { px: lx / el.width * 100, py: ly / el.height * 100 };
        };

        const stop = (e) => { e.stopPropagation(); };
        ui.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); });
        ui.addEventListener('dblclick', stop);
        ui.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const handle = e.target.closest('[data-h]')?.dataset.h || (e.target.closest('.crop-rect') ? 'move' : null);
            if (!handle) return;
            const start = { cx: e.clientX, cy: e.clientY, r: { ...st.r } };
            ui.setPointerCapture?.(e.pointerId);
            const move = (ev) => {
                const { px, py } = toPct(ev.clientX - start.cx, ev.clientY - start.cy);
                const r0 = start.r;
                let { x, y, w, h } = r0;
                if (handle === 'move') {
                    x = clamp(r0.x + px, 0, 100 - r0.w);
                    y = clamp(r0.y + py, 0, 100 - r0.h);
                } else {
                    if (handle.includes('w')) { x = clamp(r0.x + px, 0, r0.x + r0.w - MIN); w = r0.x + r0.w - x; }
                    if (handle.includes('e')) { w = clamp(r0.w + px, MIN, 100 - r0.x); }
                    if (handle.includes('n')) { y = clamp(r0.y + py, 0, r0.y + r0.h - MIN); h = r0.y + r0.h - y; }
                    if (handle.includes('s')) { h = clamp(r0.h + py, MIN, 100 - r0.y); }
                }
                st.r = { x, y, w, h };
                paint();
            };
            const up = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
        });

        // Teclado: Enter aplica, Esc cancela (sem desselecionar nada por baixo).
        st.onKey = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); this._applyInlineCrop(); }
            else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this._cancelInlineCrop(); }
            else if (e.key === 'Delete' || e.key === 'Backspace' || e.key.startsWith('Arrow')) { e.stopPropagation(); }
        };
        document.addEventListener('keydown', st.onKey, true);

        // Clicar fora da imagem aplica o recorte (como nos editores de design).
        st.onOutside = (e) => {
            if (st.ui.contains(e.target) || st.bar.contains(e.target)) return;
            if (!e.target.closest('#board-viewport')) return;
            this._applyInlineCrop();
        };
        document.addEventListener('mousedown', st.onOutside, true);

        this.ui.showToast('Arrasta as pegas para recortar. Enter aplica, Esc cancela.', 3500);
    };

    P._endInlineCrop = function () {
        const st = this._crop;
        if (!st) return null;
        this._crop = null;
        document.removeEventListener('keydown', st.onKey, true);
        document.removeEventListener('mousedown', st.onOutside, true);
        st.ui?.remove();
        st.bar?.remove();
        st.dom?.classList.remove('cropping');
        this.board.viewport.classList.remove('is-cropping');
        return st;
    };

    P._cancelInlineCrop = function () {
        const st = this._endInlineCrop();
        if (st) this.board.updateSelectionBox();
    };

    P._applyInlineCrop = async function () {
        const st = this._endInlineCrop();
        if (!st) return;
        const el = this.project && this.project.elementos.find(e => e.id === st.id);
        if (!el) return;
        const r = st.r;
        if (r.x < 0.2 && r.y < 0.2 && r.w > 99.6 && r.h > 99.6) { this.board.updateSelectionBox(); return; }

        try {
            const img = await loadImage(el.src);
            const nw = img.naturalWidth, nh = img.naturalHeight;
            // Na imagem original (antes de espelhar)
            const ix = el.flipX ? 100 - r.x - r.w : r.x;
            const iy = el.flipY ? 100 - r.y - r.h : r.y;
            const sx = nw * ix / 100, sy = nh * iy / 100;
            const sw = Math.max(1, nw * r.w / 100), sh = Math.max(1, nh * r.h / 100);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(sw);
            canvas.height = Math.round(sh);
            canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

            // A parte que fica mantém a posição no quadro (mesmo rodada).
            const newW = el.width * r.w / 100, newH = el.height * r.h / 100;
            const ox = (r.x + r.w / 2 - 50) / 100 * el.width;
            const oy = (r.y + r.h / 2 - 50) / 100 * el.height;
            const a = (el.rotation || 0) * Math.PI / 180;
            const cx = el.x + el.width / 2 + ox * Math.cos(a) - oy * Math.sin(a);
            const cy = el.y + el.height / 2 + ox * Math.sin(a) + oy * Math.cos(a);

            el.src = await compactarImagem(canvas.toDataURL('image/png'));
            el.width = newW;
            el.height = newH;
            el.x = cx - newW / 2;
            el.y = cy - newH / 2;
            this._renderElement(el);
            this._selectElement(el.id);
            this._commitHistory();
            this.isDirty = true;
            this.ui.showToast('Recorte aplicado!');
        } catch (err) {
            console.error(err);
            this.ui.showToast('Não foi possível recortar esta imagem.');
            this.board.updateSelectionBox();
        }
    };

    // Mudar de ferramenta, de quadro ou desfazer cancela o recorte em curso.
    for (const name of ['_changeTool', '_loadProjectIntoEditor', 'undo', 'redo', '_backToHome']) {
        const orig = P[name];
        if (typeof orig !== 'function') continue;
        P[name] = function (...args) {
            if (this._crop) this._cancelInlineCrop();
            return orig.apply(this, args);
        };
    }
})();
