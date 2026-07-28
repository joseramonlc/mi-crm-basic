# Auditoría — JOS-21 · Pantalla Pipeline de Prospectos (plan de implementación)

| | |
|---|---|
| **Issue** | [JOS-21 · Pantalla Pipeline de Prospectos: vista agrupada por etapas](https://linear.app/jose-lumbreras/issue/JOS-21/pantalla-pipeline-de-prospectos-vista-agrupada-por-etapas) |
| **Milestone** | M5 · Pipeline de Prospectos (proyecto CRM-MVP) · prioridad High |
| **Rama** | `joseramonlc/jos-21-pantalla-pipeline-de-prospectos-vista-agrupada-por-etapas` (aún **no creada**; saldría de `master` `9c5c479`) |
| **Estado del código** | **Ninguno.** No se ha escrito una sola línea. Este documento es el diseño previo. |
| **Fecha del documento** | 2026-07-27 |
| **Revisión** | **rev. 2** — tras NO-GO condicional de la 1ª auditoría de plan |
| **Preparado para** | **Auditoría de plan** (el veredicto GO/NO-GO lo emite el departamento de auditoría, no el autor) |

> Este documento **describe lo que se pretende construir**, para su auditoría previa. No es un veredicto ni una implementación. Los apartados §9 y §10 separan **puntos que se someten expresamente a criterio de auditoría** de lo que **queda fuera de alcance**.

> ## Rev. 2 — respuesta al NO-GO condicional
>
> **Bloqueante (aceptado, era un fallo real del plan).** La rev. 1 leía por `by_usuario_etapa` y ordenaba por `fechaProximoSeguimiento` **después** del `.take()`. Ese índice no está ordenado por esa fecha, así que con más de `MAX_PIPELINE` prospectos en una etapa el corte se llevaba por delante a los más urgentes y la pantalla podía **ocultar vencidos** mostrando otros menos urgentes. La causa raíz era conceptual: el orden estaba en un `.sort()` posterior al corte en lugar de venir del índice.
>
> **Corrección:** se añade el índice `by_usuario_etapa_seguimiento` y **el orden pasa a ser nativo del índice, anterior al corte** (§3.3). El truncamiento descarta entonces los *menos* urgentes, que es lo que debe descartar. Se elimina el `.sort()` posterior y con él el uso de `antiguedad()` en esta pantalla — era justo la pieza que forzaba a ordenar después del corte.
>
> **Mayor 1 (contadores) — decisión de producto tomada por el usuario:** `MAX_PIPELINE = 500`, contador **exacto** por debajo del tope y `500+` con banner por encima (§3.2). Se descartó la tabla de contadores por coste/complejidad para el MVP.
>
> **Mayor 2 (tests):** se añade el test de regresión del caso exacto señalado —truncamiento con los más urgentes creados los últimos— y se especifica el desempate determinista (§3.3 y §8).
>
> **Mayor 3 (coste de lectura):** se añade medición explícita con datos voluminosos como paso de verificación, no como estimación de diseño (§8).

---

## 1. Propósito y alcance

`/prospectos` **ya está enlazada** en la navegación (`src/components/layout/nav.ts:2-6`, alimenta a la vez el Sidebar de desktop y la TabBar de móvil) pero **la ruta no existe**: hoy pulsar "Prospectos" devuelve un 404. Esta issue crea esa pantalla y cierra el milestone M5, cubriendo la función MVP 4 (gestión de etapas del proceso).

Es una de las dos pantallas del MVP que faltan; la otra es Resumen/Dashboard (JOS-24), también enlazada y también en 404 hoy.

**Alcance previsto:** 1 índice nuevo en el esquema, 1 query nueva de Convex, 1 ruta nueva de Next con 3 ficheros, 2 promociones a módulos compartidos, 2 props opcionales en un componente del design system. No toca autenticación, ni el aislamiento multi-tenant, ni el motor de seguimiento, ni ninguna mutación existente, ni la query `listar`.

---

## 2. Divergencia detectada entre la issue y el diseño de Fase 0

**Es el hallazgo principal de la fase de exploración y conviene que auditoría lo valide explícitamente.**

La issue JOS-21 y el diseño de Fase 0 **no describen la misma pantalla**:

| Fuente | Qué describe |
|---|---|
| **Issue JOS-21** | Vista agrupada en 6 secciones por etapa, con contador por etapa. Móvil: secciones colapsables. Desktop: kanban de columnas. |
| **Diseño Fase 0** (`Design/Evolucion Lider Design System descomprimido/ui_kits/crm-networker/screens.jsx:111-138`) | Lista **plana** con barra de chips de filtro (`Todos / Alta prioridad / Contactado / Nuevos / En valoración`). Sin agrupación ni contadores. |

`Design/design (3).md:99` confirma que "Pipeline (Prospectos, con filtros)" es la ruta `/prospectos`, es decir: ambas fuentes hablan de la misma pantalla.

**Decisión tomada (usuario, 2026-07-27): manda la issue.** Se implementa la vista agrupada por etapas; la barra de chips queda descartada para esta pantalla. Motivos:

1. La issue es la especificación funcional vigente y cubre la función MVP 4.
2. El chip "Alta prioridad" del diseño depende del campo `prioridad`, que **no existe** en el modelo de datos (JOS-50, milestone M10, sin hacer). El diseño no es implementable tal cual hoy.
3. La agrupación por 6 etapas que sí existe en el diseño corresponde a la pantalla **Resumen** ("Embudo por etapa", `screens.jsx:141-173`), que es otra issue (JOS-24).

**Consecuencia administrativa:** JOS-21 se actualizará en Linear para dejar constancia de esta divergencia y de la decisión, antes de programar (ver §7).

---

## 3. Backend — `convex/`

### 3.1 Por qué una query nueva y no la existente

La issue dice literalmente: *"`GET /prospectos` (sin filtro) para obtener todos los prospectos. El agrupamiento por etapa se hace en el frontend."*

Eso **no encaja con la arquitectura ya auditada del backend** (M2 rev. 4):

- `listar` (`convex/prospectos.ts:166-181`) pagina por cursor y `validarNumItems` fuerza `1 ≤ numItems ≤ 100` (`convex/lib/validacion.ts`). No existe forma de pedir "todos".
- Agrupar en cliente obligaría a paginar en bucle hasta agotar el cursor, y **los contadores por etapa solo reflejarían lo ya descargado**, no el total — justo el dato que la issue pide mostrar.

**Se propone una query `pipeline` server-side**, calcada del patrón ya auditado y en producción de `actividadDiaria` (`convex/prospectos.ts:50-118`). Es la segunda pantalla-agregado del proyecto y reutiliza el mismo contrato de truncamiento honesto.

**Se somete a auditoría** por ser una desviación explícita del texto de la issue (§9, punto A).

### 3.2 `convex/lib/constants.ts`

Añadir junto a `MAX_ACTIVIDAD = 500` y `VENCIDOS_VISIBLES = 25`:

- `MAX_PIPELINE = 500` — cota de lectura **por etapa**. Se leen `MAX_PIPELINE + 1` filas para detectar truncamiento (mismo mecanismo de centinela que `acotar()`, `convex/prospectos.ts:34-38`).
- `PIPELINE_VISIBLES = 25` — tarjetas visibles por grupo antes de "Ver todos".

**Por qué 500 y no 200 (decisión de producto del usuario, rev. 2).** 500 prospectos *en una sola etapa* está fuera del alcance realista de un networker individual, que es el usuario del MVP. En la práctica el tope no se alcanza y **el contador por etapa es siempre exacto**, que es lo que pide la issue. El `500+` queda como comportamiento defensivo y honesto, no como el caso esperado.

Contrapartida asumida y a medir (§8): el peor caso pasa de 6 × 201 = 1.206 a **6 × 501 = 3.006 documentos leídos por ejecución**, y esta query es **reactiva** — vuelve a correr con cada cambio en la tabla `prospectos`. Se verifica con datos voluminosos antes de dar por buena la constante.

> **Corrección posterior (auditoría 2026-07-28).** Las cifras de este párrafo son las que se manejaron al redactar el plan y se conservan como registro histórico, pero **omiten el documento del `first()` de `tieneProspectos`**: el peor caso con `MAX_PIPELINE = 200` es **1.207**, no 1.206. La constante acabó en 200 (no 500) y el peor caso quedó **medido en 277 ms** — ver `JOS-21-e2e.md` §3.

### 3.3 `convex/prospectos.ts` — query `pipeline`

**Args:** `{ dayKey: v.string() }`.

Igual que en `actividadDiaria`, el `dayKey` está por **reactividad, no por tenancy**: las queries de Convex re-corren cuando cambian los **datos**, no el reloj, así que el cliente pasa el día visible y lo renueva a medianoche. El handler queda **puro sobre `(dayKey, datos)`**, sin `Date.now()`. Hace falta para marcar "Vencido".

**Tenancy:** `requireUsuario(ctx)` como única fuente del tenant, igual que el resto. Ninguna función acepta `usuarioId` del cliente.

**Índice nuevo (única modificación del esquema).** En `convex/schema.ts`, tabla `prospectos`:

```ts
.index("by_usuario_etapa_seguimiento", ["usuarioId", "etapaActual", "fechaProximoSeguimiento"])
```

Mantiene el prefijo `usuarioId` como todos los demás (aislamiento por tenant). Es aditivo: `by_usuario_etapa` se conserva porque lo usa `listar`, que **no se toca**. Convex construye el índice sin migración de datos.

**Lectura y orden — el orden viene del ÍNDICE, antes del corte.** Este es el punto que corrige el bloqueante de la rev. 1. Para cada una de las 6 etapas:

```ts
ctx.db.query("prospectos")
  .withIndex("by_usuario_etapa_seguimiento", q => q.eq("usuarioId", usuarioId).eq("etapaActual", etapa))
  .order(esTerminal(etapa) ? "desc" : "asc")
  .take(MAX_PIPELINE + 1)
```

Con los dos primeros campos fijados por igualdad, el índice queda ordenado por `fechaProximoSeguimiento`. Por tanto **`.take()` ya devuelve las filas correctas**, y no hace falta —ni se hace— ningún `.sort()` posterior:

- **Etapas no terminales** (`new`, `contacted`, `presented`, `evaluating`) → **ascendente**: lo más vencido y lo más urgente primero. El truncamiento descarta **los menos urgentes**, que es exactamente lo que debe descartar. Un prospecto vencido ya no puede caerse del conjunto.
  Nota sobre ausentes: en Convex el campo ausente ordena **antes** que cualquier valor (mismo hecho que ya documenta `actividadDiaria` en `convex/prospectos.ts:62`), así que los no terminales sin fecha encabezarían el grupo. En la práctica el bloque está vacío: `calcularFechaProximoSeguimiento` solo devuelve `undefined` en etapas terminales, y tanto `crear` como `cambiarEtapa` recalculan la fecha. Queda como comportamiento defensivo coherente: una anomalía así merece verse arriba.
- **Etapas terminales** (`joined`, `discarded`) → **descendente**: nadie tiene `fechaProximoSeguimiento` (el motor la elimina), así que todas las filas empatan y el orden lo fija el desempate implícito: **las creadas más recientemente primero**. El truncamiento descarta las más antiguas, que es lo correcto para dos secciones de carácter archivístico y colapsadas por defecto.

**Desempate determinista (petición explícita de auditoría).** No queda al azar ni depende de nuestro código: Convex **añade `_creationTime` al final de todo índice** para garantizar un orden total. Verificado en las tipificaciones del SDK instalado — `node_modules/convex/dist/cjs-types/server/system_fields.d.ts:43`: *"Convex automatically appends `_creationTime` to the end of every index"*, tipo `IndexTiebreakerField`. Dos prospectos con idéntica `fechaProximoSeguimiento` resuelven siempre en el mismo orden, y ese orden es estable entre ejecuciones.

**Se elimina `antiguedad()` de esta pantalla.** Era la pieza que obligaba a ordenar después del corte y, con ello, la causa del bloqueante. `actividadDiaria` la sigue usando y **no se modifica**: allí el corte se aplica sobre rangos de fecha ya acotados por el índice `by_usuario_seguimiento`, así que su caso es distinto y correcto.

**Retorno:**

```ts
{
  dayKey: string,
  tieneProspectos: boolean,        // lo afirma el servidor, no una lista vacía
  grupos: Record<Etapa, {
    prospectos: ProspectoPipeline[],
    total: number,                 // filas leídas tras acotar
    truncado: boolean,
  }>,
}
```

**Proyección `ProspectoPipeline`** — interfaz propia de la pantalla, igual que `ProspectoActividad` y **no** `ProspectoPublico` (no se envían datos que la pantalla no pinta):
`id, nombre, etapaActual, canalContactoPreferido, fechaUltimoContacto?, fechaProximoSeguimiento?, diasVencido?`.

`diasVencido` se calcula con `diffCalendarDays(...)` **solo** cuando `fechaProximoSeguimiento < hoyInicio`.

**Honestidad de los contadores.** `total` es el número de filas leídas hasta el tope, **no un `count()` real** — Convex no ofrece conteo barato sin una tabla de contadores dedicada (descartada, §9-B). Con `MAX_PIPELINE = 500`, por debajo del tope el contador es **exacto**; al superarlo, `truncado === true` y la UI muestra `(500+)` con el banner de vista parcial. Se mantiene el contrato ya auditado en la Actividad Diaria: *nunca presentar un resultado truncado como completo*.

---

## 4. Design system — `src/components/ui/ProspectCard.tsx`

Única modificación a un componente compartido. Dos props opcionales, **retrocompatibles** (las dos llamadas de Actividad Diaria no cambian):

- **`showStage?: boolean`** (default `true`). El Pipeline lo pone a `false`: la sección o columna ya declara la etapa, y la etiqueta "Presentación realizada" desborda una columna estrecha del kanban.
- **`accessory?: React.ReactNode`** — slot en la fila de metadatos, tras `timeAgo`. El Pipeline pasa `<Badge tone="error">Vencido</Badge>` para la indicación de urgencia que pide la issue. El tono `error` ya existe (`src/components/ui/Badge.tsx:15`); no se añaden tokens de color.

Se descartó meter la lógica de seguimiento dentro de `ProspectCard` (sería dominio dentro de un componente de design system). El slot genérico deja la decisión en la pantalla.

`ProspectCard` **no tiene test hoy**. Se crea `src/components/ui/ProspectCard.test.tsx` cubriendo ambas props y el default retrocompatible.

---

## 5. Reutilización: dos promociones a módulos compartidos

Ambas piezas ya existen y están co-localizadas; el Pipeline las necesita idénticas. Se siguen las promociones que el propio código ya anticipaba en sus comentarios.

- **`OPCIONES_ETAPA` y `etiquetaEtapa`** — de `src/app/(app)/prospectos/[id]/textos.ts:81-92` a **`src/lib/etiquetas.ts`**, cuyo docblock ya se declara "única fuente de las etiquetas de producto de los enums de la API" y donde ya viven `OPCIONES_CANAL`, `OPCIONES_TIPO`, `OPCIONES_RESULTADO` y `formatearFechaEs`. El `textos.ts` de la ficha **re-exporta** lo que ya publicaba → **ningún consumidor cambia**. Es exactamente el patrón que ese fichero ya aplica hoy con las otras tres listas.
- **`useDayKey()`** — de `src/app/(app)/actividad/page.tsx:23-37` a **`src/lib/useDayKey.ts`**. Renueva el día a medianoche recomputando con `dayKeyToday` (no incrementando), lo que cubre suspensión del navegador y cambios de reloj. Actividad pasa a importarlo; sin cambio de comportamiento.

**No se promociona `SelectorEtapa.tsx`.** Su cabecera dice que subiría al kit "si el Pipeline de M5 lo necesita", y **no lo necesita**: desde el Pipeline no se cambia de etapa (la issue solo pide navegar a la ficha). Se deja donde está.

---

## 6. Frontend — ruta nueva `src/app/(app)/prospectos/`

### 6.1 Encaje en el shell (sin tocar navegación)

- `isRootRoute("/prospectos")` ya devuelve `true` → la pantalla hereda MobileHeader, TabBar y FAB "+" **sin cambios en `AppShell`**.
- `esFichaProspecto` usa `/^\/prospectos\/(?!nuevo$)[^/]+$/`, que **no casa** con `/prospectos` → no hay conflicto con la ficha.
- `src/proxy.ts` protege todo salvo `/login`, `/registro` y `/recuperar` → la ruta queda protegida automáticamente.
- `nav.ts` **no se toca**.

### 6.2 `page.tsx`

`"use client"` + `useQuery(api.prospectos.pipeline, { dayKey })`, con el payload tipado vía `FunctionReturnType` (nunca duplicado a mano). Estructura calcada de `actividad/page.tsx`:

**Estados excluyentes** en un componente `Contenido` separado:
1. Carga (`datos === undefined`) → `<p role="status">Cargando prospectos…</p>`.
2. Sin prospectos → `EmptyState` con `ctaHref="/prospectos/nuevo"`, apoyado en `datos.tieneProspectos` **del servidor** (no en listas vacías).
3. Contenido.

**Layout responsivo con un solo árbol de DOM.** Se descarta duplicar el árbol con `md:hidden` / `hidden md:flex` porque duplicaría cada tarjeta en el DOM y complicaría los tests. El contenedor de secciones es:

- móvil: `flex flex-col gap-6` → lista vertical;
- desktop: `md:flex-row md:items-start md:gap-4 md:overflow-x-auto`, con cada sección a `md:min-w-[280px] md:flex-none` → **kanban con scroll horizontal**.

El scroll horizontal es el comportamiento estándar de un kanban y evita el problema real de 6 columnas fijas: con el Sidebar de 224 px, en 1280 px cada columna quedaría en ~160 px, insuficiente para `ProspectCard`.

Contenedor de página: `mx-auto w-full max-w-2xl md:max-w-none px-4 py-6 md:px-6 md:py-8` — se mantiene `max-w-2xl` en móvil (coherente con Actividad) y se libera en desktop, que el kanban necesita a lo ancho.

**Secciones colapsables.** Cabecera `<button aria-expanded>` con título y contador. Estado local con `React.useState`. **`joined` y `discarded` arrancan colapsadas**, opción que la issue admite explícitamente porque son las secciones que se acumulan con el tiempo. El colapso funciona en ambos layouts.

**Corte por grupo** con `PIPELINE_VISIBLES` y botón `Ver todos (N)` — mismo patrón que "vencidos" en Actividad, expansión local sin refetch.

**Banner de vista parcial** cuando `truncado`, reutilizando el texto `BANNER_VISTA_PARCIAL` de `actividad/textos.ts`.

**Tarjetas:** `ProspectCard` con `showStage={false}`, `channel`, `lastInteraction` = texto de seguimiento, `accessory` = badge "Vencido" cuando proceda, y `onOpen` → `router.push('/prospectos/${p.id}')`.

### 6.3 `textos.ts` + `textos.test.ts`

Copy de la pantalla y formateadores **puros**, siguiendo `actividad/textos.ts`: título, textos de vacío por etapa y
`textoSeguimiento(fechaProximoSeguimiento, diasVencido, hoyInicio)` → `"Vencido hace 3 días"` / `"Hoy"` / `"En 5 días"` / `"Sin seguimiento"` (terminales).

### 6.4 `error.tsx` + `error.test.tsx`

Copia adaptada de `src/app/(app)/actividad/error.tsx` (contrato Next 16: props `error` + `unstable_retry`).

Nota de alcance: `[id]/` y `nuevo/` **ya tienen su propio `error.tsx`**, más cercano en el árbol, así que este boundary nuevo no altera el comportamiento de esas rutas.

---

## 7. Actualización de Linear (antes de programar)

JOS-21 se editará para que la spec cuadre con lo que se va a construir:

1. Sustituir *"`GET /prospectos` (sin filtro) … el agrupamiento por etapa se hace en el frontend"* por la query `pipeline` server-side, con el índice `by_usuario_etapa_seguimiento` que la sostiene, contadores por etapa y tope de lectura.
2. Dejar constancia de la divergencia con el diseño de Fase 0 (§2) y de que la vista agrupada es la que gana.
3. Añadir el criterio de aceptación que la rev. 1 no tenía y que destapó la auditoría: **con la lista truncada, ningún prospecto vencido puede quedar oculto** — el corte descarta los menos urgentes, nunca los más.

Es administrativo y no requiere GO de auditoría, pero se hará **antes** de escribir código para que el auditor de implementación lea una spec coherente.

---

## 8. Verificación prevista

**Gates automáticos** (los cuatro, como en JOS-71):

| Gate | Comando | Criterio |
|---|---|---|
| Tests | `npx vitest run --no-file-parallelism` | Todo verde. Secuencial es el **recuento fiable**: en paralelo el pool de workers da `Timeout waiting for worker to respond` por Dropbox + `/mnt/c` bajo WSL2. |
| Tipos | `npx tsc --noEmit` | Solo los **4 errores preexistentes** de `import.meta.glob`. |
| Lint | `npm run lint` | Limpio. |
| Build | `npm run build` | OK y la ruta `/prospectos` presente en el árbol de rutas. |

**Recorrido manual** con `next dev --webpack` sobre `http://localhost:3000` (⚠️ Clerk en dev **solo** carga en `localhost`/`127.0.0.1`, no en la IP de WSL):

1. Pulsar "Prospectos" en TabBar y en Sidebar → ya no 404.
2. Las 6 secciones con sus contadores; `joined` y `discarded` colapsadas de inicio.
3. Colapsar y expandir cada sección.
4. A 375 px: lista vertical. A ≥768 px: kanban con scroll horizontal.
5. Abrir una tarjeta → ficha correcta.
6. Un prospecto con seguimiento pasado muestra el badge "Vencido"; uno terminal no muestra fecha.

Si el escenario `populated` de `convex/seed.ts` no reparte prospectos por las 6 etapas (sus fixtures están pensados para Actividad Diaria), se extenderá para cubrirlas.

**Medición con datos voluminosos (mayor 3 de la auditoría).** No se da por buena la constante `MAX_PIPELINE = 500` sobre la estimación de diseño: se mide. Escenario `volumen` nuevo en `convex/seed.ts` que crea **600 prospectos en una sola etapa** (por encima del tope, para ejercitar el truncamiento real) y se comprueba:

1. Que la query **no supera los límites de lectura por ejecución de Convex** (documentos y bytes) — si los rozara, `MAX_PIPELINE` baja y se documenta el nuevo valor.
2. Latencia de la primera carga y de las **re-ejecuciones reactivas** al modificar un prospecto, que es el coste recurrente y el que de verdad importa en esta query.
3. Que la UI muestra `(500+)` y el banner de vista parcial, y que los vencidos siguen apareciendo arriba con el conjunto truncado.

El resultado de esta medición se incluirá en el documento de auditoría de implementación. Si obliga a cambiar la constante, se dirá explícitamente.

### Tests previstos

**Backend**, en `convex/prospectos.test.ts` (`// @vitest-environment edge-runtime`, `convexTest` + `withIdentity`):

1. Sin identidad → `UNAUTHENTICATED` sin tocar la base.
2. Aislamiento entre tenants con `dosTenants()`: el tenant B no ve prospectos de A en ningún grupo.
3. Formación de los 6 grupos y cuadre de contadores.
4. Orden en etapa no terminal: vencido antes que hoy, y hoy antes que futuro.
5. Orden en etapa terminal: creado más recientemente primero.
6. `diasVencido` presente solo en los anteriores a `hoyInicio`.
7. `tieneProspectos` en base vacía.
8. Truncamiento básico: con `MAX_PIPELINE + 1` filas, `truncado === true` y `prospectos.length === MAX_PIPELINE`.
9. **⭐ Regresión del bloqueante de la rev. 1 — el test que auditoría señaló como ausente.** En una etapa no terminal se insertan `MAX_PIPELINE + 50` prospectos **de forma que los más urgentes se creen los últimos**: primero el bloque de fechas de seguimiento lejanas, y después los vencidos. Con el algoritmo de la rev. 1 (leer por `by_usuario_etapa`, que ordena por `_creationTime`, y ordenar después del `.take()`) esos vencidos **quedarían fuera** del conjunto y el test fallaría. Se afirma que **todos los vencidos aparecen** en `prospectos` y que ocupan las primeras posiciones. Es el test que ata el índice: si alguien vuelve a leer por `by_usuario_etapa`, se rompe.
10. **Desempate determinista:** varios prospectos con idéntica `fechaProximoSeguimiento` → el orden devuelto es estable entre ejecuciones repetidas de la query y sigue `_creationTime`.

**Página**, en `src/app/(app)/prospectos/page.test.tsx` (`// @vitest-environment jsdom`, `vi.hoisted` + `vi.mock("convex/react")` + `vi.mock("next/navigation")`, fábricas de payload locales al fichero):
estado de carga; estado sin prospectos con CTA a `/prospectos/nuevo`; las 6 cabeceras con contador; `joined`/`discarded` con `aria-expanded="false"` de inicio y expansión al pulsar; etapa vacía sin romper el resto; click en tarjeta → `pushMock` con `/prospectos/{id}`; badge "Vencido" solo en vencidos; "Ver todos" al superar `PIPELINE_VISIBLES`.

---

## 9. Puntos sometidos a criterio de auditoría — estado en rev. 2

### Cerrados en esta revisión

**BLOQUEANTE — Selección bajo truncamiento (§3.3).** **Resuelto.** El orden pasa a ser nativo del índice `by_usuario_etapa_seguimiento` y por tanto **anterior al `.take()`**; se elimina el `.sort()` posterior. En etapas no terminales el truncamiento descarta los menos urgentes, nunca un vencido. Atado con el test de regresión nº 9 de §8, que falla contra el algoritmo de la rev. 1. Se declara además el desempate determinista, verificado en las tipificaciones del SDK instalado.

**B. Contadores exactos.** **Decidido por el usuario (producto):** `MAX_PIPELINE = 500`, contador exacto por debajo del tope y `500+` honesto por encima. Con ese tope el caso truncado queda fuera del alcance realista de un networker individual, así que el "contador por etapa" de la issue se cumple en la práctica. Se descarta la tabla de contadores por complejidad en el camino de escritura, riesgo de desincronización y necesidad de backfill (§3.2).

**Tests del caso crítico.** **Añadidos:** regresión de truncamiento con los más urgentes creados los últimos, y desempate determinista (§8, tests 9 y 10).

**C. Valor de `MAX_PIPELINE`.** **Ya no se justifica por estimación.** Se fija en 500 por decisión de producto y **se mide** con un escenario de 600 prospectos en una etapa: límites de lectura por query, latencia de carga inicial y de re-ejecución reactiva. Si la medición lo desaconseja, la constante baja y se documenta (§8).

### Siguen abiertos a criterio de auditoría

**A. Desviación del texto de la issue en la carga de datos (§3.1).** Query server-side en lugar del "agrupar en el frontend" que dice la issue. La 1ª auditoría la calificó de "desviación razonable, condicionada a actualizar Linear antes de programar"; el §7 recoge ese compromiso. Se mantiene como punto formal porque ahora además **añade un índice al esquema**, cosa que la rev. 1 no hacía.

**D. Kanban por scroll horizontal en desktop (§6.2).** Aceptado en la 1ª auditoría como decisión razonable. Sin cambios en rev. 2.

**E. Modificación de un componente compartido (§4).** Aceptado en la 1ª auditoría, condicionado a **cubrir el default en tests** — recogido en `ProspectCard.test.tsx` (§4). Sin cambios en rev. 2.

**F. Colapso persistente entre breakpoints (§6.2).** Efecto observable: una sección colapsada en móvil sigue colapsada al ensanchar la ventana. Se considera aceptable e incluso útil para `joined`/`discarded`. No fue objetado en la 1ª auditoría; se mantiene declarado.

**G. Coste del índice nuevo (§3.3, nuevo en rev. 2).** `by_usuario_etapa_seguimiento` es el quinto índice de `prospectos`. Añade amplificación de escritura en `crear`, `actualizar` y `cambiarEtapa`. Se considera menor frente a la corrección que compra, pero es un coste real que auditoría debería validar.

---

## 10. Fuera de alcance

- **JOS-53** (indicador visual de prioridad en las tarjetas del Pipeline, M10): depende de JOS-50, que no está hecho. `ProspectCard` seguirá recibiendo `priority="medium"` fijo, igual que en Actividad Diaria.
- **Barra de chips de filtro** del diseño de Fase 0: descartada para esta pantalla (§2).
- **Cambio de etapa desde el Pipeline** (drag & drop o selector): la issue solo pide navegar a la ficha.
- **JOS-24 / pantalla Resumen** (`/resumen`), que sigue en 404.
- **Pantalla de búsqueda o filtrado de prospectos**: no la pide la issue.

---

## 11. Proceso acordado

1. **Este plan** → departamento de auditoría.
2. Auditoría devuelve **GO / NO-GO**. Con NO-GO se revisa y vuelve a auditarse. **Sin GO no se escribe una línea de código.**
3. Con GO → actualización de Linear (§7) → rama nueva desde `master` actualizado → **implementación**.
4. El **código implementado vuelve a auditoría** (auditoría de implementación), con su propio GO.
5. **Commit local.**
6. **Push y PR solo con autorización expresa del usuario.** No se sube nada a GitHub por iniciativa propia, aunque los gates estén verdes y la auditoría haya dado GO.
7. **Merge del PR: lo hace el usuario.** Al fusionar, Railway despliega solo.
