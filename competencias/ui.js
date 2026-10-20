export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function duration(ms) {
    if (ms == null) return '—';
    return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(Math.floor(ms / 10) % 100).padStart(2, '0')}`;
}
export function links(id) {
    const root = new URL('../', import.meta.url);
    return {
        play: new URL(`index.html?competencia=${encodeURIComponent(id)}`, root).href,
        ranking: new URL(`competencias/ranking.html?competencia=${encodeURIComponent(id)}`, root).href
    };
}
export const statusLabel = { draft: 'Preparada', active: 'En juego', closed: 'Finalizada' };
export function message(error) {
    return error?.message || 'No se pudo conectar. Revisá tu conexión y volvé a intentar.';
}
