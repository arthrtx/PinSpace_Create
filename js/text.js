/**
 * text.js — Gestão de caixas de texto
 */

const FONTES = [
    'Segoe UI', 'Inter', 'Montserrat', 'Poppins', 'Raleway',
    'Open Sans', 'Roboto', 'Lato', 'Nunito', 'Playfair Display',
    'Lora', 'Merriweather', 'Georgia', 'Times New Roman',
    'Oswald', 'Bebas Neue', 'Archivo Black', 'Abril Fatface',
    'Cinzel', 'Pacifico', 'Lobster', 'Dancing Script', 'Caveat',
    'Advent Pro', 'Courier New', 'Courier Prime', 'Verdana', 'Impact'
];

let fitMeasureCanvas = null;

/* Presets estilo Canva — "Adicionar texto" */
const TEXT_PRESETS = {
    titulo: { conteudo: 'Adicione um título', fonte: 'Playfair Display', tamanho: 46, cor: '#0f172a', negrito: true, alinhamento: 'left', width: 520, height: 90 },
    subtitulo: { conteudo: 'Adicione um subtítulo', fonte: 'Montserrat', tamanho: 26, cor: '#3f3f46', negrito: false, alinhamento: 'left', width: 440, height: 60 },
    texto: { conteudo: 'Adicione algum texto', fonte: 'Segoe UI', tamanho: 18, cor: '#52525b', negrito: false, alinhamento: 'left', width: 360, height: 48 }
};

function createTextPreset(preset, elementos) {
    const layer = getNextLayer(elementos);
    const base = TEXT_PRESETS[preset] || TEXT_PRESETS.texto;
    return {
        ...createTextElement(200, 200, layer),
        conteudo: base.conteudo,
        fonte: base.fonte,
        tamanho: base.tamanho,
        cor: base.cor,
        negrito: base.negrito,
        alinhamento: base.alinhamento,
        width: base.width,
        height: base.height
    };
}

function createTextElement(x = 200, y = 200, layer = 0) {
    return {
        tipo: 'texto',
        id: generateId(),
        conteudo: 'Clique para editar',
        x,
        y,
        width: 250,
        height: 60,
        rotation: 0,
        opacidade: 1,
        layer,
        bloqueada: false,
        visivel: true,
        nome: 'Texto',
        fonte: 'Segoe UI',
        tamanho: 24,
        cor: '#0f172a',
        negrito: false,
        italico: false,
        sublinhado: false,
        riscado: false,
        autoAjustar: true,
        alinhamento: 'left'
    };
}

function addTextElement(elementos) {
    const layer = getNextLayer(elementos);
    return createTextElement(200, 200, layer);
}

function renderTextElement(dom, el) {
    let textEl = dom.querySelector('.text-content');
    if (!textEl) {
        dom.innerHTML = '';
        textEl = document.createElement('div');
        textEl.className = 'text-content';
        textEl.contentEditable = !el.bloqueada;
        dom.appendChild(textEl);
    }

    textEl.contentEditable = !el.bloqueada;
    if (document.activeElement !== textEl) {
        textEl.textContent = el.conteudo;
    }

    textEl.style.fontFamily = el.fonte;
    textEl.style.fontSize = el.tamanho + 'px';
    textEl.style.color = el.cor;
    textEl.style.fontWeight = el.negrito ? 'bold' : 'normal';
    textEl.style.fontStyle = el.italico ? 'italic' : 'normal';
    textEl.style.textDecoration = [
        el.sublinhado ? 'underline' : '',
        el.riscado ? 'line-through' : ''
    ].filter(Boolean).join(' ') || 'none';
    textEl.style.textAlign = el.alinhamento;

    fitTextElement(dom, el);
}

function fitTextElement(dom, el) {
    if (!el || el.tipo !== 'texto' || el.autoAjustar === false) return;
    const block = measureTextBlock(el);
    const newH = Math.max(24, Math.round(block.height) + 8);
    if (newH !== el.height) {
        el.height = newH;
        dom.style.height = el.height + 'px';
    }
}

function measureTextBlock(el) {
    const c = fitMeasureCanvas || (fitMeasureCanvas = document.createElement('canvas'));
    const ctx = c.getContext('2d');
    ctx.font = `${el.italico ? 'italic ' : ''}${el.negrito ? 'bold ' : ''}${el.tamanho || 24}px ${el.fonte || 'Arial'}`;
    const availW = Math.max(20, (el.width || 250) - 8);
    const lineH = (el.tamanho || 24) * 1.3;
    const paragraphs = String(el.conteudo || '').split('\n');
    let lines = 0;
    for (const para of paragraphs) {
        const words = para.trim() ? para.trim().split(/\s+/) : [];
        if (!words.length) { lines += 1; continue; }
        lines += 1;
        let cur = '';
        for (const w of words) {
            const test = cur ? cur + ' ' + w : w;
            if (cur && ctx.measureText(test).width > availW) {
                lines += 1;
                cur = w;
            } else {
                cur = test;
            }
        }
    }
    return { height: Math.max(lineH, lines * lineH) };
}

function getTextPanelHTML(el) {
    const currentFont = el?.fonte || 'Segoe UI';
    const fontOptions = FONTES.map(f => {
        const sel = el?.fonte === f ? ' selected' : '';
        return `<option value="${f}" style="font-family:'${f}';font-size:13px"${sel}>${f}</option>`;
    }).join('');

    return `
        <div class="panel-section">
            <h4>Adicionar texto</h4>
            <div class="text-add-grid">
                <button class="text-add-card" data-add="titulo" title="Adicionar título">
                    <span class="text-add-sample" style="font-family:'Playfair Display';font-weight:700;font-size:30px">Adicione um título</span>
                    <span class="text-add-label">Título</span>
                </button>
                <button class="text-add-card" data-add="subtitulo" title="Adicionar subtítulo">
                    <span class="text-add-sample" style="font-family:'Montserrat';font-weight:600;font-size:20px">Adicione um subtítulo</span>
                    <span class="text-add-label">Subtítulo</span>
                </button>
                <button class="text-add-card" data-add="texto" title="Adicionar texto">
                    <span class="text-add-sample" style="font-family:'Segoe UI';font-weight:400;font-size:15px">Adicione algum texto</span>
                    <span class="text-add-label">Texto</span>
                </button>
            </div>
        </div>
        ${el ? `
        <div class="panel-section" style="margin-top:16px">
            <div class="form-group">
                <label>Conteúdo</label>
                <textarea id="prop-conteudo" rows="3">${escapeHTML(el.conteudo || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Fonte</label>
                <div id="font-preview" style="font-family:'${currentFont}';font-size:18px;color:var(--text-primary);background:var(--bg-secondary);padding:8px 12px;border-radius:8px;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(currentFont)}</div>
                <select id="prop-fonte">${fontOptions}</select>
            </div>
            <div class="form-group">
                <label>Tamanho</label>
                <div class="text-size-group">
                    <button type="button" class="toggle-btn text-size-step" id="prop-tamanho-men" title="Diminuir">A−</button>
                    <input type="number" id="prop-tamanho" value="${el.tamanho || 24}" min="8" max="400">
                    <button type="button" class="toggle-btn text-size-step" id="prop-tamanho-mais" title="Aumentar">A+</button>
                </div>
            </div>
            <div class="form-group">
                <label>Cor</label>
                <input type="color" id="prop-cor" value="${el.cor || '#0f172a'}">
            </div>
            <div class="form-group">
                <label>Estilo</label>
                <div class="toggle-group">
                    <button class="toggle-btn ${el.negrito ? 'active' : ''}" id="prop-negrito" title="Negrito"><b>B</b></button>
                    <button class="toggle-btn ${el.italico ? 'active' : ''}" id="prop-italico" title="Itálico"><i>I</i></button>
                    <button class="toggle-btn ${el.sublinhado ? 'active' : ''}" id="prop-sublinhado" title="Sublinhado"><u>U</u></button>
                    <button class="toggle-btn ${el.riscado ? 'active' : ''}" id="prop-riscado" title="Riscado"><s>S</s></button>
                </div>
            </div>
            <div class="form-group">
                <label>Alinhamento</label>
                <div class="toggle-group">
                    <button class="toggle-btn ${el.alinhamento === 'left' ? 'active' : ''}" data-align="left" title="Esquerda">⬅</button>
                    <button class="toggle-btn ${el.alinhamento === 'center' ? 'active' : ''}" data-align="center" title="Centro">⬌</button>
                    <button class="toggle-btn ${el.alinhamento === 'right' ? 'active' : ''}" data-align="right" title="Direita">➡</button>
                </div>
            </div>
            <div class="form-group">
                <label><input type="checkbox" id="prop-autoajustar" ${el.autoAjustar !== false ? 'checked' : ''} style="margin-right:6px"> Auto-ajustar caixa ao conteúdo</label>
            </div>
            <div class="form-group">
                <label>Opacidade</label>
                <input type="range" id="prop-opacidade" min="0" max="1" step="0.05" value="${el.opacidade ?? 1}">
            </div>
            <div class="form-group">
                <label>Rotação</label>
                <input type="number" id="prop-rotation" value="${el.rotation || 0}" min="-360" max="360">
            </div>
        </div>` : ''}
    `;
}

function bindTextPanelEvents(panel, el, callbacks) {
    panel.querySelectorAll('[data-add]').forEach(btn => {
        btn.addEventListener('click', () => {
            callbacks.onAddTextPreset?.(btn.dataset.add);
        });
    });

    if (!el) return;

    panel.querySelector('#prop-tamanho-men')?.addEventListener('click', () => {
        const input = panel.querySelector('#prop-tamanho');
        const val = Math.max(8, (parseInt(input.value, 10) || 24) - 2);
        input.value = val;
        el.tamanho = val;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-tamanho-mais')?.addEventListener('click', () => {
        const input = panel.querySelector('#prop-tamanho');
        const val = Math.min(400, (parseInt(input.value, 10) || 24) + 2);
        input.value = val;
        el.tamanho = val;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-conteudo')?.addEventListener('input', (e) => {
        el.conteudo = e.target.value;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-fonte')?.addEventListener('change', (e) => {
        el.fonte = e.target.value;
        const sel = e.target;
        sel.style.fontFamily = `'${el.fonte}'`;
        const preview = panel.querySelector('#font-preview');
        if (preview) {
            preview.style.fontFamily = `'${el.fonte}'`;
            preview.textContent = el.fonte;
        }
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-tamanho')?.addEventListener('change', (e) => {
        el.tamanho = parseInt(e.target.value) || 24;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-cor')?.addEventListener('input', (e) => {
        el.cor = e.target.value;
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-negrito')?.addEventListener('click', (e) => {
        el.negrito = !el.negrito;
        e.target.classList.toggle('active');
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-italico')?.addEventListener('click', (e) => {
        el.italico = !el.italico;
        e.target.classList.toggle('active');
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-sublinhado')?.addEventListener('click', (e) => {
        el.sublinhado = !el.sublinhado;
        e.target.classList.toggle('active');
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-riscado')?.addEventListener('click', (e) => {
        el.riscado = !el.riscado;
        e.target.classList.toggle('active');
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-autoajustar')?.addEventListener('change', (e) => {
        el.autoAjustar = e.target.checked;
        callbacks.onUpdate(el);
    });

    panel.querySelectorAll('[data-align]').forEach(btn => {
        btn.addEventListener('click', () => {
            el.alinhamento = btn.dataset.align;
            panel.querySelectorAll('[data-align]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            callbacks.onUpdate(el);
        });
    });

    panel.querySelector('#prop-opacidade')?.addEventListener('input', (e) => {
        el.opacidade = parseFloat(e.target.value);
        callbacks.onUpdate(el);
    });

    panel.querySelector('#prop-rotation')?.addEventListener('change', (e) => {
        el.rotation = parseInt(e.target.value) || 0;
        callbacks.onUpdate(el);
    });
}

function bindTextContentEdit(dom, el, onUpdate) {
    if (dom.dataset.textBound === '1') return;
    dom.dataset.textBound = '1';
    const textEl = dom.querySelector('.text-content');
    if (!textEl) return;

    textEl.addEventListener('input', () => {
        el.conteudo = textEl.textContent;
        onUpdate(el, false);
    });

    textEl.addEventListener('blur', () => {
        onUpdate(el, true);
    });
}

function duplicateText(el, layer) {
    return {
        ...JSON.parse(JSON.stringify(el)),
        id: generateId(),
        x: el.x + 20,
        y: el.y + 20,
        layer
    };
}
