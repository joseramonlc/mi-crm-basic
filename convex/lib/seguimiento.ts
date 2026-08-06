import { addCivilDays, civilDate, zonedMidnightToMs, APP_TZ } from "./fecha";
import { SEGUIMIENTO_DIAS, type Etapa } from "../config/seguimiento";

// La tabla de días por etapa (JOS-8) vive en convex/config/seguimiento.ts;
// se reexporta para que consumidores y tests sigan importando desde el motor.
export { SEGUIMIENTO_DIAS, type Etapa };

/**
 * Fecha del próximo seguimiento: medianoche (APP_TZ) del día resultante de sumar
 * los días de la etapa a la fecha de referencia (fechaUltimoContacto ?? fechaAlta,
 * según JOS-8). `undefined` para etapas terminales — el prospecto sale de la
 * Actividad Diaria.
 */
export function calcularFechaProximoSeguimiento(etapa: Etapa, fechaReferenciaMs: number): number | undefined {
  const dias = SEGUIMIENTO_DIAS[etapa];
  if (dias === null) return undefined;
  return zonedMidnightToMs(addCivilDays(civilDate(fechaReferenciaMs, APP_TZ), dias), APP_TZ);
}

/** Terminal = el motor no programa seguimiento (JOS-8): el prospecto sale de la Actividad Diaria. */
export function esTerminal(etapa: Etapa): boolean {
  return SEGUIMIENTO_DIAS[etapa] === null;
}

/* ── Precedencia de la fecha acordada (JOS-67) ────────────────────────────── */

/** Los dos campos de seguimiento de un prospecto, tal y como se leen y se escriben. */
export interface EstadoSeguimiento {
  fechaProximoSeguimiento?: number;
  seguimientoManual?: boolean;
}

/**
 * ¿Hay un acuerdo vigente? Exige los DOS campos, no solo el booleano.
 *
 * Un documento con `seguimientoManual: true` y sin fecha es incoherente y no
 * debería existir (el patch de etapa terminal limpia ambos), pero si llegase por
 * datos antiguos o una escritura manual, tratarlo como acuerdo activo dejaría el
 * prospecto SIN fecha y CON el motor desactivado: invisible en la Actividad
 * Diaria para siempre. Con esta condición, lo anómalo cae a la rama del motor.
 */
export function acuerdoActivo(estado: EstadoSeguimiento): boolean {
  return estado.seguimientoManual === true && estado.fechaProximoSeguimiento !== undefined;
}

/**
 * Estado de seguimiento resultante de un CAMBIO DE ETAPA (invocación 3 de
 * JOS-12, con la precedencia de JOS-67). Función pura: toda la regla vive aquí,
 * no repartida por los handlers.
 *
 * `undefined` en cualquiera de los dos campos significa ELIMINARLO en el patch
 * (convención de "nulos por ausencia" del esquema).
 *
 * Tres ramas, en este orden:
 *  1. Etapa terminal → se descarta TODO, también el acuerdo. Borrar solo la
 *     fecha y dejar el booleano colgado abriría esta trampa: al recuperar el
 *     prospecto hacia una etapa activa, la regla "con acuerdo no recalcules"
 *     lo dejaría sin fecha y sin motor, sin más salida que registrar una
 *     interacción.
 *  2. Acuerdo activo → la cita acordada con el prospecto GANA sobre la regla de
 *     la etapa: la fecha no se mueve.
 *  3. Resto → manda el motor, como hasta JOS-67.
 */
export function seguimientoTrasCambioEtapa(
  etapa: Etapa,
  fechaReferenciaMs: number,
  actual: EstadoSeguimiento,
): { fechaProximoSeguimiento: number | undefined; seguimientoManual: boolean | undefined } {
  if (esTerminal(etapa)) {
    return { fechaProximoSeguimiento: undefined, seguimientoManual: undefined };
  }
  if (acuerdoActivo(actual)) {
    return { fechaProximoSeguimiento: actual.fechaProximoSeguimiento, seguimientoManual: true };
  }
  return {
    fechaProximoSeguimiento: calcularFechaProximoSeguimiento(etapa, fechaReferenciaMs),
    seguimientoManual: undefined,
  };
}
