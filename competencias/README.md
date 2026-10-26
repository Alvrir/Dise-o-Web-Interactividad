# Competencias de Password Game

El enlace con `?competencia=ID` abre el inicio de la exposición y conserva todas las actividades en orden. El juego final de la actividad 7 registra el resultado con el mismo nombre del formulario original. No hay una segunda inscripción ni una bienvenida competitiva: el ranking se revela en la victoria. El DNI y la edad del formulario original no se envían a Supabase. Sin ese parámetro, todo funciona en modo libre.

## Configuración necesaria (una sola vez)

1. Creá un proyecto en [Supabase](https://supabase.com/dashboard). Guardá tus contraseñas fuera del repositorio.
2. En la configuración del proyecto copiá **Project URL** y **Publishable key** (también sirve la clave pública `anon` de proyectos anteriores). En `competencias/config.js` completá:
   - Línea 2: `SUPABASE_URL`.
   - Línea 3: `SUPABASE_PUBLISHABLE_KEY`.
   Estos dos datos son públicos. Nunca pegues una secret key, `service_role`, contraseña de base de datos ni token administrativo.
3. Abrí **SQL Editor**, pegá el contenido completo de `sql/001_initial_schema.sql` y ejecutalo **una vez**. Crea tablas, permisos, funciones y agrega `pw_leaderboard` y `pw_competitions` a la publicación `supabase_realtime`. No ejecutarlo parcialmente ni volver a aplicarlo si ya se instaló.
4. En **Authentication → Sign In / Providers** habilitá **Anonymous Sign-Ins**. Es una sesión técnica para reconocer al participante, sin formulario de registro. Se recupera en el mismo navegador mientras se conserve su almacenamiento. Borrar datos o usar otro navegador crea otra identidad.
5. En **Authentication → Users**, creá tu usuario de administrador con correo y contraseña (confirmado). Copiá su UUID y ejecutá en SQL Editor:

   ```sql
   insert into public.pw_admins(user_id) values ('PEGAR_UUID_DE_TU_USUARIO');
   ```

   Estar autenticado no basta para administrar; sólo los UUID de esta tabla tienen permisos. No uses el UUID de un participante anónimo.
6. En **Authentication → URL Configuration** configurá la URL real de tu sitio de GitHub Pages. Este panel usa correo y contraseña directamente; no implementa enlaces mágicos ni recuperación por correo. Podés administrar tu usuario desde Supabase.
7. En **Database → Replication / Publications**, verificá que `supabase_realtime` incluya las dos tablas mencionadas. Sólo contienen datos públicos del evento y ranking; no publicamos tokens ni los ID de autenticación.

Si falta la configuración, la interfaz muestra un aviso; el modo libre funciona sin cargar el cliente de Supabase. Sólo completar las dos líneas no reemplaza los pasos de SQL y autenticación.

## Publicación y uso

Publicá los archivos con el mecanismo de GitHub Pages que ya utiliza el repositorio. Revisá **Settings → Pages** para confirmar su rama o workflow; esta implementación no cambia la configuración de publicación. Los cambios se publican mediante commit y push a `main`, conservando la configuración de Pages del repositorio.

1. Abrí `TU_URL/competencias/admin.html` e ingresá con tu cuenta.
2. Creá una competencia (dos victorias por defecto) y activala. Sólo puede haber una activa; primero finalizá la anterior.
3. Abrí **Enlaces y QR**. El QR se genera en el navegador y respeta el subdirectorio real de GitHub Pages.
4. Abrí el enlace del ranking en el proyector. Compartí el enlace del juego o su QR.
5. Los participantes recorren las actividades y completan el formulario original. Su nombre se reutiliza al llegar al juego final; pueden repetirse nombres porque la identidad interna los distingue. Tras ganar, pueden consultar el ranking, repetir sólo el juego final o continuar al cierre de la exposición.
6. Al terminar, finalizá la competencia. Los resultados quedan en el historial. Para una exposición nueva, creá otra; no hace falta borrar pruebas.

Para jugar como participante mientras probás el panel, usá otro navegador o perfil: el administrador y el participante utilizan la sesión de Auth del navegador. Cerrar o cambiar esa sesión puede hacer que no se recupere una identidad anónima anterior.

## Reglas de funcionamiento

- El cronómetro arranca con el primer contenido en la caja de contraseña. Continúa si la pestaña se cierra o queda en segundo plano. Se conserva el inicio, texto, reglas reveladas y condiciones en almacenamiento local.
- La partida en curso se conserva localmente. Al ganar en competencia, se guarda en Supabase la contraseña final del juego para mostrarla en el ranking. Usar sólo contraseñas inventadas para el desafío. El modo libre conserva su resultado e imagen originales.
- Abandonar no consume intentos. Una victoria confirmada consume uno. Cada partida tiene UUID; los reintentos devuelven el registro existente.
- La base de datos limita victorias y rechaza escrituras directas. El bloqueo de la competencia serializa altas, resultados y cierre; un índice único impide dos competencias activas.
- Hay 20 segundos de cooldown; en competencia se cuentan desde la confirmación temporal del servidor. No se inicia otro intento mientras haya un envío pendiente.
- Si el resultado todavía no llegó cuando se cierra la competencia, no se acepta. Si ya estaba guardado, un reintento puede recuperarlo incluso después del cierre.
- El QR identifica una competencia concreta y abre el inicio de la exposición: uno viejo no inscribe en una exposición nueva. El recorrido y formulario se conservan localmente para recuperar la pantalla tras una recarga. La inscripción en Supabase se realiza al entrar al juego final; el contador no incluye visitantes que todavía no llegaron a esa actividad.
- Ranking: mejor tiempo, momento de registro de esa marca y UUID público del participante. Se almacenan milisegundos y se muestran centésimas; dos tiempos visualmente iguales pueden diferir en milisegundos.
- El contador representa participantes registrados, no personas conectadas. Los datos visibles del ranking y el historial son públicos.
- El ranking usa dos suscripciones por pantalla (resultados y estado). También consulta cada 15 segundos como respaldo y después de reconectar.
- El panel de desarrollo no se inicializa en modo competencia. Un navegador manipulado todavía puede falsificar tiempos o victorias: este sistema es educativo. Los tiempos deben estar entre 1 ms y siete días; eso no certifica que sean legítimos.
- Límites: de 1 a 20 victorias configuradas; nombre de participante hasta 40 caracteres y competencia hasta 100. Se utiliza el límite elegido al crear el evento; no hay edición ni borrado masivo.

## Conectividad y protección básica

Supabase Auth aplica límites de altas anónimas. Revisalos en Authentication → Rate Limits si usan un Wi-Fi compartido: la documentación indica 30 altas/hora/IP por defecto. Para un evento chico, probá primero con la red real. Este proyecto no implementa CAPTCHA ni una defensa avanzada contra altas automatizadas; no promete protección completa contra spam. Si se habilita CAPTCHA en Supabase, será necesario integrar su formulario antes de usar altas anónimas.

El cliente oficial de Supabase y la biblioteca QR se cargan desde jsDelivr con versiones fijadas. El modo libre no depende de esas descargas. Si el CDN falla, la interfaz informa el problema y el enlace de juego sigue disponible si el QR no carga.

## Verificación

Pruebas de lógica y persistencia, sin dependencias:

```powershell
node --test competencias/tests/game.mjs
node --experimental-vm-modules --test competencias/tests/recovery.mjs
```

Prueba del esquema y permisos con PostgreSQL embebido (dependencia de desarrollo, no necesaria para publicar):

```powershell
$testDeps = Join-Path $env:TEMP 'password-competition-test-deps'
npm install --prefix $testDeps --no-audit --no-fund --ignore-scripts @electric-sql/pglite@0.3.14
node competencias/tests/database.mjs "$testDeps/node_modules"
```

Esta prueba simula `auth.uid()` y roles. No verifica Auth, Realtime ni concurrencia de solicitudes en un proyecto Supabase real.

Después de configurar Supabase, verificar manualmente desde dos dispositivos:

1. Registro, mismo nombre en victoria/ranking, recuperación después de recargar y mismo participante al volver.
2. Abandono sin consumo; dos victorias, mejora de marca, cooldown y rechazo de una tercera.
3. Reintento con la conexión cortada y recarga de victoria sin duplicar resultados.
4. Ranking que cambia en el proyector, reconexión y respaldo.
5. Cierre durante una partida y recuperación de resultados que ya estaban confirmados.
6. Competencia nueva vacía e historial anterior intacto; visitante sin permisos administrativos.
7. Dos pestañas enviando resultados: el máximo debe mantenerse. Dos activaciones simultáneas: sólo una puede ganar.
8. Las ocho actividades libres, reglas, victoria, imagen descargable y cooldown siguen funcionando.
9. Probar desde la URL publicada y un celular. Las pruebas locales no sustituyen esta validación.

No se declara completada la integración con Supabase hasta ejecutar estas pruebas con el proyecto configurado.

## Caracteres y contraseña en el ranking

El ranking muestra la cantidad de caracteres y la contraseña **de la mejor marca** de cada participante. El texto completo aparece difuminado; se revela al pasar el mouse por encima o con el botón “Mostrar contraseña” (también funciona con teclado y en celulares). El botón permite volver a ocultarla. No se recorta el texto.

Para habilitar el guardado, ejecutar una vez `competencias/sql/002_result_details.sql` en SQL Editor de Supabase, después del esquema inicial. En instalaciones existentes **no volver a ejecutar 001**. Los resultados viejos muestran “No disponible”: no es posible recuperar contraseñas que nunca se enviaron. Hasta aplicar 002, se siguen registrando los tiempos con el procedimiento anterior; los detalles quedan pendientes en el dispositivo y se pueden reintentar desde la victoria.

El difuminado es únicamente visual: estas soluciones del juego son públicas en el ranking y no deben ser contraseñas reales de cuentas. El contador mantiene el mismo criterio del juego (`String.length`, unidades UTF-16). Un resultado más lento no reemplaza el texto de la mejor marca; si mejora, se actualizan juntos el tiempo, contador y contraseña.
