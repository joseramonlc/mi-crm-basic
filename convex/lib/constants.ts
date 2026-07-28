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
