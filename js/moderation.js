/**
 * moderation.js — Regras de conteúdo para os quadros públicos.
 *
 * Duas responsabilidades:
 *   1. Bloquear nomes de autor (e texto) com linguagem ofensiva.
 *   2. Fornecer os termos e condições de direitos de imagem mostrados
 *      antes de publicar.
 *
 * A validação também é feita no lado do cliente, antes de enviar para o
 * Supabase (js/supabase.js), para devolver um erro imediato ao utilizador.
 */

const MODERATION_BAD_WORDS = [
    'abo', 'arrombado', 'baitola', 'bicha', 'boceta', 'bosta', 'buceta',
    'caralho', 'cacete', 'cu', 'cuzão', 'cuzao', 'cornudo', 'corno',
    'desgraçado', 'desgracado', 'escroto', 'foder', 'fodase', 'foda-se',
    'fodido', 'filhadaputa', 'filho da puta', 'grelo', 'idiota', 'imbecil',
    'merda', 'otario', 'otário', 'pau', 'pinto', 'piroca', 'porra',
    'punheta', 'puta', 'putaria', 'puto', 'peido', 'pentelho', 'rola',
    'sacanagem', 'tarado', 'troxa', 'vagabunda', 'vagabundo', 'viado',
    'xoxota',
    'asshole', 'bastard', 'bitch', 'bullshit', 'cock', 'cunt', 'dick',
    'douche', 'faggot', 'fag', 'fuck', 'fucker', 'motherfucker', 'nigga',
    'nigger', 'pussy', 'retard', 'shit', 'slut', 'whore', 'wanker',
    'nazi', 'hitler'
];

const MODERATION_LEET = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
    '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's',
    '!': 'i', '|': 'i'
};

const IMAGE_RIGHTS_TERMS = [
    'Confirma que é o autor das imagens que publica ou que tem autorização ou licença dos respetivos titulares de direitos.',
    'É o único responsável pelo conteúdo que publica e não pode publicar imagens sem direitos de utilização.',
    'Nomes ofensivos, conteúdo de ódio, violento ou sexual, e conteúdo que viole direitos de terceiros são proibidos.',
    'Se publicar conteúdo que infrinja direitos de autor ou de imagem de terceiros, o conteúdo pode ser removido sem aviso e assume total responsabilidade por eventuais reclamações.'
];

function moderationNormalize(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[0-9@$!|]/g, (ch) => MODERATION_LEET[ch] || ch)
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function moderationCollapse(word) {
    return word.replace(/(.)\1+/g, '$1');
}

function moderationTokenize(normalized) {
    if (!normalized) return { tokens: [], joined: '' };
    const tokens = normalized.split(' ').map(moderationCollapse);
    return { tokens, joined: tokens.join('') };
}

function moderationStripDigits(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function findBadWords(text) {
    const variants = [moderationTokenize(moderationNormalize(text))];
    const stripped = moderationStripDigits(text);
    if (stripped) variants.push(moderationTokenize(stripped));
    const found = new Set();
    for (const raw of MODERATION_BAD_WORDS) {
        const banned = moderationCollapse(moderationNormalize(raw).replace(/\s+/g, ''));
        if (!banned) continue;
        for (const { tokens, joined } of variants) {
            if (tokens.includes(banned) || joined === banned || (banned.length >= 5 && joined.includes(banned))) {
                found.add(raw);
                break;
            }
        }
    }
    return [...found];
}

function moderationFormatList(words) {
    return words.map(w => '“' + w + '”').join(', ');
}

function moderationBadWordsReason(words) {
    const count = words.length === 1
        ? 'uma palavra proibida'
        : words.length + ' palavras proibidas';
    return 'O nome contém ' + count + ': ' + moderationFormatList(words) +
        '. Não é permitido usar linguagem ofensiva em quadros públicos — escolha outro nome.';
}

function validateAuthorName(name) {
    const value = String(name || '').trim() || 'Anónimo';
    if (value.length > 40) {
        return { ok: false, error: 'O nome tem ' + value.length + ' caracteres, mas o máximo permitido é 40. Encurte o nome para publicar.' };
    }
    if (/https?:\/\//i.test(value) || /www\./i.test(value) || /\S+\.(com|pt|net|org|io|xyz|info)\b/i.test(value)) {
        return { ok: false, error: 'O nome não pode conter links nem endereços de sites (ex.: www.exemplo.com). Remova o link e tente novamente.' };
    }
    const bad = findBadWords(value);
    if (bad.length) {
        return { ok: false, error: moderationBadWordsReason(bad) };
    }
    return { ok: true, value };
}

function validatePublicText(text) {
    const bad = findBadWords(text);
    if (bad.length) {
        return { ok: false, error: 'O texto contém ' + (bad.length === 1 ? 'uma palavra proibida' : bad.length + ' palavras proibidas') + ': ' + moderationFormatList(bad) + '. Remova a linguagem ofensiva.' };
    }
    return { ok: true, value: String(text || '').trim() };
}
