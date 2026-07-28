import { describe, expect, it } from "vitest";
import { APP_TZ, ventanaDia } from "../../../../convex/lib/fecha";
import { FECHA_POR_VALIDAR, SIN_SEGUIMIENTO, textoSeguimiento, textoTotal } from "./textos";

const { hoyInicio, mananaInicio } = ventanaDia("2026-07-12", APP_TZ);
const DIA = 86_400_000;

describe("textoTotal", () => {
  it("es exacto salvo truncamiento, donde declara el tope con '+'", () => {
    expect(textoTotal(0, false)).toBe("0");
    expect(textoTotal(42, false)).toBe("42");
    expect(textoTotal(500, true)).toBe("500+");
  });
});

describe("textoSeguimiento", () => {
  it("prioriza el vencimiento que calcula el servidor, con singular y plural", () => {
    expect(textoSeguimiento(hoyInicio - DIA, 1, hoyInicio)).toBe("Vencido hace 1 día");
    expect(textoSeguimiento(hoyInicio - 5 * DIA, 5, hoyInicio)).toBe("Vencido hace 5 días");
  });

  it("sin fecha (etapas terminales) lo dice explícitamente", () => {
    expect(textoSeguimiento(undefined, undefined, hoyInicio)).toBe(SIN_SEGUIMIENTO);
  });

  it("distingue hoy, mañana y el futuro por días de calendario", () => {
    expect(textoSeguimiento(hoyInicio, undefined, hoyInicio)).toBe("Hoy");
    // Último instante del día visible: sigue siendo hoy.
    expect(textoSeguimiento(mananaInicio - 1, undefined, hoyInicio)).toBe("Hoy");
    expect(textoSeguimiento(mananaInicio, undefined, hoyInicio)).toBe("Mañana");
    expect(textoSeguimiento(hoyInicio + 4 * DIA, undefined, hoyInicio)).toBe("En 4 días");
  });

  it("una fecha pasada sin diasVencido es un dato incoherente y no se presenta como válido", () => {
    // El servidor siempre acompaña un vencido con diasVencido; llegar aquí
    // significa payload inconsistente, no un caso de producto.
    expect(textoSeguimiento(hoyInicio - 2 * DIA, undefined, hoyInicio)).toBe(FECHA_POR_VALIDAR);
  });
});
