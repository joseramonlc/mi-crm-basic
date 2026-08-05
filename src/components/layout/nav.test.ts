import { describe, expect, it } from "vitest";
import { esFichaProspecto, isRootRoute, muestraFab, NAV_ITEMS } from "./nav";

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

describe("muestraFab (JOS-26): dónde sale el '+' en móvil", () => {
  it("sale en las 3 rutas raíz", () => {
    for (const item of NAV_ITEMS) {
      expect(muestraFab(item.href)).toBe(true);
    }
  });

  it("sale en la ficha del prospecto", () => {
    expect(muestraFab("/prospectos/j57abc123")).toBe(true);
  });

  it("NO sale en las dos pantallas de captura (decisión de producto 2026-08-05)", () => {
    expect(muestraFab("/prospectos/nuevo")).toBe(false);
    expect(muestraFab("/prospectos/j57abc123/interacciones/nueva")).toBe(false);
  });

  it("un id que empieza por 'nuevo' es ficha, y por tanto sí lleva '+'", () => {
    expect(muestraFab("/prospectos/nuevo2")).toBe(true);
  });
});
