import { formatearFechaEs } from "@/lib/etiquetas";

/** Correspondencias de dominio compartidas: desde M4 (bocado 1, P4) viven en src/lib/etiquetas.ts. */
export { OPCIONES_TIPO, OPCIONES_RESULTADO, formatearFechaEs } from "@/lib/etiquetas";
export type { TipoInteraccion, ResultadoInteraccion } from "@/lib/etiquetas";

export const ERROR_TIPO_OBLIGATORIO = "Elige el tipo de contacto";
export const ERROR_FECHA_OBLIGATORIA = "La fecha es obligatoria";
export const ERROR_FECHA_FUTURA = "La fecha no puede ser futura";
export const ERROR_QUE_OCURRIO_OBLIGATORIO = "Cuenta qué ocurrió en el contacto";
export const ERROR_RESULTADO_OBLIGATORIO = "Elige un resultado";
export const ERROR_FECHA_ACORDADA_PASADA = "La fecha acordada no puede estar en el pasado";
export const BANNER_ERROR_RED = "No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.";

/**
 * El servidor rechaza la fecha acordada en etapas terminales (JOS-68). La
 * pantalla oculta el campo en esas etapas, así que esto solo se ve en una
 * carrera: el prospecto pasó a incorporado o descartado con el formulario ya
 * abierto. Merece texto propio — el banner de red mandaría a comprobar la
 * conexión cuando el problema es otro y no se arregla reintentando.
 */
export const BANNER_ETAPA_TERMINAL =
  "Este prospecto ya no está activo, así que no admite un próximo contacto. Vuelve atrás y actualiza la pantalla.";

export const PLACEHOLDER_QUE_OCURRIO = "Resume brevemente qué pasó en este contacto...";
export const PLACEHOLDER_SIGUIENTE_PASO = "Ej: Enviarle el vídeo de presentación / Llamarle el jueves...";

/**
 * Textos de ayuda de las DOS fechas de la pantalla (JOS-68). Son simétricas y
 * significan lo contrario —una mira al pasado y la otra al futuro—, que es el
 * principal riesgo de UX de la tarea: las etiquetas solas no bastan.
 */
export const AYUDA_FECHA_CONTACTO = "Cuándo hablaste con el prospecto";
export const AYUDA_FECHA_ACORDADA = "Solo si habéis quedado en una fecha concreta. Si lo dejas vacío, la calculo yo";

/** Límite SOLO de cliente (P11): la API de M2, cerrada, no lo impone. */
export const MAX_QUE_OCURRIO = 500;

/**
 * Texto del toast (P8): el "cierre de bucle" de JOS-61 incluye el próximo
 * contacto que dejó fijado el motor; en etapas terminales no hay próximo.
 *
 * Con `acordado` (JOS-68) la fecha la puso el usuario, no el motor, y el texto lo
 * dice: confirma que su acuerdo quedó registrado en vez de atribuir la fecha a
 * un cálculo que no ha ocurrido.
 */
export function textoToast(fechaProximoSeguimiento?: number, acordado = false): string {
  if (fechaProximoSeguimiento === undefined) return "Interacción registrada";
  const etiqueta = acordado ? "contacto acordado" : "próximo contacto";
  return `Interacción registrada, ${etiqueta}: ${formatearFechaEs(fechaProximoSeguimiento)}`;
}
