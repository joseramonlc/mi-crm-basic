/**
 * Configuración de producto del motor de seguimiento (JOS-8): días hasta el
 * próximo contacto según la etapa del pipeline. `null` = etapa terminal, sin
 * seguimiento — el prospecto sale de la Actividad Diaria.
 *
 * Valores validados por el product owner el 2026-07-13 (comentario en JOS-8).
 * Este fichero es el único punto de ajuste: cambiar los días no toca el motor
 * (`convex/lib/seguimiento.ts`), que se limita a importar esta tabla. Aquí no
 * se importa nada del motor (sin ciclos).
 */

export type Etapa = "new" | "contacted" | "presented" | "evaluating" | "joined" | "discarded";

export const SEGUIMIENTO_DIAS: Record<Etapa, number | null> = {
  new: 1,
  contacted: 3,
  presented: 5,
  evaluating: 7,
  joined: null,
  discarded: null,
};
