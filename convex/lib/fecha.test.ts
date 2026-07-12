import { describe, expect, it } from "vitest";
import {
  APP_TZ,
  addCivilDays,
  civilDate,
  dayKeyToday,
  diffCalendarDays,
  parseDayKey,
  siguienteMedianocheMs,
  tzOffsetMs,
  ventanaDia,
  zonedMidnightToMs,
} from "./fecha";

const HORA = 3_600_000;

describe("zonedMidnightToMs", () => {
  it("invierno: medianoche de Madrid es 23:00 UTC del día anterior (UTC+1)", () => {
    expect(zonedMidnightToMs({ y: 2026, m: 1, d: 15 }, APP_TZ)).toBe(Date.UTC(2026, 0, 14, 23));
  });

  it("verano: medianoche de Madrid es 22:00 UTC del día anterior (UTC+2)", () => {
    expect(zonedMidnightToMs({ y: 2026, m: 7, d: 15 }, APP_TZ)).toBe(Date.UTC(2026, 6, 14, 22));
  });

  it("invariante: el timestamp devuelto es exactamente las 00:00 civiles del día pedido", () => {
    for (const civil of [
      { y: 2026, m: 3, d: 29 }, // día del cambio a horario de verano
      { y: 2026, m: 10, d: 25 }, // día del cambio a horario de invierno
      { y: 2026, m: 1, d: 1 },
      { y: 2026, m: 12, d: 31 },
    ]) {
      const ts = zonedMidnightToMs(civil, APP_TZ);
      expect(civilDate(ts, APP_TZ)).toEqual(civil);
      // 00:00 exactas: un ms antes pertenece al día civil anterior
      expect(civilDate(ts - 1, APP_TZ)).toEqual(addCivilDays(civil, -1));
    }
  });
});

describe("ventanaDia (semiabierta, DST)", () => {
  it("día normal: 24 h", () => {
    const { hoyInicio, mananaInicio } = ventanaDia("2026-07-12", APP_TZ);
    expect(mananaInicio - hoyInicio).toBe(24 * HORA);
  });

  it("29-mar-2026 (entra el verano): 23 h", () => {
    const { hoyInicio, mananaInicio } = ventanaDia("2026-03-29", APP_TZ);
    expect(mananaInicio - hoyInicio).toBe(23 * HORA);
  });

  it("25-oct-2026 (vuelve el invierno): 25 h", () => {
    const { hoyInicio, mananaInicio } = ventanaDia("2026-10-25", APP_TZ);
    expect(mananaInicio - hoyInicio).toBe(25 * HORA);
  });

  it("límites: [hoyInicio, mananaInicio) — el último ms es del día, mananaInicio ya no", () => {
    const { hoyInicio, mananaInicio } = ventanaDia("2026-07-12", APP_TZ);
    expect(civilDate(hoyInicio, APP_TZ)).toEqual({ y: 2026, m: 7, d: 12 });
    expect(civilDate(mananaInicio - 1, APP_TZ)).toEqual({ y: 2026, m: 7, d: 12 });
    expect(civilDate(mananaInicio, APP_TZ)).toEqual({ y: 2026, m: 7, d: 13 });
  });
});

describe("parseDayKey", () => {
  it("acepta una fecha real y devuelve la fecha civil", () => {
    expect(parseDayKey("2026-07-12")).toEqual({ y: 2026, m: 7, d: 12 });
  });

  it.each(["2026-02-31", "2026-13-01", "2026-00-10", "26-01-01", "2026-1-1", "hoy", ""])(
    "rechaza %j",
    (invalido) => {
      expect(() => parseDayKey(invalido)).toThrow(/dayKey inválido/);
    },
  );
});

describe("tzOffsetMs", () => {
  it("ignora los ms sobrantes truncando al segundo", () => {
    const ts = Date.UTC(2026, 0, 15, 12); // invierno: UTC+1
    expect(tzOffsetMs(ts, APP_TZ)).toBe(1 * HORA);
    expect(tzOffsetMs(ts + 123, APP_TZ)).toBe(1 * HORA);
    expect(tzOffsetMs(ts + 999, APP_TZ)).toBe(1 * HORA);
  });
});

describe("addCivilDays (rollover)", () => {
  it("cambio de mes", () => {
    expect(addCivilDays({ y: 2026, m: 1, d: 31 }, 1)).toEqual({ y: 2026, m: 2, d: 1 });
  });

  it("cambio de año", () => {
    expect(addCivilDays({ y: 2026, m: 12, d: 31 }, 1)).toEqual({ y: 2027, m: 1, d: 1 });
  });

  it("días negativos", () => {
    expect(addCivilDays({ y: 2026, m: 3, d: 1 }, -1)).toEqual({ y: 2026, m: 2, d: 28 });
  });
});

describe("diffCalendarDays", () => {
  it("cuenta días civiles, no bloques de 24 h (exacto a través del DST)", () => {
    // Del 28-mar 12:00 al 30-mar 12:00 hay 47 h reales pero 2 días de calendario
    const desde = zonedMidnightToMs({ y: 2026, m: 3, d: 28 }, APP_TZ) + 12 * HORA;
    const hasta = zonedMidnightToMs({ y: 2026, m: 3, d: 30 }, APP_TZ) + 12 * HORA;
    expect(hasta - desde).toBe(47 * HORA);
    expect(diffCalendarDays(desde, hasta, APP_TZ)).toBe(2);
  });

  it("mismo día → 0; hacia atrás → negativo", () => {
    const mediodia = zonedMidnightToMs({ y: 2026, m: 7, d: 12 }, APP_TZ) + 12 * HORA;
    expect(diffCalendarDays(mediodia, mediodia + HORA, APP_TZ)).toBe(0);
    expect(diffCalendarDays(mediodia, mediodia - 24 * HORA, APP_TZ)).toBe(-1);
  });
});

describe("dayKeyToday / siguienteMedianocheMs", () => {
  it("dayKeyToday usa el día civil de Madrid, no el de UTC", () => {
    // 23:30 UTC del 11-jul = 01:30 del 12-jul en Madrid (UTC+2)
    expect(dayKeyToday(Date.UTC(2026, 6, 11, 23, 30), APP_TZ)).toBe("2026-07-12");
  });

  it("siguienteMedianocheMs devuelve la próxima medianoche estrictamente posterior", () => {
    const mediodia = zonedMidnightToMs({ y: 2026, m: 7, d: 12 }, APP_TZ) + 12 * HORA;
    expect(siguienteMedianocheMs(mediodia, APP_TZ)).toBe(zonedMidnightToMs({ y: 2026, m: 7, d: 13 }, APP_TZ));
  });

  it("en la medianoche exacta salta a la del día siguiente (delay nunca 0)", () => {
    const medianoche = zonedMidnightToMs({ y: 2026, m: 7, d: 12 }, APP_TZ);
    expect(siguienteMedianocheMs(medianoche, APP_TZ)).toBe(zonedMidnightToMs({ y: 2026, m: 7, d: 13 }, APP_TZ));
  });
});
