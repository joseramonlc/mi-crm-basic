import { MAX_PIPELINE } from "../../../../convex/lib/constants";
import { APP_TZ, diffCalendarDays } from "../../../../convex/lib/fecha";
import type { Etapa } from "@/lib/etiquetas";

/* Copy y formateadores puros del Pipeline (JOS-21). */

export const TITULO = "Pipeline";
export const CARGANDO = "Cargando prospectos…";

export const VACIO_TITULO = "Aún no tienes prospectos";
export const VACIO_DESCRIPCION = "Añade tu primer prospecto para empezar a trabajar tu red.";
export const VACIO_CTA = "Añadir prospecto";

export const SIN_PROSPECTOS_ETAPA = "Nadie en esta etapa.";
export const SIN_SEGUIMIENTO = "Sin seguimiento";
export const FECHA_POR_VALIDAR = "Fecha por validar";
export const ETIQUETA_VENCIDO = "Vencido";

/**
 * Aviso de truncamiento. Sin "primeros": aunque el índice garantiza que el corte
 * descarta los MENOS urgentes, la vista sigue sin ser el total y no se presenta
 * como tal.
 */
export const BANNER_VISTA_PARCIAL = `Mostrando ${MAX_PIPELINE} prospectos de esta etapa; hay más.`;

/** Etapas terminales: se acumulan, así que arrancan plegadas (JOS-21). */
export const ETAPAS_COLAPSADAS_INICIO: readonly Etapa[] = ["joined", "discarded"];

/** Contador de la cabecera: exacto salvo truncamiento, donde se declara "500+". */
export function textoTotal(total: number, truncado: boolean): string {
  return truncado ? `${total}+` : String(total);
}

/**
 * Meta de la tarjeta, relativa al día visible (hoyInicio) y no al reloj — puro
 * sobre (fecha, dayKey), coherente con el diasVencido que calcula el servidor.
 * En etapas terminales no hay fecha porque el motor no programa seguimiento.
 */
export function textoSeguimiento(
  fechaProximoSeguimiento: number | undefined,
  diasVencido: number | undefined,
  hoyInicio: number,
): string {
  if (diasVencido !== undefined) {
    return diasVencido === 1 ? "Vencido hace 1 día" : `Vencido hace ${diasVencido} días`;
  }
  if (fechaProximoSeguimiento === undefined) return SIN_SEGUIMIENTO;

  const dias = diffCalendarDays(hoyInicio, fechaProximoSeguimiento, APP_TZ);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  // Defensivo: un vencido llega siempre con diasVencido desde el servidor, así
  // que aquí un valor negativo significaría datos incoherentes.
  if (dias < 0) return FECHA_POR_VALIDAR;
  return `En ${dias} días`;
}
