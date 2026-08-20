import * as React from "react";
import { ETIQUETAS_PRIORIDAD, type PriorityLevel } from "@/lib/prioridad";

// Re-exportado desde su fuente única (src/lib/prioridad.ts) para no romper a
// quien lo importa desde aquí (p. ej. ProspectCard).
export type { PriorityLevel };

export interface PriorityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Priority level. @default 'medium' */
  level?: PriorityLevel;
  /** Override the default Spanish label. */
  label?: string;
  /** Render just the colored dot (for cards). @default false */
  dotOnly?: boolean;
  /** Dot diameter in px when dotOnly. @default 9 */
  size?: number;
}

/** Priority pill (Alta/Media/Baja) or bare colored dot. */
export function PriorityBadge({ level = "medium", label, dotOnly = false, size = 9, style, ...rest }: PriorityBadgeProps) {
  if (dotOnly) {
    return (
      <span
        aria-label={`Prioridad ${ETIQUETAS_PRIORIDAD[level]}`}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `var(--color-priority-${level}-dot)`,
          display: "inline-block",
          flex: "none",
          ...style,
        }}
        {...rest}
      />
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: "var(--radius-full)",
        background: `var(--color-priority-${level}-bg)`,
        color: `var(--color-priority-${level}-text)`,
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.2,
        ...style,
      }}
      {...rest}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: `var(--color-priority-${level}-dot)`, flex: "none" }} />
      {label || ETIQUETAS_PRIORIDAD[level]}
    </span>
  );
}
