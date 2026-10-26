import { getClient, rpc, competition, board } from './supabase.js';
import { escapeHtml as html, duration, links, message } from './ui.js';

// Sólo la solución final se publica con su resultado; la partida en curso sigue siendo local.
export function startCompetition(hooks) {
    const id = new URL(location.href).searchParams.get('competencia');
    const app = document.querySelector('#app');
    const ranking = links(id).ranking;
    let client, event, participant, saved, key, summary;
    let busy = false, prepared = false, timer;
    const renderNotice = text => {
        app.innerHTML = `<section class="competition-card"><h2>Password Game</h2><p role="status">${html(text)}</p><button id="competition-reload">Volver a intentar</button><p><a href="${html(ranking)}">Ver ranking</a> · <a href="index.html">Modo libre</a></p></section>`;
        document.querySelector('#competition-reload').onclick = () => hooks.play();
    };
    function persist() { localStorage.setItem(key, JSON.stringify(saved)); }
    function restore() {
        try { saved = JSON.parse(localStorage.getItem(key)); } catch { saved = null; }
        if (!saved || typeof saved.gameId !== 'string') {
            saved = { gameId: crypto.randomUUID(), snapshot: null, result: null, receipt: null };
        }
    }
    async function syncSummary() {
        const rows = await board(id);
        summary = rows.find(row => row.participant_id === participant.id);
        return rows;
    }
    function renderResult(errorText = '') {
        clearInterval(timer);
        if (!hooks.isFinal()) return;
        const receipt = saved.receipt;
        const stats = receipt ? (summary || receipt.summary) : null;
        const remaining = stats ? Math.max(0, event.max_attempts - stats.completed) : null;
        app.innerHTML = `<section class="competition-card">
            <p class="eyebrow">${html(event.name)}</p><h2>¡DESAFÍO COMPLETADO!</h2>
            <img class="competition-genie" src="assets/genio/idle.png" alt="Genio sonriendo">
            <h3>${html(participant.name)}</h3><p class="competition-time">${duration(saved.result.durationMs)}</p>
            <p role="status">${receipt ? (saved.detailsPending ? 'Tiempo registrado. Contraseña pendiente de sincronización.' : 'Resultado registrado.') : 'Resultado pendiente de confirmación.'}</p>
            ${stats ? `<p>Mejor marca: <strong>${duration(stats.best_ms)}</strong></p><p>Intentos completados: ${stats.completed}/${event.max_attempts} · Restantes: ${remaining}</p><p id="personal-position"></p>` : ''}
            <p class="competition-error" role="alert">${html(errorText)}</p>
            <div class="actions"><button id="continue-exhibition">CONTINUAR →</button><a class="competition-link" href="${html(ranking)}">Ver ranking</a>
            ${!receipt || saved.detailsPending ? '<button id="submit-result">Reintentar envío</button>' : remaining > 0 && event.status === 'active' ? '<button id="next-attempt" disabled>Esperando cooldown…</button>' : ''}</div>
            ${remaining === 0 ? '<p>Ya no quedan intentos competitivos.</p>' : ''}
            ${event.status === 'closed' ? '<p>La competencia finalizó.</p>' : ''}
            <p><a href="index.html">Volver al modo libre</a></p>
        </section>`;
        document.querySelector('#continue-exhibition').onclick = hooks.continue;
        const submit = document.querySelector('#submit-result');
        if (submit) { submit.disabled = busy; submit.onclick = send; }
        const next = document.querySelector('#next-attempt');
        if (next) {
            const update = () => {
                const seconds = Math.max(0, Math.ceil((Date.parse(stats.last_completed_at || receipt.result.completed_at) + 20000 - Date.now()) / 1000));
                next.disabled = seconds > 0;
                next.textContent = seconds ? `Volver a intentar (${seconds}s)` : 'Volver a intentar';
            };
            update(); timer = setInterval(update, 250);
            next.onclick = async () => {
                next.disabled = true;
                try {
                    event = await competition(id); await syncSummary();
                    if (event.status !== 'active' || summary.completed >= event.max_attempts) { renderResult(); return; }
                    const nextAttempt = { gameId: crypto.randomUUID(), snapshot: null, result: null, receipt: null };
                    localStorage.setItem(key, JSON.stringify(nextAttempt));
                    saved = nextAttempt;
                    clearInterval(timer); hooks.restore(null); hooks.play();
                } catch (error) { renderResult(message(error)); }
            };
        }
        if (receipt) board(id).then(rows => {
            const element = document.querySelector('#personal-position');
            if (element) element.textContent = `Posición actual: #${rows.filter(r => r.best_ms != null).findIndex(r => r.participant_id === participant.id) + 1}`;
        }).catch(() => {});
    }
    async function send() {
        if (busy || (saved.receipt && !saved.detailsPending)) return;
        busy = true; renderResult();
        try {
            const args = { p_competition: id, p_game: saved.gameId, p_duration: saved.result.durationMs };
            const hasPassword = typeof saved.result.password === 'string';
            if (hasPassword) args.p_password = saved.result.password;
            let receipt;
            try {
                receipt = await rpc(hasPassword ? 'pw_submit_details' : 'pw_submit', args);
                saved.detailsPending = false;
            } catch (error) {
                if (!hasPassword || error.code !== 'PGRST202') throw error;
                // Durante el despliegue, el SQL anterior sigue registrando tiempos sin perder intentos.
                const { p_password, ...legacyArgs } = args;
                receipt = await rpc('pw_submit', legacyArgs);
                saved.detailsPending = true;
            }
            saved.receipt = receipt;
            summary = receipt.summary;
            persist();
            try { event = await competition(id); } catch { /* La confirmación ya llegó. */ }
            busy = false; renderResult();
        } catch (error) { busy = false; renderResult(message(error)); }
    }
    const runtime = {
        async prepare(name) {
            if (prepared) return true;
            app.innerHTML = '<p role="status">Preparando el desafío…</p>';
            try {
                client = await getClient();
                event = await competition(id);
                const { data, error } = await client.auth.getSession();
                if (error) throw error;
                if (!data.session) {
                    const { error: authError } = await client.auth.signInAnonymously();
                    if (authError) throw authError;
                }
                participant = await rpc('pw_join', { p_competition: id, p_name: name });
                key = `pw-competition:${id}:${participant.id}`;
                restore(); persist(); await syncSummary();
                if (!saved.result && event.status !== 'active') throw new Error('Esta exposición ya no acepta resultados.');
                if (!saved.result && summary.completed >= event.max_attempts) throw new Error('Ya completaste todos tus intentos.');
                const remaining = Date.parse(summary.last_completed_at || '') + 20000 - Date.now();
                if (!saved.result && remaining > 0) throw new Error(`Esperá ${Math.ceil(remaining / 1000)} segundos antes de volver a jugar.`);
                hooks.restore(saved.snapshot);
                prepared = true;
                return true;
            } catch (error) { renderNotice(message(error)); return false; }
        },
        leave() { clearInterval(timer); },
        save(snapshot) { if (saved) { saved.snapshot = snapshot; persist(); } },
        showCompleted() {
            if (!saved?.result) return false;
            renderResult();
            if (!saved.receipt || saved.detailsPending) void send();
            return true;
        },
        complete(result) {
            if (!saved.result) {
                saved.result = { durationMs: Math.max(1, Math.round(result.durationMs)), password: result.password };
                saved.snapshot = null;
                try { persist(); } catch { /* Conservamos el resultado en memoria para enviarlo. */ }
            }
            renderResult(); void send();
        }
    };
    window.addEventListener('online', () => { if (saved?.result && (!saved.receipt || saved.detailsPending)) void send(); });
    hooks.attach(runtime);
    return runtime;
}
