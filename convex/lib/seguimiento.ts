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
