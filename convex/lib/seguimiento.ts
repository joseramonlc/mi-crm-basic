import { addCivilDays, civilDate, zonedMidnightToMs, APP_TZ } from "./fecha";

export type Etapa = "new" | "contacted" | "presented" | "evaluating" | "joined" | "discarded";

/**
 * Reglas del motor de seguimiento (JOS-8): días hasta el próximo contacto según
 * la etapa del pipeline. Configuración, no lógica — se ajusta aquí sin tocar el
 * motor. `null` = etapa terminal, sin seguimiento.
 */
export const SEGUIMIENTO_DIAS: Record<Etapa, number | null> = {
  new: 1,
  contacted: 3,
  presented: 5,
  evaluating: 7,
  joined: null,
  discarded: null,
};

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
