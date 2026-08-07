# Plan · JOS-69 — Fijar y quitar la fecha de contacto acordada desde la Ficha

**Milestone:** M11 · Fecha de Contacto Acordada · **Bocado C de 4** (JOS-67 y JOS-68 hechos; queda JOS-70)
**Alcance:** solo cliente. El servidor no se toca: las dos mutations existen desde JOS-67.
**Rama:** `joseramonlc/jos-69-fijar-y-quitar-la-fecha-de-contacto-acordada-desde-la-ficha`
**Base:** master `6b6a8f6` (merge de JOS-68).

**Veredicto de auditoría: GO con condiciones menores** (sin mayores). Las cuatro condiciones y el test extra se incorporaron antes de escribir código:

| Punto de la auditoría | Dónde se resuelve |
| --- | --- |
| El tercer parámetro de `textoToastEtapa` debe ser «acuerdo activo» (marca **y** fecha), no solo la marca | §3.1 — se delega en `acuerdoActivo()`, el predicado del backend, en vez de reimplementar la condición |
| El aviso del cambio de etapa debe leer `seguimientoManual` del prospecto DEVUELTO | §3.3 — los tres datos salen de la respuesta; test propio con la suscripción desfasada |
| Un rechazo por `etapaActual` no debe mostrarse como fallo de red | §3.2 — banner con texto propio, como en JOS-68 |
| Corregir el comentario de «SOLO lectura»; el esquema ya se corrigió en JOS-67 | §3.3 — corregido en `TarjetaSeguimiento` y en el título del describe de tests; servidor sin tocar |
| Test extra: marca sin fecha **no** debe decir «se mantiene por contacto acordado» | §4 — uno en `textos`/ficha y otro a nivel de componente |

---

## 1. Punto de partida

`prospectos.fijarSeguimientoAcordado` y `prospectos.quitarSeguimientoAcordado` están completas y probadas desde JOS-67: la primera valida y normaliza la fecha y rechaza etapas terminales; la segunda no borra la marca, **recalcula** con el motor y escribe el resultado. **Este bocado no añade ni cambia una línea de servidor.**

En la Ficha, `TarjetaSeguimiento` era solo lectura por la letra de JOS-17/JOS-18, que listaba `fechaProximoSeguimiento` entre los campos no editables. La Mejora #4 introduce la excepción a propósito, así que el comentario que lo afirmaba se corrige en vez de quedar contradiciendo al código.

## 2. Decisiones de diseño

**2.1 · Componente co-localizado, `SeguimientoAcordado.tsx`.** Es la convención de la ficha: cada pieza interactiva es un componente con sus tests (`EdicionDatos`, `SelectorEtapa`) y `page.tsx` solo orquesta mutación y aviso. El componente no conoce Convex: recibe `onFijar` y `onQuitar`.

**2.2 · Los dos estados se distinguen por etiqueta Y por una frase.** «Próximo seguimiento» + *«La calcula el sistema según la etapa»* frente a «Contacto acordado» + *«La acordaste tú con el prospecto»*. Una etiqueta que muta sola es fácil de no notar, y el riesgo declarado en la issue es exactamente ese.

**2.3 · Quitar es un botón visible.** Lo pide la issue. Con acuerdo: «Cambiar fecha» y «Volver al automático». Sin acuerdo: «Fijar contacto acordado».

**2.4 · En etapas terminales no se ofrece fijar** (mismo criterio que JOS-68: el servidor lo rechaza porque JOS-8 promete «sin seguimiento»). **Quitar sí sigue disponible** si hubiera un acuerdo colgando: esa mutation no rechaza y deja el estado coherente.

**2.5 · Sin estado optimista, con guarda de reentrada**, copiando el patrón ya probado del cambio de etapa. La fecha mostrada es siempre la del servidor.

**2.6 · La conversión día → milisegundos se comparte.** `fechaAcordadaAMs()` sale de la pantalla de JOS-68 a `src/lib/fechaAcordada.ts` y la importan las dos. Duplicarla garantizaría que un día solo una de las dos se arregle.

## 3. Cambios

**3.1 · `textos.ts`** — etiquetas, frases, textos de botón, errores y avisos. `textoToastEtapa` recibe un tercer parámetro y decide con **`acuerdoActivo()`**, importado del motor: exige marca y fecha, así que el documento anómalo (marca sin fecha) cae al texto normal, igual que en el backend cae a la rama del motor.

**3.2 · `SeguimientoAcordado.tsx`** (nuevo) — los dos estados, el selector con `min` = hoy, validación de fecha pasada con «hoy» recalculado al guardar, guarda de reentrada, y tres destinos de error distintos: `fecha` → inline; `etapaActual` → banner propio; resto → banner de red. Al abrir con acuerdo vigente precarga la fecha; sin acuerdo arranca vacío, porque proponer la del motor sería ponerle palabras en la boca al usuario.

**3.3 · `page.tsx`** — las dos mutations conectadas con el esqueleto de `manejarCambioEtapa`; el rechazo se re-lanza para que el componente conserve lo tecleado. El aviso del cambio de etapa pasa los tres datos del prospecto devuelto. `TarjetaSeguimiento` compone el componente nuevo y su comentario se corrige. `DatoFecha` se muda al componente nuevo (su dueño) y `page.tsx` la importa.

**3.4 · `src/lib/fechaAcordada.ts`** (nuevo) y la pantalla de JOS-68 pasa a importarla.

## 4. Tests (+24, +1 fichero)

**`SeguimientoAcordado.test.tsx` (19):** los dos estados con etiqueta y frase; el caso anómalo de marca sin fecha; qué acciones se ofrecen en cada estado; fijar (mediodía de Madrid, `min` = hoy, hoy aceptado, precarga, cancelar, sin fecha, doble activación); quitar (sin argumentos, sin optimismo); etapas terminales (no se ofrece fijar, quitar sigue); y los tres tipos de fallo del servidor.

**`page.test.tsx` (+5):** fijar y quitar llaman a su mutation y avisan; el cambio de etapa con acuerdo vigente dice que la fecha se mantiene; la marca sin fecha no presume acuerdo; y el aviso sale del prospecto devuelto aunque la suscripción vaya desfasada.

Un test existente se actualizó: fijaba la lista exacta de mutations de la ficha (2 → 4) y se le añadió la aserción explícita de que `interacciones:crear` sigue ausente, que es lo que de verdad protege.

## 5. Lo que NO hace

No toca el servidor. No entra en JOS-70, el bocado que cierra M11. No cambia Actividad Diaria, Pipeline ni Resumen.

## 6. Riesgo residual

El único cambio con alcance fuera de esta pantalla es mudar `fechaAcordadaAMs()`, que toca la pantalla de JOS-68 recién mergeada; sus tests la cubren y siguen verdes.

Resultados de la ejecución: `docs/auditoria/JOS-69-gates.txt`.
