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
 * interacciones. Sin cota, un historial arbitrariamente grande podría superar los
 * límites de transacción de Convex (16 MiB / 32.000 leídos / 16.000 escritos) y dejar
 * sin borrar datos personales justo en el peor caso. Se hace cumplir en
 * `interacciones.crear`, así que acota el crecimiento SOLO HACIA DELANTE. Eso, por sí
 * solo, NO garantiza los datos YA guardados (que pudieron crecer sin tope antes de
 * JOS-24/JOS-80): que la cascada quepa para el histórico EXISTENTE lo CERTIFICA el gate
 * de producción (auditoría de tamaños + medición real del borrado) ANTES de habilitar el
 * borrado; ver plan JOS-80 §4.2(b).
 *
 * El binding de la cascada es la ESCRITURA de documentos: borra N+1 (N interacciones +
 * el prospecto). Con margen ≤ 25 %: N+1 ≤ 0,25 × 16.000 = 4.000. Por bytes, con los
 * campos libres ya topados desde JOS-24 (2.000 car. × 2), cada interacción ronda ~4,5 KB,
 * así que 500 × 4,5 KB ≈ 2,2 MB de lectura ≈ 14 % del límite de 16 MiB. 500 queda
 * holgado por ambos lados y, como MAX_PIPELINE/MAX_RESUMEN_*, está fuera del alcance
 * realista de un networker individual (500 contactos registrados con UNA misma persona).
 *
 * ⚠️ VALOR PROVISIONAL: lo CONFIRMA el gate de producción de JOS-80 (auditoría de tamaños
 * reales + medición del borrado con `getTransactionMetrics()` en entorno desechable). Si la
 * medición mostrara el peor caso por encima del 25 % de cualquier límite, se baja este valor
 * ANTES de habilitar el borrado. El gate y su umbral viven en [ver plan JOS-80 §4.2(b)].
 */
export const MAX_INTERACCIONES_POR_PROSPECTO = 500;
