import * as React from "react";
import { Icon } from "./Icon";

/** Tinte del pill activo; "primario" replica el FilterChip activo (verde sólido). */
export type PillTone = "primario" | "verde" | "ambar" | "slate" | "slate-suave";

export interface PillOption<V extends string = string> {
  value: V;
  label: string;
  /** Icono Lucide opcional (16px) a la izquierda del label. */
  icon?: string;
  /**
   * Punto de color opcional a la izquierda del label. Se limita a una variable
   * CSS del sistema de tokens (nunca un color suelto), para que un componente
   * compartido no acepte estilos no gobernados. Lo usa el selector de prioridad
   * con `--color-priority-{nivel}-dot`.
   */
  dot?: `var(${string})`;
  /** @default "primario" */
  tone?: PillTone;
}

export interface PillSelectProps<V extends string = string> {
  label?: string;
  options: Array<PillOption<V>>;
  value?: V;
  onChange?: (value: V) => void;
  /** Error inline — mismo tratamiento visual que Input. */
  error?: string;
  id?: string;
  style?: React.CSSProperties;
}

/** Los tonos semánticos usan fondo suave + texto fuerte + anillo interior (JOS-61). */
const TONOS: Record<PillTone, { bg: string; texto: string; anillo?: string }> = {
  primario: { bg: "var(--color-primary-500)", texto: "#fff" },
  verde: { bg: "var(--color-success-bg)", texto: "var(--color-success-text)", anillo: "var(--color-success)" },
  ambar: { bg: "var(--color-warning-bg)", texto: "var(--color-warning-text)", anillo: "var(--color-warning)" },
  slate: { bg: "var(--color-neutral-200)", texto: "var(--color-neutral-700)", anillo: "var(--color-neutral-500)" },
  "slate-suave": { bg: "var(--color-neutral-100)", texto: "var(--color-neutral-500)", anillo: "var(--color-neutral-400)" },
};

/**
 * Selección única mediante pills de un toque (M3). Accesible como radiogroup
 * con roving tabindex (flechas mueven Y seleccionan, patrón radio nativo).
 * Área táctil mínima --layout-tap-min (44px, JOS-60); visual del FilterChip.
 */
export function PillSelect<V extends string = string>({ label, options, value, onChange, error, id, style }: PillSelectProps<V>) {
  const generatedId = React.useId();
  const groupId = id || generatedId;
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const seleccionada = options.findIndex((o) => o.value === value);
  const tabbable = seleccionada >= 0 ? seleccionada : 0;

  function mover(desde: number, delta: number) {
    const destino = (desde + delta + options.length) % options.length;
    onChange?.(options[destino].value);
    refs.current[destino]?.focus();
  }

  function manejarTecla(e: React.KeyboardEvent, idx: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      mover(idx, 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      mover(idx, -1);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <span
          id={`${groupId}-label`}
          style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--color-neutral-700)" }}
        >
          {label}
        </span>
      )}
      <div
        role="radiogroup"
        aria-labelledby={label ? `${groupId}-label` : undefined}
        aria-describedby={error ? `${groupId}-error` : undefined}
        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
      >
        {options.map((o, idx) => {
          const activa = o.value === value;
          const tono = TONOS[o.tone ?? "primario"];
          return (
            <button
              key={o.value}
              ref={(el) => {
                refs.current[idx] = el;
              }}
              type="button"
              role="radio"
              aria-checked={activa}
              tabIndex={idx === tabbable ? 0 : -1}
              onClick={() => onChange?.(o.value)}
              onKeyDown={(e) => manejarTecla(e, idx)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                minHeight: "var(--layout-tap-min)",
                padding: "0 16px",
                borderRadius: "var(--radius-full)",
                border: "none",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                background: activa ? tono.bg : "var(--color-neutral-100)",
                color: activa ? tono.texto : "var(--color-neutral-600)",
                boxShadow: activa && tono.anillo ? `inset 0 0 0 1.5px ${tono.anillo}` : "none",
                transition: "background-color var(--duration-base) var(--ease-standard), color var(--duration-base) var(--ease-standard)",
                whiteSpace: "nowrap",
              }}
            >
              {o.dot && (
                <span
                  aria-hidden
                  style={{ width: 8, height: 8, borderRadius: "50%", background: o.dot, flex: "none" }}
                />
              )}
              {o.icon && <Icon name={o.icon} size={16} />}
              {o.label}
            </button>
          );
        })}
      </div>
      {error && (
        <span id={`${groupId}-error`} style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--color-error-text)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
