import { APP_TZ } from "../../../../../../../convex/lib/fecha";
import type { InteraccionPublica } from "../../../../../../../convex/lib/proyecciones";
import type { PillOption } from "@/components/ui";

export type TipoInteraccion = InteraccionPublica["tipo"];
export type ResultadoInteraccion = InteraccionPublica["resultado"];

/** Pills con icono para el tipo (JOS-61): un toque, sin dropdown. */
export const OPCIONES_TIPO: Array<PillOption<TipoInteraccion>> = [
  { value: "call", label: "Llamada", icon: "phone" },
  { value: "message", label: "Mensaje", icon: "message-circle" },
  { value: "meeting", label: "Reunión", icon: "calendar" },
];

/** Las 4 opciones de la API y JOS-16 (P4 de la rev. 2); tonos semánticos de JOS-61. */
export const OPCIONES_RESULTADO: Array<PillOption<ResultadoInteraccion>> = [
  { value: "interested", label: "Interesado", tone: "verde" },
  { value: "thinking", label: "Necesita pensar", tone: "ambar" },
  { value: "not_interested", label: "No interesado", tone: "slate" },
  { value: "other", label: "Otro", tone: "slate-suave" },
];

export const ERROR_TIPO_OBLIGATORIO = "Elige el tipo de contacto";
export const ERROR_FECHA_OBLIGATORIA = "La fecha es obligatoria";
export const ERROR_FECHA_FUTURA = "La fecha no puede ser futura";
export const ERROR_QUE_OCURRIO_OBLIGATORIO = "Cuenta qué ocurrió en el contacto";
export const ERROR_RESULTADO_OBLIGATORIO = "Elige un resultado";
export const BANNER_ERROR_RED = "No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.";

export const PLACEHOLDER_QUE_OCURRIO = "Resume brevemente qué pasó en este contacto...";
export const PLACEHOLDER_SIGUIENTE_PASO = "Ej: Enviarle el vídeo de presentación / Llamarle el jueves...";

/** Límite SOLO de cliente (P11): la API de M2, cerrada, no lo impone. */
export const MAX_QUE_OCURRIO = 500;

/** "lunes, 20 de julio" — fecha civil en Madrid, formato es-ES (design.md §1). */
export function formatearFechaEs(ms: number): string {
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: APP_TZ }).format(ms);
}

/**
 * Texto del toast (P8): el "cierre de bucle" de JOS-61 incluye el próximo
 * contacto que dejó fijado el motor; en etapas terminales no hay próximo.
 */
export function textoToast(fechaProximoSeguimiento?: number): string {
  if (fechaProximoSeguimiento === undefined) return "Interacción registrada";
  return `Interacción registrada, próximo contacto: ${formatearFechaEs(fechaProximoSeguimiento)}`;
}
