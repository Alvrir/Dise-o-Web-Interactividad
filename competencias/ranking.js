import { getClient, competition, board } from './supabase.js';
import { escapeHtml as html, duration, statusLabel, message } from './ui.js';

const $ = id => document.getElementById(id);
let id = new URL(location.href).searchParams.get('competencia');
let event, rows = [], expanded = false, connected = false, channel, client, poll, debounce;
let loading = false, rerun = false;
const revealed = new Map();
function draw() {
    $('event-name').textContent = event.name;
    $('event-status').textContent = statusLabel[event.status];
    $('registered').textContent = rows.length;
    const ranked = rows.filter(row => row.best_ms != null);
    $('finished').textContent = ranked.length;
    $('empty-state').hidden = ranked.length > 0;
    $('empty-state').textContent = rows.length ? 'El desafío está en marcha. Esperando la primera victoria…' : '¡El genio espera a sus primeros participantes!';
    $('podium').innerHTML = ranked.length ? ranked.slice(0, 3).map((row, index) => `<article class="podium-place place-${index + 1}"><span class="podium-number">${index + 1}</span>${index === 0 ? '<img src="../assets/genio/idle.png" alt="Genio sonriendo">' : ''}<h2>${html(row.name)}</h2><strong>${duration(row.best_ms)}</strong></article>`).join('') : '<img class="waiting-genie" src="../assets/genio/pensando.png" alt="Genio esperando resultados">';
    $('ranking-rows').innerHTML = ranked.slice(0, expanded ? ranked.length : 10).map((row, index) => `<tr><td>#${index + 1}</td><th scope="row">${html(row.name)}</th><td>${duration(row.best_ms)}</td><td>${row.completed}/${event.max_attempts}</td><td>${row.character_count ?? '—'}</td><td>${row.game_password == null ? '<span class="ranking-note">No disponible</span>' : `<div class="ranking-password ${revealed.get(row.participant_id) === row.game_password ? 'is-revealed' : ''}"><button type="button" class="secondary-button" data-password="${html(row.participant_id)}" aria-expanded="${revealed.get(row.participant_id) === row.game_password}" aria-controls="password-${html(row.participant_id)}">${revealed.get(row.participant_id) === row.game_password ? 'Ocultar contraseña' : 'Mostrar contraseña'}</button><span id="password-${html(row.participant_id)}" class="ranking-password-text">${html(row.game_password)}</span></div>`}</td></tr>`).join('');
    $('ranking-rows').querySelectorAll('[data-password]').forEach(button => {
        button.onclick = () => {
            const row = ranked.find(item => item.participant_id === button.dataset.password);
            if (revealed.get(row.participant_id) === row.game_password) revealed.delete(row.participant_id);
            else revealed.set(row.participant_id, row.game_password);
            const visible = revealed.has(row.participant_id);
            button.parentElement.classList.toggle('is-revealed', visible);
            button.setAttribute('aria-expanded', String(visible));
            button.textContent = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
        };
    });
    $('show-all').hidden = ranked.length <= 10;
    $('show-all').textContent = expanded ? 'Mostrar los primeros 10' : `Ver los ${ranked.length} resultados`;
}
async function refresh() {
    if (loading) { rerun = true; return; }
    loading = true;
    try {
        [event, rows] = await Promise.all([competition(id), board(id)]);
        draw(); $('ranking-error').textContent = '';
        $('connection').textContent = connected ? '● En vivo' : '↻ Actualización de respaldo cada 15 s';
    } catch (error) {
        $('connection').textContent = 'Sin conexión · reintentando';
        $('ranking-error').textContent = message(error);
    } finally {
        loading = false;
        if (rerun) { rerun = false; void refresh(); }
    }
}
function scheduleRefresh() { clearTimeout(debounce); debounce = setTimeout(refresh, 250); }
$('show-all').onclick = () => { expanded = !expanded; draw(); };
try {
    client = await getClient();
    if (!id) {
        const { data, error } = await client.from('pw_competitions').select('id').eq('status', 'active').maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('No hay una competencia activa. Abrí un ranking desde el historial del panel.');
        id = data.id;
    }
    await refresh();
    channel = client.channel(`ranking:${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pw_leaderboard', filter: `competition_id=eq.${id}` }, scheduleRefresh)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pw_competitions', filter: `id=eq.${id}` }, scheduleRefresh)
        .subscribe(status => {
            connected = status === 'SUBSCRIBED';
            if (connected) void refresh();
            else $('connection').textContent = '↻ Reconectando · respaldo cada 15 s';
        });
    poll = setInterval(refresh, 15000);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
    window.addEventListener('pagehide', () => { clearInterval(poll); clearTimeout(debounce); client.removeChannel(channel); });
    window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
} catch (error) {
    $('connection').textContent = 'Ranking no disponible';
    $('ranking-error').textContent = message(error);
    $('empty-state').textContent = 'Comprobá la configuración y recargá la página.';
}
