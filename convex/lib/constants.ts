/**
 * Identificador provisional del único usuario de la rebanada sólo-desarrollo.
 * Se fija en servidor; la query nunca lo acepta del cliente. Cuando JOS-5 decida
 * el proveedor de auth, este valor desaparece en favor de la identidad de sesión
 * (migración de datos asumida como deuda conocida).
 */
export const DEV_USUARIO_ID = "dev-user";

/**
 * Cota de lectura por sección de la Actividad Diaria (hoy / vencidos / completados).
 * Se lee MAX_ACTIVIDAD + 1 para detectar truncamiento; la UI presenta vista parcial
 * cuando se supera — nunca resultados truncados como completos.
 */
export const MAX_ACTIVIDAD = 500;

/** Vencidos visibles antes de expandir con "Ver todos". */
export const VENCIDOS_VISIBLES = 25;
