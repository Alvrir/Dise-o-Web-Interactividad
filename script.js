const app = document.querySelector("#app");
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
    finalPassword: "",
    finalPasswordRevealedCount: 0,
    finalPasswordCompletionOrder: []
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

const passwordContext = {
    currentYear: String(new Date().getFullYear()),
    browserName: getBrowserPasswordTerm()
};

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
        description: "Mínimo 5 caracteres.",
        validate: password => password.length >= 5
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
    },
    {
        id: "digitSum",
        description: "Los números de la contraseña por separado deben sumar 15.",
        validate: password => sumPasswordDigits(password) === 15
    },
    {
        id: "currentYear",
        description: `Debe contener el año actual (${passwordContext.currentYear}).`,
        validate: password => password.includes(passwordContext.currentYear)
    },
    {
        id: "browserName",
        description: `Debe contener el nombre de tu navegador (${passwordContext.browserName}).`,
        validate: password => normalizeText(password).includes(normalizeText(passwordContext.browserName))
    },
    {
        id: "month",
        description: "Debe contener un mes del año.",
        validate: password => containsMonth(password)
    },
    {
        id: "romanNumeral",
        description: "Debe contener un número romano.",
        validate: password => /[IVXLCDM]/.test(password)
    },
    {
        id: "sponsor",
        description: "Debe contener uno de nuestros sponsors: Binco, Manaos o Milkaut.",
        logos: ["assets/logos/1.png", "assets/logos/2.png", "assets/logos/3.png"],
        validate: password => ["binco", "manaos", "milkaut"].some(sponsor => normalizeText(password).includes(sponsor))
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
    updateProgress(screen);
    updateDeveloperScreenSelect(screenId);
    app.innerHTML = "";
    screen.render();
    app.classList.remove("is-entering");
    void app.offsetWidth;
    app.classList.add("is-entering");
    app.focus({ preventScroll: true });
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
    const environmentPromise = getEnvironmentDetails();

    app.innerHTML = `
        <section class="genie-screen">
            <div class="genie-stage">
                <img id="genie-image" class="genie-image" src="assets/genio/idle.png" alt="Genio esperando para comenzar">
                <div class="genie-dialog">
                    <p id="genie-message">¡Hola! Puedo adivinar algunas cosas sobre el dispositivo desde el que me visitás.</p>
                    <button id="genie-action" type="button">EMPEZAR ADIVINACIÓN</button>
                </div>
            </div>
            <span id="battery-status" class="hidden">Consultando...</span>
            <div class="info-card callout hidden" data-genie-extra>
                <strong>User-Agent</strong>
                <code class="user-agent">${navigator.userAgent}</code>
            </div>
            <div class="tip-box hidden" data-genie-extra>
                <strong>El truco</strong>
                <p>Apretá <kbd>F12</kbd> para inspeccionar estos datos. El User-Agent puede modificarse y navegadores como Brave limitan parte de esta información para proteger tu privacidad.</p>
            </div>
            <div class="actions hidden" data-genie-extra>
                <button data-next="events">CONTINUAR →</button>
            </div>
        </section>
    `;

    loadBatteryInfo();
    initGenieExperience(environmentPromise);
    bindNextButtons();
}

async function loadBatteryInfo() {
    const initialStatus = document.querySelector("#battery-status");

    if (!initialStatus || typeof navigator.getBattery !== "function") {
        if (initialStatus) {
            initialStatus.textContent = "No disponible en este navegador";
        }
        return;
    }

    try {
        const battery = await navigator.getBattery();
        const currentStatus = document.querySelector("#battery-status");

        if (!currentStatus) {
            return;
        }

        const percentage = Math.round(battery.level * 100);
        const chargingStatus = battery.charging ? " · Cargando" : "";
        currentStatus.textContent = `${percentage}%${chargingStatus}`;
    } catch (error) {
        const currentStatus = document.querySelector("#battery-status");

        if (currentStatus) {
            currentStatus.textContent = "Información no permitida";
        }

        console.warn("No se pudo consultar la Battery Status API.", error);
    }
}

function initGenieExperience(environmentPromise) {
    const image = document.querySelector("#genie-image");
    const message = document.querySelector("#genie-message");
    const action = document.querySelector("#genie-action");
    let currentStep = 0;

    ["pensando.png", "celu.png"].forEach(fileName => {
        const preload = new Image();
        preload.src = `assets/genio/${fileName}`;
    });

    const steps = [
        {
            thinking: "Voy a adivinar desde dónde me estás viendo...",
            answer: async () => formatDeviceDetails(await environmentPromise)
        },
        {
            thinking: "Ahora voy a descubrir qué navegador elegiste...",
            answer: async () => formatBrowserDetails(await environmentPromise)
        },
        {
            thinking: "Me falta una pista. Voy a intentar sentir la energía de tu batería...",
            answer: () => formatBatteryGuess()
        }
    ];

    action.addEventListener("click", async () => {
        if (currentStep >= steps.length) {
            finishGenieExperience();
            return;
        }

        const step = steps[currentStep];
        action.disabled = true;
        setGeniePose("pensando", "Genio pensando la respuesta");
        message.textContent = step.thinking;

        await wait(2000);

        if (state.currentScreen !== "browser" || !document.querySelector("#genie-image")) {
            return;
        }

        setGeniePose("celu", "Genio mostrando la respuesta");
        message.textContent = typeof step.answer === "function" ? await step.answer() : step.answer;
        currentStep += 1;
        action.textContent = currentStep < steps.length ? "OTRA PISTA" : "MOSTRAR EL TRUCO";

        await wait(1000);

        if (state.currentScreen === "browser" && document.querySelector("#genie-action")) {
            action.disabled = false;
        }
    });

    function setGeniePose(pose, altText) {
        image.src = `assets/genio/${pose}.png`;
        image.alt = altText;
        image.classList.toggle("is-thinking", pose === "pensando");
    }

    function finishGenieExperience() {
        setGeniePose("idle", "Genio explicando cómo hizo las adivinanzas");
        message.textContent = "No fue magia: JavaScript leyó información que comparte tu navegador. Estos datos pueden ser incompletos o modificarse.";
        document.querySelector(".genie-screen")?.classList.add("is-complete");
        document.querySelectorAll("[data-genie-extra]").forEach(element => element.classList.remove("hidden"));
        action.classList.add("hidden");
    }
}

function formatDeviceGuess(device) {
    const descriptions = {
        Android: "un dispositivo Android",
        iPhone: "un iPhone",
        iPad: "un iPad",
        Computadora: "una computadora"
    };

    return descriptions[device] || "un dispositivo que no pude reconocer del todo";
}

function formatBatteryGuess() {
    const batteryStatus = document.querySelector("#battery-status")?.textContent || "No disponible";

    if (batteryStatus.includes("No disponible") || batteryStatus.includes("no permitida")) {
        return "Tu navegador mantiene la batería en secreto. ¡Esa pista no está disponible!";
    }

    return `Tu batería indica ${batteryStatus.toLowerCase()}.`;
}

function wait(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
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
        <section class="student-layout">
            <div class="student-form-column">
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
                        <button type="submit">CARGAR</button>
                        <button id="continue-after-form" type="button" class="hidden" data-next="shortPassword">CONTINUAR →</button>
                    </div>
                </form>
            </div>
            <section class="result-panel" aria-live="polite">
                <h2>VERIFICACIÓN</h2>
                <ul id="validation-results" class="validation-list">
                    <li class="validation-item"><span class="status waiting">?</span><span>Esperando la carga de los datos.</span></li>
                    <li class="validation-item"><span class="status waiting">?</span><span>Consulta a la base de datos pendiente.</span></li>
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
    const edad = Number(formData.edad);
    const validFormat = formData.nombre.length > 0
        && dniOnlyNumbers
        && formData.dni.length >= 7
        && formData.dni.length <= 9
        && edadOnlyNumbers
        && edad >= 12
        && edad <= 99;
    const alumno = validFormat ? findAlumnoByDni(formData.dni) : null;
    const studentMatches = Boolean(alumno)
        && normalizeText(alumno.nombre) === normalizeText(formData.nombre)
        && Number(alumno.edad) === edad;

    state.alumnoEncontrado = studentMatches ? alumno : null;
    addResult(results, validFormat, "Los datos tienen un formato válido.", "Revisá los datos ingresados.");
    addResult(results, studentMatches, "El alumno está en la base de datos.", "El alumno no está en la base de datos.");

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
        ruleMode: "always",
        nextScreen: "fakeFinal"
    });
}

function renderFinalPassword() {
    renderPasswordScreen({
        intro: "Ahora sí. Cumplí todas las condiciones.",
        stateKey: "finalPassword",
        inputId: "final-password-input",
        rules: finalPasswordRules,
        ruleMode: "progressive",
        revealedCountKey: "finalPasswordRevealedCount",
        completedOrderKey: "finalPasswordCompletionOrder",
        continueAtEnd: true,
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
                <div id="password-actions" class="actions ${config.continueAtEnd ? "password-actions-end" : ""}">
                    <button id="password-continue" type="button" class="hidden" data-next="${config.nextScreen}">CONTINUAR →</button>
                </div>
            </div>
            <ul id="password-rules" class="rule-list"></ul>
        </section>
    `;

    const input = document.querySelector(`#${config.inputId}`);
    const continueButton = document.querySelector("#password-continue");
    const passwordActions = document.querySelector("#password-actions");
    const renderRules = () => {
        state[config.stateKey] = input.value;
        const results = validatePassword(input.value, config.rules);
        const visibleResults = getVisiblePasswordResults(results, config);
        const orderedResults = orderPasswordResults(visibleResults, config);
        const allValid = results.every(result => result.ok);

        renderPasswordRules(document.querySelector("#password-rules"), orderedResults);

        continueButton.classList.toggle("hidden", !allValid);
        passwordActions.classList.toggle("hidden", !allValid);
    };

    input.addEventListener("input", renderRules);
    renderRules();
    bindNextButtons();
}

function validatePassword(password, rules) {
    return rules.map((rule, order) => ({
        id: rule.id,
        description: rule.description,
        logos: rule.logos || [],
        order,
        ok: rule.validate(password)
    }));
}

function getVisiblePasswordResults(results, config) {
    if (config.ruleMode === "always") {
        return results;
    }

    let revealedCount = state[config.revealedCountKey] || 0;

    if (state[config.stateKey].length > 0 && revealedCount === 0) {
        revealedCount = 1;
    }

    if (revealedCount === 0) {
        return [];
    }

    while (revealedCount < results.length && results.slice(0, revealedCount).every(result => result.ok)) {
        revealedCount += 1;
    }

    state[config.revealedCountKey] = revealedCount;

    return results.slice(0, revealedCount);
}

function orderPasswordResults(results, config) {
    if (!config.completedOrderKey) {
        return results;
    }

    const completedOrder = state[config.completedOrderKey];

    results.filter(result => result.ok).forEach(result => {
        if (!completedOrder.includes(result.id)) {
            completedOrder.push(result.id);
        }
    });

    return [...results].sort((first, second) => {
        if (first.ok !== second.ok) {
            return Number(first.ok) - Number(second.ok);
        }

        if (!first.ok) {
            return second.order - first.order;
        }

        return completedOrder.indexOf(first.id) - completedOrder.indexOf(second.id);
    });
}

function renderPasswordRules(list, results) {
    const previousPositions = new Map(
        [...list.children].map(item => [item.dataset.ruleId, item.getBoundingClientRect()])
    );
    const existingItems = new Map(
        [...list.children].map(item => [item.dataset.ruleId, item])
    );
    const visibleIds = new Set(results.map(result => result.id));

    existingItems.forEach((item, id) => {
        if (!visibleIds.has(id)) {
            item.remove();
        }
    });

    results.forEach(result => {
        let item = existingItems.get(result.id);
        const isNew = !item;

        if (!item) {
            item = document.createElement("li");
            item.dataset.ruleId = result.id;
        }

        item.className = `rule-item ${result.ok ? "is-valid" : "is-invalid"}`;
        item.innerHTML = `
            <span class="status ${result.ok ? "ok" : "bad"}">${result.ok ? "✓" : "×"}</span>
            <div class="rule-content">
                <span>${result.description}</span>
                ${renderSponsorLogos(result.logos)}
            </div>
        `;
        list.append(item);

        if (isNew) {
            item.classList.add("is-entering");
            item.addEventListener("animationend", () => item.classList.remove("is-entering"), { once: true });
        }
    });

    results.forEach(result => {
        const item = list.querySelector(`[data-rule-id="${result.id}"]`);
        const previousPosition = previousPositions.get(result.id);

        if (!item || !previousPosition) {
            return;
        }

        const currentPosition = item.getBoundingClientRect();
        const offset = previousPosition.top - currentPosition.top;

        if (Math.abs(offset) < 1) {
            return;
        }

        item.style.transition = "none";
        item.style.transform = `translateY(${offset}px)`;
        void item.offsetHeight;
        item.style.transition = "";
        item.style.transform = "";
    });
}

function renderSponsorLogos(logos) {
    if (!logos.length) {
        return "";
    }

    return `
        <span class="sponsor-logos" aria-label="Logos de sponsors">
            ${logos.map((logo, index) => `<img src="${logo}" alt="Logo de sponsor ${index + 1}">`).join("")}
        </span>
    `;
}

function sumPasswordDigits(password) {
    return (password.match(/\d/g) || []).reduce((total, digit) => total + Number(digit), 0);
}

function containsMonth(password) {
    const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    const normalizedPassword = normalizeText(password);
    return months.some(month => normalizedPassword.includes(month));
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
        finalPassword: buildValidFinalPassword()
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

function buildValidFinalPassword() {
    const yearDigitSum = sumPasswordDigits(passwordContext.currentYear);
    let remainingSum = Math.max(0, 15 - yearDigitSum);
    let balancingDigits = "";

    while (remainingSum > 9) {
        balancingDigits += "9";
        remainingSum -= 9;
    }

    balancingDigits += String(remainingSum);
    return `Ab!${passwordContext.currentYear}mayoVManaos${balancingDigits}${passwordContext.browserName}`;
}

function setDeveloperMessage(message) {
    devMessage.textContent = message;
}

function openReadme() {
    window.open("README.md", "_blank");
    setDeveloperMessage("README abierto en otra pestaña.");
}

function detectDevice() {
    const agent = navigator.userAgent;

    if (/Android/i.test(agent)) return "Android";
    if (/iPhone|iPod/i.test(agent)) return "iPhone";
    if (/iPad/i.test(agent)) return "iPad";

    return "Computadora";
}

function detectBrowser() {
    const agent = navigator.userAgent;

    if (navigator.brave) return "Brave";
    if (agent.includes("Firefox")) return "Firefox";
    if (agent.includes("Edg")) return "Microsoft Edge";
    if (agent.includes("OPR")) return "Opera";
    if (agent.includes("SamsungBrowser")) return "Samsung Internet";
    if (agent.includes("Chrome")) return "Chrome";
    if (agent.includes("Safari")) return "Safari";

    return "Navegador no identificado";
}

function getBrowserPasswordTerm() {
    const browserTerms = {
        "Microsoft Edge": "Edge",
        "Samsung Internet": "Samsung",
        "Navegador no identificado": "navegador"
    };

    const browser = detectBrowser();
    return browserTerms[browser] || browser;
}

async function getEnvironmentDetails() {
    const agent = navigator.userAgent;
    const details = {
        device: detectDevice(),
        model: detectModel(agent),
        os: detectOperatingSystem(agent),
        browser: detectBrowser(),
        browserVersion: detectBrowserVersion(agent)
    };

    if (!navigator.userAgentData?.getHighEntropyValues) {
        return details;
    }

    try {
        const hints = await navigator.userAgentData.getHighEntropyValues([
            "model",
            "platformVersion",
            "fullVersionList"
        ]);

        if (hints.model) {
            details.model = hints.model;
        }

        if (hints.platformVersion) {
            details.os = formatClientHintOperatingSystem(navigator.userAgentData.platform, hints.platformVersion, details.os);
        }

        const browserHint = selectBrowserHint(hints.fullVersionList || []);
        if (browserHint) {
            details.browser = browserHint.name;
            details.browserVersion = browserHint.version;
        }
    } catch (error) {
        console.warn("El navegador no compartió los datos detallados del dispositivo.", error);
    }

    return details;
}

function detectModel(agent) {
    const androidMatch = agent.match(/Android\s[\d.]+;\s*([^;)]+?)(?:\s+Build\/[^;)]+)?[;)]/i);
    return androidMatch && androidMatch[1] !== "K" ? androidMatch[1].trim() : "";
}

function detectOperatingSystem(agent) {
    const androidMatch = agent.match(/Android\s([\d.]+)/i);
    if (androidMatch) return `Android ${androidMatch[1]}`;

    const iosMatch = agent.match(/(?:iPhone|CPU) OS ([\d_]+)/i);
    if (iosMatch) return `iOS ${iosMatch[1].replaceAll("_", ".")}`;

    const windowsMatch = agent.match(/Windows NT ([\d.]+)/i);
    if (windowsMatch) {
        return windowsMatch[1] === "10.0" ? "Windows 10 u 11" : `Windows ${windowsMatch[1]}`;
    }

    const macMatch = agent.match(/Mac OS X ([\d_]+)/i);
    if (macMatch) return `macOS ${macMatch[1].replaceAll("_", ".")}`;
    if (/Linux/i.test(agent)) return "Linux";

    return "sistema no identificado";
}

function detectBrowserVersion(agent) {
    const patterns = [
        /Edg\/([\d.]+)/,
        /Firefox\/([\d.]+)/,
        /Chrome\/([\d.]+)/,
        /Version\/([\d.]+).*Safari/
    ];
    const match = patterns.map(pattern => agent.match(pattern)).find(Boolean);
    return match ? match[1] : "";
}

function formatClientHintOperatingSystem(platform, platformVersion, fallback) {
    if (platform === "Windows") {
        const majorVersion = Number(platformVersion.split(".")[0]);
        if (majorVersion >= 13) return "Windows 11";
        if (majorVersion > 0) return "Windows 10";
        return fallback;
    }

    if (platform === "Android") return `Android ${platformVersion}`;
    if (platform === "macOS") return `macOS ${platformVersion}`;
    if (platform === "Chrome OS") return `ChromeOS ${platformVersion}`;
    return fallback;
}

function selectBrowserHint(versionList) {
    const knownBrowsers = [
        ["Microsoft Edge", /Microsoft Edge/i],
        ["Opera", /Opera/i],
        ["Google Chrome", /Google Chrome/i],
        ["Chromium", /^Chromium$/i]
    ];

    for (const [name, pattern] of knownBrowsers) {
        const match = versionList.find(item => pattern.test(item.brand));
        if (match) return { name, version: match.version };
    }

    return null;
}

function formatDeviceDetails(details) {
    const model = details.model ? ` Modelo: ${details.model}.` : "";
    const modelNotice = !details.model && ["iPhone", "iPad"].includes(details.device)
        ? " El navegador no comparte el modelo exacto."
        : "";
    return `¡Estás usando ${formatDeviceGuess(details.device)}!${model} Sistema: ${details.os}.${modelNotice}`;
}

function formatBrowserDetails(details) {
    const version = details.browserVersion ? ` ${details.browserVersion}` : "";
    return `Tu navegador parece ser ${details.browser}${version}.`;
}

function normalizeText(text) {
    return String(text)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}
