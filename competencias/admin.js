import { getClient, rpc } from './supabase.js';
import { escapeHtml as html, links, message, statusLabel } from './ui.js';
const $ = id => document.getElementById(id);
let client;
async function showLinks(event) {
    const urls = links(event.id);
    const panel = $('event-links'); panel.hidden = false;
    panel.innerHTML = `<h2>${html(event.name)}</h2><p><a href="${html(urls.play)}" target="_blank" rel="noopener">Abrir juego</a></p><input aria-label="Enlace para jugar" readonly value="${html(urls.play)}"><p><a href="${html(urls.ranking)}" target="_blank" rel="noopener">Abrir ranking para proyectar</a></p><div id="qr-code" aria-label="Código QR para jugar"></div><p id="qr-message">Generando QR…</p>`;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    try {
        const { default: QRCode } = await import('https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm');
        if (!panel.querySelector('input') || panel.querySelector('input').value !== urls.play) return;
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, urls.play, { width: 280, margin: 3, errorCorrectionLevel: 'M' });
        canvas.setAttribute('aria-label', `QR para ${event.name}`);
        $('qr-code').append(canvas); $('qr-message').textContent = 'Escaneá para entrar a esta competencia.';
    } catch { $('qr-message').textContent = 'No se pudo generar el QR. Podés compartir el enlace de arriba.'; }
}
async function refresh() {
    const { data, error } = await client.from('pw_competitions').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    $('events-list').innerHTML = data.length ? data.map(event => `<article class="event-card"><div><h3>${html(event.name)}</h3><p>${statusLabel[event.status]} · ${event.max_attempts} victorias por participante · ${new Date(event.created_at).toLocaleDateString('es-AR')}</p></div><div class="actions"><button data-links="${event.id}" class="secondary-button">Enlaces y QR</button>${event.status === 'draft' ? `<button data-state="active" data-id="${event.id}">Activar</button>` : ''}${event.status === 'active' ? `<button data-state="closed" data-id="${event.id}">Finalizar competencia</button>` : ''}</div></article>`).join('') : '<p>Todavía no creaste competencias.</p>';
    $('events-list').querySelectorAll('[data-links]').forEach(button => button.onclick = () => showLinks(data.find(e => e.id === button.dataset.links)));
    $('events-list').querySelectorAll('[data-state]').forEach(button => button.onclick = async () => {
        if (button.dataset.state === 'closed' && !confirm('¿Finalizar esta competencia? No aceptará resultados nuevos y se conservará el historial.')) return;
        button.disabled = true; $('admin-error').textContent = '';
        try { await rpc('pw_set_status', { p_competition: button.dataset.id, p_status: button.dataset.state }); await refresh(); }
        catch (error) { $('admin-error').textContent = message(error); button.disabled = false; }
    });
}
async function checkSession() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    const session = data.session;
    const admin = session ? await rpc('pw_is_admin') : false;
    $('login-panel').hidden = admin;
    $('admin-panel').hidden = !admin;
    if (admin) { $('admin-user').textContent = session.user.email; await refresh(); }
    else if (session && !session.user.is_anonymous) $('admin-error').textContent = 'Tu usuario no tiene permisos de administrador. Revisá el paso pw_admins del README.';
}
$('login-form').onsubmit = async e => {
    e.preventDefault();
    const form = e.currentTarget, button = form.querySelector('button'), values = new FormData(form);
    button.disabled = true; $('admin-error').textContent = '';
    try {
        client = await getClient();
        const { error } = await client.auth.signInWithPassword({ email: values.get('email').trim(), password: values.get('password') });
        if (error) throw error;
        form.reset(); await checkSession();
    } catch (error) { $('admin-error').textContent = message(error); }
    finally { button.disabled = false; }
};
$('logout').onclick = async () => {
    try {
        const { error } = await client.auth.signOut(); if (error) throw error;
        $('admin-error').textContent = ''; $('event-links').hidden = true; await checkSession();
    } catch (error) { $('admin-error').textContent = message(error); }
};
$('create-form').onsubmit = async e => {
    e.preventDefault(); const form = e.currentTarget, values = new FormData(form), button = form.querySelector('button');
    button.disabled = true; $('admin-error').textContent = '';
    try {
        await rpc('pw_create_competition', { p_name: values.get('name').trim(), p_max: Number(values.get('max')) });
        form.reset(); await refresh();
    } catch (error) { $('admin-error').textContent = message(error); }
    finally { button.disabled = false; }
};
try { client = await getClient(); await checkSession(); }
catch (error) { $('admin-error').textContent = message(error); }
