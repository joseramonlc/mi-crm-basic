/**
 * Prioridad de prospecto en la UI (JOS-50/JOS-51). Fuente ÚNICA de las etiquetas
 * y las opciones que consumen las pantallas de M10 (alta, ficha, pipeline,
 * actividad); antes las etiquetas vivían escondidas en PriorityBadge.
 *
 * Las CLAVES coinciden con `prioridadProspecto` del backend (convex/schema.ts) y
 * con `PriorityBadge`. El color de cada nivel NO se define aquí: se toma del
 * token `--color-priority-{nivel}-dot`, la MISMA fuente que usa PriorityBadge,
 * para que un prospecto tenga idéntico color en el selector, en su Ficha y en el
 * Pipeline. En concreto, "low" es VERDE (no gris/blanco): es la identidad de
 * color ya fijada en los tokens (decisión cerrada en la auditoría de JOS-51).
 */
export type PriorityLevel = "high" | "medium" | "low";

/** Etiqueta española por nivel. */
export const ETIQUETAS_PRIORIDAD: Record<PriorityLevel, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

/** Defecto de producto (JOS-50): "medium" cuando el usuario no elige. */
export const PRIORIDAD_POR_DEFECTO: PriorityLevel = "medium";

/** Token del punto de color por nivel, cerrado a las variables del sistema. */
export type PriorityDotToken = `var(--color-priority-${PriorityLevel}-dot)`;

const PUNTO: Record<PriorityLevel, PriorityDotToken> = {
  high: "var(--color-priority-high-dot)",
  medium: "var(--color-priority-medium-dot)",
  low: "var(--color-priority-low-dot)",
};

export interface OpcionPrioridad {
  value: PriorityLevel;
  label: string;
  dot: PriorityDotToken;
}

/** Opciones ordenadas Alta → Media → Baja para los selectores de prioridad. */
export const OPCIONES_PRIORIDAD: OpcionPrioridad[] = [
  { value: "high", label: ETIQUETAS_PRIORIDAD.high, dot: PUNTO.high },
  { value: "medium", label: ETIQUETAS_PRIORIDAD.medium, dot: PUNTO.medium },
  { value: "low", label: ETIQUETAS_PRIORIDAD.low, dot: PUNTO.low },
];
