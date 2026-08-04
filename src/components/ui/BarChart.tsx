import * as React from "react";

export interface BarChartDatum {
  dayKey: string;
  valor: number;
  /**
   * El día NO se midió. No es un 0: es una ausencia, y se dibuja distinto.
   * Quien lo decide es la pantalla (predicado único de JOS-24 §D6); este
   * componente solo lo pinta.
   */
  sinDatos?: boolean;
}

export interface BarChartProps {
  datos: BarChartDatum[];
  /** Texto para lectores de pantalla de cada barra. Se renderiza como texto real. */
  etiqueta: (d: BarChartDatum) => string;
  /** Rótulo visible bajo la barra; `null` para no rotularla. */
  rotulo?: (d: BarChartDatum, indice: number, total: number) => string | null;
  /** Nombre accesible de la lista de barras. */
  ariaLabel: string;
  /** Alto del área de barras en px. @default 120 */
  altura?: number;
}

/** Grosor mínimo de una barra con valor > 0: un 1 no puede parecer un 0. */
const MINIMO_VISIBLE = 3;
/** Tope que marca la línea base en un 0 REAL — lo que lo distingue de "sin datos". */
const GROSOR_CERO = 2;

const RAYADO = `repeating-linear-gradient(45deg, transparent, transparent 3px, var(--color-neutral-200) 3px, var(--color-neutral-200) 5px)`;

/**
 * Gráfico de barras sin librería, sin ejes, sin interactividad y sin tooltips
 * (JOS-62: *"simple, nada técnico — el usuario es un networker, no un analista"*).
 *
 * Flex con `min-width: 0` en cada barra y **sin `overflow-x`**: 30 barras entran
 * en 375 px sin provocar scroll horizontal. Nada de anchos fijos ni de SVG
 * dimensionado, que es por donde volvería el desbordamiento.
 *
 * Presentacional puro: no conoce Convex, ni parcialidad, ni fechas.
 */
export function BarChart({ datos, etiqueta, rotulo, ariaLabel, altura = 120 }: BarChartProps) {
  // Los días sin medir no participan en la escala: un valor que no conocemos no
  // puede fijar el máximo. Mínimo 1 para no dividir por cero con la serie a cero.
  const max = Math.max(1, ...datos.filter((d) => !d.sinDatos).map((d) => d.valor));

  return (
    <ul
      aria-label={ariaLabel}
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 2,
        margin: 0,
        padding: 0,
        listStyle: "none",
        width: "100%",
      }}
    >
      {datos.map((d, indice) => {
        const texto = rotulo?.(d, indice, datos.length) ?? null;
        return (
          <li key={d.dayKey} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="sr-only">{etiqueta(d)}</span>
            <div
              style={{
                height: altura,
                display: "flex",
                alignItems: "flex-end",
                borderRadius: "var(--radius-sm)",
                background: d.sinDatos ? RAYADO : "var(--color-neutral-100)",
              }}
            >
              {!d.sinDatos && (
                <div
                  style={{
                    width: "100%",
                    height: d.valor > 0 ? Math.max(MINIMO_VISIBLE, (d.valor / max) * altura) : GROSOR_CERO,
                    borderRadius: "var(--radius-sm)",
                    background: d.valor > 0 ? "var(--color-primary-500)" : "var(--color-neutral-300)",
                  }}
                />
              )}
            </div>
            {texto !== null && (
              <span
                aria-hidden="true"
                style={{
                  fontSize: 10,
                  lineHeight: 1.2,
                  textAlign: "center",
                  color: "var(--color-neutral-500)",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                {texto}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
