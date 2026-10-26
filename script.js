const app = document.querySelector("#app");
const progressCard = document.querySelector("#progress-card");
const progressText = document.querySelector("#progress-text");
const progressFill = document.querySelector("#progress-fill");
const devPanel = document.querySelector("#dev-panel");
const devClose = document.querySelector("#dev-close");
const devScreenSelect = document.querySelector("#dev-screen-select");
const devMessage = document.querySelector("#dev-message");
const finalResultStoragePrefix = "interactividad-password-final-result:";
const BACKGROUND_IMAGE = "assets/background/background.png";
const CAPTCHA_FILES = ["4NV3A.png", "AWSKH.png", "B4T9S.png", "DWXM5.png", "N8C6H.png", "TK58P.png"];

function getRandomCaptcha() {
    return CAPTCHA_FILES[Math.floor(Math.random() * CAPTCHA_FILES.length)];
}

function getCaptchaAnswer() {
    return passwordContext.captchaFile.replace(/\.[^.]+$/, "");
}
const GENIE_ASSETS = {
    idle: "assets/genio/idle.png",
    pensando: "assets/genio/pensando.png",
    celu: "assets/genio/celu.png"
};
let finalTimerFrame = null;
let finalRestartCooldownInterval = null;
let developerHoldTimeout = null;
const competitionMode = new URLSearchParams(location.search).has("competencia");
let competitionRuntime = null;

function finalSnapshot() {
    return {
        password: state.finalPassword,
        playerName: state.formData.nombre,
        revealed: state.finalPasswordRevealedCount,
        order: state.finalPasswordCompletionOrder,
        startedAt: state.finalPasswordStartedAt,
        context: passwordContext
    };
}

function restoreFinalSnapshot(snapshot) {
    resetFinalAttempt();
    if (!snapshot || typeof snapshot.password !== "string") return;
    state.finalPassword = snapshot.password;
    if (!state.formData.nombre.trim() && typeof snapshot.playerName === "string") {
        state.formData.nombre = snapshot.playerName;
    }
    state.finalPasswordRevealedCount = Number(snapshot.revealed) || 0;
    state.finalPasswordCompletionOrder = Array.isArray(snapshot.order) ? snapshot.order : [];
    state.finalPasswordStartedAt = Number(snapshot.startedAt) || null;
    if (snapshot.context?.targetColor?.name) {
        Object.assign(passwordContext, snapshot.context);
        finalPasswordRules.find(rule => rule.id === "targetColor").color = passwordContext.targetColor;
    }
    if (!CAPTCHA_FILES.includes(passwordContext.captchaFile)) {
        passwordContext.captchaFile = getRandomCaptcha();
    }
}

function saveFinalProgress() {
    try {
        if (competitionMode) competitionRuntime?.save(finalSnapshot());
        else localStorage.setItem(`interactividad-password-progress:${state.formData.dni || "sin-dni"}`, JSON.stringify(finalSnapshot()));
    } catch (error) {
        console.warn("No se pudo conservar el progreso en este dispositivo.", error);
    }
}

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
    },
    {
        dni: "41928374",
        nombre: "Alvaro Irazoqui",
        edad: 17
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
    discoveredEvents: [],
    shortPassword: "",
    finalPassword: "",
    finalPasswordRevealedCount: 0,
    finalPasswordCompletionOrder: [],
    finalPasswordStartedAt: null,
    activePlayerDni: ""
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
    currentYearRoman: toRomanNumeral(new Date().getFullYear()),
    browserName: getBrowserPasswordTerm(),
    targetColor: getRandomPasswordColor(),
    targetLength: null,
    captchaFile: getRandomCaptcha()
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
        id: "lowercase",
        description: "Al menos una minúscula.",
        validate: password => /[a-záéíóúñ]/.test(password)
    },
    {
        id: "minLength",
        description: "Mínimo 8 caracteres.",
        validate: password => password.length >= 8
    },
    {
        id: "uppercase",
        description: "Al menos una mayúscula.",
        validate: password => /[A-ZÁÉÍÓÚÑ]/.test(password)
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
        id: "currentYear",
        description: "Debe contener el año actual.",
        validate: password => password.includes(passwordContext.currentYear)
    },
    {
        id: "currentYearRoman",
        description: "Debe contener el año actual en números romanos.",
        validate: password => normalizeText(password).includes(normalizeText(passwordContext.currentYearRoman))
    },
    {
        id: "multiplicationResult",
        description: "Debe contener el resultado de 10 × 42.",
        validate: password => password.includes("420")
    },
    {
        id: "browserName",
        description: "Debe contener el navegador que estás usando.",
        validate: password => normalizeText(password).includes(normalizeText(passwordContext.browserName))
    },
    {
        id: "month",
        description: "Debe contener un mes del año.",
        validate: password => containsMonth(password)
    },
    {
        id: "playerName",
        description: "Debe contener tu nombre o apellido.",
        validate: password => getPlayerNameWords().some(word => normalizeText(password).includes(word))
    },
    {
        id: "sponsor",
        description: "Debe contener uno de nuestros sponsors.",
        logos: ["assets/logos/1.png", "assets/logos/2.png", "assets/logos/3.png"],
        validate: password => ["binco", "manaos", "milkaut"].some(sponsor => normalizeText(password).includes(sponsor))
    },
    {
        id: "targetColor",
        description: "Debe contener el siguiente color:",
        color: passwordContext.targetColor,
        validate: password => normalizeText(password).includes(passwordContext.targetColor.name)
    },
    {
        id: "cityName",
        description: "Debe contener el nombre de nuestra ciudad.",
        validate: password => normalizeText(password).includes("rojas")
    },
    {
        id: "captcha",
        description: "Debe contener el texto de esta imagen, respetando las mayúsculas.",
        get captchaFile() { return passwordContext.captchaFile; },
        validate: password => password.includes(getCaptchaAnswer())
    },
    {
        id: "reversedPlanet",
        description: "Debe contener el nombre de un planeta al revés.",
        validate: password => ["mercurio", "venus", "tierra", "marte", "jupiter", "saturno", "urano", "neptuno"]
            .some(planet => normalizeText(password).includes([...planet].reverse().join("")))
    },
    {
        id: "longPassword",
        get description() {
            return `La contraseña debe tener al menos ${passwordContext.targetLength ?? "más"} caracteres.`;
        },
        validate: password => passwordContext.targetLength !== null && password.length >= passwordContext.targetLength
    },
    {
        id: "consecutiveCharacters",
        description: "No puede haber más de 5 caracteres iguales seguidos.",
        validate: password => !/([\s\S])\1{5}/u.test(password)
    },
    // Agregar futuras condiciones antes de esta: debe cerrar siempre el juego.
    {
        id: "matchingEnds",
        description: "Debe comenzar y terminar con el mismo carácter.",
        validate: password => {
            const characters = [...password];
            return characters.length >= 2 && characters[0] === characters.at(-1);
        }
    }
];

function getPlayerNameWords() {
    return normalizeText(state.formData.nombre).split(/\s+/).filter(Boolean);
}

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
    configureBackground();
    await loadAlumnos();
    if (competitionMode) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "competencias/competencias.css";
        document.head.append(css);
        try {
            const { startCompetition } = await import("./competencias/game.js");
            startCompetition({
                attach: runtime => { competitionRuntime = runtime; },
                restore: restoreFinalSnapshot,
                play: () => showScreen("finalPassword"),
                continue: () => showScreen("closing"),
                isFinal: () => state.currentScreen === "finalPassword"
            });
        } catch (error) {
            app.textContent = "No se pudo abrir la exposición. Revisá la conexión y recargá la página.";
            return;
        }
        try {
            const journey = JSON.parse(localStorage.getItem(journeyKey()));
            if (journey?.formData) {
                state.formData = journey.formData;
                state.activePlayerDni = journey.activePlayerDni || "";
                showScreen(screens.some(screen => screen.id === journey.screen) ? journey.screen : "start");
                return;
            }
        } catch { /* Si no hay un recorrido guardado, comenzar normalmente. */ }
    } else {
        initDeveloperTools();
    }
    showScreen("start");
}

function journeyKey() {
    return `pw-journey:${new URLSearchParams(location.search).get("competencia")}`;
}

function saveJourney(screen = state.currentScreen) {
    if (!competitionMode) return;
    try {
        localStorage.setItem(journeyKey(), JSON.stringify({ screen, formData: state.formData, activePlayerDni: state.activePlayerDni }));
    } catch { /* No bloquear las actividades si se llena el almacenamiento. */ }
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

async function showScreen(screenId) {
    if (competitionMode && screenId === "finalPassword") {
        if (!state.formData.nombre || !state.activePlayerDni) {
            showScreen("form");
            return;
        }
        state.currentScreen = screenId;
        saveJourney(screenId);
        if (!await competitionRuntime.prepare(state.formData.nombre)) return;
    }
    competitionRuntime?.leave();
    const screen = screens.find(item => item.id === screenId);

    if (!screen) {
        return;
    }

    stopFinalTimer();
    stopFinalRestartCooldown();
    state.currentScreen = screenId;
    saveJourney(screenId);
    updateProgress(screen);
    updateDeveloperScreenSelect(screenId);
    app.innerHTML = "";
    screen.render();
    app.classList.remove("is-entering");
    void app.offsetWidth;
    app.classList.add("is-entering");
    app.focus({ preventScroll: true });
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
}

function configureBackground() {
    if (!BACKGROUND_IMAGE.trim()) {
        document.documentElement.style.removeProperty("--custom-background-image");
        return;
    }

    document.documentElement.style.setProperty("--custom-background-image", `url("${BACKGROUND_IMAGE}")`);
}

function updateProgress(screen) {
    const index = screens.findIndex(item => item.id === screen.id);
    const percentage = index <= 0 ? 4 : Math.round((index / (screens.length - 1)) * 100);

    progressText.textContent = screen.label;
    progressFill.style.width = `${percentage}%`;
}

function renderStart() {
    app.innerHTML = `
        <section class="start-screen">
            <h2 class="hero-title">INTERACTIVIDAD <span>Y VALIDACIÓN</span></h2>
            <p class="lead">Una página que reacciona a vos.</p>
            <p class="lead">Descubrí cómo una página web puede detectar tus acciones, procesar información y responder.</p>
            <div class="hero-actions">
                <button data-next="browser">COMENZAR</button>
                ${competitionMode ? "" : '<button data-next="finalPassword" class="secondary-button">IR AL PASSWORD GAME FINAL</button>'}
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
                <img id="genie-image" class="genie-image" src="${GENIE_ASSETS.idle}" alt="Genio esperando para comenzar">
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

    const revealImage = () => {
        image.classList.remove("is-appearing");
        void image.offsetWidth;
        image.classList.add("is-appearing");
    };

    if (image.complete) {
        revealImage();
    } else {
        image.addEventListener("load", revealImage, { once: true });
    }

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
        image.classList.remove("is-appearing");
        image.src = GENIE_ASSETS[pose];
        image.alt = altText;
        image.classList.toggle("is-thinking", pose === "pensando");

        if (image.complete) {
            revealImage();
        } else {
            image.addEventListener("load", revealImage, { once: true });
        }
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

    const percentageMatch = batteryStatus.match(/^(\d+)%/);
    const percentage = percentageMatch ? Number(percentageMatch[1]) : null;

    if (percentage !== null && percentage < 20) {
        return `Tu batería indica ${percentage}%, cuidado que no se te apague en cualquier momento...`;
    }

    return `Tu batería indica ${batteryStatus.toLowerCase()}.`;
}

function wait(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

function renderEvents() {
    app.innerHTML = `
        <section class="activity-layout events-activity">
            <div class="events-lab">
                <header class="lab-header">
                <span class="section-kicker">ACTIVIDAD 2 · EVENTOS</span>
                <h2>INTERACTIVIDAD</h2>
                <p class="lead">Tu navegador puede detectar lo que hacés. Probá diferentes acciones y mirá cómo responde.</p>
            </header>
                <div class="event-grid" aria-label="Experimentos de eventos">
                <article class="event-card" data-event-card="click">
                    <div class="event-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v10m0 0 4-4m-4 4-4-4M5 14v4a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-4"/></svg></div>
                    <span class="event-tag">01 · CLICK</span>
                    <h3>Activá el pulso</h3>
                    <p>Un click dispara una respuesta inmediata.</p>
                    <button id="click-demo" class="event-control" type="button">PROBAR CLICK</button>
                </article>
                <article class="event-card" data-event-card="mouseover">
                    <div class="event-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5h16M4 12h10M4 19h6"/><path d="m16 15 4 4m0-4-4 4"/></svg></div>
                    <span class="event-tag">02 · PUNTERO</span>
                    <h3>Explorá la zona</h3>
                    <p>Con mouse se detecta <code>mouseover</code>; al tocar, <code>pointerdown</code>.</p>
                    <div id="hover-demo" class="event-target interactive" tabindex="0" role="button" aria-label="Probar evento de puntero">ZONA SENSIBLE</div>
                </article>
                <article class="event-card" data-event-card="input">
                    <div class="event-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h.01M10 9h.01M13 9h.01M16 9h.01M7 13h.01M10 13h.01M13 13h4"/></svg></div>
                    <span class="event-tag">03 · INPUT</span>
                    <h3>Escribí algo</h3>
                    <p>Cada cambio del campo genera un evento.</p>
                    <label class="field">
                        <span class="sr-only">Campo de texto para probar input</span>
                        <input id="input-demo" type="text" placeholder="Escribí una señal">
                    </label>
                </article>
                <article class="event-card" data-event-card="keydown">
                    <div class="event-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h.01M10 9h.01M13 9h.01M16 9h.01M7 13h.01M10 13h.01M13 13h4"/><path d="m16 9 2 2-2 2"/></svg></div>
                    <span class="event-tag">04 · KEYDOWN</span>
                    <h3>Presioná una tecla</h3>
                    <p>Tocá el campo y usá el teclado de tu celular, o escribí con el teclado físico.</p>
                    <label class="field">
                        <span class="sr-only">Campo para probar keydown</span>
                        <input id="key-demo" type="text" placeholder="Presioná una tecla">
                    </label>
                </article>
                </div>
                <section class="event-console" aria-live="polite">
                <div class="event-console-header">
                    <span>EVENTO DETECTADO</span>
                    <strong id="event-discovery-count">Eventos descubiertos: ${state.discoveredEvents.length}/4</strong>
                </div>
                <strong id="last-event" class="event-name">${state.lastEvent}</strong>
                <p id="event-description">Esperando una interacción para mostrar qué ocurrió.</p>
                </section>
                <div class="actions">
                    <button id="continue-after-events" data-next="form" ${state.discoveredEvents.length < 4 ? "disabled" : ""} aria-describedby="events-hint">CONTINUAR →</button>
                </div>
                <p id="events-hint" class="hint">${state.discoveredEvents.length === 4 ? "¡Probaste las cuatro tarjetas! Ya podés continuar." : "Probá las cuatro tarjetas para continuar."}</p>
            </div>
            <aside class="reflection-bubble events-reflection">
                <details>
                    <summary>Para pensar…</summary>
                    <p>Además de hacer clic, tocar o escribir, ¿qué otra cosa podría pasar en una página? ¿Cómo podría responder?</p>
                    <ul>
                        <li><code>dblclick</code>: hacer doble clic.</li>
                        <li><code>submit</code>: enviar un formulario.</li>
                        <li><code>paste</code>: pegar texto.</li>
                        <li><code>scroll</code>: desplazar el contenido.</li>
                        <li><code>resize</code>: cambiar el tamaño de la ventana.</li>
                        <li><code>play</code>: iniciar un audio o video.</li>
                    </ul>
                </details>
            </aside>
        </section>
    `;

    const eventDescriptions = {
        click: "El navegador detectó un click sobre el control interactivo.",
        mouseover: "El cursor entró en la zona sensible y disparó mouseover.",
        pointerdown: "El navegador detectó la pulsación sobre la zona sensible mediante pointerdown.",
        input: "El valor del campo cambió mientras escribías.",
        keydown: key => `El navegador detectó que presionaste la tecla ${key}.`
    };

    const updateLastEvent = (eventName, detail = "", discovery = eventName) => {
        state.lastEvent = eventName;
        const discoveryName = discovery === "pointerdown" ? "mouseover" : discovery;

        if (!state.discoveredEvents.includes(discoveryName)) {
            state.discoveredEvents.push(discoveryName);
        }

        document.querySelector("#last-event").textContent = eventName;
        document.querySelector("#event-description").textContent = typeof eventDescriptions[eventName] === "function"
            ? eventDescriptions[eventName](detail)
            : eventDescriptions[eventName];
        document.querySelector("#event-discovery-count").textContent = `Eventos descubiertos: ${state.discoveredEvents.length}/4`;
        document.querySelector(`[data-event-card="${discoveryName}"]`)?.classList.add("is-discovered");
        const complete = state.discoveredEvents.length === 4;
        document.querySelector("#continue-after-events").disabled = !complete;
        document.querySelector("#events-hint").textContent = complete
            ? "¡Probaste las cuatro tarjetas! Ya podés continuar."
            : `Te faltan ${4 - state.discoveredEvents.length} tarjetas por probar.`;
    };

    document.querySelector("#click-demo").addEventListener("click", () => updateLastEvent("click"));
    document.querySelector("#hover-demo").addEventListener("mouseover", () => updateLastEvent("mouseover"));
    document.querySelector("#hover-demo").addEventListener("pointerdown", () => updateLastEvent("pointerdown"));
    document.querySelector("#hover-demo").addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            updateLastEvent("keydown", event.key === " " ? "Espacio" : event.key, "mouseover");
        }
    });
    document.querySelector("#input-demo").addEventListener("input", () => updateLastEvent("input"));
    const keyDemo = document.querySelector("#key-demo");
    let identifiedKey = false;
    keyDemo.addEventListener("keydown", event => {
        identifiedKey = Boolean(event.key) && !event.isComposing
            && !["Unidentified", "Process", "Dead"].includes(event.key);
        if (identifiedKey) updateLastEvent("keydown", event.key === " " ? "Espacio" : event.key);
    });
    keyDemo.addEventListener("keyup", () => { identifiedKey = false; });
    keyDemo.addEventListener("blur", () => { identifiedKey = false; });
    // El input posterior no debe tapar una tecla identificada por keydown.
    keyDemo.addEventListener("input", (event = {}) => {
        if (identifiedKey) {
            identifiedKey = false;
            return;
        }
        updateLastEvent("input", "", "keydown");
        document.querySelector("#event-description").textContent = event.data
            ? `El teclado ingresó: ${event.data}. Este navegador lo informa mediante input.`
            : event.inputType?.startsWith("delete")
                ? "El teclado borró texto mediante input."
                : `El campo cambió mediante input. Texto actual: ${keyDemo.value || "(vacío)"}.`;
    });

    state.discoveredEvents.forEach(eventName => {
        document.querySelector(`[data-event-card="${eventName}"]`)?.classList.add("is-discovered");
    });

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
                            <input id="nombre" name="nombre" type="text" autocomplete="name" value="${escapeHtml(state.formData.nombre)}" placeholder="Juan Perez">
                        </div>
                        <div class="field">
                            <label for="dni">DNI</label>
                            <input id="dni" name="dni" type="text" inputmode="numeric" value="${escapeHtml(state.formData.dni)}" placeholder="12345678">
                        </div>
                        <div class="field">
                            <label for="edad">Edad</label>
                            <input id="edad" name="edad" type="text" inputmode="numeric" value="${escapeHtml(state.formData.edad)}" placeholder="18">
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
                <p id="student-genie-message" class="genie-remark">Veamos si estás en la lista.</p>
                <ul id="validation-results" class="validation-list">
                    <li class="validation-item"><span class="status waiting">?</span><span>Esperando la carga de los datos.</span></li>
                    <li class="validation-item"><span class="status waiting">?</span><span>Consulta a la base de datos pendiente.</span></li>
                </ul>
                ${renderGenieCompanion({
                    pose: "pensando",
                    message: "Voy a revisar si los datos coinciden con la base local."
                })}
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

        if (results.every(result => result.ok) && state.activePlayerDni !== state.formData.dni) {
            state.activePlayerDni = state.formData.dni;
            resetFinalAttempt();
        }
        saveJourney();
    });

    bindNextButtons();
}

function renderDataNotice() {
    if (state.dataSource === "json") {
        return "";
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
    const alumno = validFormat ? findAlumnoByName(formData.nombre) : null;
    const studentMatches = Boolean(alumno)
        && normalizeText(alumno.nombre) === normalizeText(formData.nombre);

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

    const studentGenie = document.querySelector(".student-layout .genie-companion img");
    studentGenie.src = allValid ? GENIE_ASSETS.idle : GENIE_ASSETS.pensando;
    studentGenie.alt = allValid ? "Akinator sonriendo" : "Akinator pensando";
    document.querySelector("#student-genie-message").textContent = allValid
        ? "¡Acá estás! Podemos seguir."
        : "Todavía no puedo confirmarlo. Revisemos tus datos.";

    list.innerHTML = results.map(result => `
        <li class="validation-item">
            <span class="status ${result.ok ? "ok" : "bad"}">${result.ok ? "✓" : "×"}</span>
            <span>${result.message}</span>
        </li>
    `).join("");

    continueButton.classList.toggle("hidden", !allValid);
    const fieldErrors = {
        nombre: !state.formData.nombre.trim() ? "Ingresá tu nombre y apellido." :
            (!state.alumnoEncontrado && results[0].ok ? "Ese nombre no figura en la base de alumnos." : ""),
        dni: /^\d{7,9}$/.test(state.formData.dni) ? "" : "Ingresá un DNI de 7 a 9 números.",
        edad: /^\d+$/.test(state.formData.edad) && Number(state.formData.edad) >= 12 && Number(state.formData.edad) <= 99
            ? "" : "Ingresá una edad entre 12 y 99."
    };
    Object.entries(fieldErrors).forEach(([id, message]) => {
        const input = document.getElementById(id);
        let hint = document.getElementById(`${id}-error`);
        if (!hint) {
            hint = document.createElement("span");
            hint.id = `${id}-error`;
            hint.className = "warning-text";
            input.after(hint);
        }
        hint.textContent = message;
        hint.hidden = !message;
        input.setAttribute("aria-invalid", String(Boolean(message)));
        input.setAttribute("aria-describedby", hint.id);
    });
    if (!allValid) {
        const firstInvalid = Object.keys(fieldErrors).find(id => fieldErrors[id]);
        document.getElementById(firstInvalid)?.focus({ preventScroll: true });
    }
}

function findAlumnoByName(nombre) {
    return state.alumnos.find(alumno => normalizeText(alumno.nombre) === normalizeText(nombre)) || null;
}

function renderShortPassword() {
    renderPasswordScreen({
        intro: "Creá una contraseña que cumpla las condiciones.",
        stateKey: "shortPassword",
        inputId: "short-password-input",
        rules: shortPasswordRules,
        ruleMode: "always",
        geniePose: "pensando",
        genieMessage: "¿Pensaste que crear una contraseña era tan fácil?",
        nextScreen: "fakeFinal"
    });
}

function renderFinalPassword() {
    if (competitionMode && competitionRuntime?.showCompleted()) return;
    const storedResult = competitionMode ? null : getStoredFinalResult();

    if (storedResult) {
        renderCompletedFinalPassword(storedResult);
        return;
    }

    if (!competitionMode && !state.finalPasswordStartedAt) {
        try {
            restoreFinalSnapshot(JSON.parse(localStorage.getItem(`interactividad-password-progress:${state.formData.dni || "sin-dni"}`)));
        } catch { /* Un almacenamiento dañado no impide jugar. */ }
    }

    renderPasswordScreen({
        intro: "Ahora sí, creá tu verdadera contraseña",
        description: "Deberás crear una contraseña que cumpla todas las condiciones que irán apareciendo.",
        helper: "Empezá a escribir: el tiempo comienza con tu primera letra.",
        stateKey: "finalPassword",
        inputId: "final-password-input",
        rules: finalPasswordRules,
        ruleMode: "progressive",
        revealedCountKey: "finalPasswordRevealedCount",
        completedOrderKey: "finalPasswordCompletionOrder",
        continueAtEnd: true,
        geniePose: "pensando",
        genieMessage: "Concentrate: cada condición desbloquea la siguiente pista.",
        nextScreen: "closing"
    });
}

function renderPasswordScreen(config) {
    app.innerHTML = `
        <section class="password-layout password-layout--${config.stateKey}">
            <div class="password-primary">
                <p class="lead">${config.intro}</p>
                ${config.description ? `<p class="password-description">${config.description}</p>` : ""}
                ${config.helper ? `<p class="password-helper">${config.helper}</p>` : ""}
                ${config.stateKey === "shortPassword" ? `<p id="short-genie-success" class="genie-remark hidden" role="status">Eso estuvo fácil, ¿no?</p>` : ""}
                ${config.stateKey === "finalPassword" && !getPlayerNameWords().length ? `
                    <label class="field" for="final-player-name">
                        <span>Nombre y apellido</span>
                        <input id="final-player-name" type="text" autocomplete="name" placeholder="Ingresá tu nombre y apellido">
                    </label>
                ` : ""}
                ${config.stateKey === "finalPassword" ? `
                    <p class="live-timer" aria-live="off">
                        <span>TIEMPO</span>
                        <strong id="final-live-timer">${formatLiveDuration(0)}</strong>
                    </p>
                ` : ""}
                <label class="field" for="${config.inputId}">
                    <span>Contraseña</span>
                    <span class="password-input-row">
                        <input id="${config.inputId}" type="text" value="${escapeHtml(state[config.stateKey])}" autocomplete="off">
                        <span id="password-character-count" class="password-character-count" aria-live="polite">0</span>
                    </span>
                </label>
                <div id="password-actions" class="actions ${config.continueAtEnd ? "password-actions-end" : ""}">
                    <button id="password-continue" type="button" class="hidden" data-next="${config.nextScreen}">CONTINUAR →</button>
                </div>
            </div>
            ${renderGenieCompanion({
                pose: config.geniePose,
                message: config.genieMessage
            })}
            <ul id="password-rules" class="rule-list"></ul>
        </section>
    `;

    const input = document.querySelector(`#${config.inputId}`);
    const continueButton = document.querySelector("#password-continue");
    const passwordActions = document.querySelector("#password-actions");
    const characterCount = document.querySelector("#password-character-count");
    const liveTimer = document.querySelector("#final-live-timer");
    const renderRules = () => {
        state[config.stateKey] = input.value;
        characterCount.textContent = input.value.length;
        const results = validatePassword(input.value, config.rules);
        const visibleResults = getVisiblePasswordResults(results, config);
        const orderedResults = orderPasswordResults(visibleResults, config);
        const allValid = results.every(result => result.ok);

        if (config.stateKey === "shortPassword") {
            document.querySelector("#short-genie-success").classList.toggle("hidden", !allValid);
            const genie = document.querySelector(".password-layout--shortPassword .genie-companion img");
            genie.src = allValid ? GENIE_ASSETS.idle : GENIE_ASSETS.pensando;
            genie.alt = allValid ? "Akinator sonriendo" : "Akinator pensando";
        }

        renderPasswordRules(document.querySelector("#password-rules"), orderedResults);

        continueButton.classList.toggle("hidden", !allValid);
        passwordActions.classList.toggle("hidden", !allValid);

        if (config.stateKey === "finalPassword") {
            if (input.value.length > 0 && !state.finalPasswordStartedAt) {
                state.finalPasswordStartedAt = Date.now();
                startFinalTimer(liveTimer);
            }

            if (allValid) {
                completeFinalPassword(input.value.length);
            } else {
                saveFinalProgress();
            }
        }
    };

    input.addEventListener("input", renderRules);
    document.querySelector("#final-player-name")?.addEventListener("input", event => {
        state.formData.nombre = event.target.value.trim();
        saveJourney();
        renderRules();
    });
    if (config.stateKey === "finalPassword") {
        input.addEventListener("focus", () => scrollFinalPasswordIntoView(input));
    }
    renderRules();
    if (config.stateKey === "finalPassword" && state.finalPasswordStartedAt) {
        startFinalTimer(liveTimer);
    }
    bindNextButtons();
}

function scrollFinalPasswordIntoView(input) {
    if (!window.matchMedia("(max-width: 820px)").matches) {
        return;
    }

    // Espera a que el teclado virtual reduzca el viewport antes de calcular el desplazamiento.
    window.setTimeout(() => {
        if (document.activeElement !== input) {
            return;
        }

        const inputTop = input.getBoundingClientRect().top;
        const targetTop = 16;

        if (inputTop > targetTop) {
            window.scrollBy({
                top: inputTop - targetTop,
                behavior: "smooth"
            });
        }
    }, 300);
}

function completeFinalPassword(characterCount) {
    stopFinalTimer();
    const result = {
        nombre: state.formData.nombre || "Jugador/a",
        dni: state.formData.dni || "sin-dni",
        password: state.finalPassword,
        durationMs: Math.max(0, Date.now() - (state.finalPasswordStartedAt || Date.now())),
        characterCount,
        completedAt: new Date().toISOString()
    };

    if (competitionMode) {
        competitionRuntime.complete(result);
        return;
    }

    saveFinalResult(result);
    try { localStorage.removeItem(`interactividad-password-progress:${state.formData.dni || "sin-dni"}`); } catch { /* Sin almacenamiento disponible. */ }
    renderCompletedFinalPassword(result);
    showFinalResultModal(result);
}

function startFinalTimer(timerElement) {
    stopFinalTimer();

    const updateTimer = () => {
        if (!timerElement || !state.finalPasswordStartedAt) {
            return;
        }

        timerElement.textContent = formatLiveDuration(Date.now() - state.finalPasswordStartedAt);
        finalTimerFrame = window.requestAnimationFrame(updateTimer);
    };

    updateTimer();
}

function stopFinalTimer() {
    if (finalTimerFrame) {
        window.cancelAnimationFrame(finalTimerFrame);
        finalTimerFrame = null;
    }
}

function renderCompletedFinalPassword(result) {
    app.innerHTML = `
        <section class="completed-game-screen">
            <p class="lead">Esta partida ya fue registrada en este dispositivo.</p>
            <div class="result-summary">
                <strong>${escapeHtml(result.nombre)}</strong>
                <span class="result-summary-password">${escapeHtml(getResultPassword(result))}</span>
                <span>${formatDuration(result.durationMs)} · ${result.characterCount} letras</span>
            </div>
            ${renderGenieCompanion({
                pose: "idle",
                message: "¡Excelente! Guardé tu resultado para que puedas volver a verlo."
            })}
            <div class="actions password-actions-end">
                <button id="show-final-result" type="button">MOSTRAR RESULTADO</button>
                <div class="result-next-actions">
                    <button data-next="closing" type="button">CONTINUAR →</button>
                    <button id="restart-final-game" class="secondary-button" type="button" disabled>REINICIAR PARTIDA (20s)</button>
                </div>
            </div>
        </section>
    `;

    document.querySelector("#show-final-result").addEventListener("click", () => showFinalResultModal(result));
    document.querySelector("#restart-final-game").addEventListener("click", resetCurrentPlayerGame);
    startFinalRestartCooldown(result);
    bindNextButtons();
}

function showFinalResultModal(result) {
    document.querySelector("#final-result-modal")?.remove();

    const modal = document.createElement("section");
    modal.id = "final-result-modal";
    modal.className = "result-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Resultado de la partida");
    modal.innerHTML = `
        <div class="result-modal-card">
            <button id="close-final-result" class="result-modal-close" type="button" aria-label="Cerrar resultado">×</button>
            <span class="result-modal-label">RESULTADO</span>
            <strong class="result-player-name">${escapeHtml(result.nombre)}</strong>
            <div class="result-password">
                <span>CONTRASEÑA</span>
                <strong>${escapeHtml(getResultPassword(result))}</strong>
            </div>
            <div class="result-metrics">
                <div><span>TIEMPO</span><strong class="result-time">${formatDuration(result.durationMs)}</strong></div>
                <div><span>LETRAS</span><strong>${result.characterCount}</strong></div>
            </div>
            <button id="save-final-result" type="button">GUARDAR IMAGEN</button>
        </div>
    `;

    document.body.append(modal);
    document.querySelector("#close-final-result").addEventListener("click", () => modal.remove());
    document.querySelector("#save-final-result").addEventListener("click", async event => {
        const button = event.currentTarget;
        button.disabled = true;
        button.textContent = "PREPARANDO IMAGEN...";

        try {
            await downloadFinalResultImage(result);
        } finally {
            button.disabled = false;
            button.textContent = "GUARDAR IMAGEN";
        }
    });
}

function getFinalResultKey(dni = state.formData.dni) {
    return `${finalResultStoragePrefix}${dni || "sin-dni"}`;
}

function getStoredFinalResult() {
    try {
        const storedResult = localStorage.getItem(getFinalResultKey());
        return storedResult ? JSON.parse(storedResult) : null;
    } catch (error) {
        console.warn("No se pudo leer el resultado guardado.", error);
        return null;
    }
}

function saveFinalResult(result) {
    try {
        localStorage.setItem(getFinalResultKey(result.dni), JSON.stringify(result));
    } catch (error) {
        console.warn("No se pudo guardar el resultado en este dispositivo.", error);
    }
}

function getResultPassword(result) {
    return result.password || "No disponible";
}

function resetFinalAttempt() {
    passwordContext.targetLength = null;
    passwordContext.captchaFile = getRandomCaptcha();
    state.finalPassword = "";
    state.finalPasswordRevealedCount = 0;
    state.finalPasswordCompletionOrder = [];
    state.finalPasswordStartedAt = null;
}

function resetCurrentPlayerGame() {
    stopFinalRestartCooldown();
    try {
        localStorage.removeItem(getFinalResultKey());
        localStorage.removeItem(`interactividad-password-progress:${state.formData.dni || "sin-dni"}`);
    } catch (error) {
        console.warn("No se pudo borrar el resultado guardado.", error);
    }

    resetFinalAttempt();
    document.querySelector("#final-result-modal")?.remove();
    showScreen("finalPassword");
}

function startFinalRestartCooldown(result) {
    const restartButton = document.querySelector("#restart-final-game");

    if (!restartButton) {
        return;
    }

    const updateRestartButton = () => {
        const completedAt = new Date(result.completedAt).getTime();
        const remainingMs = Number.isFinite(completedAt)
            ? Math.max(0, 20000 - (Date.now() - completedAt))
            : 0;

        if (remainingMs === 0) {
            restartButton.disabled = false;
            restartButton.textContent = "REINICIAR PARTIDA";
            stopFinalRestartCooldown();
            return;
        }

        restartButton.disabled = true;
        restartButton.textContent = `REINICIAR PARTIDA (${Math.ceil(remainingMs / 1000)}s)`;
    };

    stopFinalRestartCooldown();
    updateRestartButton();
    finalRestartCooldownInterval = window.setInterval(updateRestartButton, 250);
}

function stopFinalRestartCooldown() {
    if (finalRestartCooldownInterval) {
        window.clearInterval(finalRestartCooldownInterval);
        finalRestartCooldownInterval = null;
    }
}

function formatDuration(durationMs) {
    const totalMilliseconds = Math.max(0, Math.floor(durationMs));
    const totalSeconds = Math.floor(totalMilliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    const milliseconds = String(totalMilliseconds % 1000).padStart(3, "0");

    return `${minutes}:${seconds}.${milliseconds}`;
}

function formatLiveDuration(durationMs) {
    return formatDuration(durationMs);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function downloadFinalResultImage(result) {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 920;
    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#0b1623");
    gradient.addColorStop(1, "#183b50");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "rgba(83, 151, 208, 0.42)";
    context.lineWidth = 2;
    context.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
    context.fillStyle = "#27b6b9";
    context.font = "700 34px Arial";
    context.fillText("RESULTADO", 80, 100);
    context.fillStyle = "#f4f7fb";
    context.font = "700 62px Arial";
    context.fillText(String(result.nombre).slice(0, 28), 80, 190);
    context.font = "700 30px Arial";
    context.fillStyle = "#a9bacb";
    context.fillText("CONTRASEÑA", 80, 280);
    context.fillStyle = "#f4f7fb";
    context.font = "700 36px Arial";
    const passwordEndY = drawCanvasPassword(context, getResultPassword(result), 80, 345, 620, 50);
    const metricLabelY = passwordEndY + 100;
    context.font = "700 30px Arial";
    context.fillStyle = "#a9bacb";
    context.fillText("TIEMPO", 80, metricLabelY);
    context.fillText("LETRAS", 470, metricLabelY);
    context.font = "700 78px Arial";
    context.fillStyle = "#fabf3f";
    context.fillText(formatDuration(result.durationMs), 80, metricLabelY + 130);
    context.fillText(String(result.characterCount), 470, metricLabelY + 130);
    context.font = "700 25px Arial";
    context.fillStyle = "#27b6b9";
    context.fillText("Interactividad y validación", 80, metricLabelY + 250);

    const genieImage = await loadCanvasImage(GENIE_ASSETS.idle);
    if (genieImage) {
        drawCanvasGenie(context, genieImage, 740, 145, 370, 610);
    }

    const link = document.createElement("a");
    link.download = `resultado-${String(result.nombre).replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "jugador"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}

function loadCanvasImage(source) {
    return new Promise(resolve => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = source;
    });
}

function drawCanvasGenie(context, image, x, y, maxWidth, maxHeight) {
    const ratio = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const width = image.naturalWidth * ratio;
    const height = image.naturalHeight * ratio;
    const drawX = x + (maxWidth - width) / 2;
    const drawY = y + (maxHeight - height) / 2;

    context.drawImage(image, drawX, drawY, width, height);
}

function drawCanvasPassword(context, password, x, y, maxWidth, lineHeight) {
    let line = "";
    let lineY = y;

    for (const character of String(password)) {
        if (line && context.measureText(`${line}${character}`).width > maxWidth) {
            context.fillText(line, x, lineY);
            line = character;
            lineY += lineHeight;
        } else {
            line += character;
        }
    }

    context.fillText(line || "No disponible", x, lineY);
    return lineY;
}

function validatePassword(password, rules) {
    return rules.map((rule, order) => ({
        id: rule.id,
        description: rule.description,
        logos: rule.logos || [],
        color: rule.color || null,
        captchaFile: rule.captchaFile || null,
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

    const lengthIndex = results.findIndex(result => result.id === "longPassword");
    if (config.stateKey === "finalPassword" && lengthIndex >= 0 && lengthIndex < revealedCount
        && passwordContext.targetLength === null) {
        passwordContext.targetLength = state.finalPassword.length + 5 + Math.floor(Math.random() * 14);
        const rule = finalPasswordRules.find(rule => rule.id === "longPassword");
        results[lengthIndex].description = rule.description;
        results[lengthIndex].ok = rule.validate(state.finalPassword);
    }

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

        return completedOrder.indexOf(second.id) - completedOrder.indexOf(first.id);
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
                ${renderPasswordColor(result.color)}
                ${renderPasswordCaptcha(result.captchaFile)}
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

function renderPasswordCaptcha(file) {
    if (!CAPTCHA_FILES.includes(file)) return "";
    return `<img class="password-captcha" src="assets/captchas/${file}" alt="Captcha: transcribí los caracteres de la imagen" decoding="async">`;
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

function renderPasswordColor(color) {
    if (!color) {
        return "";
    }

    return `<span class="password-color-swatch" style="--password-target-color: ${color.hex}" aria-label="Color requerido"></span>`;
}

function getRandomPasswordColor() {
    const colors = [
        { name: "rojo", hex: "#dc3d3d" },
        { name: "azul", hex: "#1c78d4" },
        { name: "amarillo", hex: "#f5c542" },
        { name: "verde", hex: "#32a462" },
        { name: "blanco", hex: "#ffffff" },
        { name: "negro", hex: "#111111" }
    ];

    return colors[Math.floor(Math.random() * colors.length)];
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
            <div class="fake-final-content">
                <p id="fake-final-message" class="fake-final-message">Completaste todas las condiciones.</p>
                <div class="actions">
                    <button id="fake-final-button" type="button">ESPERÁ...</button>
                    <button id="fake-final-continue" type="button" class="hidden" data-next="finalPassword">CONTINUAR →</button>
                </div>
            </div>
            ${renderGenieCompanion({
                pose: "idle",
                message: "¡Excelente! Pero todavía queda un último desafío."
            })}
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
    const firstName = state.formData.nombre.trim().split(/\s+/)[0];
    app.innerHTML = `
        <section class="closing-screen">
            <header class="closing-celebration">
                <div>
                    <span class="section-kicker">RECORRIDO COMPLETADO</span>
                    <h2>${firstName ? `¡Bien hecho, ${escapeHtml(firstName)}!` : "¡Felicitaciones!"}</h2>
                    <p>La magia la hiciste vos.</p>
                </div>
                ${renderGenieCompanion({
                    pose: "idle",
                    message: "¡Excelente trabajo! Ya dominás las pistas de la experiencia."
                })}
            </header>
            <div class="recap-switch" role="tablist" aria-label="Lo que experimentaste">
                <button id="recap-tab-events" role="tab" aria-selected="true" aria-controls="recap-playground" data-recap="events">El genio</button>
                <button id="recap-tab-form" role="tab" aria-selected="false" aria-controls="recap-playground" tabindex="-1" data-recap="form">¿Sos alumno?</button>
                <button id="recap-tab-validation" role="tab" aria-selected="false" aria-controls="recap-playground" tabindex="-1" data-recap="validation">Tu contraseña</button>
                <button id="recap-tab-ranking" role="tab" aria-selected="false" aria-controls="recap-playground" tabindex="-1" data-recap="ranking">La competencia</button>
            </div>
            <section id="recap-playground" class="recap-playground" role="tabpanel" aria-labelledby="recap-tab-events"></section>
            <div class="actions closing-actions">
                <button type="button" data-next="start">VOLVER AL INICIO</button>
                <button type="button" class="secondary-button" data-next="finalPassword">PANTALLA ANTERIOR</button>
            </div>
        </section>
    `;

    const tabs = [...document.querySelectorAll("[data-recap]")];
    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => {
            tabs.forEach(item => {
                item.setAttribute("aria-selected", String(item === tab));
                item.tabIndex = item === tab ? 0 : -1;
            });
            renderClosingExperiment(tab.dataset.recap);
        });
        tab.addEventListener("keydown", event => {
            const next = event.key === "ArrowRight" ? (index + 1) % tabs.length
                : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length
                : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
            if (next === null) return;
            event.preventDefault();
            tabs[next].focus();
            tabs[next].click();
        });
    });
    renderClosingExperiment("events");
    bindNextButtons();
}

function renderClosingExperiment(mode) {
    const panel = document.querySelector("#recap-playground");
    panel.setAttribute("aria-labelledby", `recap-tab-${mode}`);
    if (mode === "events") {
        panel.innerHTML = `
            <h3 class="recap-moment">Cuando el genio “adivinó” tu navegador…</h3>
            <div class="recap-live-scene">
                <button class="recap-genie-button" id="recap-react" aria-label="Hacer reaccionar al genio">
                    <img id="recap-pose" src="${GENIE_ASSETS.pensando}" alt="Akinator pensando">
                    <span>OTRA PISTA</span>
                </button>
                <p id="recap-reaction" class="recap-speech" aria-live="polite">¿Cómo lo sabía?</p>
            </div>
            <div class="recap-signal"><span>Tu clic</span><span aria-hidden="true">→</span><code>JavaScript</code><span aria-hidden="true">→</span><span id="recap-effect">¿Qué cambia?</span></div>
            <p class="recap-caption"><strong>Evento + JavaScript:</strong> tu clic pidió una pista; el código leyó datos del navegador y mostró una respuesta.</p>`;
        let smiling = false;
        document.querySelector("#recap-react").addEventListener("click", () => {
            smiling = !smiling;
            const pose = document.querySelector("#recap-pose");
            pose.src = smiling ? GENIE_ASSETS.idle : GENIE_ASSETS.pensando;
            pose.alt = smiling ? "Akinator sonriendo" : "Akinator pensando";
            document.querySelector("#recap-reaction").textContent = smiling ? `Tu navegador indica: ${passwordContext.browserName}.` : "Leí una pista del navegador. No era magia ni una prueba de tu identidad.";
            document.querySelector("#recap-effect").textContent = "Dato → respuesta";
        });
    } else if (mode === "form") {
        panel.innerHTML = `
            <h3 class="recap-moment">Cuando cargaste tus datos…</h3>
            <form id="recap-form" class="recap-validation-scene">
                <label for="recap-name">Nombre y apellido</label>
                <input id="recap-name" type="text" autocomplete="off" value="${escapeHtml(state.formData.nombre || "Juan Perez")}">
                <button type="submit">CARGAR</button>
                <p id="recap-form-result" class="recap-check" aria-live="polite">Consulta pendiente.</p>
            </form>
            <div class="recap-signal"><span>Tu nombre</span><span aria-hidden="true">→</span><span>Lista de alumnos</span><span aria-hidden="true">→</span><span>Coincide o no coincide</span></div>
            <p class="recap-caption"><strong>Formulario + consulta:</strong> recibimos lo que escribiste y buscamos tu nombre en una lista local.</p>`;
        document.querySelector("#recap-form").addEventListener("submit", event => {
            event.preventDefault();
            const name = document.querySelector("#recap-name").value.trim();
            const found = Boolean(name && findAlumnoByName(name));
            const result = document.querySelector("#recap-form-result");
            result.textContent = !name ? "Escribí un nombre para consultar." : found ? "✓ El alumno está en la lista." : "× Ese nombre no está en la lista.";
            result.classList.toggle("is-valid", found);
        });
    } else if (mode === "validation") {
        panel.innerHTML = `
            <h3 class="recap-moment">Cuando armaste tu contraseña…</h3>
            <div class="recap-validation-scene">
                <label for="recap-sample">Una regla que ya viste: mínimo 8 caracteres</label>
                <input id="recap-sample" type="text" autocomplete="off" placeholder="Probá escribir…" aria-describedby="recap-check">
                <div class="recap-meter" aria-hidden="true">${"<span></span>".repeat(8)}</div>
                <p id="recap-check" class="recap-check" aria-live="polite">0 / 8 · Pendiente</p>
            </div>
            <div class="recap-signal"><span>Escribís</span><span aria-hidden="true">→</span><code>input</code><span aria-hidden="true">→</span><span>Se comprueba la regla</span></div>
            <p class="recap-caption"><strong>Validación:</strong> cada letra vuelve a comprobar la regla. Por eso cambiaban los colores mientras escribías.</p>`;
        document.querySelector("#recap-sample").addEventListener("input", event => {
            const length = event.target.value.length;
            document.querySelectorAll(".recap-meter span").forEach((segment, index) => segment.classList.toggle("is-filled", length > index));
            const check = document.querySelector("#recap-check");
            check.classList.toggle("is-valid", length >= 8);
            check.textContent = `${length} / 8 · ${length >= 8 ? "✓ Cumplida" : "Pendiente"}`;
        });
    } else {
        panel.innerHTML = `
            <h3 class="recap-moment">Cuando enviaste tu resultado…</h3>
            <div class="recap-ranking-scene">
                <div class="recap-delivery" aria-label="Dispositivo, servidor y ranking">
                    <span class="is-active">Tu dispositivo</span><b aria-hidden="true">→</b><span>Servidor</span><b aria-hidden="true">→</b><span>Ranking compartido</span>
                </div>
                <p id="recap-delivery-message" class="recap-speech" aria-live="polite">Terminaste el juego: nombre y tiempo listos.</p>
                <button id="recap-delivery-next" type="button">Recrear el envío →</button>
                <small>Recreación del recorrido. No envía otro resultado.</small>
            </div>
            <p class="recap-caption"><strong>Cliente y servidor:</strong> tu dispositivo envió el resultado. El servidor lo registró y permitió compartirlo en el ranking.</p>`;
        let step = 0;
        document.querySelector("#recap-delivery-next").addEventListener("click", event => {
            step = (step + 1) % 3;
            document.querySelectorAll(".recap-delivery span").forEach((node, index) => node.classList.toggle("is-active", index <= step));
            document.querySelector("#recap-delivery-message").textContent = [
                "Terminaste el juego: nombre y tiempo listos.",
                "El servidor comprueba la participación y registra el resultado.",
                "Los demás dispositivos pueden ver la clasificación."
            ][step];
            event.currentTarget.textContent = ["Recrear el envío →", "Actualizar ranking →", "↻ Volver a verlo"][step];
        });
    }
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

    initDeveloperHoldTrigger();

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

function renderGenieCompanion({ message, pose = "idle" }) {
    const source = GENIE_ASSETS[pose] || GENIE_ASSETS.idle;
    const alt = pose === "pensando"
        ? "Akinator pensando"
        : pose === "celu"
            ? "Akinator observando un celular"
            : "Akinator sonriendo";

    return `
        <aside class="genie-companion genie-companion--${pose}">
            <img src="${source}" alt="${alt}">
            <div class="genie-companion-message">
                <span>AKINATOR</span>
                <p>${message}</p>
            </div>
        </aside>
    `;
}

function initDeveloperHoldTrigger() {
    const startHold = event => {
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }

        clearDeveloperHold();
        developerHoldTimeout = window.setTimeout(() => {
            devPanel.classList.remove("hidden");
            setDeveloperMessage("Herramientas abiertas.");
            developerHoldTimeout = null;
        }, 2500);
    };

    progressCard.addEventListener("pointerdown", startHold);
    progressCard.addEventListener("pointerup", clearDeveloperHold);
    progressCard.addEventListener("pointercancel", clearDeveloperHold);
    progressCard.addEventListener("pointerleave", clearDeveloperHold);
    progressCard.addEventListener("lostpointercapture", clearDeveloperHold);
    progressCard.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
            event.preventDefault();
            startHold(event);
        }
    });
    progressCard.addEventListener("keyup", clearDeveloperHold);
}

function clearDeveloperHold() {
    if (developerHoldTimeout) {
        window.clearTimeout(developerHoldTimeout);
        developerHoldTimeout = null;
    }
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
    state.activePlayerDni = alumno.dni;
    resetFinalAttempt();

    document.querySelector("#nombre").value = state.formData.nombre;
    document.querySelector("#dni").value = state.formData.dni;
    document.querySelector("#edad").value = state.formData.edad;
    renderValidationResults(validateStudentForm(state.formData));
    setDeveloperMessage("Alumno de prueba cargado y validado.");
}

function completeDeveloperPassword() {
    if (competitionMode) return;
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
    if (state.currentScreen === "finalPassword" && passwordContext.targetLength > input.value.length) {
        input.value = input.value.padEnd(passwordContext.targetLength, "ab") + [...input.value][0];
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    setDeveloperMessage("Contraseña de prueba cargada.");
}

function buildValidFinalPassword() {
    let remainingSum = 15;
    const balancingDigits = [];

    while (remainingSum > 9) {
        balancingDigits.push("9");
        remainingSum -= 9;
    }

    balancingDigits.push(String(remainingSum));
    return `Ab!${passwordContext.currentYear}mayo${passwordContext.currentYearRoman}VManaos420${balancingDigits.join("x")}${passwordContext.browserName}interactividadRojas${passwordContext.targetColor.name}${getPlayerNameWords()[0] || ""}${getCaptchaAnswer()}etramA`;
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

function toRomanNumeral(number) {
    const numerals = [
        [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
        [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
        [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
    ];
    let remaining = number;
    let roman = "";

    numerals.forEach(([value, symbol]) => {
        while (remaining >= value) {
            roman += symbol;
            remaining -= value;
        }
    });

    return roman;
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
