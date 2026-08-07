import type { Infer } from "convex/values";
import { prioridadProspecto } from "../schema";

export type Prioridad = Infer<typeof prioridadProspecto>;

/** El defecto del campo: se escribe por ausencia, nunca como valor almacenado. */
export const PRIORIDAD_POR_DEFECTO: Prioridad = "medium";

/**
 * Prioridad efectiva de un prospecto (JOS-50).
 *
 * ÚNICO sitio donde la ausencia del campo se traduce a "medium". El campo es
 * opcional en el esquema para no necesitar migración —los prospectos anteriores
 * a M10 no lo tienen— y las mutations omiten el valor por defecto en lugar de
 * escribirlo, de modo que "ausente" y "medium" son el mismo estado.
 *
 * Esa regla NO sale de aquí: la proyección pública resuelve el valor antes de
 * devolverlo, así que ninguna pantalla ve nunca un prospecto sin prioridad.
 */
export function prioridadDe(doc: { prioridad?: Prioridad }): Prioridad {
  return doc.prioridad ?? PRIORIDAD_POR_DEFECTO;
}

/**
 * Valor a PERSISTIR para una prioridad pedida: `undefined` cuando es el defecto,
 * lo que en un patch de Convex elimina el campo y en un insert lo omite.
 *
 * Que "medium" no se guarde nunca es lo que mantiene coherente el modelo: si a
 * veces se escribiera y a veces no, existirían dos representaciones del mismo
 * estado y cualquier lectura directa del documento tendría que contemplar las dos.
 */
export function prioridadAPersistir(prioridad: Prioridad | undefined): Prioridad | undefined {
  return prioridad === undefined || prioridad === PRIORIDAD_POR_DEFECTO ? undefined : prioridad;
}
