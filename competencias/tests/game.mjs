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
        if (!elements.has(key)) elements.set(key, { innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, focus() {}, listeners: {}, addEventListener(type, callback) { this.listeners[type] = callback; } });
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
test('cierre personaliza sin interpretar HTML y conserva ambas salidas', () => {
    const h = harness();
    h.run(`state.formData.nombre='<img> Apellido'; renderClosing();`);
    const markup = h.elements.get('#app').innerHTML;
    assert.match(markup, /¡Bien hecho, &lt;img&gt;!/);
    assert.doesNotMatch(markup, /Para pensar/);
    assert.match(markup, /data-next="start"/);
    assert.match(markup, /data-next="finalPassword"/);
    h.run(`state.formData.nombre=''; renderClosing();`);
    assert.match(h.elements.get('#app').innerHTML, /¡Felicitaciones!/);
});

test('las demostraciones del cierre reaccionan sin modificar la partida', () => {
    const h = harness();
    h.run('renderClosingExperiment("events")');
    h.elements.get('#recap-react').listeners.click();
    assert.match(h.elements.get('#recap-pose').src, /idle.png/);
    h.run('renderClosingExperiment("validation")');
    h.elements.get('#recap-sample').listeners.input({target:{value:'hola'}});
    assert.match(h.elements.get('#recap-check').textContent, /Cumplida/);
    h.elements.get('#recap-sample').listeners.input({target:{value:'a'}});
    assert.match(h.elements.get('#recap-check').textContent, /Pendiente/);
    h.run('renderClosingExperiment("ranking")');
    const button = h.elements.get('#recap-delivery-next');
    button.listeners.click({currentTarget:button});
    assert.match(h.elements.get('#recap-delivery-message').textContent, /servidor/);
    button.listeners.click({currentTarget:button});
    assert.match(h.elements.get('#recap-delivery-message').textContent, /clasificación/);
    assert.equal(h.run('state.finalPassword'), '');
    assert.equal(h.run('state.finalPasswordStartedAt'), null);
    assert.equal(h.storage.size, 0);
});

test('las ocho actividades y las 15 reglas finales se conservan', () => {
    const h = harness();
    assert.equal(h.run('screens.length'),8); // Incluye inicio; formulario contiene actividades 3 y 4.
    assert.equal(h.run('finalPasswordRules.length'),15);
    assert.equal(h.run('finalPasswordRules.some(r => r.id === "romanNumeral")'),false);
    assert.equal(h.run('finalPasswordRules.some(r => r.id === "currentYearRoman")'),true);
    assert.equal(h.run('shortPasswordRules.length'),3);
});

test('acepta cualquier palabra del nombre, normaliza tildes y rechaza nombres vacíos', () => {
    const h = harness();
    h.run(`state.formData.nombre='  Álvaro   José Irazoqui  ';`);
    for (const word of ['alvaro', 'JOSE', 'irazoqui']) {
        assert.equal(h.run(`finalPasswordRules.find(r=>r.id==='playerName').validate('123${word}!')`),true);
    }
    assert.equal(h.run(`finalPasswordRules.find(r=>r.id==='playerName').validate('otro')`),false);
    h.run(`state.formData.nombre='   ';`);
    assert.equal(h.run(`finalPasswordRules.find(r=>r.id==='playerName').validate('cualquiertexto')`),false);
});

test('longitud aleatoria se fija al revelarse, persiste y se reinicia por partida', () => {
    const h = harness();
    h.run(`const cfg={stateKey:'finalPassword',revealedCountKey:'finalPasswordRevealedCount'};
        state.finalPassword='a';
        getVisiblePasswordResults(validatePassword(state.finalPassword,finalPasswordRules),cfg);`);
    assert.equal(h.run('passwordContext.targetLength'),null);
    for (const [random, extra] of [[0,5],[0.999999,18]]) {
        h.run(`resetFinalAttempt(); Math.random=()=>${random}; state.finalPassword=buildValidFinalPassword();
            getVisiblePasswordResults(validatePassword(state.finalPassword,finalPasswordRules),cfg);`);
        assert.equal(h.run('passwordContext.targetLength-state.finalPassword.length'),extra);
        const target = h.run('passwordContext.targetLength');
        h.run(`saveFinalProgress(); restoreFinalSnapshot(JSON.parse(localStorage.getItem('interactividad-password-progress:sin-dni')));`);
        assert.equal(h.run('passwordContext.targetLength'),target);
        assert.equal(h.run(`finalPasswordRules.find(r=>r.id==='longPassword').validate('a'.repeat(${target-1}))`),false);
        assert.equal(h.run(`finalPasswordRules.find(r=>r.id==='longPassword').validate('a'.repeat(${target}))`),true);
        h.run(`state.finalPassword='a'; getVisiblePasswordResults(validatePassword(state.finalPassword,finalPasswordRules),cfg);`);
        assert.equal(h.run('passwordContext.targetLength'),target);
    }
    h.run('resetFinalAttempt()');
    assert.equal(h.run('passwordContext.targetLength'),null);
});

test('eventos desbloquea solo al completar las cuatro tarjetas, incluido teclado virtual', () => {
    const h = harness();
    h.run('renderEvents()');
    assert.match(h.elements.get('#app').innerHTML, /id="continue-after-events"[^>]*disabled/);
    assert.match(h.elements.get('#app').innerHTML, /<summary>Para pensar/);
    assert.match(h.elements.get('#app').innerHTML, /<code>scroll<\/code>/);
    assert.doesNotMatch(h.elements.get('#app').innerHTML, /genie-companion/);
    h.elements.get('#click-demo').listeners.click();
    h.elements.get('#click-demo').listeners.click();
    assert.equal(h.run('state.discoveredEvents.length'), 1);
    h.elements.get('#hover-demo').listeners.pointerdown();
    h.elements.get('#key-demo').listeners.input();
    assert.equal(h.elements.get('#continue-after-events').disabled, true);
    assert.equal(h.run('state.lastEvent'), 'input');
    h.elements.get('#input-demo').listeners.input();
    assert.equal(h.elements.get('#continue-after-events').disabled, false);
    h.run('renderEvents()');
    assert.doesNotMatch(h.elements.get('#app').innerHTML, /id="continue-after-events"[^>]*disabled/);
});

test('keydown conserva la letra ante input y admite teclados virtuales', () => {
    const h = harness();
    h.run('renderEvents()');
    const key = h.elements.get('#key-demo');
    key.listeners.keydown({key:'a'});
    key.listeners.input({data:'a'});
    assert.equal(h.run('state.lastEvent'), 'keydown');
    assert.match(h.elements.get('#event-description').textContent, /tecla a/);
    key.listeners.keyup();
    key.listeners.keydown({key:'Unidentified'});
    key.listeners.input({data:'ñ'});
    assert.equal(h.run('state.lastEvent'), 'input');
    assert.match(h.elements.get('#event-description').textContent, /ingresó: ñ/);
    key.listeners.input({inputType:'deleteContentBackward'});
    assert.match(h.elements.get('#event-description').textContent, /borró/);
});

test('la zona sensible permite completar la tarjeta con teclado sin contar foco', () => {
    const h = harness();
    h.run('renderEvents()');
    const zone = h.elements.get('#hover-demo');
    assert.equal(zone.listeners.focus, undefined);
    zone.listeners.keydown({key: 'Tab', preventDefault() {}});
    assert.equal(h.run('state.discoveredEvents.length'), 0);
    zone.listeners.keydown({key: 'Enter', preventDefault() {}});
    assert.equal(h.run('state.discoveredEvents[0]'), 'mouseover');
    assert.equal(h.run('state.lastEvent'), 'keydown');
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
