# Plan · JOS-67 — Fecha de contacto acordada: modelo de datos y precedencia en el motor

**Milestone:** M11 · Fecha de Contacto Acordada · **Bocado A de 4** (JOS-67; luego JOS-68, JOS-69, JOS-70)
**Alcance:** solo backend. Ninguna pantalla cambia en este bocado.
**Rama:** `joseramonlc/jos-67-fecha-de-contacto-acordada-modelo-de-datos-y-precedencia-en`

**Revisión 2** — la rev. 1 recibió **GO condicionado** de auditoría, con dos condiciones mayores y tres menores. Todas incorporadas antes de escribir código:

| Punto de la auditoría | Dónde se resuelve |
| --- | --- |
| Mayor 1 · fijar en etapa terminal rompería el contrato de JOS-8 | §3.4.a — se rechaza con `VALIDATION_ERROR`, con test |
| Mayor 2 · «quitar» debe restaurar la fecha automática, no solo borrar la marca | §3.4.b — recalcula con el motor y lo escribe |
| Riesgo no verificable · «acuerdo activo» debe ser un estado consistente | §3.5.b — `acuerdoActivo()` exige booleano **y** fecha; lo anómalo cae al motor |
| Menor · las proyecciones agregadas no llevan el flag | §6.b — explicitado |
| Menor · tests de «sin sesión» en las dos mutations nuevas | §6.b — añadidos |
| Menor · la deuda de `constants.ts` en commit aparte | §6.b — commit separado |

Resultados de la ejecución: `docs/auditoria/JOS-67-gates.txt`.

---

## 1. Contexto

Hoy la fecha del próximo seguimiento la calcula **siempre** el motor a partir de la etapa (JOS-8). Cuando un prospecto acuerda explícitamente otra cosa —«llámame el jueves 15», «mejor en dos semanas porque me voy de viaje»— ese acuerdo solo queda como texto libre y **no dispara nada**: un prospecto en *Presentación realizada* reaparece en la Actividad Diaria a los 5 días aunque haya pedido dos semanas.

JOS-67 añade el soporte de backend para que una fecha fijada a mano **tenga precedencia** sobre el motor. Es la base de las otras tres tareas de M11, que sin esto no tienen sobre qué apoyarse.

**Por qué ahora:** el propio milestone avisa de que M11 debe ir **antes de M9 · QA**, porque JOS-28/29/30 prueban estos mismos flujos y habría que repetir parte del QA.

**Resultado esperado:** el motor sigue gobernando por defecto; la fecha acordada solo manda cuando el usuario la fija, y se consume al registrar la siguiente interacción.

---

## 2. Estado verificado del código

Comprobado leyendo el repo (no supuesto):

| Comprobación | Resultado |
| --- | --- |
| Batería de tests de partida | **42 ficheros en disco, 42 ejecutados, 439 tests, exit 0** — sin verdes falsos |
| Puntos de invocación del motor | Exactamente **3**, como dice la tarea: `prospectos.crear`, `interacciones.crear`, `prospectos.cambiarEtapa` |
| «Ya contacté» (JOS-23) | **No es un cuarto punto**: `actividad/page.tsx:114` solo hace `router.push` al formulario de registrar interacción. Hereda el comportamiento sin trabajo extra |
| Índice de la Actividad Diaria | `by_usuario_seguimiento` = `[usuarioId, fechaProximoSeguimiento]`. Escribir el acuerdo en ese mismo campo **no rompe el índice** y deja Actividad Diaria, Pipeline y Resumen sin tocar. La decisión de diseño de la tarea es correcta |
| Migración de datos | **No hace falta**: booleano opcional, ausencia = `false`, convención de «nulos por ausencia» ya vigente en el esquema |

---

## 3. Decisiones de diseño

### 3.1 El campo se llama `seguimientoManual` (no `seguimiento_manual`)

La tarea lo escribe en snake_case, pero **todo el esquema usa camelCase** (`fechaProximoSeguimiento`, `canalContactoPreferido`, `siguientePasoAcordado`). Se respeta la convención del repo.

### 3.2 La fecha acordada se normaliza a medianoche de `APP_TZ`

`convex/schema.ts:15-16` declara como invariante que `fechaProximoSeguimiento` **siempre** es una medianoche de Europe/Madrid calculada por el motor. Si se guardase la fecha acordada con la hora que venga del cliente, ese invariante dejaría de ser cierto y el cálculo de «días vencido» (`diffCalendarDays`) empezaría a depender de la hora.

Se normaliza reutilizando lo que ya existe en `convex/lib/fecha.ts`: `zonedMidnightToMs(civilDate(fecha, APP_TZ), APP_TZ)`.

### 3.3 «No puede estar en el pasado» se decide con el reloj del servidor

El mismo criterio que ya usa `validarFechaInteraccion` (`validacion.ts:154`), que compara contra `Date.now()` pasado desde el handler. El suelo es **la medianoche de hoy en APP_TZ**, de modo que *hoy* se acepta entero.

No se aplica el margen `FUTURO_MARGEN_MS`: ese margen existe para tolerar relojes de cliente adelantados al registrar algo que **ya ocurrió**; aquí el riesgo es el contrario y el suelo ya es generoso (la medianoche, no el instante actual).

### 3.4 Dos mutations, no una

La tarea deja abierto «PATCH nuevo o extensión del PATCH existente». Se proponen **dos mutations explícitas**:

- `fijarSeguimientoAcordado({ id, fecha })`
- `quitarSeguimientoAcordado({ id })`

**Motivo:** con una sola mutation y `fecha: v.optional(...)`, «no envío fecha» y «quiero quitar el acuerdo» serían indistinguibles. Además JOS-69 exige que quitar el acuerdo sea *«una acción visible, no escondida»* — dos mutations lo reflejan. No se toca `actualizar`, cuyo contrato («deja intactos etapa y fechas», test en `prospectos.api.test.ts:215`) sigue igual.

#### 3.4.a Fijar en etapa terminal se RECHAZA *(condición mayor 1 de la auditoría)*

En *Incorporado* y *Descartado* el contrato de JOS-8 es **«sin seguimiento»**. Si `fijarSeguimientoAcordado` aceptase una fecha ahí, ese prospecto **volvería a la Actividad Diaria** y contradiría al motor. La mutation comprueba la etapa **antes** de validar la fecha y lanza `VALIDATION_ERROR` (`field: "etapaActual"`). Con test.

#### 3.4.b Quitar RESTAURA la fecha automática *(condición mayor 2 de la auditoría)*

`quitarSeguimientoAcordado` **no se limita a borrar el booleano**: recalcula con `calcularFechaProximoSeguimiento(doc.etapaActual, doc.fechaUltimoContacto ?? doc.fechaAlta)` y escribe el resultado. En etapa terminal el motor devuelve `undefined` y la fecha queda ausente.

Sin esto quedaría **una fecha manual disfrazada de automática**: el usuario cree haber vuelto al cálculo del motor y la fecha sigue siendo la que él fijó.

### 3.5 ⚠️ Las etapas terminales deben limpiar **también** el booleano

**Este es el punto más delicado del bocado y no está en la tarea.**

La tarea dice que al pasar a *Incorporado* o *Descartado* se descarta el acuerdo y la fecha queda ausente. Si se borrase solo la fecha y el booleano quedase en `true`, se abriría esta trampa:

1. Prospecto con acuerdo activo → pasa a *Descartado* → se borra la fecha, `seguimientoManual` sigue `true`.
2. El usuario lo recupera y lo devuelve a *Contactado*.
3. La regla dice «con acuerdo activo no recalcules» → **no se recalcula nada**.
4. El prospecto se queda **sin fecha de seguimiento y con el motor desactivado**: nunca vuelve a aparecer en la Actividad Diaria, y la única salida es registrar una interacción.

Por eso el patch de etapa terminal borra **los dos campos**. Va con test dedicado.

### 3.5.b Un acuerdo solo está ACTIVO si están el booleano **y** la fecha

*(Riesgo señalado por la auditoría como no verificable hasta ver el diff.)*

La condición de precedencia es `seguimientoManual === true && fechaProximoSeguimiento !== undefined`, encapsulada en una función `acuerdoActivo()`. Un documento incoherente —booleano `true` sin fecha, que §3.5 hace imposible pero que podría llegar de datos antiguos o de una escritura manual— **no desactiva el motor**: cae a la rama de recálculo y de paso limpia el booleano. Va con test del caso anómalo.

### 3.6 Reutilización: `esTerminal` se sube a `lib/seguimiento.ts`

`prospectos.ts:150` tiene hoy una copia local de `esTerminal`. La nueva lógica de precedencia la necesita también, así que se mueve al motor (`lib/seguimiento.ts`) y `prospectos.ts` la importa. Una sola definición.

---

## 4. Comportamiento resultante

| Punto de invocación | Con acuerdo activo | Sin acuerdo |
| --- | --- | --- |
| **Alta** (`prospectos.crear`) | No aplica — en el alta no hay acuerdo posible | Sin cambios |
| **Registrar interacción** (`interacciones.crear`) | El contacto ya ocurrió: **se consume** el acuerdo (`seguimientoManual` se borra) y el motor recalcula | Sin cambios |
| **Cambio de etapa** (`prospectos.cambiarEtapa`) | **NO recalcula**: el acuerdo gana sobre la regla de etapa | Recalcula como hoy |
| **Cambio a etapa terminal** | Se descartan **fecha y booleano** (§3.5) | Se borra la fecha, como hoy |

---

## 5. Ficheros a modificar

### Backend

| Fichero | Cambio |
| --- | --- |
| `convex/schema.ts` | Campo `seguimientoManual: v.optional(v.boolean())` en `prospectos`. **Y corregir el comentario de las líneas 15-17**, que hoy afirma que `fechaProximoSeguimiento` «nunca» es editable por el usuario — esta tarea es justo la excepción |
| `convex/lib/seguimiento.ts` | `esTerminal` (movida desde `prospectos.ts`) y una función pura nueva `seguimientoTrasCambioEtapa(etapa, fechaReferenciaMs, actual)` que devuelve el patch de los dos campos. La precedencia queda en **un solo sitio**, testeable sin base de datos. `calcularFechaProximoSeguimiento` **no se toca** |
| `convex/lib/validacion.ts` | `fechaAcordadaValidada(fecha, ahoraMs): number` — número finito, normalización a medianoche APP_TZ, rechazo de fechas anteriores a hoy. Importa `fecha.ts` (sin ciclos: `fecha.ts` no importa nada) |
| `convex/lib/proyecciones.ts` | `seguimientoManual` en `prospectoPublicoValidator` y en `toProspectoPublico`, para que la UI de JOS-68/69 pueda distinguir los dos estados |
| `convex/prospectos.ts` | Las dos mutations nuevas (§3.4); `cambiarEtapa` pasa a usar el helper del motor; se elimina la copia local de `esTerminal` |
| `convex/interacciones.ts` | En el patch del prospecto, añadir `seguimientoManual: undefined` para consumir el acuerdo |
| `convex/lib/constants.ts` | **Deuda pendiente desde el 2026-08-04**: el comentario de `MAX_RESUMEN_INTERACCIONES` dice «500 → 29,8 %» cuando lo medido contra deployment real fue **33,9 %** (`docs/auditoria/JOS-24-e2e.md:9`). Quedó a la espera de «la próxima tarea que toque `convex/`», y esta lo es |

### Tests

| Fichero | Qué se añade |
| --- | --- |
| `convex/lib/seguimiento.test.ts` | La precedencia como función pura: con acuerdo no recalcula, sin acuerdo recalcula, etapa terminal borra los dos campos |
| `convex/prospectos.api.test.ts` | Fijar acuerdo; quitarlo y volver al automático; rechazo de fecha pasada; normalización a medianoche; cambio de etapa con acuerdo activo (no mueve la fecha); etapa terminal con acuerdo activo (§3.5); tenant ajeno → `NOT_FOUND` en las dos mutations nuevas |
| `convex/interacciones.test.ts` | Registrar interacción con acuerdo activo lo consume y recalcula |
| `convex/resumen.test.ts` | Re-medición del presupuesto (§6) |

---

## 6. ⚠️ El test de presupuesto de lectura se va a activar — y es su función

`convex/resumen.test.ts:414` mide el peor caso admisible del documento de prospecto y lo compara contra 1/3 del límite de 16 MiB. Su propio comentario avisa:

> «La guarda va a 1/3 del límite (5.592.405 B): quedan ~107 KB de holgura, un 2 %. Es deliberadamente estrecha — **cualquier campo nuevo en el documento de prospecto la rompe y obliga a volver a medir**, que es justo su función.»

Añadir `seguimientoManual` es exactamente ese caso. Lo que hay que hacer:

1. Añadir `seguimientoManual: true` a los fixtures del test — el peor caso admisible es **con** el campo presente, no sin él.
2. **Volver a medir ejecutando el test**, no estimando.
3. Actualizar el comentario con la cifra nueva.

**Estimación previa** (a confirmar con la medición real, que es la que manda): `,"seguimientoManual":true` son 25 B por documento × 1.201 documentos ≈ **30 KB** contra los ~107 KB de holgura. Debería entrar y dejar el total en ~32,9 %, pero **si la medición dice otra cosa, manda la medición** y habría que replantear la cota antes de seguir.

---

## 6.b Menores de la auditoría, incorporadas

- **Las proyecciones agregadas NO llevan el flag.** `actividadDiaria` (`prospectos.ts:97`) y `pipeline` (`prospectos.ts:132`) tienen proyecciones propias y **se quedan como están**: solo la proyección pública core (`toProspectoPublico`, que usan `obtener`/`listar`/las mutations) incorpora `seguimientoManual`. JOS-68/69 leen la ficha vía `obtener`, así que les basta. Queda escrito para que no se lea como olvido.
- **Tests de «sin sesión»** para las dos mutations nuevas, además de los de tenant ajeno.
- **La corrección del comentario de `constants.ts` va en su propio commit**, separado del resto, para que el diff quede quirúrgico como pide la auditoría sin perder la deuda pendiente desde el 2026-08-04.

---

## 7. Fuera de alcance (deliberadamente)

- **Cualquier pantalla.** El campo viaja en la API pero ninguna UI lo usa todavía.
- **El argumento de fecha acordada en `interacciones.crear`.** Es de JOS-68, junto con su campo en el formulario. Aquí solo se implementa el **consumo** del acuerdo.
- **El choque JOS-67 ↔ JOS-68** (registrar un contacto y fijar fecha nueva a la vez). La regla propuesta —*si el usuario escribe fecha nueva, esa manda; si lo deja vacío, se consume el acuerdo y el motor recalcula*— se decide y se implementa **en el plan de JOS-68**. Se deja anotado aquí para que la auditoría compruebe que este bocado no cierra esa puerta: no la cierra, porque el consumo y la fijación son escrituras independientes sobre los mismos dos campos.
- `convex/seed.ts`. Ningún escenario necesita acuerdos activos hasta que haya pantalla que los muestre (JOS-69).

---

## 8. Verificación

1. **`npm test`** — contrastar el recuento: deben seguir siendo **42 ficheros ejecutados** (no se crean ficheros de test nuevos, solo casos) y los tests deben subir de 439 a ~455. Un recuento de ficheros menor que 42 es verde falso, no éxito.
2. **`npm run lint`** — sin avisos nuevos.
3. **Medición del presupuesto** — anotar la cifra que devuelva el test de `resumen.test.ts` y compararla con la estimación de §6.
4. **Publicación del esquema contra deployment real** — `npx convex dev` y confirmar que el campo nuevo se publica sin error. Es lo mismo que se hizo en JOS-21 con el índice nuevo: `convex-test` no prueba que el cambio de esquema sea válido de verdad.
5. **Recorrido manual mínimo** (no necesita pantalla nueva; se hace con `npx convex run` sobre el deployment de desarrollo):
   - Fijar un acuerdo a 14 días y comprobar en `npx convex data prospectos` que `fechaProximoSeguimiento` cae en medianoche y `seguimientoManual` es `true`.
   - Cambiar la etapa y comprobar que **la fecha no se mueve**.
   - Registrar una interacción y comprobar que el acuerdo desaparece y la fecha vuelve a la del motor.
   - Intentar fijar una fecha de ayer y comprobar que se rechaza.
   - Pasar a *Descartado* y comprobar que **los dos campos** quedan ausentes (§3.5).

Arrancar el servidor con `npm run dev` normal: el `--webpack` ya no hace falta (comprobado hoy al cerrar JOS-6).

---

## 9. Después de este bocado

| Bocado | Tarea | Depende de |
| --- | --- | --- |
| B | JOS-68 — campo de fecha en Registrar Interacción | A |
| C | JOS-69 — fijar/quitar desde la Ficha, con los dos estados diferenciados | A |
| D | JOS-70 — enlace «Añadir a mi calendario» | De nada (solo lee una fecha que ya existe) |

Cada uno con su propio plan, su auditoría y su PR.
