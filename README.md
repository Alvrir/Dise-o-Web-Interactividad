# Interactividad y validación

Página educativa e interactiva para una exposición de Diseño Web de primer año.

La idea principal es que la persona no solo lea conceptos, sino que los experimente: hace click, escribe, completa formularios, ve validaciones y juega dos versiones de un Password Game.

## Página publicada

La versión pública está disponible en:

```text
https://alvrir.github.io/Dise-o-Web-Interactividad/
```

El repositorio de GitHub es:

```text
https://github.com/Alvrir/Dise-o-Web-Interactividad
```

## Regla de mantenimiento

Antes de cada commit y cada publicación en GitHub se debe revisar y actualizar este `README.md` para que siempre coincida con el estado real del proyecto.

La revisión debe incluir, según corresponda:

- cambios visuales o de distribución;
- textos y títulos;
- pantallas y navegación;
- validaciones y reglas de contraseña;
- herramientas de desarrollador;
- datos de prueba;
- instrucciones de ejecución y publicación.

`index.html` agrega un parámetro `?v=` a `style.css` y `script.js` para evitar que GitHub Pages o el navegador mantengan archivos antiguos en caché. Cuando se publiquen cambios de CSS o JavaScript, incrementar ese valor en ambas referencias.

## Cómo abrir el proyecto

La forma recomendada es usar un servidor local sencillo, porque algunos navegadores bloquean la lectura de archivos JSON cuando se abre el HTML directamente con `file://`.

En PowerShell:

```powershell
cd "C:\Users\Alva\Documents\Página Diseño Web"
python -m http.server 8000
```

Después abrir:

```text
http://127.0.0.1:8000
```

También se puede probar abriendo `index.html` directamente, pero puede fallar la carga de `data/alumnos.json`. Si eso pasa, la página usa datos de demostración guardados en `script.js`.

## Estructura de archivos

```text
Página Diseño Web/
|
|-- index.html
|-- style.css
|-- script.js
|
|-- data/
|   |-- alumnos.json
|
|-- assets/
|   |-- screens/
|       |-- .gitkeep
|
|-- README.md
```

## Qué hace cada archivo

### `index.html`

Contiene la estructura base de la página:

- cabecera con el indicador de progreso y las herramientas de desarrollador;
- indicador de progreso;
- botón de herramientas de desarrollador;
- panel de herramientas de desarrollador;
- contenedor principal donde JavaScript dibuja cada pantalla.

No tiene todo el contenido escrito pantalla por pantalla. La mayoría se genera desde `script.js`.

### `style.css`

Contiene todo el diseño visual:

- layout general;
- responsive para celular y PC;
- botones;
- formularios;
- tarjetas;
- validaciones;
- reglas del Password Game;
- panel de herramientas de desarrollador;
- tip de F12;
- cierre con tarjetas preparadas para miniaturas.

El layout principal utiliza una columna flex de altura completa (`100dvh`). El encabezado conserva su altura natural y `.screen` ocupa todo el espacio restante del navegador, sin imponer una altura mínima adicional en celulares.

Cada cambio de pantalla reinicia la clase `.is-entering`, que aplica un fade de entrada de 320 ms al contenido. Si el navegador tiene activado `prefers-reduced-motion`, la animación se desactiva.

### `script.js`

Es el archivo principal de funcionamiento.

Contiene:

- estado central de la aplicación;
- lista de pantallas;
- navegación entre pantallas;
- detección básica del navegador;
- consulta opcional del nivel y estado de carga de la batería;
- secuencia interactiva del genio para revelar los datos;
- eventos interactivos;
- formulario;
- validaciones;
- búsqueda de alumnos en JSON;
- Password Game corto;
- Password Game final;
- falso final;
- cierre;
- herramientas de desarrollador.

### `data/alumnos.json`

Simula una base de datos local de alumnos.

Acá se agregan, modifican o eliminan alumnos.

### `assets/screens/`

Carpeta preparada para poner imágenes o miniaturas de cada actividad en el futuro.

Por ejemplo:

```text
assets/screens/interactividad.png
assets/screens/eventos.png
assets/screens/javascript.png
assets/screens/formularios.png
assets/screens/validacion.png
assets/screens/password-game.png
```

## Recorrido de pantallas

El recorrido actual es:

1. Inicio
2. Información del navegador y User-Agent
3. Eventos e interactividad
4. Formulario y validación
5. Password Game corto
6. Falso final
7. Password Game final
8. Cierre

Las pantallas están definidas en `script.js`, en el arreglo:

```javascript
const screens = [
    ...
];
```

Cada pantalla tiene:

- `id`: identificador interno;
- `title`: nombre descriptivo usado en las herramientas de desarrollador;
- `label`: texto del progreso;
- `render`: función que dibuja esa pantalla.

Ejemplo:

```javascript
{ id: "events", title: "LA PÁGINA REACCIONA", label: "Actividad 2 / 8", render: renderEvents }
```

## Cómo funciona la navegación

La navegación usa la función:

```javascript
showScreen("idDePantalla");
```

Los botones usan el atributo:

```html
data-next="events"
```

Después JavaScript detecta esos botones y cambia la pantalla.

La función que conecta los botones es:

```javascript
bindNextButtons()
```

Al cambiar de pantalla, `showScreen()` enfoca el contenido principal con `preventScroll`. Esto conserva la accesibilidad del foco sin desplazar automáticamente la página hacia abajo, especialmente en celulares.

## Estado central de la aplicación

En `script.js` existe un objeto llamado:

```javascript
const state = {
    ...
};
```

Sirve para guardar datos mientras la página está abierta:

- pantalla actual;
- alumnos cargados;
- datos del formulario;
- alumno encontrado;
- último evento detectado;
- contraseña del juego corto;
- contraseña del juego final.

No se usa `localStorage`, base de datos real ni servidor.

## Cómo modificar alumnos

Editar:

```text
data/alumnos.json
```

Ejemplo:

```json
[
    {
        "dni": "12345678",
        "nombre": "Juan Perez",
        "edad": 18
    }
]
```

Importante:

- El DNI debe estar como texto entre comillas.
- El nombre debe coincidir con lo que se escribe en el formulario.
- La edad puede ir como número.
- Respetar comas entre objetos.
- El archivo debe seguir siendo JSON válido.

Si el JSON está mal escrito, la página no va a poder cargarlo correctamente.

## Cómo funciona la validación del formulario

La pantalla del formulario pide:

- nombre y apellido;
- DNI;
- edad.

La función principal es:

```javascript
validateStudentForm(formData)
```

Esa función:

1. revisa que el nombre no esté vacío;
2. revisa que el DNI exista;
3. revisa que el DNI tenga solo números;
4. revisa una longitud razonable;
5. revisa que la edad exista;
6. revisa que la edad tenga solo números;
7. revisa un rango de edad;
8. busca el DNI en `alumnos.json`;
9. compara nombre y edad con el registro encontrado;
10. permite continuar si todo está correcto.

Para buscar un alumno se usa:

```javascript
findAlumnoByDni(dni)
```

## Dónde cambiar las reglas del Password Game

En `script.js` hay dos listas:

```javascript
const shortPasswordRules = [
    ...
];
```

```javascript
const finalPasswordRules = [
    ...
];
```

La primera corresponde al juego corto.

La segunda corresponde al juego final.

Cada regla tiene esta forma:

```javascript
{
    id: "minLength",
    description: "Mínimo 8 caracteres.",
    validate: password => password.length >= 8
}
```

Para agregar una regla nueva, agregar otro objeto a la lista.

Ejemplo:

```javascript
{
    id: "symbol",
    description: "Debe tener un símbolo.",
    validate: password => /[^A-Za-z0-9]/.test(password)
}
```

## Cómo aparecen las reglas de contraseña

Las condiciones aparecen de a una.

Primero se muestra la primera regla. Cuando se cumple, aparece la siguiente. Cuando esa también se cumple, aparece otra, y así hasta terminar.

La función que decide qué reglas se muestran es:

```javascript
getVisiblePasswordResults(results)
```

La función que valida todas las reglas es:

```javascript
validatePassword(password, rules)
```

El botón de continuar aparece recién cuando todas las reglas están cumplidas.

## Herramientas de desarrollador internas

La página tiene un botón:

```text
Herramientas de desarrollador
```

Sirve para testear y armar la página más rápido.

Desde ese panel se puede:

- saltar a cualquier pantalla;
- ir a la pantalla anterior;
- ir a la pantalla siguiente;
- completar automáticamente el alumno de prueba;
- completar automáticamente una contraseña válida;
- abrir el `README.md` en otra pestaña.

Esto es solo para desarrollo y exposición. Si se quiere ocultar más adelante, se puede borrar o comentar el panel en `index.html` y las funciones de herramientas en `script.js`.

Funciones relacionadas:

```javascript
initDeveloperTools()
fillDeveloperStudent()
completeDeveloperPassword()
moveDeveloperScreen(direction)
```

## Battery Status API

La pantalla `¿Qué sabe la página sobre vos?` intenta consultar la batería mediante:

```javascript
navigator.getBattery()
```

Durante la adivinanza, el mensaje del genio puede mostrar:

- porcentaje aproximado;
- si el dispositivo está cargando;
- que la información no está disponible cuando la API no existe;
- que el navegador mantiene el dato en secreto cuando bloquea la consulta.

La función responsable es:

```javascript
loadBatteryInfo()
```

Esta API tiene compatibilidad limitada y requiere un contexto seguro en los navegadores modernos. La versión publicada en GitHub Pages usa HTTPS, pero algunos navegadores, especialmente varios navegadores de dispositivos Apple, pueden no compartir esta información.

## Genio del navegador

La pantalla `¿Qué sabe la página sobre vos?` utiliza tres imágenes PNG transparentes:

```text
assets/genio/idle.png
assets/genio/pensando.png
assets/genio/celu.png
```

Estados del personaje:

- `idle.png`: pose inicial y explicación final;
- `pensando.png`: se muestra durante 2 segundos antes de cada respuesta;
- `celu.png`: acompaña la respuesta revelada.

Después de mostrar cada respuesta, el botón `OTRA PISTA` permanece bloqueado durante 1 segundo adicional para dar tiempo a leerla.

La clase `.genie-image` aplica una máscara degradada en CSS para que los bordes superior e inferior de las tres imágenes se desvanezcan suavemente hasta ser transparentes. Los archivos PNG originales no se modifican.

Mientras el genio está adivinando, `.genie-stage` se expande para ocupar y centrar el contenido en todo el espacio disponible. Al mostrar el truco, la clase `.is-complete` vuelve compacta la escena para dejar lugar al User-Agent y al recuadro final.

En pantallas de más de `820px`, el estado de adivinación se divide en dos columnas del mismo ancho: el genio puede crecer hasta `520px` y el diálogo ocupa la otra mitad con una altura amplia. Estas reglas usan `.genie-screen:not(.is-complete)`, por lo que no cambian el diseño final de `MOSTRAR EL TRUCO`.

El genio revela por etapas:

1. tipo de dispositivo;
2. navegador;
3. nivel y estado de la batería, cuando están disponibles.

Las respuestas aparecen solamente en el diálogo del personaje y no generan tarjetas debajo. Al pulsar `MOSTRAR EL TRUCO`, aparecen el User-Agent, el botón para continuar y un único recuadro breve que combina el tip de `F12` con el dato sobre las protecciones de privacidad de navegadores como Brave.

El estilo del recuadro final está en:

```css
.tip-box
```

Las funciones relacionadas son:

```javascript
initGenieExperience()
formatDeviceGuess()
formatBatteryGuess()
```

## Tip de F12

En la pantalla de información del navegador aparece un tip que indica:

```text
Apretá F12 en tu navegador para abrir las herramientas de desarrollador.
```

La idea es que el alumnado entienda que la información como el User-Agent puede inspeccionarse, simularse o modificarse, por eso no es una identificación confiable.

Ese texto está dentro de:

```javascript
renderBrowserInfo()
```

El estilo visual está en:

```css
.tip-box
kbd
```

## Dónde cambiar textos

Los textos principales están en las funciones de pantalla dentro de `script.js`:

```javascript
renderStart()
renderBrowserInfo()
renderEvents()
renderForm()
renderPasswordScreen()
renderFakeFinal()
renderClosing()
```

Los nombres descriptivos de las pantallas, que también aparecen en el selector de las herramientas de desarrollador, están en el arreglo:

```javascript
const screens = [
    ...
];
```

## Dónde cambiar el diseño

Todo el diseño está en:

```text
style.css
```

Partes importantes:

- `.app-shell`: contenedor de ancho y altura completos;
- `.topbar`: cabecera con progreso y acceso a las herramientas de desarrollador;
- `.screen`: caja principal flexible que ocupa el espacio restante del viewport;
- `.progress-card`: barra de progreso;
- `.form-grid`: formulario;
- `.rule-item`: reglas del Password Game;
- `.dev-panel`: herramientas de desarrollador;
- `.tip-box`: tip de F12;
- `@media (max-width: 820px)`: comportamiento responsive en celular.

## Cómo agregar una nueva pantalla

1. Crear una función nueva en `script.js`.

Ejemplo:

```javascript
function renderNuevaPantalla() {
    app.innerHTML = `
        <section>
            <p class="lead">Contenido de la nueva pantalla.</p>
            <div class="actions">
                <button data-next="closing">CONTINUAR →</button>
            </div>
        </section>
    `;

    bindNextButtons();
}
```

2. Agregarla al arreglo `screens`.

```javascript
{ id: "nuevaPantalla", title: "NUEVA PANTALLA", label: "Actividad nueva", render: renderNuevaPantalla }
```

3. Cambiar algún botón `data-next` para que apunte a esa pantalla.

Ejemplo:

```html
<button data-next="nuevaPantalla">CONTINUAR →</button>
```

## Cómo agregar imágenes al cierre

La pantalla final usa esta lista:

```javascript
const closingConcepts = [
    ...
];
```

Cada concepto tiene:

```javascript
{
    title: "Eventos",
    description: "Click, escritura, teclas y tacto disparan acciones.",
    image: "assets/screens/eventos.png",
    activity: "Actividad 2"
}
```

Por ahora se muestran espacios preparados para miniaturas.

Para agregar imágenes reales:

1. guardar la imagen en `assets/screens/`;
2. usar el mismo nombre indicado en `image`;
3. más adelante se puede ajustar `renderConceptCard()` para mostrar `<img>` en lugar del placeholder.

## Cosas importantes para no romper

- No borrar `app.innerHTML`, porque ahí se dibuja cada pantalla.
- No borrar `bindNextButtons()` al final de las funciones `render`, porque conecta los botones.
- No cambiar los `id` de pantalla sin actualizar los botones `data-next`.
- Si se modifica `alumnos.json`, revisar que sea JSON válido.
- Si se agregan reglas de contraseña, cada regla necesita `id`, `description` y `validate`.
- Si se cambia el nombre de un input del formulario, revisar también `validateStudentForm()`.

## Datos de prueba

Alumno de prueba:

```text
Nombre: Juan Perez
DNI: 12345678
Edad: 18
```

Contraseña válida para el juego corto:

```text
Clave123
```

Contraseña válida para el juego final:

```text
Clave1234!
```

## Tecnologías usadas

- HTML
- CSS
- JavaScript
- JSON local

No se usa:

- SQL;
- backend;
- frameworks;
- librerías externas.

## Objetivo del proyecto

Mostrar de forma práctica:

- interactividad web;
- eventos;
- acciones del usuario;
- JavaScript;
- formularios;
- validación del lado del cliente;
- consulta de datos locales con JSON;
- diferencia entre información útil e información confiable;
- reglas dinámicas mediante un Password Game.

Este proyecto todavía es una base inicial. La prioridad es que funcione completo y sea fácil de modificar.

