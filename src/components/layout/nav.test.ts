import { describe, expect, it } from "vitest";
import { esFichaProspecto, isRootRoute } from "./nav";

describe("esFichaProspecto (M4 bocado 1, P16)", () => {
  it("casa la ficha: exactamente un segmento tras /prospectos distinto de 'nuevo'", () => {
    expect(esFichaProspecto("/prospectos/j57abc123")).toBe(true);
    // Un id que EMPIEZA por "nuevo" sí es una ficha (la exclusión es exacta).
    expect(esFichaProspecto("/prospectos/nuevo2")).toBe(true);
  });

  it("no casa el formulario de alta ni las subrutas (conservan su TabBar)", () => {
    expect(esFichaProspecto("/prospectos/nuevo")).toBe(false);
    expect(esFichaProspecto("/prospectos/j57abc123/interacciones/nueva")).toBe(false);
  });

  it("no casa las rutas raíz ni /prospectos a secas", () => {
    expect(esFichaProspecto("/prospectos")).toBe(false);
    expect(esFichaProspecto("/actividad")).toBe(false);
    expect(esFichaProspecto("/resumen")).toBe(false);
  });

  it("las raíces siguen siendo raíces (sin interferencia con isRootRoute)", () => {
    expect(isRootRoute("/actividad")).toBe(true);
    expect(isRootRoute("/prospectos/j57abc123")).toBe(false);
  });
});
