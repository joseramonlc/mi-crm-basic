# Plan · JOS-68 — Campo de fecha acordada en la pantalla «Registrar Interacción»

**Milestone:** M11 · Fecha de Contacto Acordada · **Bocado B de 4** (JOS-67 hecho; luego JOS-69, JOS-70)
**Alcance:** la mutation `interacciones.crear` y la pantalla `Registrar Interacción`. Ninguna pantalla de lectura cambia.
**Rama:** `joseramonlc/jos-68-campo-de-fecha-acordada-en-la-pantalla-registrar-interaccion`
**Bloqueante:** JOS-67 (Done, master `808960c`).

**Veredicto de auditoría: GO con condiciones menores** (sin mayores). Las cinco condiciones se incorporaron antes de escribir código:

| Punto de la auditoría | Dónde se resuelve |
| --- | --- |
| El rechazo por etapa terminal debe ir ANTES del insert | §3.2 — `fechaAcordadaDelRegistro()` se llama con el resto de validaciones, antes de `ctx.db.insert` |
| Reutilizar `esTerminal()` en vez de duplicar `joined`/`discarded` | §3.2 — se pregunta por la función, nunca por la lista de etapas |
| `Campo` debe incluir `"fechaAcordada"` y `ERROR_SERVIDOR` mapearlo | §4.2 — ambos, con test que exige el error bajo el campo correcto |
| El campo solo debe renderizarse con el prospecto ya cargado (sin parpadeo) | §4.3 — `permiteAcuerdo` exige `prospecto !== undefined`, con test propio |
| `field: "etapaActual"` caería al banner genérico de red | §4.4 — banner con texto propio (se eligió el mensaje específico sobre el simple test), con test |
| Test de carrera: no terminal al cargar, terminal al guardar | §5 — uno en backend y otro en la pantalla |

---

## 1. Punto de partida

JOS-67 dejó el backend listo: `seguimientoManual` en el esquema, `acuerdoActivo()` y la precedencia en el motor, y `fechaAcordadaValidada()` en `convex/lib/validacion.ts` (rechaza el pasado, normaliza a medianoche de `APP_TZ`). **Ni el esquema ni el motor se tocan en este bocado.**

La pantalla llama a una sola mutation, `interacciones.crear`, que hoy termina **consumiendo** el acuerdo (`seguimientoManual: undefined`): el contacto ya ocurrió, así que el motor vuelve a mandar. Ese es el punto exacto donde entra JOS-68 — si el usuario rellena la fecha nueva, en lugar de consumir el acuerdo se **fija uno nuevo**.

## 2. Las tres decisiones de diseño

**2.1 · La fecha viaja DENTRO de `interacciones.crear`.**
La alternativa —`crear` y después `prospectos.fijarSeguimientoAcordado`— se descarta: son dos transacciones, y un fallo de la segunda dejaría la interacción guardada y el acuerdo perdido, con el aviso de confirmación ya mostrado al usuario. JOS-11 exige que todo persista o nada.

**2.2 · Etapa terminal: el campo no se ofrece, y además el servidor lo rechaza.**
JOS-67 decidió que en `joined`/`discarded` no cabe un contacto acordado, pero sí se puede registrar una interacción sobre un prospecto ya cerrado. Sin hacer nada, el formulario permitiría crear justo lo que JOS-67 prohíbe. Dos capas: la pantalla oculta el campo y el servidor lo rechaza como última defensa.

**2.3 · El rechazo del servidor necesita `field` propio.**
`fechaAcordadaValidada()` etiquetaba su error como campo `"fecha"`, que en esta pantalla es **la fecha de la interacción**, con regla opuesta y con el texto «La fecha no puede ser futura» ya mapeado. Sin distinguirlas, un rechazo pintaría el campo equivocado con el mensaje contrario. Se resuelve con un tercer parámetro `campo` (por defecto `"fecha"`, así las llamadas de JOS-67 no cambian).

## 3. Backend

**3.1 · `convex/lib/validacion.ts`** — `fechaAcordadaValidada(fecha, ahoraMs, campo = "fecha")`. Un parámetro nuevo con valor por defecto; cero cambios de comportamiento para JOS-67.

**3.2 · `convex/interacciones.ts`** — argumento `fechaAcordada: v.optional(v.number())`. Toda la regla vive en una función auxiliar, `fechaAcordadaDelRegistro(fechaAcordada, etapa, ahoraMs)`, que devuelve la fecha normalizada o `undefined`, y que se invoca **junto al resto de validaciones, antes del insert**: la mutation es transaccional y el rollback lo cubriría igual, pero el contrato es más claro si no se escribe nada hasta que todos los argumentos son válidos. El rechazo terminal pregunta por `esTerminal()`, la fuente de verdad de `SEGUIMIENTO_DIAS`.

El patch del prospecto pasa a tener dos ramas: con acuerdo escribe `fechaProximoSeguimiento` = fecha acordada y `seguimientoManual: true`; sin acuerdo queda **exactamente el camino de hoy**, línea por línea.

Un solo `Date.now()` para las dos fechas: dos llamadas podrían caer a distinto lado de la medianoche y validarse contra días civiles distintos.

La interacción **no** guarda esta fecha: no describe el contacto que ocurrió, sino el que se pactó.

## 4. Pantalla

**4.1 · Textos** (`textos.ts`) — etiqueta «Próximo contacto acordado», error propio, banner propio de etapa terminal, y las **dos ayudas simétricas** que deshacen la ambigüedad que avisa la issue: «Cuándo hablaste con el prospecto» y «Solo si habéis quedado en una fecha concreta. Si lo dejas vacío, la calculo yo». La etiqueta del campo antiguo no se renombra.

**4.2 · Errores** — `Campo` incluye `"fechaAcordada"`; `ERROR_SERVIDOR` le da entrada propia (no comparte la de `fecha`).

**4.3 · Ubicación y visibilidad** — el campo va **el último, pegado a «Siguiente paso acordado»**: ese recoge el *qué* del acuerdo y este el *cuándo*, y quedan lo más lejos posible de la fecha de la interacción. Se renderiza solo con `prospecto !== undefined && !esTerminal(prospecto.etapaActual)`: con el prospecto aún cargando la etapa no se conoce, y pintarlo para esconderlo después daría un parpadeo.

**4.4 · Validación y envío** — `min` = hoy (espejo del `max` = hoy del otro campo); error inline si está en el pasado, con «hoy» recalculado al enviar por si cruzó la medianoche; no bloquea el botón por estar vacío, porque es opcional. Se envía el mediodía de Madrid del día elegido —dentro del día civil correcto incluso en cambios de DST— y el servidor lo normaliza a medianoche. Un `field` que no corresponde a ningún campo del formulario (`etapaActual`) va a un banner con texto propio: el de red mandaría a comprobar la conexión cuando el problema es otro y no se arregla reintentando.

**4.5 · Aviso al guardar** — con fecha puesta por el usuario dice «contacto acordado» en vez de «próximo contacto». Quién puso la fecha se lee del prospecto que devuelve el servidor, no de lo que el formulario creía enviar.

## 5. Tests (+16, ninguno fichero nuevo)

**Backend (8):** el acuerdo manda sobre el motor y se guarda a medianoche; «hoy» se acepta (el borde); sustituye un acuerdo anterior en vez de consumirlo; rechaza ayer / NaN / +Infinity / fuera del rango de `Date` con `field: "fechaAcordada"` y sin escribir nada; carrera con etapa terminal → rechazo con `field: "etapaActual"` y el prospecto intacto. El camino sin fecha acordada ya estaba cubierto por los tests de JOS-67, que siguen verdes sin tocarlos.

**Pantalla (8):** campo vacío por defecto con `min` = hoy y las dos ayudas presentes; sin rellenar, el envío no cambia; con fecha, viaja el mediodía y el aviso dice «contacto acordado»; fecha pasada → error **bajo su campo** (comprobado con `within`, no por texto suelto), botón bloqueado, sin llamar a la API; rechazo del servidor con `fechaAcordada` → se pinta en el campo acordado y **nunca** en la fecha de la interacción; en etapa terminal el campo no se ofrece; mientras carga tampoco; carrera con `etapaActual` → banner explicativo, no el de conexión.

## 6. Lo que este plan NO hace

Ver, cambiar o quitar la fecha acordada desde la Ficha del Prospecto: eso es **JOS-69**. Aquí solo se captura al registrar el contacto. Actividad Diaria, Pipeline y Resumen no se tocan: siguen leyendo `fechaProximoSeguimiento` sin saber quién la puso, que es justo el diseño de JOS-67.

## 7. Riesgo residual

El presupuesto de lectura de Convex no se mueve: no hay campos nuevos en el esquema ni consultas nuevas. La holgura sigue en el 1,4 % que dejó JOS-67, y M10 (`prioridad`) obligará a remedirla igualmente.

Resultados de la ejecución: `docs/auditoria/JOS-68-gates.txt`.
