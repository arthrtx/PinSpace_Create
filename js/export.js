/**
 * export.js — Exportação para PNG, JPEG e PDF
 */

async function exportProject(project, format = 'png') {
    const canvas = await renderToCanvas(project);
    const filename = sanitizeFilename(project.titulo);

    switch (format) {
        case 'png':
            canvas.toBlob(blob => downloadBlob(blob, `${filename}.png`), 'image/png');
            break;
        case 'jpeg':
            canvas.toBlob(blob => downloadBlob(blob, `${filename}.jpg`), 'image/jpeg', 0.92);
            break;
        case 'pdf':
            await exportPDF(canvas, filename);
            break;
    }
}

async function renderToCanvas(project) {
    const w = project.boardWidth || 3000;
    const h = project.boardHeight || 3000;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    await drawBackground(ctx, project.background, w, h);

    const sorted = sortByLayer(project.elementos || []);
    for (const el of sorted) {
        if (el.visivel === false) continue;
        await drawElement(ctx, el);
    }

    return canvas;
}

async function drawBackground(ctx, bg, w, h) {
    if (!bg) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        return;
    }

    switch (bg.tipo) {
        case 'cor':
            ctx.fillStyle = bg.valor || '#ffffff';
            ctx.fillRect(0, 0, w, h);
            break;
        case 'gradiente':
            if (bg.valor) {
                const angle = (bg.valor.angulo || 135) * Math.PI / 180;
                const x1 = w / 2 - Math.cos(angle) * w;
                const y1 = h / 2 - Math.sin(angle) * h;
                const x2 = w / 2 + Math.cos(angle) * w;
                const y2 = h / 2 + Math.sin(angle) * h;
                const grad = ctx.createLinearGradient(x1, y1, x2, y2);
                grad.addColorStop(0, bg.valor.cor1 || '#fff');
                grad.addColorStop(1, bg.valor.cor2 || '#ccc');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            }
            break;
        case 'imagem':
            if (bg.valor) {
                try {
                    const img = await loadImage(bg.valor);
                    ctx.drawImage(img, 0, 0, w, h);
                } catch {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, w, h);
                }
            }
            break;
        default:
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
    }
}

async function drawElement(ctx, el) {
    ctx.save();
    ctx.globalAlpha = el.opacidade ?? 1;
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((el.rotation || 0) * Math.PI / 180);

    switch (el.tipo) {
        case 'imagem':
            if (el.src) {
                try {
                    ctx.filter = getImageCSSFilter(el);
                    const sx = el.flipX ? -1 : 1;
                    const sy = el.flipY ? -1 : 1;
                    const raio = Math.min(el.raio ?? 8, el.width / 2, el.height / 2);
                    ctx.save();
                    ctx.scale(sx, sy);
                    if (raio > 0) {
                        roundRectPath(ctx, -el.width / 2, -el.height / 2, el.width, el.height, raio);
                        ctx.clip();
                    }
                    const img = await loadImage(el.src);
                    ctx.drawImage(img, -el.width / 2, -el.height / 2, el.width, el.height);
                    ctx.restore();
                    ctx.filter = 'none';
                } catch { /* skip broken images */ }
            }
            break;

        case 'texto':
            ctx.fillStyle = el.cor || '#000';
            const fontStyle = `${el.italico ? 'italic ' : ''}${el.negrito ? 'bold ' : ''}${el.tamanho || 24}px ${el.fonte || 'Arial'}`;
            ctx.font = fontStyle;
            ctx.textAlign = el.alinhamento || 'left';
            ctx.textBaseline = 'top';

            const lines = (el.conteudo || '').split('\n');
            const lineHeight = (el.tamanho || 24) * 1.3;
            const startY = -el.height / 2 + 4;
            let textX = -el.width / 2;
            if (el.alinhamento === 'center') textX = 0;
            if (el.alinhamento === 'right') textX = el.width / 2;

            lines.forEach((line, i) => {
                const y = startY + i * lineHeight;
                ctx.fillText(line, textX, y);
                if (el.sublinhado || el.riscado) {
                    const metrics = ctx.measureText(line);
                    let lineY = y + (el.tamanho || 24) * 1.02;
                    if (el.riscado) lineY = y + (el.tamanho || 24) * 0.52;
                    let lineX = textX;
                    if (el.alinhamento === 'center') lineX -= metrics.width / 2;
                    if (el.alinhamento === 'right') lineX -= metrics.width;
                    ctx.beginPath();
                    ctx.moveTo(lineX, lineY);
                    ctx.lineTo(lineX + metrics.width, lineY);
                    ctx.strokeStyle = el.cor;
                    ctx.lineWidth = Math.max(1, (el.tamanho || 24) * 0.08);
                    ctx.stroke();

                    if (el.sublinhado && el.riscado) {
                        const ulY = y + (el.tamanho || 24) * 1.02;
                        ctx.beginPath();
                        ctx.moveTo(lineX, ulY);
                        ctx.lineTo(lineX + metrics.width, ulY);
                        ctx.stroke();
                    }
                }
            });
            break;

        case 'forma':
            drawShape(ctx, el);
            break;
    }

    ctx.restore();
}

function drawShape(ctx, el) {
    const fill = el.preenchimento !== false ? el.cor : 'transparent';
    const stroke = el.corContorno || el.cor;
    const sw = (el.espessura || 0) > 0 ? el.espessura : 0;
    const hw = el.width / 2;
    const hh = el.height / 2;

    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = sw;
    ctx.lineJoin = 'round';

    switch (el.forma) {
        case 'quadrado':
        case 'retangulo':
            ctx.fillRect(-hw, -hh, el.width, el.height);
            if (sw > 0) ctx.strokeRect(-hw, -hh, el.width, el.height);
            break;
        case 'circulo':
            ctx.beginPath();
            ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
            ctx.fill();
            if (sw > 0) ctx.stroke();
            break;
        case 'linha':
            ctx.beginPath();
            ctx.moveTo(-hw, 0);
            ctx.lineTo(hw, 0);
            ctx.lineCap = 'round';
            if (sw > 0) { ctx.lineWidth = sw; ctx.stroke(); }
            break;
        case 'seta': {
            const headSize = Math.min(24, el.height);
            ctx.beginPath();
            ctx.moveTo(-hw, 0);
            ctx.lineTo(hw - headSize, 0);
            ctx.lineCap = 'round';
            if (sw > 0) { ctx.lineWidth = Math.max(sw, 1); ctx.stroke(); }
            ctx.strokeStyle = stroke;
            ctx.beginPath();
            ctx.moveTo(hw, 0);
            ctx.lineTo(hw - headSize, -headSize / 2);
            ctx.lineTo(hw - headSize, headSize / 2);
            ctx.closePath();
            ctx.fillStyle = stroke;
            ctx.fill();
            break;
        }
        default: {
            const geo = shapeGeometry(el.forma, el.width, el.height);
            if (!geo) break;
            let path;
            try {
                path = new Path2D(geo.d);
            } catch {
                break;
            }
            if (el.preenchimento !== false) ctx.fill(path);
            if (sw > 0) ctx.stroke(path);
        }
    }
}

async function exportPDF(canvas, filename) {
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const imgBytes = dataURLToBytes(imgData);
    const w = canvas.width;
    const h = canvas.height;

    const pdf = buildMinimalPDF(imgBytes, w, h);
    const blob = new Blob([pdf], { type: 'application/pdf' });
    downloadBlob(blob, `${filename}.pdf`);
}

function dataURLToBytes(dataURL) {
    const base64 = dataURL.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function buildMinimalPDF(jpegBytes, width, height) {
    const pageW = 595.28;
    const pageH = 841.89;
    const scale = Math.min(pageW / width, pageH / height) * 0.95;
    const imgW = width * scale;
    const imgH = height * scale;
    const offsetX = (pageW - imgW) / 2;
    const offsetY = (pageH - imgH) / 2;

    const parts = [];
    let offset = 0;
    const objOffsets = [];

    function addObj(content) {
        objOffsets.push(offset);
        const bytes = new TextEncoder().encode(content);
        parts.push(bytes);
        offset += bytes.length;
    }

    const header = `%PDF-1.4\n`;
    parts.push(new TextEncoder().encode(header));
    offset += header.length;

    addObj(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
    addObj(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);
    addObj(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`);
    addObj(`4 0 obj\n<< /Length 44 >>\nstream\nq ${imgW.toFixed(2)} 0 0 ${imgH.toFixed(2)} ${offsetX.toFixed(2)} ${offsetY.toFixed(2)} cm /Im1 Do Q\nendstream\nendobj\n`);
    addObj(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);

    parts.push(jpegBytes);
    offset += jpegBytes.length;

    const streamEnd = `\nendstream\nendobj\n`;
    parts.push(new TextEncoder().encode(streamEnd));
    offset += streamEnd.length;

    const xrefOffset = offset;
    let xref = `xref\n0 6\n0000000000 65535 f \n`;
    objOffsets.forEach(off => {
        xref += `${String(off).padStart(10, '0')} 00000 n \n`;
    });

    const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    parts.push(new TextEncoder().encode(xref + trailer));

    const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
    const result = new Uint8Array(totalLength);
    let pos = 0;
    parts.forEach(p => { result.set(p, pos); pos += p.length; });
    return result;
}

function sanitizeFilename(name) {
    return (name || 'quadro').replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, '').trim() || 'quadro';
}

function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

async function generateThumbnailDataURL(project) {
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 400;
    thumbCanvas.height = 280;
    const fullCanvas = await renderToCanvas(project);
    const ctx = thumbCanvas.getContext('2d');
    const scale = Math.min(400 / fullCanvas.width, 280 / fullCanvas.height);
    const w = fullCanvas.width * scale;
    const h = fullCanvas.height * scale;
    ctx.drawImage(fullCanvas, (400 - w) / 2, (280 - h) / 2, w, h);
    return thumbCanvas.toDataURL('image/jpeg', 0.6);
}
