const app = document.querySelector("#app");
const screenTitle = document.querySelector("#screen-title");
const progressText = document.querySelector("#progress-text");
const progressFill = document.querySelector("#progress-fill");
const devPanel = document.querySelector("#dev-panel");
const devToggle = document.querySelector("#dev-toggle");
const devClose = document.querySelector("#dev-close");
const devScreenSelect = document.querySelector("#dev-screen-select");
const devMessage = document.querySelector("#dev-message");

const fallbackAlumnos = [
    {
        dni: "12345678",
        nombre: "Juan Perez",
        edad: 18
    },
    {
        dni: "87654321",
        nombre: "Maria Lopez",
        edad: 17
    },
    {
        dni: "11223344",
        nombre: "Ana Gomez",
        edad: 19
    }
];

const state = {
    currentScreen: "start",
    alumnos: [],
    dataSource: "cargando",
    formData: {
        nombre: "",
        dni: "",
        edad: ""
    },
    alumnoEncontrado: null,
    lastEvent: "todavía ninguno",
    shortPassword: "",
    finalPassword: ""
};

const screens = [
    { id: "start", title: "INTERACTIVIDAD Y VALIDACIÓN", label: "Inicio", render: renderStart },
    { id: "browser", title: "¿QUÉ SABE LA PÁGINA SOBRE VOS?", label: "Actividad 1 / 8", render: renderBrowserInfo },
    { id: "events", title: "LA PÁGINA REACCIONA", label: "Actividad 2 / 8", render: renderEvents },
    { id: "form", title: "¿SOS ALUMNO?", label: "Actividad 3 y 4 / 8", render: renderForm },
    { id: "shortPassword", title: "PASSWORD GAME", label: "Actividad 5 / 8", render: renderShortPassword },
    { id: "fakeFinal", title: "¡FELICIDADES!", label: "Actividad 6 / 8", render: renderFakeFinal },
    { id: "finalPassword", title: "PASSWORD GAME - NIVEL FINAL", label: "Actividad 7 / 8", render: renderFinalPassword },
    { id: "closing", title: "¿QUÉ ACABAMOS DE HACER?", label: "Actividad 8 / 8", render: renderClosing }
];

const shortPasswordRules = [
    {
        id: "minLength",
        description: "Mínimo 8 caracteres.",
        validate: password => password.length >= 8
    },
    {
        id: "uppercase",
        description: "Una letra mayúscula.",
        validate: password => /[A-ZÁÉÍÓÚÑ]/.test(password)
    },
    {
        id: "number",
        description: "Un número.",
        validate: password => /\d/.test(password)
    }
];

const finalPasswordRules = [
    {
        id: "minLength",
        description: "Mínimo 10 caracteres.",
        validate: password => password.length >= 10
    },
    {
        id: "uppercase",
        description: "Al menos una mayúscula.",
        validate: password => /[A-ZÁÉÍÓÚÑ]/.test(password)
    },
    {
        id: "lowercase",
        description: "Al menos una minúscula.",
        validate: password => /[a-záéíóúñ]/.test(password)
    },
    {
        id: "number",
        description: "Al menos un número.",
        validate: password => /\d/.test(password)
    },
    {
        id: "symbol",
        description: "Al menos un símbolo.",
        validate: password => /[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(password)
    }
];

const closingConcepts = [
    {
        title: "Interactividad",
        description: "La página cambia cuando la persona participa.",
        image: "assets/screens/interactividad.png",
        activity: "Inicio"
    },
    {
        title: "Eventos",
        description: "Click, escritura, teclas y tacto disparan acciones.",
        image: "assets/screens/eventos.png",
        activity: "Actividad 2"
    },
    {
        title: "JavaScript",
        description: "El código escucha eventos, procesa datos y actualiza la interfaz.",
        image: "assets/screens/javascript.png",
        activity: "Actividad 2"
    },
    {
        title: "Formularios",
        description: "Los datos ingresados por el usuario se convierten en información útil.",
        image: "assets/screens/formularios.png",
        activity: "Actividad 3"
    },
    {
        title: "Validación",
        description: "Antes de avanzar se comprueba formato, existencia y coincidencia.",
        image: "assets/screens/validacion.png",
        activity: "Actividad 4"
    },
    {
        title: "Password Game",
        description: "Las reglas separadas de la interfaz permiten modificar el juego fácilmente.",
        image: "assets/screens/password-game.png",
        activity: "Actividad 5 y 7"
    }
];

init();

async function init() {
    await loadAlumnos();
    initDeveloperTools();
    showScreen("start");
}

async function loadAlumnos() {
    try {
        const response = await fetch("data/alumnos.json", { cache: "no-store" });

        if (!response.ok) {
            throw new Error("No se pudo leer data/alumnos.json");
        }

        state.alumnos = await response.json();
        state.dataSource = "json";
    } catch (error) {
        state.alumnos = fallbackAlumnos;
        state.dataSource = "fallback";
        console.warn("Se usaran alumnos de demostracion en memoria.", error);
    }
}

function showScreen(screenId) {
    const screen = screens.find(item => item.id === screenId);

    if (!screen) {
        return;
    }

    state.currentScreen = screenId;
    screenTitle.textContent = screen.title;
    updateProgress(screen);
    updateDeveloperScreenSelect(screenId);
    app.innerHTML = "";
    screen.render();
    app.focus();
}

function updateProgress(screen) {
    const index = screens.findIndex(item => item.id === screen.id);
    const percentage = index <= 0 ? 4 : Math.round((index / (screens.length - 1)) * 100);

    progressText.textContent = screen.label;
    progressFill.style.width = `${percentage}%`;
}

function renderStart() {
    app.innerHTML = `
        <section>
            <h2 class="hero-title">INTERACTIVIDAD Y VALIDACIÓN</h2>
            <p class="lead">Una página que reacciona a vos.</p>
            <p class="lead">Descubrí cómo una página web puede detectar tus acciones, procesar información y responder.</p>
            <div class="hero-actions">
                <button data-next="browser">COMENZAR</button>
            </div>
        </section>
    `;

    bindNextButtons();
}

function renderBrowserInfo() {
    const device = detectDevice();
    const browser = detectBrowser();

    app.innerHTML = `
        <section>
            <p class="lead">JavaScript puede leer información del entorno del navegador. No es una identificación segura: estos datos pueden variar o falsificarse.</p>
            <div class="info-grid">
                <article class="info-card">
                    <strong>Tu dispositivo</strong>
                    <code>${device}</code>
                </article>
                <article class="info-card">
                    <strong>Tu navegador</strong>
                    <code>${browser}</code>
                </article>
                <article class="info-card">
                    <strong>Idioma</strong>
                    <code>${navigator.language || "No disponible"}</code>
                </article>
            </div>
            <div class="info-card callout">
                <strong>User-Agent</strong>
                <code class="user-agent">${navigator.userAgent}</code>
            </div>
            <div class="tip-box">
                <strong>Tip</strong>
                <p>Apretá <kbd>F12</kbd> en tu navegador para abrir las herramientas de desarrollador. Desde ahí se puede inspeccionar cómo trabaja una página y, en algunos casos, modificar o simular información del navegador. Por eso estos datos sirven para experimentar, pero no son una identificación confiable.</p>
            </div>
            <div class="actions">
                <button data-next="events">CONTINUAR →</button>
            </div>
        </section>
    `;

    bindNextButtons();
}

function renderEvents() {
    app.innerHTML = `
        <section>
            <p class="lead">Probá realizar diferentes acciones y mirá cómo cambia el último evento detectado.</p>
            <div class="event-grid">
                <button id="click-demo" type="button">Hacer click</button>
                <div id="hover-demo" class="event-target interactive" tabindex="0">Pasar el mouse o tocar</div>
                <div>
                    <label class="field">
                        <span>Campo de texto</span>
                        <input id="input-demo" type="text" placeholder="Escribí algo">
                    </label>
                </div>
                <div>
                    <label class="field">
                        <span>Zona de teclas</span>
                        <input id="key-demo" type="text" placeholder="Presioná una tecla">
                    </label>
                </div>
            </div>
            <div id="last-event" class="last-event">ÚLTIMO EVENTO: ${state.lastEvent}</div>
            <div class="actions">
                <button data-next="form">CONTINUAR →</button>
            </div>
        </section>
    `;

    const updateLastEvent = eventName => {
        state.lastEvent = eventName;
        document.querySelector("#last-event").textContent = `ÚLTIMO EVENTO: ${eventName}`;
    };

    document.querySelector("#click-demo").addEventListener("click", () => updateLastEvent("click"));
    document.querySelector("#hover-demo").addEventListener("mouseover", () => updateLastEvent("mouseover"));
    document.querySelector("#hover-demo").addEventListener("touchstart", () => updateLastEvent("touchstart"));
    document.querySelector("#hover-demo").addEventListener("focus", () => updateLastEvent("focus"));
    document.querySelector("#input-demo").addEventListener("input", () => updateLastEvent("input"));
    document.querySelector("#key-demo").addEventListener("keydown", () => updateLastEvent("keydown"));

    bindNextButtons();
}

function renderForm() {
    app.innerHTML = `
        <section>
            <p class="lead">Completá tus datos para continuar. El formulario se valida en el navegador y consulta una base local en JSON.</p>
            ${renderDataNotice()}
            <form id="student-form" novalidate>
                <div class="form-grid">
                    <div class="field">
                        <label for="nombre">Nombre y apellido</label>
                        <input id="nombre" name="nombre" type="text" autocomplete="name" value="${state.formData.nombre}" placeholder="Juan Perez">
                    </div>
                    <div class="field">
                        <label for="dni">DNI</label>
                        <input id="dni" name="dni" type="text" inputmode="numeric" value="${state.formData.dni}" placeholder="12345678">
                    </div>
                    <div class="field">
                        <label for="edad">Edad</label>
                        <input id="edad" name="edad" type="text" inputmode="numeric" value="${state.formData.edad}" placeholder="18">
                    </div>
                </div>
                <p class="hint">Alumno de prueba: Juan Perez, DNI 12345678, edad 18.</p>
                <div class="actions">
                    <button type="submit">ENVIAR</button>
                    <button id="continue-after-form" type="button" class="hidden" data-next="shortPassword">CONTINUAR →</button>
                </div>
            </form>
            <section class="result-panel" aria-live="polite">
                <h2>¿LOS DATOS SON CORRECTOS?</h2>
                <ul id="validation-results" class="validation-list">
                    <li class="validation-item"><span class="status waiting">?</span><span>Esperando envío del formulario.</span></li>
                </ul>
            </section>
        </section>
    `;

    document.querySelector("#student-form").addEventListener("submit", event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);

        state.formData = {
            nombre: String(form.get("nombre") || "").trim(),
            dni: String(form.get("dni") || "").trim(),
            edad: String(form.get("edad") || "").trim()
        };

        const results = validateStudentForm(state.formData);
        renderValidationResults(results);
    });

    bindNextButtons();
}

function renderDataNotice() {
    if (state.dataSource === "json") {
        return `<p class="success-text">✓ Datos cargados desde data/alumnos.json.</p>`;
    }

    return `<p class="warning-text">! El navegador bloqueó la lectura del JSON por file://. Se usan datos de demostración en memoria. Para leer el archivo real, ejecutá un servidor local sencillo.</p>`;
}

function validateStudentForm(formData) {
    const results = [];
    const dniOnlyNumbers = /^\d+$/.test(formData.dni);
    const edadOnlyNumbers = /^\d+$/.test(formData.edad);

    addResult(results, formData.nombre.length > 0, "Nombre y apellido ingresado.", "Debés ingresar nombre y apellido.");
    addResult(results, formData.dni.length > 0, "DNI ingresado.", "Debés ingresar tu DNI.");
    addResult(results, dniOnlyNumbers, "El DNI contiene solamente números.", "El DNI debe contener solamente números.");
    addResult(results, formData.dni.length >= 7 && formData.dni.length <= 9, "Longitud de DNI razonable.", "El DNI debe tener entre 7 y 9 dígitos.");
    addResult(results, formData.edad.length > 0, "Edad ingresada.", "Debés ingresar tu edad.");
    addResult(results, edadOnlyNumbers, "La edad contiene solamente números.", "La edad debe contener solamente números.");

    const edad = Number(formData.edad);
    addResult(results, edadOnlyNumbers && edad >= 12 && edad <= 99, "Edad dentro de un rango razonable.", "La edad debe estar entre 12 y 99.");

    const hasBasicErrors = results.some(result => !result.ok);
    const alumno = hasBasicErrors ? null : findAlumnoByDni(formData.dni);
    state.alumnoEncontrado = alumno;

    if (!hasBasicErrors) {
        addResult(results, Boolean(alumno), "DNI encontrado.", "DNI no encontrado.");

        if (alumno) {
            const nombreCoincide = normalizeText(alumno.nombre) === normalizeText(formData.nombre);
            const edadCoincide = Number(alumno.edad) === edad;
            addResult(results, nombreCoincide, "El nombre coincide con el registro.", "El nombre no coincide con el registro.");
            addResult(results, edadCoincide, "La edad coincide con el registro.", "La edad no coincide con el registro.");
        }
    }

    const allValid = results.every(result => result.ok);
    addResult(results, allValid, "Datos verificados.", "Los datos no coinciden con el registro.");

    return results;
}

function addResult(results, ok, successMessage, errorMessage) {
    results.push({
        ok,
        message: ok ? successMessage : errorMessage
    });
}

function renderValidationResults(results) {
    const list = document.querySelector("#validation-results");
    const continueButton = document.querySelector("#continue-after-form");
    const allValid = results.every(result => result.ok);

    list.innerHTML = results.map(result => `
        <li class="validation-item">
            <span class="status ${result.ok ? "ok" : "bad"}">${result.ok ? "✓" : "×"}</span>
            <span>${result.message}</span>
        </li>
    `).join("");

    continueButton.classList.toggle("hidden", !allValid);
}

function findAlumnoByDni(dni) {
    return state.alumnos.find(alumno => String(alumno.dni) === String(dni)) || null;
}

function renderShortPassword() {
    renderPasswordScreen({
        intro: "Creá una contraseña que cumpla las condiciones.",
        stateKey: "shortPassword",
        inputId: "short-password-input",
        rules: shortPasswordRules,
        nextScreen: "fakeFinal"
    });
}

function renderFinalPassword() {
    renderPasswordScreen({
        intro: "Ahora sí. Cumplí todas las condiciones.",
        stateKey: "finalPassword",
        inputId: "final-password-input",
        rules: finalPasswordRules,
        nextScreen: "closing"
    });
}

function renderPasswordScreen(config) {
    app.innerHTML = `
        <section class="password-layout">
            <div>
                <p class="lead">${config.intro}</p>
                <label class="field" for="${config.inputId}">
                    <span>Contraseña</span>
                    <input id="${config.inputId}" type="text" value="${state[config.stateKey]}" autocomplete="off">
                </label>
                <div class="actions">
                    <button id="password-continue" type="button" class="hidden" data-next="${config.nextScreen}">CONTINUAR →</button>
                </div>
            </div>
            <ul id="password-rules" class="rule-list"></ul>
        </section>
    `;

    const input = document.querySelector(`#${config.inputId}`);
    const continueButton = document.querySelector("#password-continue");
    const renderRules = () => {
        state[config.stateKey] = input.value;
        const results = validatePassword(input.value, config.rules);
        const visibleResults = getVisiblePasswordResults(results);
        const allValid = results.every(result => result.ok);

        document.querySelector("#password-rules").innerHTML = visibleResults.map(result => `
            <li class="rule-item">
                <span class="status ${result.ok ? "ok" : "bad"}">${result.ok ? "✓" : "×"}</span>
                <span>${result.description}</span>
            </li>
        `).join("");

        continueButton.classList.toggle("hidden", !allValid);
    };

    input.addEventListener("input", renderRules);
    renderRules();
    bindNextButtons();
}

function validatePassword(password, rules) {
    return rules.map(rule => ({
        id: rule.id,
        description: rule.description,
        ok: rule.validate(password)
    }));
}

function getVisiblePasswordResults(results) {
    const visibleResults = [];

    for (const result of results) {
        visibleResults.push(result);

        if (!result.ok) {
            break;
        }
    }

    return visibleResults;
}

function renderFakeFinal() {
    app.innerHTML = `
        <section class="fake-final">
            <p id="fake-final-message" class="fake-final-message">Completaste todas las condiciones.</p>
            <div class="actions">
                <button id="fake-final-button" type="button">ESPERÁ...</button>
                <button id="fake-final-continue" type="button" class="hidden" data-next="finalPassword">CONTINUAR →</button>
            </div>
        </section>
    `;

    const message = document.querySelector("#fake-final-message");
    const waitButton = document.querySelector("#fake-final-button");
    const continueButton = document.querySelector("#fake-final-continue");

    waitButton.addEventListener("click", () => {
        waitButton.disabled = true;
        message.textContent = "ESPERÁ...";

        window.setTimeout(() => {
            message.textContent = "NO TAN RÁPIDO.";
            waitButton.classList.add("hidden");
            continueButton.classList.remove("hidden");
        }, 900);
    });

    bindNextButtons();
}

function renderClosing() {
    app.innerHTML = `
        <section>
            <div class="screen-grid">
                <div>
                    <p class="lead">El recorrido conectó acciones reales del usuario con eventos, código JavaScript, validación y respuestas visibles.</p>
                    <ul class="flow-list">
                        <li>USUARIO</li>
                        <li>ACCIÓN</li>
                        <li>EVENTO</li>
                        <li>JAVASCRIPT</li>
                        <li>VALIDACIÓN</li>
                        <li>RESPUESTA</li>
                    </ul>
                    <p class="lead">Todo esto forma parte de la interactividad web.</p>
                    <div class="actions">
                        <button type="button" data-next="start">FINALIZAR</button>
                    </div>
                </div>
                <div class="callout">
                    Esta zona ya queda preparada para sumar miniaturas reales dentro de <strong>assets/screens/</strong>.
                </div>
            </div>
            <div class="summary-grid">
                ${closingConcepts.map(renderConceptCard).join("")}
            </div>
        </section>
    `;

    bindNextButtons();
}

function renderConceptCard(concept) {
    return `
        <article class="summary-card">
            <div class="screen-thumb" data-image="${concept.image}">${concept.activity}</div>
            <strong>${concept.title}</strong>
            <p>${concept.description}</p>
        </article>
    `;
}

function bindNextButtons() {
    document.querySelectorAll("[data-next]").forEach(button => {
        button.addEventListener("click", () => showScreen(button.dataset.next));
    });
}

function initDeveloperTools() {
    devScreenSelect.innerHTML = screens.map(screen => `
        <option value="${screen.id}">${screen.label} - ${screen.title}</option>
    `).join("");

    devToggle.addEventListener("click", () => {
        devPanel.classList.toggle("hidden");
    });

    devClose.addEventListener("click", () => {
        devPanel.classList.add("hidden");
    });

    document.querySelector("#dev-go-screen").addEventListener("click", () => {
        showScreen(devScreenSelect.value);
        setDeveloperMessage("Pantalla cambiada.");
    });

    document.querySelector("#dev-prev-screen").addEventListener("click", () => {
        moveDeveloperScreen(-1);
    });

    document.querySelector("#dev-next-screen").addEventListener("click", () => {
        moveDeveloperScreen(1);
    });

    document.querySelector("#dev-fill-student").addEventListener("click", fillDeveloperStudent);
    document.querySelector("#dev-complete-password").addEventListener("click", completeDeveloperPassword);
    document.querySelector("#dev-open-readme").addEventListener("click", openReadme);
}

function updateDeveloperScreenSelect(screenId) {
    if (devScreenSelect) {
        devScreenSelect.value = screenId;
    }
}

function moveDeveloperScreen(direction) {
    const currentIndex = screens.findIndex(screen => screen.id === state.currentScreen);
    const nextIndex = Math.min(Math.max(currentIndex + direction, 0), screens.length - 1);

    showScreen(screens[nextIndex].id);
    setDeveloperMessage(direction > 0 ? "Avanzaste una pantalla." : "Retrocediste una pantalla.");
}

function fillDeveloperStudent() {
    const alumno = state.alumnos[0] || fallbackAlumnos[0];

    if (state.currentScreen !== "form") {
        showScreen("form");
    }

    state.formData = {
        nombre: alumno.nombre,
        dni: alumno.dni,
        edad: String(alumno.edad)
    };

    document.querySelector("#nombre").value = state.formData.nombre;
    document.querySelector("#dni").value = state.formData.dni;
    document.querySelector("#edad").value = state.formData.edad;
    renderValidationResults(validateStudentForm(state.formData));
    setDeveloperMessage("Alumno de prueba cargado y validado.");
}

function completeDeveloperPassword() {
    const passwordByScreen = {
        shortPassword: "Clave123",
        finalPassword: "Clave1234!"
    };
    const inputByScreen = {
        shortPassword: "#short-password-input",
        finalPassword: "#final-password-input"
    };

    if (!passwordByScreen[state.currentScreen]) {
        showScreen("shortPassword");
    }

    const password = passwordByScreen[state.currentScreen];
    const input = document.querySelector(inputByScreen[state.currentScreen]);

    input.value = password;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    setDeveloperMessage("Contraseña de prueba cargada.");
}

function setDeveloperMessage(message) {
    devMessage.textContent = message;
}

function openReadme() {
    window.open("README.md", "_blank");
    setDeveloperMessage("README abierto en otra pestaña.");
}

function detectDevice() {
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        return "Celular o tablet";
    }

    return "PC";
}

function detectBrowser() {
    const agent = navigator.userAgent;

    if (agent.includes("Firefox")) return "Firefox";
    if (agent.includes("Edg")) return "Microsoft Edge";
    if (agent.includes("Chrome")) return "Chrome";
    if (agent.includes("Safari")) return "Safari";

    return "Navegador no identificado";
}

function normalizeText(text) {
    return String(text)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

