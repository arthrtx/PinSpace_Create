/* =====================================================================
   Telemóvel: o editor só existe no computador.
   No telemóvel continua tudo o resto — comunidade, perfis, música,
   comentários — e "Abrir" um quadro mostra a imagem em grande.
   ===================================================================== */

function psIsPhone() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const small = Math.min(window.screen.width || 9999, window.screen.height || 9999) < 768;
    return window.innerWidth < 700 || (coarse && small);
}

function psShowPcOnly() {
    let dlg = document.getElementById('modal-pc-only');
    if (!dlg) {
        dlg = document.createElement('dialog');
        dlg.id = 'modal-pc-only';
        dlg.className = 'modal';
        dlg.innerHTML = `
            <div class="modal-content ps-pc-only">
                <div class="ps-pc-ic"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg></div>
                <h2>O editor é só para computador</h2>
                <p>Para criar e editar quadros abre o PinSpace num computador. No telemóvel podes continuar a:</p>
                <ul>
                    <li>🎵 <span>Ouvir música</span></li>
                    <li>👤 <span>Ver e editar o teu perfil</span></li>
                    <li>🌍 <span>Explorar a comunidade, dar likes e comentar</span></li>
                </ul>
                <button type="button" class="btn btn-primary" data-pc-close>Percebi</button>
            </div>`;
        document.body.appendChild(dlg);
        dlg.addEventListener('click', (e) => {
            if (e.target === dlg || e.target.closest('[data-pc-close]')) dlg.close();
        });
    }
    if (!dlg.open) dlg.showModal();
}

(function initMobileGuard() {
    const go = () => {
        const app = window.pinspaceApp;
        if (!app || !app.ui) { setTimeout(go, 120); return; }
        if (app._mobileGuard) return;
        app._mobileGuard = true;

        const block = (obj, name) => {
            const orig = obj[name];
            if (typeof orig !== 'function') return;
            obj[name] = function (...args) {
                if (psIsPhone()) { psShowPcOnly(); return undefined; }
                return orig.apply(this, args);
            };
        };
        block(app, 'createNewProject');
        block(app, 'openProject');
        block(app, '_openPublic');
        block(app, 'publishDraft');
        block(app.ui, 'openNewProjectModal');

        // Abrir um quadro da comunidade no telemóvel = ver a imagem em grande.
        const origOpenCloud = app.openCloudBoard;
        app.openCloudBoard = function (id, ...rest) {
            if (!psIsPhone()) return origOpenCloud.call(this, id, ...rest);
            const s = this.social;
            const all = [...((s && s._exploreItems) || []), ...((s && s.state && s.state.userBoards) || [])];
            const b = all.find(x => x && x.id === id);
            const img = b && (b.image_full || b.image_url);
            if (img && s && s.openLightbox) s.openLightbox(img);
            else psShowPcOnly();
            return undefined;
        };

        // Rede de segurança: nada entra no editor no telemóvel.
        const origLoad = app._loadProjectIntoEditor;
        app._loadProjectIntoEditor = function (...args) {
            if (psIsPhone()) { this.project = null; psShowPcOnly(); return undefined; }
            return origLoad.apply(this, args);
        };
        document.documentElement.classList.toggle('is-phone', psIsPhone());
        window.addEventListener('resize', () => document.documentElement.classList.toggle('is-phone', psIsPhone()));
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
})();
