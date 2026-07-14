import { formatearFechaEs } from "@/lib/etiquetas";

/** Correspondencias de dominio compartidas: desde M4 (bocado 1, P4) viven en src/lib/etiquetas.ts. */
export { OPCIONES_TIPO, OPCIONES_RESULTADO, formatearFechaEs } from "@/lib/etiquetas";
export type { TipoInteraccion, ResultadoInteraccion } from "@/lib/etiquetas";

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

/**
 * Texto del toast (P8): el "cierre de bucle" de JOS-61 incluye el próximo
 * contacto que dejó fijado el motor; en etapas terminales no hay próximo.
 */
export function textoToast(fechaProximoSeguimiento?: number): string {
  if (fechaProximoSeguimiento === undefined) return "Interacción registrada";
  return `Interacción registrada, próximo contacto: ${formatearFechaEs(fechaProximoSeguimiento)}`;
}
