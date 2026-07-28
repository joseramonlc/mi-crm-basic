# JOS-21 · Recorrido manual e2e y medición de latencia

> **Estado: EJECUTADO.** Este documento es el guión; los resultados se anotan en él. Cubre los **dos bloqueantes** del NO-GO de la auditoría de implementación (2026-07-27): la medición de latencia contra deployment real y el recorrido e2e.
>
> Fecha de ejecución: `2026-07-28` · Ejecutado por: `José Ramón Lumbreras` (cuenta `joseramonlc@gmail.com`, tenant `…|user_3Gp6HVzECaiWoQjla3Rqivm5aws`)
>
> **Bloque de comprobaciones funcionales (§2): 13/13 OK.** Las marcadas 📷 llevan **enlace a la captura**, archivada en [`JOS-21-e2e/`](./JOS-21-e2e/); el resto son reporte directo del ejecutante.

## Evidencia archivada

Capturas tomadas durante la ejecución y conservadas en el repositorio, para que la evidencia sea verificable por terceros y no dependa de la declaración del ejecutante (petición de la auditoría del 2026-07-28):

| Fichero | Qué acredita |
|---|---|
| [`01-movil-contactado-vencido-primero.png`](./JOS-21-e2e/01-movil-contactado-vencido-primero.png) | Comprobaciones **1, 3, 6, 8, 10, 12** — vista móvil con TabBar, "Contactado (3)", orden Molina→Vega→Gil, badge "Vencido", FAB |
| [`02-truncamiento-200mas-banner-vencidos.png`](./JOS-21-e2e/02-truncamiento-200mas-banner-vencidos.png) | Comprobaciones **14, 15, 16** — "Contactado (200+)", banner ámbar y los Prospecto 551/552/553 encabezando |
| [`03-boton-ver-todos-200.png`](./JOS-21-e2e/03-boton-ver-todos-200.png) | Comprobación **17** — el botón "Ver todos (200)" tras la tarjeta nº 25 exacta (551→575) |
| [`04-desktop-kanban-scroll-lateral.png`](./JOS-21-e2e/04-desktop-kanban-scroll-lateral.png) | Comprobación **11** y la **re-ejecución reactiva** — kanban en columnas con barra de scroll horizontal, ya repintado solo tras el re-seed |
| [`05-dashboard-errors-cero.png`](./JOS-21-e2e/05-dashboard-errors-cero.png) | Panel *Errors* plano en 0 durante toda la sesión |
| [`06-dashboard-latencia-frio-64ms.png`](./JOS-21-e2e/06-dashboard-latencia-frio-64ms.png) | **64 ms** p50/p90/p95/p99 con Cache Hit Rate **0 %** y 0 errores (ejecución en frío) |
| [`07-dashboard-latencia-caliente-1ms.png`](./JOS-21-e2e/07-dashboard-latencia-caliente-1ms.png) | **1 ms** p50…p99 con Cache Hit Rate **100 %** (ejecución cacheada) |
| [`08-peor-caso-seis-etapas-saturadas.png`](./JOS-21-e2e/08-peor-caso-seis-etapas-saturadas.png) | **2ª ronda** — las seis etapas en "(200+)" con banner, vencidos encabezando cada columna |
| [`09-logs-277ms-peor-caso.png`](./JOS-21-e2e/09-logs-277ms-peor-caso.png) | **2ª ronda** — pestaña *Logs* de la función: `17:17:27.490 success 277ms` (peor caso), el `failure 10ms` UNAUTHENTICATED previo y el `363ms` con 10 documentos |

---

## Ya verificado por el departamento de auditoría (2026-07-27)

Auditoría levantó el entorno y comprobó lo que se puede comprobar **sin sesión**. Estos puntos **no hay que repetirlos**:

| Comprobado | Resultado |
|---|---|
| Convex arranca y **publica el índice `by_usuario_etapa_seguimiento`** | ✅ — el cambio de esquema funciona contra un deployment real |
| Next 16.2.10 arranca con `--webpack` | ✅ |
| **`/prospectos` sin sesión → 307 hacia `/login`** | ✅ — **la ruta ya existe (se acabó el 404) y está protegida**. Cubre el punto 13 de la tabla de abajo |
| `/login` → 200 | ✅ |

**Por qué se detuvo ahí:** no dispone de sesión de Clerk autenticada ni de automatización de navegador, y **se negó a dar por bueno el e2e apoyándose en los tests mockeados**. Es la postura correcta.

**Consecuencia:** lo que queda solo lo puede hacer una persona con navegador y sesión iniciada. No es automatizable con lo que hay hoy en el proyecto.

También reportó un aviso de arranque: `createRouteMatcher` está deprecado en Clerk. **No es una regresión de JOS-21** (viene de JOS-66) y se ha registrado como **[JOS-75](https://linear.app/jose-lumbreras/issue/JOS-75/migrar-de-createroutematcher-a-comprobaciones-de-auth-por-recurso)**.

---

## 0. Preparar el entorno

⚠️ **Dropbox bloquea `.next`** y tumba el dev server con `EACCES: rmdir`. Hay que pausarlo antes (bandeja del sistema → avatar → Pausar sincronización).

```bash
rm -rf .next
npx concurrently -n next,convex -c blue,green "next dev --webpack" "convex dev"
```

⚠️ **Clerk en desarrollo solo carga en `localhost` / `127.0.0.1`**, NO en la IP de WSL (`172.21.179.77`). Abrir siempre `http://localhost:3000`.

`convex dev` empujará el **índice nuevo** `by_usuario_etapa_seguimiento` al deployment de desarrollo. Es aditivo y no requiere migración de datos.

### Obtener el `tokenIdentifier` (lo necesita el seed)

Con sesión iniciada en la app y al menos un prospecto creado:

```bash
npx convex data prospectos          # el campo usuarioId de cualquier fila
```

---

## 1. Sembrar el pipeline

⚠️ El seed **borra los prospectos e interacciones existentes de ese tenant** (limpieza atómica, por diseño desde JOS-22: garantiza que el escenario es reproducible). Auditoría se detuvo aquí por prudencia, y hace bien en no decidirlo por su cuenta.

**Quién puede ejecutarlo con tranquilidad:** el dueño de los datos. Se trata del deployment de **desarrollo** y de datos de prueba: los escenarios `populated`, `alDia` y `pipeline` los regeneran en un comando. Si hubiera algo en ese tenant que quieras conservar, sácalo antes con `npx convex data prospectos`.

```bash
npx convex run seed:seed '{"scenario":"pipeline","usuarioId":"<tokenIdentifier>"}'
```

Debe responder `insertados: 10`, repartidos por las 6 etapas.

---

## 2. Comprobaciones funcionales

| # | Qué comprobar | OK / KO | Notas |
|---|---|---|---|
| 1 | Pulsar **"Prospectos"** en la TabBar (móvil) abre la pantalla — antes daba **404** | ✅ [📷](./JOS-21-e2e/01-movil-contactado-vencido-primero.png) | La TabBar aparece al estrechar la ventana; "Prospectos" queda activo. Se acabó el 404 |
| 2 | Pulsar **"Prospectos"** en el Sidebar (desktop) hace lo mismo | ✅ | |
| 3 | Se ven las **6 secciones** con su contador entre paréntesis | ✅ [📷](./JOS-21-e2e/01-movil-contactado-vencido-primero.png) | "Contactado (3)" visible en captura |
| 4 | **Incorporado y Descartado** aparecen **plegados** de inicio | ✅ | |
| 5 | Pulsar una cabecera **pliega/despliega** y el chevron gira | ✅ | |
| 6 | En **Contactado** el prospecto **vencido sale el primero**, con badge rojo **"Vencido"** | ✅ [📷](./JOS-21-e2e/01-movil-contactado-vencido-primero.png) | **Orden exacto acreditado**: Andrés Molina ("Vencido hace 6 días" + badge) → Carlos Vega ("Hoy") → Sara Gil ("En 3 días"). Es la regresión que tumbó la 1ª auditoría: con el algoritmo antiguo Molina desaparecía de la pantalla |
| 7 | Los de etapas terminales muestran **"Sin seguimiento"** y **no** llevan badge | ✅ | Nuria Campos (joined) y Raúl Ortega (discarded) |
| 8 | La **etapa no se repite dentro de la tarjeta** (solo en la cabecera de sección) | ✅ [📷](./JOS-21-e2e/01-movil-contactado-vencido-primero.png) | En la tarjeta solo el punto de color; el texto "Contactado" está únicamente en la cabecera |
| 9 | Tocar una tarjeta abre la **ficha del prospecto correcto** | ✅ | |
| 10 | A **375 px** de ancho: lista vertical, una columna | ✅ [📷](./JOS-21-e2e/01-movil-contactado-vencido-primero.png) | Verificado estrechando la ventana del navegador (equivalente al breakpoint; no se usó el emulador de DevTools) |
| 11 | A **≥768 px**: kanban en horizontal, con **scroll lateral** | ✅ [📷](./JOS-21-e2e/04-desktop-kanban-scroll-lateral.png) | Confirmado que el desplazamiento lateral **alcanza las dos últimas columnas** (Incorporado y Descartado) |
| 12 | El botón **"+"** flotante sigue apareciendo en esta pantalla (móvil) | ✅ [📷](./JOS-21-e2e/01-movil-contactado-vencido-primero.png) | Observación menor, **no KO**: el FAB se solapa con la esquina inferior derecha de la última tarjeta y tapa su chevron ">". Comportamiento normal de un botón flotante; la tarjeta sigue siendo pulsable por el resto de su área |
| 13 | Con la sesión cerrada, `/prospectos` **redirige a login** | ✅ | Ya verificado por auditoría (307 → `/login`). No repetir |

---

## 3. Volumen, truncamiento y latencia (bloqueante 1)

```bash
npx convex run seed:seed '{"scenario":"volumen","usuarioId":"<tokenIdentifier>"}'
```

Inserta **600 prospectos en Contactado**, todos con `notas` al **tope máximo admisible** (2.000 caracteres, JOS-74) — es el documento más grande que las mutaciones permiten crear, así que ejercita el **peor caso real**, no uno cómodo. Los **50 vencidos se crean los últimos** a propósito: es el bloqueante de la 1ª auditoría reproducido a mano.

| # | Qué comprobar | OK / KO | Notas |
|---|---|---|---|
| 14 | La cabecera de Contactado muestra **"(200+)"**, no un número exacto | ✅ [📷](./JOS-21-e2e/02-truncamiento-200mas-banner-vencidos.png) | Literal "Contactado (200+)" con 600 documentos en la etapa |
| 15 | Aparece el **banner ámbar de vista parcial** | ✅ [📷](./JOS-21-e2e/02-truncamiento-200mas-banner-vencidos.png) | "Mostrando 200 prospectos de esta etapa; hay más." |
| 16 | ⭐ **Los vencidos siguen saliendo los primeros** pese al truncamiento | ✅ [📷](./JOS-21-e2e/02-truncamiento-200mas-banner-vencidos.png) | **Evidencia decisiva**: encabezan la lista "Prospecto 551, 552, 553…" (*Vencido hace 27 días* + badge). Son los **50 insertados en último lugar**; con el algoritmo de la rev.1 habrían quedado detrás de 550 y no se vería ninguno. También acredita que el truncamiento descarta a los **menos** urgentes, no a los más |
| 17 | "Ver todos" despliega y la pantalla **no se rompe ni se congela** | ✅ [📷](./JOS-21-e2e/03-boton-ver-todos-200.png) | El botón aparece tras la tarjeta nº 25 exacta (551→575 = `PIPELINE_VISIBLES`) rotulado "Ver todos (200)". Al pulsarlo despliega las 200 **con fluidez**, sin parones, pantalla en blanco ni error |

**Observación adicional (no del guión):** los nombres largos se truncan con elipsis dentro de la tarjeta en lugar de desbordar el layout.

### Medición de latencia

En el **dashboard de Convex → Functions → `prospectos:pipeline`**, anotar:

| Métrica | Valor medido | Umbral de referencia |
|---|---|---|
| Tiempo de ejecución **en frío** (cache hit rate 0 %) | **64 ms** (p50 = p90 = p95 = p99; 1 sola llamada en esa ventana) [📷](./JOS-21-e2e/06-dashboard-latencia-frio-64ms.png) | — |
| Tiempo de ejecución **en caliente** (cache hit rate 100 %) | **1 ms** (p50…p99) [📷](./JOS-21-e2e/07-dashboard-latencia-caliente-1ms.png) | — |
| **Documentos leídos** | **202** *(calculado, ver nota)* | límite **32.000** · peor caso **1.207** |
| **Bytes leídos** | **~0,5 MiB** *(calculado, ver nota)* | límite **16 MiB** · peor caso ~3,1 MiB (19 %) |
| ¿Algún error de límite excedido? | **NO** — panel *Errors* plano en 0 toda la sesión [📷](./JOS-21-e2e/05-dashboard-errors-cero.png) | debe ser **no** |

> **Corrección del peor caso teórico (auditoría 2026-07-28):** la columna de referencia arrastraba el **~1.206** del plan original, que contaba solo `6 × (MAX_PIPELINE + 1)`. El peor caso completo **suma el documento del `first()` de `tieneProspectos`**: `6 × 201 + 1 = ` **1.207**. El cálculo de la fila medida (202 = 201 + 1) sí lo incluía; la inconsistencia estaba únicamente en la columna de umbral, y queda corregida.

**Cómo se obtuvieron los valores.** Tiempos y errores: medidos en el dashboard de Convex (Functions → `prospectos:pipeline` → Statistics), deployment `adamant-mockingbird-816`, con los 600 documentos sembrados. **El dashboard no expone documentos ni bytes leídos por función**, así que esas dos filas son **cálculo, no medición**: 1 documento del `first()` de `tieneProspectos` + `MAX_PIPELINE + 1` = 201 de `contacted` + 0 en las otras cinco etapas (el escenario `volumen` solo puebla `contacted`) = **202**; a ~2,5 KB por documento (base real ~496 B + `notas` de 2.000 caracteres) ≈ **0,5 MiB**, un **3 %** del límite.

### Medición del peor caso REAL — seis etapas saturadas (2026-07-28, 2ª ronda)

**Motivo:** la auditoría del 2026-07-28 devolvió **NO-GO provisional** porque la medición de abajo satura una sola etapa y el peor caso de seis quedaba **extrapolado**, no medido. Se repitió la medición poblando las seis.

**Cómo se montó, sin tocar el repo.** Añadir un escenario a `convex/seed.ts` habría modificado un diff ya auditado, así que en su lugar se generó un fichero temporal de **1.260 documentos** (6 etapas × 210, `notas` a 2.000 caracteres, 50 vencidos por etapa creados los últimos) y se cargó con `npx convex import --table prospectos --append`. **Cero cambios en el código de la rama.** Con los 12 documentos previos, cada etapa quedó en 211–213, es decir **todas por encima de `MAX_PIPELINE + 1`**: las seis truncan y la query lee su tope.

| Métrica | Valor medido | Umbral |
|---|---|---|
| **Documentos leídos** | **1.207** = `6 × (MAX_PIPELINE + 1)` + 1 del `first()` | límite **32.000** — **3,8 %** |
| **Bytes leídos** | ~**3,1 MiB** (1.207 × ~2,5 KB) | límite **16 MiB** — **19 %** |
| ⭐ **Tiempo de ejecución en frío** | ⭐ **277 ms** (log `17:17:27.490 success 277ms`) | presupuesto **1 s** — margen **~3,6x** |
| Ejecución cacheada posterior | **cached** (`17:17:27.497`) | — |
| Errores de límite | **ninguno** | debe ser ninguno |

**Verificado visualmente**: las seis cabeceras muestran "(200+)" con su banner ámbar y los vencidos siguen encabezando cada etapa → [📷](./JOS-21-e2e/08-peor-caso-seis-etapas-saturadas.png).

**Dato que refuerza la conclusión:** en el mismo registro, la ejecución de `17:01:21.036` tardó **363 ms leyendo solo 10 documentos** — más que la de 1.207. El tiempo de esta query lo domina el **coste fijo y la varianza del entorno**, no el volumen leído. Multiplicar por 6 los documentos **no multiplicó el tiempo**, lo que invalida la preocupación de fondo de la extrapolación lineal: la secuencialidad de los seis `grupoDe` no es el factor determinante en este rango.

> **Conclusión: el bloqueante queda cerrado con medición real.** 277 ms contra un presupuesto de 1 s, 3,8 % del límite de documentos y 19 % del de bytes.

### Hallazgo adicional de esta 2ª ronda (no es de JOS-21)

En los logs aparece, **inmediatamente antes** de la ejecución buena, un fallo transitorio:

```
17:17:18.990   failure  10ms   Uncaught ConvexError: {"code":"UNAUTHENTICATED","message":"Se requiere sesión"}
```

Al recargar, el cliente de Convex dispara `pipeline` **una vez antes de que Clerk haya adjuntado el token**. La pantalla se recupera sola (la ejecución buena llega 8 s después) y el usuario no percibió nada, pero **el error se registra y cuenta en el panel *Errors***. No es una regresión de JOS-21 —es el patrón general Convex+Clerk— pero **JOS-21 añade un error boundary a esta ruta** (`src/app/(app)/prospectos/error.tsx`), así que conviene decidir si conviene envolver `AppShell` en `<Authenticated>`, que es justo la condición que el plan de JOS-66 dejó pendiente. **Se traslada al auditor como observación, no como corrección aplicada.**

---

> ⚠️ **Matiz de la 1ª ronda, ya superado por la medición de arriba: el peor caso medido aquí es de UNA etapa, no de las seis.** El escenario `volumen` satura `contacted` y deja las otras cinco vacías, así que los 64 ms corresponden a leer ~200 documentos grandes, no ~1.200. Y las seis etapas se consultan **en secuencia** (`await` encadenado en el literal de `grupos`, no `Promise.all`), luego el coste se **suma**. Extrapolando, el peor caso real —seis etapas saturadas con notas al tope— quedaría en el **orden de 300–400 ms**: sigue dentro del presupuesto de 1 s de Convex, pero con **menos holgura de la que sugiere el 3 % de bytes**. La cota de bytes (~3,1 MiB, 19 %) no se ve afectada por la secuencialidad y mantiene su margen de ~5x. **No medido; se deja anotado para que el criterio de aceptación se aplique con este dato delante.**

**Re-ejecución reactiva** (es el coste recurrente y el que de verdad importa): con `/prospectos` abierto, editar un prospecto desde otra pestaña y observar que la pantalla se actualiza sola.

| Métrica | Valor | |
|---|---|---|
| ¿Se actualiza sola la pantalla? | **SÍ** ✅ [📷](./JOS-21-e2e/04-desktop-kanban-scroll-lateral.png) | |
| Retardo percibido hasta ver el cambio | **Instantáneo, sin retardo perceptible** ✅ | Coherente con el 1 ms en caliente del dashboard |

**Cómo se probó.** Con `/prospectos` abierto, quieto y sin recargar, se ejecutó desde el CLI `seed:seed {scenario:"pipeline"}` sobre el mismo tenant (17:01:16 → 17:01:20), sustituyendo los 600 documentos por los 10 del escenario base. La pantalla **se repintó sola**, sin intervención: "Contactado (200+)" → "Contactado (3)", desaparición del banner de vista parcial y vuelta al reparto por las 6 etapas. La captura de este paso acredita además, en vista desktop, la **comprobación 11** (columnas en horizontal con barra de scroll lateral) y el orden por urgencia **en las tres etapas no terminales a la vez**: Iván Soler, Andrés Molina y Elena Prat —los tres vencidos— encabezan Nuevo, Contactado y Presentación realizada respectivamente.

> **Criterio de aceptación de la auditoría:** no se acepta la implementación si la medición supera los límites de lectura, de bytes, o da una latencia no razonable. Si algo se acerca, **baja `MAX_PIPELINE`** en `convex/lib/constants.ts` y se vuelve a medir (la constante está acoplada a `LONGITUD_MAX_NOTAS`, ver su docblock).

---

## 4. Limpieza

```bash
npx convex run seed:seed '{"scenario":"pipeline","usuarioId":"<tokenIdentifier>"}'   # deja datos usables
```

Y reanudar Dropbox.

---

## 5. Resultado

**Veredicto del recorrido: RECORRIDO COMPLETADO — 17/17 comprobaciones OK, 0 KO, 0 errores de límite.** Ejecutado el 2026-07-28 contra el deployment de desarrollo `adamant-mockingbird-816`, con sesión real de Clerk (`joseramonlc@gmail.com`).

Quedan cubiertos los **dos bloqueantes** del NO-GO de la auditoría de implementación del 2026-07-27:

1. **Recorrido e2e autenticado** → 17/17, con 6 de las comprobaciones acreditadas por captura de pantalla, incluida la crítica nº 16.
2. **Medición de latencia contra deployment real** → 64 ms en frío / 1 ms en caliente, 0 errores, ~202 documentos y ~0,5 MiB leídos.

**2ª ronda (2026-07-28, tras el NO-GO provisional de auditoría): peor caso REAL medido.** Con las **seis etapas saturadas** (1.207 documentos, ~3,1 MiB): **277 ms**, un **3,8 %** del límite de documentos y un **19 %** del de bytes, sin errores. La salvedad que motivó el NO-GO queda **resuelta con medición, no con extrapolación**; el montaje no requirió ningún cambio en el código de la rama (carga por `convex import`). Ver §3.

**Incidencias encontradas:**

```
Ninguna bloqueante. Dos observaciones menores, ambas para criterio del auditor:

1. El botón flotante "+" se solapa con la esquina inferior derecha de la última
   tarjeta visible y tapa su chevron ">". Comportamiento habitual de un FAB y la
   tarjeta sigue siendo pulsable por el resto de su área; se anota porque el
   criterio de la comprobación 12 mencionaba expresamente el solapamiento.

2. [RESUELTA en la 2ª ronda] El peor caso de latencia probado era de UNA etapa
   saturada. Se repitió con las SEIS saturadas (1.207 documentos): 277 ms, dentro
   del presupuesto de 1 s con ~3,6x de margen. Ya no hay extrapolación.

3. [NUEVA, no es de JOS-21] Al recargar la pantalla, `prospectos:pipeline` se
   ejecuta una vez SIN sesión y falla con UNAUTHENTICATED (10 ms) antes de que
   Clerk adjunte el token. Se recupera sola y no fue perceptible, pero el error
   se registra y cuenta en el panel Errors. Como JOS-21 añade un error boundary a
   esta ruta, procede decidir si se envuelve AppShell en <Authenticated> — la
   condición que el plan de JOS-66 dejó pendiente. Ver §3.
```

**Notas de ejecución**, por si hay que reproducirlo:

- La parte "móvil" **no se hizo con el emulador de DevTools**, sino **estrechando la ventana del navegador** hasta que el layout cambia de breakpoint y aparece la TabBar inferior. Es equivalente para lo que se comprueba aquí y bastante más simple de operar.
- Se confirma el aviso del guión: **desde un teléfono real no es posible** — Clerk en desarrollo solo carga en `localhost`/`127.0.0.1`, así que no hay forma de iniciar sesión desde la IP de WSL.
- El **CLI de Convex no sirve** para la medición: `npx convex logs` solo devuelve errores y salida de consola, no tiempos de ejecución. Hay que ir al dashboard (Functions → `prospectos:pipeline` → Statistics). Y ese panel **no expone documentos ni bytes leídos** por función.
