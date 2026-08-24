/**
 * Cota de lectura por sección de la Actividad Diaria (hoy / vencidos / completados).
 * Se lee MAX_ACTIVIDAD + 1 para detectar truncamiento; la UI presenta vista parcial
 * cuando se supera — nunca resultados truncados como completos.
 */
export const MAX_ACTIVIDAD = 500;

/** Vencidos visibles antes de expandir con "Ver todos". */
export const VENCIDOS_VISIBLES = 25;

/**
 * Cota de lectura POR ETAPA del Pipeline (JOS-21), con el mismo centinela +1.
 *
 * 200 en una sola etapa queda fuera del alcance realista de un networker
 * individual, así que en la práctica el contador por etapa es EXACTO; el "200+"
 * es comportamiento defensivo, no el caso esperado.
 *
 * El valor está ACOPLADO a LONGITUD_MAX_NOTAS (JOS-74): la query lee documentos
 * completos contra el límite de 16 MiB de Convex, así que la cota por etapa y el
 * tope del campo libre no se pueden decidir por separado. Con 200 y notas de
 * 2.000 caracteres el peor caso —6 × 201 + 1 = 1.207 documentos (el +1 es el
 * `first()` de `tieneProspectos`), y es reactiva— se queda en ~19 % del límite.
 * MEDIDO contra deployment real el 2026-07-28 con las seis etapas saturadas:
 * 277 ms y 3,8 % del límite de documentos (docs/auditoria/JOS-21-e2e.md §3).
 * Subir cualquiera de los dos exige volver a medir; lo vigila el test
 * "presupuesto de lectura".
 */
export const MAX_PIPELINE = 200;

/** Tarjetas visibles por grupo del Pipeline antes de expandir con "Ver todos". */
export const PIPELINE_VISIBLES = 25;

/**
 * Cota TOTAL de prospectos leídos por el Resumen (JOS-24), con el mismo centinela +1.
 *
 * El Resumen hace UNA sola pasada sobre `by_usuario` y de ella deriva recuentos por
 * etapa, pendientes, nuevos del período y totales. Un único flag `exacto` gobierna
 * todo lo derivado: o todo es exacto o todo se declara parcial, nunca un conjunto
 * internamente inconsistente (p. ej. totales exactos con etapas truncadas).
 *
 * Se expresa como 6 × MAX_PIPELINE A PROPÓSITO, no como literal 1200: garantiza que
 * SIEMPRE que el Pipeline muestre recuentos exactos, el Resumen también. Dos pantallas
 * que cuentan lo mismo no pueden contradecirse. Al acotar por total y no por etapa, el
 * Resumen puede además ser exacto donde el Pipeline muestra "200+" — es más preciso,
 * no incoherente (lo fija el test "201 en una etapa, resto vacío").
 *
 * ACOPLADO a LONGITUD_MAX_NOTAS igual que MAX_PIPELINE: la query lee documentos
 * completos contra el límite de 16 MiB. Subir el tope de notas obliga a volver a medir
 * LAS DOS pantallas, no solo el Pipeline.
 */
export const MAX_RESUMEN_PROSPECTOS = 6 * MAX_PIPELINE;

/**
 * Cota de interacciones leídas por el Resumen dentro de la ventana del período.
 *
 * 500 en 30 días son ~17 contactos diarios sostenidos: fuera del alcance realista de un
 * networker individual, mismo razonamiento que MAX_PIPELINE. La lectura es DESCENDENTE
 * por fecha, de modo que al truncar se pierden los días MÁS ANTIGUOS y nunca los
 * recientes, que son los que el usuario mira.
 *
 * EL VALOR LO FIJÓ LA MEDICIÓN, no una estimación (docs/auditoria/JOS-24-e2e.md). El
 * Resumen es la primera pantalla que lee DOS tablas en la misma query, y ambas suman
 * contra el mismo límite de 16 MiB. Con MAX_RESUMEN_PROSPECTOS atado por coherencia al
 * Pipeline, esta cota es el único parámetro libre para conservar margen. Cifras
 * ESTIMADAS con las que se eligió el valor:
 *
 *   1.000 → 42,5 % del límite (margen 2,3×)   500 → 29,8 % (margen 3,4×)   300 → 24,7 % (4,1×)
 *
 * Decisión de producto (2026-08-03): 500. Recupera margen para añadir campos al
 * documento más adelante sin que la pantalla se declare parcial en uso realista.
 *
 * ⚠️ LO MEDIDO DESPUÉS CONTRA DEPLOYMENT REAL FUE PEOR que esa estimación: con 500 el
 * consumo real es del 33,9 %, no del 29,8 % (docs/auditoria/JOS-24-e2e.md — 1.702
 * documentos, 5.686.323 B, margen 2,95×). La decisión sigue siendo correcta y la
 * pantalla tiene holgura de sobra, pero al replantear esta cota hay que partir del
 * 33,9 %, no de la tabla de arriba. El peor caso ADMISIBLE lo vigila aparte el test
 * "presupuesto de lectura" de convex/resumen.test.ts, que se remidió en JOS-67.
 */
export const MAX_RESUMEN_INTERACCIONES = 500;

/**
 * Tope de interacciones por prospecto (JOS-80). NO es cosmético: acota la cascada de
 * `prospectos.eliminar`, que borra en UNA transacción el prospecto y TODAS sus
 * interacciones. Sin cota, un historial arbitrariamente grande podría superar los límites
 * de transacción de Convex (16 MiB leídos/escritos, 32.000/16.000 docs) y dejar sin borrar
 * datos personales justo en el peor caso. Se hace cumplir en `interacciones.crear`, así que
 * acota el crecimiento SOLO HACIA DELANTE; que la cascada quepa para el histórico EXISTENTE
 * lo CERTIFICÓ el gate de producción (auditoría de tamaños: máx. real = 1 interacción por
 * prospecto). Ver docs/auditoria/JOS-80-gate.md.
 *
 * VALOR FIJADO POR MEDICIÓN (gate de JOS-80, 2026-08-24; docs/auditoria/JOS-80-gate.md).
 * Dos hallazgos bajaron el valor desde los 500 provisionales:
 *  1. El binding NO es la escritura sino la LECTURA de bytes: Convex LEE CADA DOC DOS VECES
 *     al borrar (localizarlo por índice en `collect()` + lectura interna de `ctx.db.delete`),
 *     así que bytesRead ≈ 2× el contenido.
 *  2. Las validaciones acotan por `string.length`, NO por bytes (`validacion.ts`): un
 *     carácter BMP ocupa hasta 3 bytes UTF-8, luego el peor caso admisible pesa ~3× lo que
 *     sugeriría contar caracteres. Peor caso: interacción (2000+2000)×3 = 12 000 B;
 *     prospecto 2479×3 = 7 437 B.
 * Borrado real del peor caso medido: 500 → 72,91 % de bytesRead; 170 → 24,85 %;
 * **150 → 21,94 %** (margen ~3 puntos bajo el criterio de diseño ≤ 25 %). 150 es un techo de
 * seguridad muy por encima del uso realista; si alguien lo aproximara, el Trozo B de JOS-80
 * (borrar interacciones sueltas) es la vía de escape. Cambiar este valor —o los topes de
 * longitud de `validacion.ts`— obliga a REMEDIR el gate.
 */
export const MAX_INTERACCIONES_POR_PROSPECTO = 150;
