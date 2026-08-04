// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BarChart, type BarChartDatum } from "./BarChart";

afterEach(cleanup);

const ETIQUETA = (d: BarChartDatum) => (d.sinDatos ? `${d.dayKey}: sin datos` : `${d.dayKey}: ${d.valor}`);

/** `null` = día sin medir; un número = valor real (incluido el 0). */
function serie(valores: Array<number | null>): BarChartDatum[] {
  return valores.map((v, i) => ({
    dayKey: `2026-08-${String(i + 1).padStart(2, "0")}`,
    valor: v ?? 0,
    sinDatos: v === null,
  }));
}

/** La barra interior de cada columna; `null` cuando la columna no pinta ninguna. */
function barras(): Array<HTMLElement | null> {
  return screen.getAllByRole("listitem").map((li) => li.querySelector<HTMLElement>("div > div"));
}

describe("BarChart", () => {
  it("expone el valor de cada barra como texto real, no solo como color", () => {
    render(<BarChart datos={serie([3, 0, null])} etiqueta={ETIQUETA} ariaLabel="Interacciones por día" />);

    expect(screen.getByText("2026-08-01: 3")).toBeDefined();
    expect(screen.getByText("2026-08-02: 0")).toBeDefined();
    expect(screen.getByText("2026-08-03: sin datos")).toBeDefined();
    expect(screen.getByRole("list", { name: "Interacciones por día" })).toBeDefined();
  });

  it("un valor > 0 nunca se dibuja con altura 0, por pequeño que sea frente al máximo", () => {
    // 1 frente a 1.000 daría 0,12 px: se eleva al mínimo visible.
    render(<BarChart datos={serie([1, 1000])} etiqueta={ETIQUETA} ariaLabel="g" altura={120} />);

    const [pequena, grande] = barras();
    expect(pequena?.style.height).toBe("3px");
    expect(grande?.style.height).toBe("120px");
  });

  it("un 0 real lleva tope de línea base; un día sin datos no pinta barra alguna", () => {
    render(<BarChart datos={serie([0, null])} etiqueta={ETIQUETA} ariaLabel="g" />);

    const [cero, ausente] = barras();
    expect(cero?.style.height).toBe("2px");
    expect(ausente).toBeNull();
  });

  it("la serie entera a cero no rompe la escala (no divide por cero)", () => {
    render(<BarChart datos={serie([0, 0, 0])} etiqueta={ETIQUETA} ariaLabel="g" />);

    for (const barra of barras()) {
      expect(barra?.style.height).toBe("2px");
    }
  });

  it("los días sin datos no participan en la escala", () => {
    // El 999 no se midió: no puede fijar el máximo y aplastar al 2, que sí.
    render(<BarChart datos={serie([2, null])} etiqueta={ETIQUETA} ariaLabel="g" altura={120} />);

    expect(barras()[0]?.style.height).toBe("120px");
  });

  it("el rótulo del eje se omite cuando la función lo devuelve null", () => {
    const { rerender } = render(
      <BarChart datos={serie([1, 2])} etiqueta={ETIQUETA} ariaLabel="g" rotulo={() => null} />,
    );
    expect(screen.queryByText("L")).toBeNull();

    rerender(<BarChart datos={serie([1, 2])} etiqueta={ETIQUETA} ariaLabel="g" rotulo={() => "L"} />);
    expect(screen.getAllByText("L")).toHaveLength(2);
  });
});
