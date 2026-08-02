# PLAN JOS-23 — Acción rápida "Ya contacté" desde la Actividad Diaria

**Revisión 2** · corrige el NO-GO condicionado de la auditoría sobre la rev. 1
**Issue:** [JOS-23](https://linear.app/jose-lumbreras/issue/JOS-23/accion-rapida-ya-contacte-desde-la-actividad-diaria) · Milestone M6 · Prioridad Urgente
**Rama prevista:** `joseramonlc/jos-23-accion-rapida-ya-contacte-desde-la-actividad-diaria`
**Base:** `origin/master` = `61e9886`

---

## Respuesta a la auditoría de la rev. 1

| # | Hallazgo | Gravedad | Respuesta |
|---|---|---|---|
| 1 | El toast no debe depender de que existan tarjetas | Bloqueante | Corregido — §1 |
| 2 | Contradicción de contrato en el contador de ritmo | Mayor | Corregido — §2 |
| 3 | `?volver=actividad` sin open redirect | Observación | Confirmado y explicitado — §3 |
| 4 | Test: "Ya contacté" no debe disparar `onOpen` | Observación | Añadido — §3 |
| 5 | Base de la rama no verificable | Observación | Verificado contra el remoto — §0 |

---

## 0. Base de la rama (punto que la auditoría no pudo verificar)

Comprobado contra el remoto:

- `origin/master` = **61e9886**, y **sí contiene** el trabajo de JOS-21 (PR #4 fusionado).
- `master` **local** está en `9c5c479`, **2 commits por detrás**.
- El checkout actual está en la rama de JOS-21, como señalaba la auditoría.

**Acción antes de escribir una línea:** `git checkout master` → `git pull` (hasta `61e9886`) → crear la rama desde ahí. La rama **no** parte de la de JOS-21.

---

## 1. Corrección del bloqueante — ubicación del consumo del flash

Aceptada sin matices. El error de la rev. 1 era colgar el toast de `Actividad`, componente que solo se monta cuando hay tarjetas.

**Corrección:** el flash se consume en **`ActividadPage`**, el componente raíz de la pantalla, que se monta siempre. El toast se renderiza como hermano de `<Contenido>`, no dentro de él. Así aparece en los **cuatro** estados excluyentes que hoy resuelve `Contenido`:

| Estado | ¿Se ve el toast? |
|---|---|
| Cargando (`datos === undefined`) | Sí |
| Sin prospectos (`tieneProspectos: false`) | Sí |
| "¡Todo al día!" (listas vacías) | Sí — el caso límite señalado |
| Con actividad | Sí |

Se reutiliza el patrón exacto de la Ficha (`src/app/(app)/prospectos/[id]/page.tsx`): efecto de lectura única con guarda de `ref`, para que el doble montaje de Strict Mode no consuma un flash ya vacío y machaque el aviso con `null`.

**Tests que se añaden (los cuatro que pide la auditoría):**

1. Contactar al último prospecto pendiente → se renderiza "¡Todo al día!" **y** el toast.
2. Estado "sin prospectos" con flash pendiente → toast visible.
3. Estado de carga con flash pendiente → toast visible.
4. Doble montaje (Strict Mode) → el flash se consume **una sola vez** y el toast **no** desaparece en la segunda pasada.

---

## 2. Corrección del hallazgo de contrato — el contador de ritmo

Aceptada. Mantener el alcance sin tocar el comentario dejaría una entrega que el propio código declara incompleta.

### a) Issue nuevo en Linear que se queda con la deuda

> **Título:** Contador de ritmo exacto: calcular "completados" sobre `interacciones`, no sobre `fechaUltimoContacto`
>
> **Cuerpo:** Hoy `actividadDiaria` aproxima "completados" contando prospectos cuyo `fechaUltimoContacto` cae en el día visible, y lo marca con `aproximado: true`. Eso cuenta *contactos de hoy*, no *seguimientos planificados que se han cumplido*. El cálculo exacto requiere consultar `interacciones` del día. Separado de JOS-23, que solo añade la acción rápida.
>
> **Milestone:** M6 · Actividad Diaria — **Prioridad:** Media

Es administrativo (Linear), así que no pasa por auditoría; se crearía **después del GO y antes de programar**, para disponer del identificador real que va en el comentario. Si la auditoría prefiere no abrir issue, la alternativa es redactar los comentarios sin nombrar ninguna tarea.

### b) Reescritura de los dos comentarios que hoy apuntan a JOS-23

`convex/prospectos.ts:102-104` y `src/app/(app)/actividad/page.tsx:138` pasan a citar el issue nuevo y a decir explícitamente que JOS-23 **no** cambia este cálculo.

### c) Documentación del límite de alcance

En la descripción del PR y como comentario en el propio JOS-23, para que la aceptación no quede ambigua.

### Rectificación respecto a la rev. 1

La rev. 1 afirmaba "sin cambios en `convex/`". **Ya no es cierto:** se toca `convex/prospectos.ts`, pero **solo el bloque de comentario de las líneas 102-104**. Ni una línea de lógica, ni el esquema, ni la forma de los datos que devuelve la consulta. Se señala para que el diff no sorprenda.

---

## 3. Observaciones no bloqueantes, incorporadas

- **Sin open redirect:** la función que traduce el origen devuelve una de **dos rutas literales constantes** (`/actividad` o `/prospectos/{id}`). No concatena nada que venga de la URL: el parámetro solo se compara con el literal `"actividad"`; cualquier otro valor cae en el destino por defecto (la Ficha).
- **Test explícito añadido:** pulsar "Ya contacté" navega al formulario **y no dispara `onOpen`** (la ficha no se abre).
- **Pie de la tarjeta:** confirmado, `onContacted` va en la zona de pie (fuera del `<button>` de `ProspectCard.tsx:64-105`), sin anidamiento.
- **Suspense:** se mantiene, y la verificación no será "se ve bien en desarrollo" sino **`npm run build` en verde**.

---

## 4. Alcance final

### Qué existe ya (y por eso la rebanada es pequeña)

- La pantalla "Registrar interacción" ya vive dentro del prospecto (`/prospectos/[id]/interacciones/nueva`): el prospecto ya viene preseleccionado y su nombre ya sale en cabecera. El punto 3 del issue está cubierto de origen.
- El backend ya crea la interacción, actualiza `fechaUltimoContacto` y recalcula el seguimiento en la misma transacción (M2). **No hay lógica de backend que escribir.**
- `ProspectCard` ya tiene una fila de acciones al pie, hoy sin usar en ninguna pantalla.
- El mecanismo de mensaje flash entre pantallas ya existe y lo usa la Ficha.

### Cambio A — Botón "Ya contacté" en la tarjeta

`ProspectCard` recibe una prop **opcional** nueva (`onContacted`). Si se pasa, pinta al pie de la tarjeta un botón verde sólido a ancho completo con icono de check y el texto "Ya contacté", tal y como está en el prototipo navegable del diseño (botón `#16A34A`, alto 40, radio 10, icono `check`). El verde es el `--color-primary-500` del design system, no un color nuevo.

- Al ser opcional, **el Pipeline y el resto de pantallas no cambian** (no la pasan).
- Etiqueta accesible con el nombre ("Ya contacté con María") para distinguir tarjetas entre sí.
- Se pasa en **las dos secciones**: "Para hoy" y "Seguimientos vencidos".

### Cambio B — El formulario debe volver a Actividad, no a la Ficha

Hoy el formulario vuelve **siempre** a la Ficha, al guardar y al cancelar (contrato deliberado de M3: destino fijo, nunca `history.back()`).

Se añade un parámetro de URL con valor cerrado: `?volver=actividad`.

- Solo se acepta ese valor concreto; cualquier otro se ignora y se comporta como hoy.
- Afecta a los dos caminos de salida: **guardar** y **cancelar/flecha atrás**.
- Se mantiene `replace` (no `push`): el formulario no queda en el historial.
- Leer parámetros de URL en un componente cliente obliga, según la documentación de Next 16 incluida en el proyecto (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md`), a una barrera `Suspense`; sin ella funciona en desarrollo pero **la compilación de producción puede fallar**. Implica partir el fichero del formulario en envoltura + formulario.

*Alternativa descartada:* guardar el origen en almacenamiento de sesión (como el flash). No necesitaría `Suspense`, pero se pierde al recargar a medio formulario y es estado invisible.

### Cambio C — Confirmación al volver a Actividad

Ver §1.

### Lo que no hay que programar aunque el issue lo pida

Puntos 7 y 8 del issue — el prospecto desaparece de la lista y el contador sube — **salen gratis**: los datos de Convex son reactivos y la consulta se recalcula sola al crear la interacción. Solo hay que **comprobarlo**, no construirlo.

### Fuera de alcance

Cálculo exacto del contador (se va al issue nuevo) · botones de Llamar/WhatsApp en la tarjeta · JOS-24 (Dashboard, el enlace "Resumen" roto) · cualquier cambio en el Pipeline o la Ficha · JOS-74/75/76.

### Caso límite documentado, que no es un fallo

Si el usuario registra el contacto con **fecha de un día anterior**, al volver el prospecto puede **seguir apareciendo** como vencido y el contador de hoy no sube — porque el contacto no fue hoy. Es el comportamiento correcto del motor de seguimiento, aunque contradiga literalmente el punto 7 del issue. No se añade caso especial.

---

## 5. Ficheros que se tocan

| Fichero | Qué |
|---|---|
| `src/components/ui/ProspectCard.tsx` | Prop opcional `onContacted` + botón verde al pie |
| `src/components/ui/ProspectCard.test.tsx` | Tests de la prop nueva y de que sin ella nada cambia |
| `src/app/(app)/actividad/page.tsx` | Pasar la acción en ambas secciones · consumo del flash y toast **en el componente raíz** · comentario del ritmo |
| `src/app/(app)/actividad/page.test.tsx` | Tests de navegación y de toast en los cuatro estados |
| `src/app/(app)/prospectos/[id]/interacciones/nueva/page.tsx` | Partir en envoltura + formulario; destino de salida según el origen |
| `src/app/(app)/prospectos/[id]/interacciones/nueva/page.test.tsx` | Tests de los dos destinos (guardar y cancelar) |
| `src/lib/volver.ts` (nuevo) | Función única que traduce el parámetro a destino, testeada en un solo sitio |
| `convex/prospectos.ts` | **Solo comentario** (líneas 102-104) |

Sin cambios: esquema de datos, lógica de Convex, Pipeline, Ficha.

---

## 6. Verificación

1. Con la acción, la tarjeta muestra "Ya contacté"; **sin** la acción, la tarjeta queda idéntica a hoy (no-regresión del Pipeline).
2. Pulsar el botón navega a la ruta del formulario con el origen marcado, **y no dispara `onOpen`**.
3. Guardar con origen "actividad" vuelve a `/actividad`; sin origen, sigue volviendo a la Ficha (contrato de M3 intacto).
4. Cancelar respeta el mismo destino.
5. Toast visible en los cuatro estados de la pantalla, y consumido una sola vez bajo Strict Mode.
6. Un origen inventado en la URL se ignora y manda a la Ficha.
7. `npm run test` (los 237 existentes en verde + los nuevos) · `npm run lint` · `npm run build`.
