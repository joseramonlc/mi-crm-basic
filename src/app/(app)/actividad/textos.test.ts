import { describe, expect, it } from "vitest";
import { APP_TZ, zonedMidnightToMs } from "../../../../convex/lib/fecha";
import { BANNER_VISTA_PARCIAL, formatTimeAgo, textoRitmo, textoVencido, type Ritmo } from "./textos";

const HORA = 3_600_000;
const HOY_INICIO = zonedMidnightToMs({ y: 2026, m: 7, d: 12 }, APP_TZ);

function ritmo(parcial: Partial<Ritmo>): Ritmo {
  return {
    completados: 0,
    pendientes: 0,
    total: 0,
    completadosTruncados: false,
    pendientesTruncados: false,
    aproximado: true,
    ...parcial,
  };
}

describe("BANNER_VISTA_PARCIAL", () => {
  it("texto exacto del plan, con la constante interpolada", () => {
    expect(BANNER_VISTA_PARCIAL).toBe("Mostrando una vista parcial de 500 seguimientos; hay más.");
  });
});

describe("textoRitmo", () => {
  it("sin truncamiento: fracción N de M en plural", () => {
    expect(textoRitmo(ritmo({ completados: 3, pendientes: 2, total: 5 }))).toBe(
      "3 de 5 seguimientos de hoy (aprox.)",
    );
  });

  it("sin truncamiento: singular cuando el total es 1", () => {
    expect(textoRitmo(ritmo({ completados: 0, pendientes: 1, total: 1 }))).toBe(
      "0 de 1 seguimiento de hoy (aprox.)",
    );
  });

  it("solo completados truncados: ≥ únicamente en esa cantidad", () => {
    expect(
      textoRitmo(ritmo({ completados: 500, pendientes: 2, total: 502, completadosTruncados: true })),
    ).toBe("≥500 completados · 2 pendientes (aprox.)");
  });

  it("solo pendientes truncados: ≥ únicamente en esa cantidad", () => {
    expect(
      textoRitmo(ritmo({ completados: 3, pendientes: 500, total: 503, pendientesTruncados: true })),
    ).toBe("3 completados · ≥500 pendientes (aprox.)");
  });

  it("ambos truncados: ≥ en las dos cantidades", () => {
    expect(
      textoRitmo(
        ritmo({ completados: 500, pendientes: 500, total: 1000, completadosTruncados: true, pendientesTruncados: true }),
      ),
    ).toBe("≥500 completados · ≥500 pendientes (aprox.)");
  });

  it("cantidad no truncada en singular", () => {
    expect(
      textoRitmo(ritmo({ completados: 1, pendientes: 500, total: 501, pendientesTruncados: true })),
    ).toBe("1 completado · ≥500 pendientes (aprox.)");
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
