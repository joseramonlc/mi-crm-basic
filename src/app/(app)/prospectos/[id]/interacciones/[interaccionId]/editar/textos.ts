// Corregir interacción (JOS-80 Trozo B). Reutiliza los copys de campo del formulario de "Registrar
// interacción" (una sola fuente) y añade los propios de la pantalla de corrección. NO incluye la
// "fecha acordada": corregir una interacción no reabre el acuerdo, que se gestiona en la Ficha
// (JOS-69). Solo se editan los campos que la interacción ALMACENA.
export {
  OPCIONES_TIPO,
  OPCIONES_RESULTADO,
  ERROR_TIPO_OBLIGATORIO,
  ERROR_FECHA_OBLIGATORIA,
  ERROR_FECHA_FUTURA,
  ERROR_QUE_OCURRIO_OBLIGATORIO,
  ERROR_RESULTADO_OBLIGATORIO,
  BANNER_ERROR_RED,
  PLACEHOLDER_QUE_OCURRIO,
  PLACEHOLDER_SIGUIENTE_PASO,
  AYUDA_FECHA_CONTACTO,
  MAX_QUE_OCURRIO,
} from "../../nueva/textos";
export type { TipoInteraccion, ResultadoInteraccion } from "../../nueva/textos";

export const TITULO_CORREGIR = "Corregir interacción";
export const CARGANDO_INTERACCION = "Cargando interacción…";
export const GUARDAR_CAMBIOS = "Guardar cambios";
export const GUARDANDO = "Guardando…";
export const TOAST_CAMBIOS_GUARDADOS = "Cambios guardados";
export const NO_ENCONTRADA_TITULO = "No se ha encontrado";
export const NO_ENCONTRADA_DESC = "Esta interacción no existe o ya no está disponible.";
