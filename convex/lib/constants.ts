/**
 * Cota de lectura por sección de la Actividad Diaria (hoy / vencidos / completados).
 * Se lee MAX_ACTIVIDAD + 1 para detectar truncamiento; la UI presenta vista parcial
 * cuando se supera — nunca resultados truncados como completos.
 */
export const MAX_ACTIVIDAD = 500;

/** Vencidos visibles antes de expandir con "Ver todos". */
export const VENCIDOS_VISIBLES = 25;
