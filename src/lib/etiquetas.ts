import { APP_TZ } from "../../convex/lib/fecha";
import type { InteraccionPublica, ProspectoPublico } from "../../convex/lib/proyecciones";
import type { PillOption } from "@/components/ui";

/**
 * Correspondencias de dominio compartidas entre pantallas (M4 bocado 1, P4):
 * única fuente de las etiquetas de producto de los enums de la API y del
 * formato de fecha en español. Los textos.ts de cada pantalla re-exportan
 * desde aquí lo que ya publicaban — ningún consumidor cambia.
 */

export type CanalContacto = ProspectoPublico["canalContactoPreferido"];
export type TipoInteraccion = InteraccionPublica["tipo"];
export type ResultadoInteraccion = InteraccionPublica["resultado"];
export type Etapa = ProspectoPublico["etapaActual"];

/**
 * Las 6 etapas fijas del pipeline, en el orden de la metodología (JOS-19) y con
 * las etiquetas de producto de JOS-7 — las mismas que muestra StageBadge.
 *
 * Promovido aquí desde el textos.ts de la ficha al necesitarlo también el
 * Pipeline (JOS-21); la ficha lo re-exporta y sus consumidores no cambian.
 */
export const OPCIONES_ETAPA: Array<{ value: Etapa; label: string }> = [
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "presented", label: "Presentación realizada" },
  { value: "evaluating", label: "En valoración" },
  { value: "joined", label: "Incorporado" },
  { value: "discarded", label: "Descartado" },
];

export function etiquetaEtapa(etapa: Etapa): string {
  return OPCIONES_ETAPA.find((o) => o.value === etapa)?.label ?? etapa;
}

/** Opciones de JOS-15 mapeadas al enum de la API (etiqueta de producto → clave). */
export const OPCIONES_CANAL: Array<{ value: CanalContacto; label: string }> = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Llamada" },
  { value: "mail", label: "Email" },
  { value: "instagram", label: "Instagram" },
  { value: "otro", label: "Otro" },
];

/** Pills con icono para el tipo (JOS-61): un toque, sin dropdown. */
export const OPCIONES_TIPO: Array<PillOption<TipoInteraccion>> = [
  { value: "call", label: "Llamada", icon: "phone" },
  { value: "message", label: "Mensaje", icon: "message-circle" },
  { value: "meeting", label: "Reunión", icon: "calendar" },
];

/** Las 4 opciones de la API y JOS-16 (P4 de la rev. 2 de M3); tonos semánticos de JOS-61. */
export const OPCIONES_RESULTADO: Array<PillOption<ResultadoInteraccion>> = [
  { value: "interested", label: "Interesado", tone: "verde" },
  { value: "thinking", label: "Necesita pensar", tone: "ambar" },
  { value: "not_interested", label: "No interesado", tone: "slate" },
  { value: "other", label: "Otro", tone: "slate-suave" },
];

/** "lunes, 20 de julio" — fecha civil en Madrid, formato es-ES (design.md §1). */
export function formatearFechaEs(ms: number): string {
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: APP_TZ }).format(ms);
}
