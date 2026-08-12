import { describe, expect, it } from "vitest";
import { APP_TZ, zonedMidnightToMs } from "../../convex/lib/fecha";
import { urlGoogleCalendar } from "./calendario";

/**
 * Las fechas se construyen SIEMPRE con `zonedMidnightToMs` —la medianoche real
 * de Madrid, que es el instante que guarda el backend— y nunca con `Date.UTC`
 * ni con un mediodía. Es lo único que hace fallar a una implementación que pase
 * por UTC: con `Date.UTC(2026, 7, 15)` el día en UTC y el día en Madrid
 * coinciden y la prueba pasaría con el fallo dentro (condición de la auditoría,
 * rev. 2, Mayor 1).
 */
function medianocheMadrid(y: number, m: number, d: number): number {
  return zonedMidnightToMs({ y, m, d }, APP_TZ);
}

function paramsDe(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

function rangoDe(url: string): [string, string] {
  const [inicio, fin] = paramsDe(url).get("dates")!.split("/");
  return [inicio, fin];
}

const BASE = { nombre: "Ana Pérez", canalEtiqueta: "WhatsApp" };

describe("día civil de Madrid y fin exclusivo", () => {
  it("P1 · verano (UTC+2): la medianoche del 15-ago es 22:00 del 14 en UTC", () => {
    const fechaMs = medianocheMadrid(2026, 8, 15);
    // Deja constancia de la trampa: una ruta por UTC leería aquí el día 14.
    expect(fechaMs).toBe(Date.UTC(2026, 7, 14, 22, 0));

    expect(paramsDe(urlGoogleCalendar({ ...BASE, fechaMs })).get("dates")).toBe("20260815/20260816");
  });

  it("P2 · invierno (UTC+1): la medianoche del 15-ene es 23:00 del 14 en UTC", () => {
    const fechaMs = medianocheMadrid(2026, 1, 15);
    expect(fechaMs).toBe(Date.UTC(2026, 0, 14, 23, 0));

    expect(paramsDe(urlGoogleCalendar({ ...BASE, fechaMs })).get("dates")).toBe("20260115/20260116");
  });

  it("P3 · el día de fin es exactamente uno más que el de inicio", () => {
    const [inicio, fin] = rangoDe(urlGoogleCalendar({ ...BASE, fechaMs: medianocheMadrid(2026, 5, 20) }));
    expect(inicio).toBe("20260520");
    expect(fin).toBe("20260521");
  });

  it("P4 · cruza el fin de mes sin aritmética de milisegundos", () => {
    const url = urlGoogleCalendar({ ...BASE, fechaMs: medianocheMadrid(2026, 8, 31) });
    expect(paramsDe(url).get("dates")).toBe("20260831/20260901");
  });

  it("P5 · cruza el fin de año", () => {
    const url = urlGoogleCalendar({ ...BASE, fechaMs: medianocheMadrid(2026, 12, 31) });
    expect(paramsDe(url).get("dates")).toBe("20261231/20270101");
  });
});

describe("descripción del evento", () => {
  const fechaMs = medianocheMadrid(2026, 8, 15);

  it("P6 · con teléfono y email, los dos aparecen", () => {
    const detalles = paramsDe(
      urlGoogleCalendar({ ...BASE, fechaMs, telefono: "+34 600 111 222", email: "ana@ejemplo.com" }),
    ).get("details")!;

    expect(detalles).toContain("Canal preferido: WhatsApp");
    expect(detalles).toContain("Teléfono: +34 600 111 222");
    expect(detalles).toContain("Email: ana@ejemplo.com");
  });

  it("P7 · sin teléfono, no se nombra el teléfono", () => {
    const detalles = paramsDe(urlGoogleCalendar({ ...BASE, fechaMs, email: "ana@ejemplo.com" })).get("details")!;

    expect(detalles).not.toContain("Teléfono");
    expect(detalles).toContain("Email: ana@ejemplo.com");
  });

  it("P8 · sin teléfono ni email, solo el canal y sin líneas vacías", () => {
    const detalles = paramsDe(urlGoogleCalendar({ ...BASE, fechaMs })).get("details")!;

    expect(detalles).toBe("Canal preferido: WhatsApp");
  });
});

describe("construcción de la URL", () => {
  const fechaMs = medianocheMadrid(2026, 8, 15);

  it("P9 · un nombre con acento y & no rompe la dirección", () => {
    const nombre = "Ana Pérez & Cía";
    const url = urlGoogleCalendar({ ...BASE, nombre, fechaMs });

    expect(paramsDe(url).get("text")).toBe(`Contactar a ${nombre}`);
    // Y no se ha colado un parámetro extra a costa del &.
    expect([...paramsDe(url).keys()]).toEqual(["action", "text", "dates", "details"]);
  });

  it("P10 · apunta al formulario de Google con la acción esperada", () => {
    const url = urlGoogleCalendar({ ...BASE, fechaMs });

    expect(url.startsWith("https://calendar.google.com/calendar/render?")).toBe(true);
    expect(paramsDe(url).get("action")).toBe("TEMPLATE");
  });
});
