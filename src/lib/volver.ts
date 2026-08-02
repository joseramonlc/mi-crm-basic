/**
 * Origen de la navegación al formulario "Registrar interacción" (JOS-23).
 *
 * El contrato rev. 2 de M3 fija un destino DETERMINISTA al salir del formulario
 * —al guardar y al cancelar—, nunca history.back(). La acción rápida "Ya
 * contacté" rompe la premisa de que ese destino sea único: quien entra desde la
 * Actividad Diaria debe volver a ella; quien entra desde la Ficha, a la Ficha.
 *
 * El origen viaja en la URL, no en sessionStorage, para que sobreviva a una
 * recarga con el formulario a medio rellenar. Pero NUNCA se usa para construir
 * la ruta: solo se compara con el literal ORIGEN_ACTIVIDAD, y cualquier otro
 * valor —o su ausencia— cae en el destino por defecto. Los dos destinos
 * posibles son constantes del código, así que no hay redirección abierta.
 */
export const PARAM_VOLVER = "volver";
export const ORIGEN_ACTIVIDAD = "actividad";
export const RUTA_ACTIVIDAD = "/actividad";

/** Ruta del formulario de interacción marcada para volver a la Actividad Diaria. */
export function rutaRegistrarDesdeActividad(prospectoId: string): string {
  return `/prospectos/${prospectoId}/interacciones/nueva?${PARAM_VOLVER}=${ORIGEN_ACTIVIDAD}`;
}

/**
 * Destino al salir del formulario. `origen` es el valor crudo del parámetro de
 * la URL: se compara, no se concatena.
 */
export function destinoAlSalir(origen: string | null | undefined, prospectoId: string): string {
  return origen === ORIGEN_ACTIVIDAD ? RUTA_ACTIVIDAD : `/prospectos/${prospectoId}`;
}
