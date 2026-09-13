/**
 * storage.js — Gestão de projetos no LocalStorage
 */

const STORAGE_KEY = 'pinspace_projects';
const SETTINGS_KEY = 'pinspace_settings';

function getAllProjects() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveAllProjects(projects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function getProject(id) {
    return getAllProjects().find(p => p.id === id) || null;
}

function saveProject(project) {
    const projects = getAllProjects();
    const index = projects.findIndex(p => p.id === project.id);

    project.ultimaEdicao = new Date().toISOString();

    if (index >= 0) {
        projects[index] = project;
    } else {
        projects.unshift(project);
    }

    saveAllProjects(projects);
    return project;
}

function deleteProject(id) {
    const projects = getAllProjects().filter(p => p.id !== id);
    saveAllProjects(projects);
}

function searchProjects(query) {
    const q = query.toLowerCase().trim();
    if (!q) return getAllProjects();
    return getAllProjects().filter(p =>
        p.titulo.toLowerCase().includes(q)
    );
}

function createEmptyProject(id, titulo = 'Sem título', boardWidth = 3000, boardHeight = 3000) {
    return {
        id,
        titulo,
        dataCriacao: new Date().toISOString(),
        ultimaEdicao: new Date().toISOString(),
        thumbnail: null,
        publico: false,
        publicKey: null,
        autor: 'Anónimo',
        publicadoAt: null,
        background: {
            tipo: 'cor',
            valor: '#e8e8e8'
        },
        grade: 'pontos',
        elementos: [],
        boardWidth,
        boardHeight
    };
}

function getSettings() {
    try {
        const data = localStorage.getItem(SETTINGS_KEY);
        return data ? JSON.parse(data) : { theme: 'light' };
    } catch {
        return { theme: 'light' };
    }
}

function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function generateThumbnail(project) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 280;
    const ctx = canvas.getContext('2d');

    const bg = project.background;
    if (bg.tipo === 'cor') {
        ctx.fillStyle = bg.valor || '#ffffff';
        ctx.fillRect(0, 0, 400, 280);
    } else if (bg.tipo === 'gradiente' && bg.valor) {
        const grad = ctx.createLinearGradient(0, 0, 400, 280);
        grad.addColorStop(0, bg.valor.cor1 || '#fff');
        grad.addColorStop(1, bg.valor.cor2 || '#ccc');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 400, 280);
    } else {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, 0, 400, 280);
    }

    const scaleX = 400 / (project.boardWidth || 3000);
    const scaleY = 280 / (project.boardHeight || 3000);
    const scale = Math.min(scaleX, scaleY);

    const sorted = [...(project.elementos || [])].sort((a, b) => a.layer - b.layer);
    sorted.forEach(el => {
        if (!el.visivel) return;
        ctx.save();
        ctx.globalAlpha = el.opacidade ?? 1;
        const cx = (el.x + el.width / 2) * scale;
        const cy = (el.y + el.height / 2) * scale;
        ctx.translate(cx, cy);
        ctx.rotate((el.rotation || 0) * Math.PI / 180);

        if (el.tipo === 'imagem' && el.src) {
            // Thumbnail async — placeholder rect
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(-el.width * scale / 2, -el.height * scale / 2, el.width * scale, el.height * scale);
        } else if (el.tipo === 'texto') {
            ctx.fillStyle = el.cor || '#000';
            ctx.font = `${(el.tamanho || 16) * scale}px ${el.fonte || 'Arial'}`;
            ctx.textAlign = 'center';
            ctx.fillText((el.conteudo || '').slice(0, 30), 0, 0);
        } else if (el.tipo === 'forma') {
            ctx.fillStyle = el.cor || '#6366f1';
            ctx.fillRect(-el.width * scale / 2, -el.height * scale / 2, el.width * scale, el.height * scale);
        }
        ctx.restore();
    });

    return canvas.toDataURL('image/jpeg', 0.6);
}
