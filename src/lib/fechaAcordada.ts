import { APP_TZ, ventanaDia } from "../../convex/lib/fecha";

/**
 * Día elegido en un `input[type=date]` (dayKey) → ms para las mutations de
 * contacto acordado (JOS-67).
 *
 * Siempre mediodía de Madrid: cae dentro del día civil correcto incluso en
 * cambios de horario de verano, y el servidor lo normaliza después a medianoche
 * de APP_TZ. No hay caso "hoy → ahora" —esa regla es de la fecha de la
 * interacción, que registra algo ya ocurrido—: esta apunta al futuro.
 *
 * Compartida por las DOS pantallas que fijan la fecha, «Registrar Interacción»
 * (JOS-68) y la Ficha (JOS-69): duplicarla sería garantizar que un día solo una
 * de las dos se arregle.
 */
export function fechaAcordadaAMs(dayKey: string): number {
  return ventanaDia(dayKey, APP_TZ).hoyInicio + 12 * 3_600_000;
}
