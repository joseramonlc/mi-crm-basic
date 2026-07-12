import { MAX_ACTIVIDAD } from "../../../../convex/lib/constants";
import { APP_TZ, diffCalendarDays } from "../../../../convex/lib/fecha";

/**
 * Texto exacto del aviso de truncamiento (JOS-22). Sin "primeros": el
 * truncamiento por take(N+1) no garantiza qué N filas se leyeron, así que
 * la UI nunca presenta la vista parcial como un prefijo ordenado del total.
 */
export const BANNER_VISTA_PARCIAL = `Mostrando una vista parcial de ${MAX_ACTIVIDAD} seguimientos; hay más.`;

export interface Ritmo {
  completados: number;
  pendientes: number;
  total: number;
  completadosTruncados: boolean;
  pendientesTruncados: boolean;
  aproximado: true;
}

/**
 * Línea de ritmo diario. Sin truncamiento: fracción "N de M". Con cualquier
 * cantidad truncada, la fracción sería ambigua — se listan las cantidades por
 * separado y "≥" prefija SOLO la cantidad cuyo flag está activo.
 */
export function textoRitmo(ritmo: Ritmo): string {
  if (!ritmo.completadosTruncados && !ritmo.pendientesTruncados) {
    const unidad = ritmo.total === 1 ? "seguimiento" : "seguimientos";
    return `${ritmo.completados} de ${ritmo.total} ${unidad} de hoy (aprox.)`;
  }
  const completados = `${ritmo.completadosTruncados ? "≥" : ""}${ritmo.completados} ${ritmo.completados === 1 ? "completado" : "completados"}`;
  const pendientes = `${ritmo.pendientesTruncados ? "≥" : ""}${ritmo.pendientes} ${ritmo.pendientes === 1 ? "pendiente" : "pendientes"}`;
  return `${completados} · ${pendientes} (aprox.)`;
}

/**
 * Antigüedad del último contacto relativa al día visible (hoyInicio), no al
 * reloj: puro sobre (fecha, dayKey), coherente con el diasVencido del servidor.
 * "Fecha por validar": un último contacto en el futuro es un dato sospechoso
 * (las mutations de JOS-13 lo impedirán); no se presenta como válido.
 */
export function formatTimeAgo(fechaUltimoContacto: number | undefined, hoyInicio: number): string {
  if (fechaUltimoContacto === undefined) return "Sin contacto aún";
  const dias = diffCalendarDays(fechaUltimoContacto, hoyInicio, APP_TZ);
  if (dias === 0) return "Hoy";
  if (dias < 0) return "Fecha por validar";
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}

/** Meta de la tarjeta de un vencido; diasVencido es siempre ≥ 1 (vencido = anterior a hoy). */
export function textoVencido(diasVencido: number): string {
  return diasVencido === 1 ? "Vencido hace 1 día" : `Vencido hace ${diasVencido} días`;
}
