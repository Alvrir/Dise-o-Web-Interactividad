import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import * as ui from '../ui.js';

async function setup({ pending = false, details = false, missingMigration = false } = {}) {
    const elements = new Map();
    const node = selector => {
        if (!elements.has(selector)) elements.set(selector, { innerHTML: '', textContent: '', disabled: false });
        return elements.get(selector);
    };
    let online = true, submissions = 0, restored, played = 0;
    const stats = { completed: pending ? 0 : 1, best_ms: 10000, last_completed_at: '2020-01-01T00:00:00Z' };
    let value = JSON.stringify({ gameId: randomUUID(), result: { durationMs: 10000, ...(details ? { password: 'Solucion de prueba' } : {}) }, snapshot: null,
        receipt: pending ? null : { result: { completed_at: stats.last_completed_at }, summary: stats } });
    const api = {
        getClient: async () => ({ auth: { getSession: async () => ({ data: { session: {} } }) } }),
        competition: async () => { if (!online) throw Error('Sin conexión'); return { name: 'Prueba', status: 'active', max_attempts: 2 }; },
        board: async () => [{ participant_id: 'p', ...stats }],
        rpc: async name => {
            if (name === 'pw_join') return { id: 'p', name: 'Nombre original' };
            if (name === 'pw_submit_details' && missingMigration) throw { code: 'PGRST202' };
            submissions++;
            return { result: { completed_at: stats.last_completed_at }, summary: { ...stats, completed: 1 } };
        }
    };
    const context = vm.createContext({
        URL, location: { href: 'https://example.com/index.html?competencia=c' },
        document: { querySelector: selector => selector === '#app' || node('#app').innerHTML.includes(`id="${selector.slice(1)}"`) ? node(selector) : null }, window: { addEventListener() {} }, crypto: { randomUUID },
        localStorage: { getItem: () => value, setItem: (key, next) => { value = next; } },
        setInterval: () => 1, clearInterval() {}
    });
    const source = await readFile(new URL('../game.js', import.meta.url), 'utf8');
    const module = new vm.SourceTextModule(source, { context });
    await module.link(specifier => {
        const exports = specifier === './supabase.js' ? api : ui;
        return new vm.SyntheticModule(Object.keys(exports), function () {
            for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
        }, { context });
    });
    await module.evaluate();
    const runtime = module.namespace.startCompetition({
        attach() {}, isFinal: () => true, continue() {}, restore: s => { restored = s; }, play: () => { played++; }
    });
    await runtime.prepare('Nombre original');
    return { runtime, node, offline: () => { online = false; }, online: () => { online = true; },
        saved: () => JSON.parse(value), submissions: () => submissions, played: () => played };
}
test('recargar una victoria pendiente reintenta el mismo UUID', async () => {
    const h = await setup({ pending: true });
    const id = h.saved().gameId;
    h.runtime.showCompleted();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.submissions(), 1);
    assert.equal(h.saved().gameId, id);
    assert.ok(h.saved().receipt);
});
test('un fallo de red al reiniciar conserva la victoria y permite reintentar', async () => {
    const h = await setup();
    h.runtime.showCompleted();
    const id = h.saved().gameId;
    h.offline(); await h.node('#next-attempt').onclick();
    assert.equal(h.saved().gameId, id);
    assert.ok(h.saved().result);
    assert.match(h.node('#app').innerHTML, /Sin conexión/);
    h.online(); await h.node('#next-attempt').onclick();
    assert.notEqual(h.saved().gameId, id);
    assert.equal(h.saved().result, null);
    assert.equal(h.played(), 1);
});

test('si falta la migración, conserva el tiempo confirmado y los detalles pendientes', async () => {
    const h = await setup({ pending: true, details: true, missingMigration: true });
    h.runtime.showCompleted();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.submissions(), 1);
    assert.ok(h.saved().receipt);
    assert.equal(h.saved().detailsPending, true);
    assert.equal(h.saved().result.password, 'Solucion de prueba');
});
