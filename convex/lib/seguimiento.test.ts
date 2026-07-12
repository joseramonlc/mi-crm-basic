import { describe, expect, it } from "vitest";
import { APP_TZ, zonedMidnightToMs } from "./fecha";
import { SEGUIMIENTO_DIAS, calcularFechaProximoSeguimiento, type Etapa } from "./seguimiento";

const HORA = 3_600_000;
// Referencia: 12-jul-2026 a las 10:00 de Madrid (la hora del día no debe influir)
const REF = zonedMidnightToMs({ y: 2026, m: 7, d: 12 }, APP_TZ) + 10 * HORA;

describe("calcularFechaProximoSeguimiento", () => {
  it.each<[Etapa, number]>([
    ["new", 1],
    ["contacted", 3],
    ["presented", 5],
    ["evaluating", 7],
  ])("%s → medianoche de +%i días de calendario", (etapa, dias) => {
    expect(calcularFechaProximoSeguimiento(etapa, REF)).toBe(
      zonedMidnightToMs({ y: 2026, m: 7, d: 12 + dias }, APP_TZ),
    );
  });

  it.each<Etapa>(["joined", "discarded"])("etapa terminal %s → undefined", (etapa) => {
    expect(SEGUIMIENTO_DIAS[etapa]).toBeNull();
    expect(calcularFechaProximoSeguimiento(etapa, REF)).toBeUndefined();
  });

  it("suma días civiles, no bloques de 24 h: cruza el DST sin desviarse", () => {
    // contacted (+3) desde el 27-mar 18:00 → medianoche del 30-mar, aunque el
    // 29-mar solo tenga 23 h.
    const refDst = zonedMidnightToMs({ y: 2026, m: 3, d: 27 }, APP_TZ) + 18 * HORA;
    expect(calcularFechaProximoSeguimiento("contacted", refDst)).toBe(
      zonedMidnightToMs({ y: 2026, m: 3, d: 30 }, APP_TZ),
    );
  });

  it("rollover de mes: new (+1) el último día del mes", () => {
    const finDeMes = zonedMidnightToMs({ y: 2026, m: 7, d: 31 }, APP_TZ) + 9 * HORA;
    expect(calcularFechaProximoSeguimiento("new", finDeMes)).toBe(
      zonedMidnightToMs({ y: 2026, m: 8, d: 1 }, APP_TZ),
    );
  });
});
