import * as React from "react";
import { OPCIONES_ETAPA, type Etapa } from "./textos";

export interface SelectorEtapaProps {
  etapaActual: Etapa;
  /** Bloquea la activación mientras la mutation está en vuelo. */
  deshabilitado?: boolean;
  /** Solo se invoca con una etapa DISTINTA de la actual. */
  onCambiar: (etapa: Etapa) => void;
}

/**
 * Selector de las 6 etapas del pipeline (JOS-19), co-localizado en la ficha
 * (se promocionará al kit si el Pipeline de M5 lo necesita). Pills con los
 * tokens --color-stage-* de StageBadge; las 6 siempre visibles (flex-wrap,
 * D2 aprobada); área táctil mínima --layout-tap-min.
 *
 * Accesibilidad: radiogroup con roving tabindex y activación MANUAL (P4) —
 * a diferencia de PillSelect, las flechas SOLO mueven el foco y activan
 * Enter/Espacio o el toque, porque cada activación dispara una mutation de
 * servidor. El keydown de Enter/Espacio se maneja explícitamente con
 * preventDefault para que la activación nativa del botón no duplique el click.
 *
 * Durante el guardado se usa aria-disabled (no `disabled`): los botones
 * siguen siendo enfocables y el foco del teclado no se pierde a mitad de
 * cambio; la guarda del handler ignora las activaciones.
 */
export function SelectorEtapa({ etapaActual, deshabilitado = false, onCambiar }: SelectorEtapaProps) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const actual = OPCIONES_ETAPA.findIndex((o) => o.value === etapaActual);
  // Roving tabindex REAL (hallazgo 2 del NO-GO M4B2): el índice tabulable
  // sigue al último botón ENFOCADO — las flechas mueven foco Y tabindex —;
  // sin foco previo, Tab entra por la etapa actual (patrón radiogroup APG).
  const [enfocado, setEnfocado] = React.useState<number | null>(null);
  const tabbable = enfocado ?? (actual >= 0 ? actual : 0);

  function activar(etapa: Etapa) {
    if (deshabilitado || etapa === etapaActual) return;
    onCambiar(etapa);
  }

  function manejarTecla(e: React.KeyboardEvent, idx: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      refs.current[(idx + 1) % OPCIONES_ETAPA.length]?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      refs.current[(idx - 1 + OPCIONES_ETAPA.length) % OPCIONES_ETAPA.length]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activar(OPCIONES_ETAPA[idx].value);
    }
  }

  return (
    <div role="radiogroup" aria-label="Etapa del pipeline" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {OPCIONES_ETAPA.map((o, idx) => {
        const activa = o.value === etapaActual;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[idx] = el;
            }}
            type="button"
            role="radio"
            aria-checked={activa}
            aria-disabled={deshabilitado || undefined}
            tabIndex={idx === tabbable ? 0 : -1}
            onClick={() => activar(o.value)}
            onKeyDown={(e) => manejarTecla(e, idx)}
            onFocus={() => setEnfocado(idx)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              minHeight: "var(--layout-tap-min)",
              padding: "0 14px",
              borderRadius: "var(--radius-full)",
              border: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 600,
              cursor: deshabilitado ? "wait" : activa ? "default" : "pointer",
              opacity: deshabilitado && !activa ? 0.6 : 1,
              background: activa ? `var(--color-stage-${o.value}-bg)` : "var(--color-neutral-100)",
              color: activa ? `var(--color-stage-${o.value}-text)` : "var(--color-neutral-600)",
              boxShadow: activa ? `inset 0 0 0 1.5px var(--color-stage-${o.value}-dot)` : "none",
              transition: "background-color var(--duration-base) var(--ease-standard), color var(--duration-base) var(--ease-standard)",
              whiteSpace: "nowrap",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: activa ? `var(--color-stage-${o.value}-dot)` : "var(--color-neutral-400)",
                flex: "none",
              }}
            />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
