/** Correspondencias de canal compartidas: desde M4 (bocado 1, P4) viven en src/lib/etiquetas.ts. */
export { OPCIONES_CANAL } from "@/lib/etiquetas";
export type { CanalContacto } from "@/lib/etiquetas";

/**
 * Se almacena la etiqueta española literal de JOS-15 (P3 de la rev. 2): el
 * campo es texto libre en la API por decisión cerrada de M2.
 */
export const OPCIONES_COMO_SE_CONOCIO = ["Referido", "Red social", "Evento", "Conocido", "Otro"];

export const ERROR_NOMBRE_OBLIGATORIO = "El nombre es obligatorio";
export const ERROR_EMAIL_FORMATO = "Email no válido";
export const ERROR_CANAL_OBLIGATORIO = "Elige un canal de contacto";
export const ERROR_COMO_OBLIGATORIO = "Indica cómo se le conoció";
export const BANNER_ERROR_RED = "No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.";

export const PLACEHOLDER_NOMBRE = "Nombre del prospecto";
export const PLACEHOLDER_NOTA = "Primera impresión, dónde se conoció, algo a recordar...";
