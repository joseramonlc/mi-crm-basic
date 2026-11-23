import { describe, expect, it } from "vitest";
import { APP_TZ, zonedMidnightToMs } from "../../../../convex/lib/fecha";
import { BANNER_VISTA_PARCIAL, formatTimeAgo, textoRitmo, textoVencido, type Ritmo } from "./textos";

const HORA = 3_600_000;
const HOY_INICIO = zonedMidnightToMs({ y: 2026, m: 7, d: 12 }, APP_TZ);

function ritmo(parcial: Partial<Ritmo>): Ritmo {
  return {
    completados: 0,
    pendientes: 0,
    completadosTruncados: false,
    pendientesTruncados: false,
    ...parcial,
  };
}

describe("BANNER_VISTA_PARCIAL", () => {
  it("texto exacto del plan, con la constante interpolada", () => {
    expect(BANNER_VISTA_PARCIAL).toBe("Mostrando una vista parcial de 500 seguimientos; hay más.");
  });
});

describe("textoRitmo", () => {
  it("sin truncamiento: dos recuentos separados en plural", () => {
    expect(textoRitmo(ritmo({ completados: 3, pendientes: 2 }))).toBe(
      "3 contactados hoy · 2 seguimientos pendientes para hoy",
    );
  });

  it("singular en ambos recuentos", () => {
    expect(textoRitmo(ritmo({ completados: 1, pendientes: 1 }))).toBe(
      "1 contactado hoy · 1 seguimiento pendiente para hoy",
    );
  });

  it("cero: plural en ambos", () => {
    expect(textoRitmo(ritmo({}))).toBe("0 contactados hoy · 0 seguimientos pendientes para hoy");
  });

  it("solo completados truncados: ≥ únicamente en esa cantidad", () => {
    expect(textoRitmo(ritmo({ completados: 500, pendientes: 2, completadosTruncados: true }))).toBe(
      "≥500 contactados hoy · 2 seguimientos pendientes para hoy",
    );
  });

  it("solo pendientes truncados: ≥ únicamente en esa cantidad", () => {
    expect(textoRitmo(ritmo({ completados: 3, pendientes: 500, pendientesTruncados: true }))).toBe(
      "3 contactados hoy · ≥500 seguimientos pendientes para hoy",
    );
  });

  it("ambos truncados: ≥ en las dos cantidades", () => {
    expect(
      textoRitmo(ritmo({ completados: 500, pendientes: 500, completadosTruncados: true, pendientesTruncados: true })),
    ).toBe("≥500 contactados hoy · ≥500 seguimientos pendientes para hoy");
  });

  it("cantidad no truncada en singular junto a una truncada", () => {
    expect(textoRitmo(ritmo({ completados: 1, pendientes: 500, pendientesTruncados: true }))).toBe(
      "1 contactado hoy · ≥500 seguimientos pendientes para hoy",
    );
  });
});

describe("formatTimeAgo", () => {
  it("sin fecha → 'Sin contacto aún'", () => {
    expect(formatTimeAgo(undefined, HOY_INICIO)).toBe("Sin contacto aún");
  });

  it("mismo día civil → 'Hoy'", () => {
    expect(formatTimeAgo(HOY_INICIO + 10 * HORA, HOY_INICIO)).toBe("Hoy");
  });

  it("futuro → 'Fecha por validar'", () => {
    expect(formatTimeAgo(HOY_INICIO + 24 * HORA, HOY_INICIO)).toBe("Fecha por validar");
  });

  it("ayer → 'hace 1 día' (singular)", () => {
    expect(formatTimeAgo(HOY_INICIO - 1, HOY_INICIO)).toBe("hace 1 día");
  });

  it("hace varios días → plural", () => {
    expect(formatTimeAgo(HOY_INICIO - 3 * 24 * HORA, HOY_INICIO)).toBe("hace 3 días");
  });
});

describe("textoVencido", () => {
  it("singular y plural", () => {
    expect(textoVencido(1)).toBe("Vencido hace 1 día");
    expect(textoVencido(7)).toBe("Vencido hace 7 días");
  });
});
