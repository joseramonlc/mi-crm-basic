import { describe, expect, it } from "vitest";
import { APP_TZ, zonedMidnightToMs } from "../../../../../../../convex/lib/fecha";
import { formatearFechaEs, textoToast } from "./textos";

// 2026-07-20 es lunes; su medianoche de Madrid cae a las 22:00 UTC del día 19 —
// el formateo debe ser fiel al día civil de Madrid, no al de UTC.
const LUNES_20_JUL = zonedMidnightToMs({ y: 2026, m: 7, d: 20 }, APP_TZ);

describe("formatearFechaEs (es-ES, Europe/Madrid)", () => {
  it("formatea el día civil de Madrid aunque el instante UTC sea del día anterior", () => {
    expect(formatearFechaEs(LUNES_20_JUL)).toBe("lunes, 20 de julio");
  });
});

describe("textoToast (P8: cierre de bucle de JOS-61)", () => {
  it("sin próximo seguimiento (etapa terminal): solo la confirmación", () => {
    expect(textoToast(undefined)).toBe("Interacción registrada");
  });

  it("con próximo seguimiento: incluye la fecha calculada por el motor", () => {
    expect(textoToast(LUNES_20_JUL)).toBe("Interacción registrada, próximo contacto: lunes, 20 de julio");
  });
});
