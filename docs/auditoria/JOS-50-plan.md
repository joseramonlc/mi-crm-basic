# Plan · JOS-50 — Campo `prioridad` en el modelo Prospecto y la API

**Milestone:** M10 · Prioridad de Prospectos · **Primer bocado de 5** (luego JOS-51, 52, 53, 54)
**Alcance:** modelo de datos y API. Ninguna pantalla.
**Rama:** `joseramonlc/jos-50-anadir-campo-prioridad-al-modelo-prospecto-y-a-la-api`
**Base:** master `5860972`.

**Veredicto de auditoría: GO con condiciones menores.** Las cinco condiciones y la corrección aritmética se incorporaron antes de escribir código:

| Punto de la auditoría | Dónde se resuelve |
| --- | --- |
| `prioridad` debe ser OBLIGATORIA en la proyección pública | §3.3 — lo es; `tsc` cazó el único fixture que la omitía |
| «medium» debe omitirse del documento, con test sobre el doc CRUDO | §3.4 y §5 — cuatro tests leen con `ctx.db.get`, no la proyección |
| El comentario de `actualizar` («solo datos de contacto y notas») quedaba falso | §3.4 — reescrito |
| El peor caso del presupuesto debe insertar `prioridad` explícita | §5 — con `"medium"`, la cadena más larga; razonado en el test |
| Ya existe `PriorityLevel = "high" \| "medium" \| "low"` en el kit | §3.1 — el validador usa esas claves y el comentario lo enlaza |
| La estimación de +23 KB era baja: son ~21 B/doc, ~25 KB | §5 — confirmado por medición real: +21 B exactos |

---

## 1. Qué pide y por qué es delicado

Marcar cada prospecto como Alta / Media / Baja, con Media por defecto. El motor de seguimiento dice *cuándo* contactar; la prioridad dirá *por quién empezar* cuando hay varios el mismo día. **El motor no se toca** — regla explícita de la tarea, con test que lo fija.

## 2. La decisión de fondo: no hay migración, y es a propósito

La tarea pide «añadir columna, default Media, migración reversible». En Convex eso sería un error: el esquema se valida contra los documentos existentes, así que un campo obligatorio haría que **todos los prospectos anteriores dejasen de cumplirlo y el despliegue se rechazara**.

La convención de la casa ya lo resuelve —*«Nulos por AUSENCIA, nunca null»*, escrito en el propio esquema— y `seguimientoManual` sentó el precedente el día anterior. Aquí: **campo opcional, ausente = "medium"**, y las mutations **omiten** ese valor en vez de escribirlo, de modo que la ausencia es la representación canónica del defecto. No hay migración que escribir ni que revertir; la vuelta atrás es quitar el campo del esquema.

## 3. Cambios

**3.1 · `schema.ts`** — validador `prioridadProspecto` con las claves `high`/`medium`/`low`, que son las de `PriorityLevel` en `src/components/ui/PriorityBadge.tsx`; ese componente ya existía en el kit anticipando este campo (*«matches Convex prospectos.prioridad»*) con sus etiquetas Alta/Media/Baja. El campo va opcional y **sin índice**: ordenar por prioridad se hará en memoria sobre lecturas ya acotadas, y un índice sobre un campo con ausencias complicaría los rangos. Esa decisión es de JOS-54, no de aquí.

**3.2 · `convex/lib/prioridad.ts`** (nuevo) — `prioridadDe()` (única traducción de ausencia → media) y `prioridadAPersistir()` (devuelve `undefined` para el defecto, lo que en un patch elimina el campo y en un insert lo omite).

**3.3 · `proyecciones.ts`** — `prioridad` **obligatoria** en la proyección pública y resuelta en el mapeador. La ausencia no cruza la API: si aquí fuera opcional, las cuatro pantallas de M10 reimplementarían la regla y acabaría duplicada por todo el cliente.

**3.4 · `prospectos.ts`** — `crear` y `actualizar` la aceptan; pedir «medium» escribe `undefined`, que borra el campo. No es un caso especial: es la misma mecánica que ya usan los opcionales de texto. El comentario obsoleto de `actualizar` queda corregido.

Los valores inválidos los rechaza el validador de argumentos de Convex antes del handler, con su formato de error y no con el `VALIDATION_ERROR` del contrato de M2 — exactamente lo que ya ocurre con etapa y canal. Se deja igual por coherencia.

## 4. Alcance

Solo modelo y API. Selector en el alta = JOS-51; en la ficha = JOS-52; indicador en el Pipeline = JOS-53; ordenación de la Actividad Diaria = JOS-54.

## 5. Presupuesto de lectura

Remedido de verdad: **2.832 B/prospecto** (+21 exactos), total **5.537.997 B = 33,0 %**, holgura **54.408 B (0,97 %)**. **Cabe, y no hizo falta rebajar `MAX_RESUMEN_INTERACCIONES`.**

Aviso dejado por escrito en el test: **caben dos campos escalares más, no tres.** El tercero obliga a rebajar el tope de interacciones del Resumen o a repensar qué lee.

Resultados completos: `docs/auditoria/JOS-50-gates.txt`.
