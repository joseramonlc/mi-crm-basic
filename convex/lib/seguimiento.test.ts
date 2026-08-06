import { describe, expect, it } from "vitest";
import { APP_TZ, zonedMidnightToMs } from "./fecha";
import {
  SEGUIMIENTO_DIAS,
  acuerdoActivo,
  calcularFechaProximoSeguimiento,
  esTerminal,
  seguimientoTrasCambioEtapa,
  type Etapa,
} from "./seguimiento";

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

describe("esTerminal", () => {
  it.each<[Etapa, boolean]>([
    ["new", false],
    ["contacted", false],
    ["presented", false],
    ["evaluating", false],
    ["joined", true],
    ["discarded", true],
  ])("%s → %s", (etapa, esperado) => {
    expect(esTerminal(etapa)).toBe(esperado);
  });
});

describe("acuerdoActivo (JOS-67)", () => {
  const FECHA = zonedMidnightToMs({ y: 2026, m: 7, d: 26 }, APP_TZ);

  it("exige booleano Y fecha", () => {
    expect(acuerdoActivo({ seguimientoManual: true, fechaProximoSeguimiento: FECHA })).toBe(true);
  });

  it.each([
    ["sin ningún campo", {}],
    ["solo fecha (la puso el motor)", { fechaProximoSeguimiento: FECHA }],
    ["booleano a false", { seguimientoManual: false, fechaProximoSeguimiento: FECHA }],
    // Estado incoherente: no debería existir, pero si existiera no puede contar
    // como acuerdo — dejaría el prospecto sin fecha y sin motor.
    ["booleano true SIN fecha (incoherente)", { seguimientoManual: true }],
  ])("%s → no es acuerdo activo", (_caso, estado) => {
    expect(acuerdoActivo(estado)).toBe(false);
  });
});

describe("seguimientoTrasCambioEtapa (JOS-67)", () => {
  // Referencia: 12-jul-2026 a las 10:00 de Madrid.
  const ACORDADA = zonedMidnightToMs({ y: 2026, m: 7, d: 26 }, APP_TZ); // +14 días

  it("sin acuerdo: manda el motor y el booleano queda ausente", () => {
    expect(seguimientoTrasCambioEtapa("contacted", REF, {})).toEqual({
      fechaProximoSeguimiento: zonedMidnightToMs({ y: 2026, m: 7, d: 15 }, APP_TZ),
      seguimientoManual: undefined,
    });
  });

  it("con acuerdo activo: NO recalcula, la fecha acordada se mantiene", () => {
    expect(
      seguimientoTrasCambioEtapa("contacted", REF, {
        fechaProximoSeguimiento: ACORDADA,
        seguimientoManual: true,
      }),
    ).toEqual({ fechaProximoSeguimiento: ACORDADA, seguimientoManual: true });
  });

  it.each<Etapa>(["joined", "discarded"])(
    "etapa terminal %s: borra la fecha Y el booleano, aunque el acuerdo estuviera activo",
    (etapa) => {
      expect(
        seguimientoTrasCambioEtapa(etapa, REF, {
          fechaProximoSeguimiento: ACORDADA,
          seguimientoManual: true,
        }),
      ).toEqual({ fechaProximoSeguimiento: undefined, seguimientoManual: undefined });
    },
  );

  it("terminal → activa con el booleano colgado: el motor recalcula, no se queda sin fecha", () => {
    // Estado imposible de producir con esta API (el paso a terminal limpia los dos
    // campos), pero si llegase de datos antiguos NO puede desactivar el motor: el
    // prospecto se quedaría invisible en la Actividad Diaria para siempre.
    expect(seguimientoTrasCambioEtapa("contacted", REF, { seguimientoManual: true })).toEqual({
      fechaProximoSeguimiento: zonedMidnightToMs({ y: 2026, m: 7, d: 15 }, APP_TZ),
      seguimientoManual: undefined,
    });
  });

  it("seguimientoManual a false se trata como ausencia de acuerdo", () => {
    expect(
      seguimientoTrasCambioEtapa("new", REF, {
        fechaProximoSeguimiento: ACORDADA,
        seguimientoManual: false,
      }),
    ).toEqual({
      fechaProximoSeguimiento: zonedMidnightToMs({ y: 2026, m: 7, d: 13 }, APP_TZ),
      seguimientoManual: undefined,
    });
  });
});
