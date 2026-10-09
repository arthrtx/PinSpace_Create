// Paletas de cores predefinidas para facilitar escolha de cores

const COLOR_PALETTES = {
    vintage: {
        name: 'Vintage',
        colors: ['#8B7355', '#C19A6B', '#D4A574', '#E8D5B7', '#F5E6D3']
    },
    modern: {
        name: 'Modern',
        colors: ['#0f172a', '#1e293b', '#334155', '#64748b', '#94a3b8']
    },
    pastel: {
        name: 'Pastel',
        colors: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF']
    },
    bold: {
        name: 'Bold',
        colors: ['#E60023', '#FF6B35', '#F7931E', '#FDC830', '#37B5E6']
    },
    nature: {
        name: 'Nature',
        colors: ['#2D5016', '#5C8001', '#8FBC3F', '#B8D87F', '#E8F5D0']
    },
    ocean: {
        name: 'Ocean',
        colors: ['#003366', '#0066CC', '#3399FF', '#66B2FF', '#99CCFF']
    },
    sunset: {
        name: 'Sunset',
        colors: ['#FF6B35', '#F7931E', '#FDC830', '#F37335', '#C1292E']
    },
    monochrome: {
        name: 'Monocromático',
        colors: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC']
    },
    candy: {
        name: 'Candy',
        colors: ['#FF69B4', '#FF1493', '#DA70D6', '#BA55D3', '#9370DB']
    },
    earth: {
        name: 'Earth',
        colors: ['#704214', '#8B5A2B', '#A0826D', '#C19A6B', '#D2B48C']
    }
};

function getPaletteColors(paletteName) {
    return COLOR_PALETTES[paletteName]?.colors || [];
}

function getAllPalettes() {
    return Object.entries(COLOR_PALETTES).map(([key, palette]) => ({
        key,
        name: palette.name,
        colors: palette.colors
    }));
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.COLOR_PALETTES = COLOR_PALETTES;
    window.getPaletteColors = getPaletteColors;
    window.getAllPalettes = getAllPalettes;
}
