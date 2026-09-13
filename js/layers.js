/**
 * layers.js — Gestão de camadas (z-index)
 */

function sortByLayer(elementos) {
    return [...elementos].sort((a, b) => a.layer - b.layer);
}

function getNextLayer(elementos) {
    if (elementos.length === 0) return 0;
    return Math.max(...elementos.map(e => e.layer)) + 1;
}

function bringToFront(elementos, id) {
    const maxLayer = Math.max(...elementos.map(e => e.layer));
    const el = elementos.find(e => e.id === id);
    if (el) el.layer = maxLayer + 1;
    normalizeLayers(elementos);
}

function sendToBack(elementos, id) {
    const minLayer = Math.min(...elementos.map(e => e.layer));
    const el = elementos.find(e => e.id === id);
    if (el) el.layer = minLayer - 1;
    normalizeLayers(elementos);
}

function moveLayerUp(elementos, id) {
    const sorted = sortByLayer(elementos);
    const idx = sorted.findIndex(e => e.id === id);
    if (idx < sorted.length - 1) {
        const temp = sorted[idx].layer;
        sorted[idx].layer = sorted[idx + 1].layer;
        sorted[idx + 1].layer = temp;
    }
}

function moveLayerDown(elementos, id) {
    const sorted = sortByLayer(elementos);
    const idx = sorted.findIndex(e => e.id === id);
    if (idx > 0) {
        const temp = sorted[idx].layer;
        sorted[idx].layer = sorted[idx - 1].layer;
        sorted[idx - 1].layer = temp;
    }
}

function normalizeLayers(elementos) {
    const sorted = sortByLayer(elementos);
    sorted.forEach((el, i) => { el.layer = i; });
}

function moveLayerToPosition(elementos, dragId, targetId, position) {
    const sorted = sortByLayer(elementos);
    const from = sorted.findIndex(e => e.id === dragId);
    const to = sorted.findIndex(e => e.id === targetId);
    if (from < 0 || to < 0 || from === to) return false;

    const item = sorted.splice(from, 1)[0];
    let newIdx = sorted.findIndex(e => e.id === targetId);
    if (position === 'after') newIdx += 1;
    if (position === 'before' && newIdx > 0) newIdx -= 1;
    if (newIdx > sorted.length) newIdx = sorted.length;
    sorted.splice(newIdx, 0, item);

    sorted.forEach((el, i) => { el.layer = i; });
    return true;
}

function renderLayersList(container, elementos, selectedId, callbacks) {
    container.innerHTML = '';
    const sorted = sortByLayer(elementos).reverse();

    if (sorted.length === 0) {
        container.innerHTML = '<p class="empty-state" style="padding:16px;font-size:13px;">Nenhum elemento no quadro.</p>';
        return;
    }

    sorted.forEach(el => {
        const item = document.createElement('div');
        item.className = 'layer-item' + (el.id === selectedId ? ' selected' : '');
        item.dataset.id = el.id;
        item.draggable = true;
        item.title = 'Arraste para reordenar a camada';

        item.innerHTML = `
            <span class="layer-drag-handle">⠿</span>
            <span class="layer-icon">${getElementIcon(el.forma || el.tipo)}</span>
            <input class="layer-name" value="${getElementLabel(el)}" ${el.bloqueada ? 'disabled' : ''}>
            <div class="layer-actions">
                <button class="layer-action-btn ${el.visivel === false ? '' : 'active'}" data-action="visibility" title="Visibilidade">${el.visivel === false ? '👁️‍🗨️' : '👁️'}</button>
                <button class="layer-action-btn ${el.bloqueada ? 'active' : ''}" data-action="lock" title="Bloquear">${el.bloqueada ? '🔒' : '🔓'}</button>
                <button class="layer-action-btn" data-action="delete" title="Eliminar">🗑️</button>
            </div>
        `;

        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', el.id);
            e.dataTransfer.effectAllowed = 'move';
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            container.querySelectorAll('.layer-item').forEach(i => i.classList.remove('drop-before', 'drop-after'));
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const rect = item.getBoundingClientRect();
            const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
            container.querySelectorAll('.layer-item').forEach(i => i.classList.remove('drop-before', 'drop-after'));
            item.classList.add(pos === 'before' ? 'drop-before' : 'drop-after');
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drop-before', 'drop-after');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            item.classList.remove('drop-before', 'drop-after');
            const dragId = e.dataTransfer.getData('text/plain');
            if (!dragId) return;
            const rect = item.getBoundingClientRect();
            const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
            if (moveLayerToPosition(elementos, dragId, el.id, position)) {
                callbacks.onReorder?.();
            }
        });

        item.querySelector('.layer-name').addEventListener('change', (e) => {
            el.nome = e.target.value;
            callbacks.onRename?.(el);
        });

        item.addEventListener('click', (e) => {
            if (e.target.closest('.layer-actions') || e.target.classList.contains('layer-name')) return;
            callbacks.onSelect?.(el.id);
        });

        item.querySelector('[data-action="visibility"]').addEventListener('click', (e) => {
            e.stopPropagation();
            el.visivel = el.visivel === false ? true : false;
            callbacks.onToggleVisibility?.(el);
        });

        item.querySelector('[data-action="lock"]').addEventListener('click', (e) => {
            e.stopPropagation();
            el.bloqueada = !el.bloqueada;
            callbacks.onToggleLock?.(el);
        });

        item.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
            e.stopPropagation();
            callbacks.onDelete?.(el.id);
        });

        container.appendChild(item);
    });
}
