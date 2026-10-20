import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { duration, escapeHtml } from '../ui.js';
const source = (await readFile(new URL('../../script.js', import.meta.url), 'utf8')).replace(/^init\(\);$/m, '');
function harness(search = '') {
    const storage = new Map();
    const elements = new Map();
    const element = key => {
        if (!elements.has(key)) elements.set(key, { innerHTML: '', style: {}, classList: { add() {}, remove() {} }, focus() {} });
        return elements.get(key);
    };
    const ctx = vm.createContext({
        document: { querySelector: element, querySelectorAll: () => [] },
        location: { search }, URLSearchParams,
        navigator: { userAgent: 'Chrome/130', language: 'es' },
        localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) },
        console, setInterval, clearInterval
    });
    vm.runInContext(source, ctx);
    return { run: code => vm.runInContext(code, ctx), storage, elements };
}
test('las ocho actividades y las 15 reglas finales se conservan', () => {
    const h = harness();
    assert.equal(h.run('screens.length'),8); // Incluye inicio; formulario contiene actividades 3 y 4.
    assert.equal(h.run('finalPasswordRules.length'),15);
    assert.equal(h.run('shortPasswordRules.length'),3);
});
test('restaura texto, cronómetro y condiciones de la misma partida', () => {
    const h = harness();
    h.run(`state.finalPassword='Texto"<persistido>'; state.finalPasswordStartedAt=12345; state.finalPasswordRevealedCount=4; saveFinalProgress(); resetFinalAttempt(); restoreFinalSnapshot(JSON.parse(localStorage.getItem('interactividad-password-progress:sin-dni')));`);
    assert.equal(h.run('state.finalPassword'), 'Texto"<persistido>');
    assert.equal(h.run('state.finalPasswordStartedAt'),12345);
    assert.equal(h.run('state.finalPasswordRevealedCount'),4);
    assert.equal(h.run("finalPasswordRules.find(r=>r.id==='targetColor').color.name === passwordContext.targetColor.name"),true);
});
test('la persistencia competitiva no toca el resultado libre', () => {
    const h = harness('?competencia=test');
    h.run('let captured; competitionRuntime={save:s=>captured=s}; state.finalPassword="prueba"; saveFinalProgress();');
    assert.equal(h.storage.size,0);
    assert.equal(h.run('captured.password'),'prueba');
});
test('escape de texto ingresado y precisión visual', () => {
    assert.equal(escapeHtml('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
    assert.equal(duration(84379),'01:24.37');
    assert.equal(duration(null),'—');
});
test('el enlace competitivo comienza con la exposición sin revelar ranking ni salto al final', async () => {
    const h = harness('?competencia=exposicion');
    await h.run('showScreen("start")');
    const markup = h.elements.get('#app').innerHTML;
    assert.match(markup, /COMENZAR/);
    assert.doesNotMatch(markup, /IR AL PASSWORD GAME FINAL|ranking|competencia/i);
    assert.equal(h.run('state.currentScreen'), 'start');
});
test('usa el nombre del formulario original al entrar al final y permite continuar al cierre', async () => {
    const h = harness('?competencia=exposicion');
    h.run(`let joinedName; competitionRuntime={prepare:async name=>{joinedName=name;return true},leave(){}};
        state.formData={nombre:'Nombre del formulario',dni:'12345678',edad:'18'}; state.activePlayerDni='12345678';
        screens.find(s=>s.id==='finalPassword').render=()=>{}; screens.find(s=>s.id==='closing').render=()=>{};`);
    await h.run('showScreen("finalPassword")');
    assert.equal(h.run('joinedName'),'Nombre del formulario');
    assert.equal(h.run('state.finalPasswordStartedAt'),null);
    await h.run('showScreen("closing")');
    assert.equal(h.run('state.currentScreen'),'closing');
    const journey = JSON.parse(h.storage.get('pw-journey:exposicion'));
    assert.equal(journey.formData.nombre,'Nombre del formulario');
    assert.equal(journey.screen,'closing');
});
