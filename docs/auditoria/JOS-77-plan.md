# Plan · JOS-77 — Contador de ritmo exacto: «completados» sobre `interacciones`

**Milestone:** M6 · Actividad Diaria · **Prioridad:** Medium
**Alcance:** backend de lectura (`actividadDiaria`) + textos y tests de la pantalla Actividad. **Sin cambio de esquema ni de índices.**
**Rama:** `fix/jos-77-contador-ritmo-interacciones` (validada con `validar-rama-pr.sh`)
**Base:** `main` `a34b27f`

## 1. Punto de partida

`actividadDiaria` (`convex/prospectos.ts:114-148`) calcula `completados` contando prospectos cuyo `fechaUltimoContacto` cae en el día visible (índice `by_usuario_ultimo_contacto`) y marca el ritmo con `aproximado: true`. `textos.ts` añade «(aprox.)» al texto. Eso cuenta *contactos de hoy*, no *seguimientos cumplidos*: un contacto espontáneo suma igual. Además, `fechaUltimoContacto` es un dato derivado del prospecto y puede desviarse de la tabla `interacciones` (que sí es la fuente de verdad; las interacciones se borran de verdad con `ctx.db.delete`, `convex/interacciones.ts:226`).

## 2. Decisión de producto (tomada por el usuario)

**Opción B: `completados` = número de PROSPECTOS DISTINTOS con al menos una interacción cuya `fecha` cae en `[hoyInicio, mananaInicio)`.**

Descartadas:
- **A** (contar interacciones): 3 interacciones con la misma persona sumarían 3.
- **C** (solo prospectos que tenían seguimiento previsto hoy): es el «seguimiento cumplido» estricto, pero exige cruzar con una fecha de seguimiento que cambia al registrar la interacción y complica que `total = completados + pendientes` cuadre. Queda fuera de alcance; se puede abrir como issue aparte.

**Limitación conocida y aceptada de B:** un contacto espontáneo con alguien que no tocaba hoy SIGUE sumando. B corrige la desviación respecto a `interacciones` y el doble conteo, no esa semántica. La issue original la nombra como problema; esto debe quedar dicho en la nota de cierre de la issue, no ocultarse.

## 3. Cambios

### 3.1 `convex/prospectos.ts` — `actividadDiaria`
- Sustituir la lectura por `by_usuario_ultimo_contacto` por una lectura de `interacciones` con `by_usuario_fecha`: `q.eq("usuarioId", usuarioId).gte("fecha", hoyInicio).lt("fecha", mananaInicio)`, `.take(MAX_ACTIVIDAD + 1)`. Aislamiento por tenant garantizado por el prefijo del índice.
- `completados` = tamaño del `Set` de `prospectoId` entre las interacciones leídas, descartado el centinela: se procesan como máximo `MAX_ACTIVIDAD` interacciones.
- `completadosTruncados` = se leyeron más de `MAX_ACTIVIDAD` interacciones. Semántica: «hay más interacciones de las que se miraron», por lo que el texto «≥N» sigue siendo cierto (N es cota inferior de prospectos distintos).
- Eliminar `aproximado` del objeto `ritmo`. Reescribir el comentario de la línea 139.
- **No** se toca el índice `by_usuario_ultimo_contacto` en `schema.ts`: tras el cambio queda sin uso en código, pero quitarlo es un cambio de esquema que se despliega en producción y no es necesario aquí. Se anota como limpieza posible.

### 3.2 `src/app/(app)/actividad/textos.ts`
- Quitar `aproximado` de la interfaz `Ritmo`.
- ⚠ **Decisión (ronda 1, Mayor 1 del auditor; opción 1 elegida):** se elimina la fracción «N de M». `textoRitmo` pasa a mostrar DOS recuentos separados con unidades explícitas: `3 contactados hoy · 2 seguimientos pendientes para hoy`. Singular: `1 contactado hoy · 1 seguimiento pendiente para hoy`. Con truncamiento, «≥» prefija solo el recuento truncado: `≥500 contactados hoy · 2 seguimientos pendientes para hoy`. Se quita también « (aprox.)».
- ⚠ **Ronda 2 (Mayor 1 del auditor):** `pendientes` solo cuenta seguimientos programados para el día visible (`convex/prospectos.ts:106-112,135`); los vencidos van aparte (`page.tsx:138`). Sin «para hoy», con 0 para hoy y 3 vencidos se vería «0 seguimientos pendientes» sobre «Seguimientos vencidos (3)». Se añade «para hoy» al recuento de pendientes (ya reflejado en los ejemplos de arriba). Descartadas: «de hoy» (ambiguo con «contactados hoy», suena a que son los contactados) y mover los vencidos al recuento (cambia semántica y alcance).
- Descartadas: (2) mantener «N de M» restando de los pendientes los ya contados (deja de ser el total real previsto y sigue llamando «seguimiento» a un contacto espontáneo); (3) dejar la fracción como estaba (puede mostrar «1 de 2» con un solo prospecto).
- `total` (`convex/prospectos.ts:135`): se elimina de `ritmo` si solo lo usa el texto; si algo más lo consume, se mantiene en el contrato pero no se muestra. Verificar usos en la implementación.

### 3.3 `src/app/(app)/actividad/page.tsx`
- Reescribir el comentario de `LineaRitmo` (línea ~165): ya no es aproximado.

### 3.4 `convex/seed.ts` — SIN CAMBIOS (retirado en ronda 1)
- Se retira el cambio previsto: el escenario `populated` ya inserta en `interacciones` el contacto de hoy de Jorge Salas (`convex/seed.ts:170-174`), así que `completados: 1` se mantiene sin tocar el seed. `insertados` cuenta prospectos (`convex/seed.ts:343`, dentro del bucle por prospecto), no interacciones.
- Se conserva la expectativa `insertados: 7` del test (`convex/prospectos.test.ts:710`) y la de `ritmo` (`:717`). Si tras la implementación `completados` de `populated` deja de ser 1, es un fallo del cambio de `actividadDiaria`, no del seed.

## 4. Tests

Backend (`convex/prospectos.test.ts`), con un helper para insertar interacciones:
1. Una persona con 3 interacciones hoy cuenta **1**.
2. Dos personas con interacción hoy cuentan **2**.
3. Límites del día: interacción en `hoyInicio` (detecta un cambio accidental de `gte` a `gt`) y en `mananaInicio - 1` cuentan; en `mananaInicio` y en `hoyInicio - 1` no (ronda 2, sugerencia del auditor).
4. **Regresión clave:** un prospecto con `fechaUltimoContacto` hoy pero SIN interacciones hoy ya no cuenta.
5. Aislamiento por tenant: interacciones de otro `usuarioId` no cuentan.
6. Truncamiento con recuento exacto: `MAX_ACTIVIDAD + 1` (501) interacciones hoy, con `fecha` estrictamente crecientes para que el orden de lectura del índice sea determinista, de 501 prospectos distintos (el prospecto 501 aparece solo en la fila 501) → `completadosTruncados: true` y `completados === MAX_ACTIVIDAD` (aserción exacta, no `<=`, que también pasaría con 0).
7. Truncamiento con repetidos: 501 interacciones repartidas entre al menos 4 prospectos (respeta `MAX_INTERACCIONES_POR_PROSPECTO = 150`, `convex/lib/constants.ts:106`; 501/150 → mínimo 4) → `completadosTruncados: true` y `completados` = nº exacto de prospectos distintos entre las primeras 500 filas leídas (se calcula en el test a partir de los datos insertados).
8. `ritmo` ya no contiene `aproximado`.
8b. **Solapamiento (Mayor 1):** un prospecto con interacción hoy Y con seguimiento acordado para hoy cuenta en `completados` y en `pendientes`; el texto muestra ambos recuentos separados (`1 contactado hoy · 1 seguimiento pendiente para hoy`) sin fracción ni suma que sugiera progreso.
8c. **Solo vencidos (Mayor 1, ronda 2):** en `page.test.tsx`, payload con `hoy: []`, `ritmo.pendientes: 0` y 3 `vencidos`: la línea de ritmo muestra `0 contactados hoy · 0 seguimientos pendientes para hoy` junto a «Seguimientos vencidos (3)». Y en `textos.test.ts`, los casos singular/plural/truncado con el nuevo texto.
9. Borrado (integración): crear un prospecto con una interacción hoy, comprobar `completados: 1`, borrarlo con la mutación `eliminar` y volver a consultar → `completados: 0`. Cubre el efecto visible de la cascada (`convex/prospectos.ts:485`, `convex/lib/borrado.ts:21`).
Adaptar los tests existentes que construyen `completados` vía `fechaUltimoContacto` (líneas ~132, ~180, ~308, ~341) para que inserten interacciones.

Frontend: actualizar `textos.test.ts` y `page.test.tsx` (quitar `aproximado` y «(aprox.)» de los textos esperados).

## 5. Gates y criterio de cierre
`gates.sh JOS-77`: lint, unit y build en PASS. Criterios de la issue: `completados` sobre interacciones del día visible; `aproximado` eliminado y texto revisado; respeta `MAX_ACTIVIDAD` y el aislamiento por tenant.

## 6. Riesgos y preguntas para el auditor
1. **Prospecto borrado con interacciones huérfanas:** verificado en código (ronda 1): `prospectos.eliminar` (`convex/prospectos.ts:485`) comprueba pertenencia y elimina sus interacciones en la misma transacción (`convex/lib/borrado.ts:21`). Queda cubierto con el test 9. No se puede descartar que existan huérfanos históricos en producción (no verificable desde el código).
2. Con truncamiento y repetidos (test 7), ¿es honesto el «≥N»? Se defiende que sí (cota inferior).
3. ~~`total = completados + pendientes` mezcla recuentos que se solapan~~ — **Resuelto en ronda 1 (⚠, opción 1):** los dos recuentos se muestran por separado y no hay fracción; ver 3.2 y test 8b.
4. Impacto en producción: solo cambia una query; no hay migración ni cambio de esquema.
5. **Coste de lectura:** `actividadDiaria` hará tres lecturas acotadas a 501 filas (dos de prospectos, una de `interacciones`, cuyas filas se leen completas, con dos campos de texto de hasta `LONGITUD_MAX_TEXTO_INTERACCION`). En implementación, validar el tamaño combinado con las tres lecturas en 501 filas (el escenario `resumen` del seed ya trae 1.201 prospectos y 501 interacciones como base) y dejar el resultado anotado; si se acerca a un límite de Convex, se escala. Ronda 2 (sugerencia del auditor, incorporada): el seed `resumen` reparte las interacciones en 30 días y usa texto ASCII (`convex/seed.ts:285`), así que por sí solo subestima la lectura diaria. La medición debe preparar las tres lecturas a la vez en el mismo día (501 + 501 + 501 filas), con texto multibyte a `LONGITUD_MAX_TEXTO_INTERACCION`, y registrar los bytes de la query completa, incluida la consulta de existencia (`convex/prospectos.ts:91`), frente al límite de 16 MiB.
