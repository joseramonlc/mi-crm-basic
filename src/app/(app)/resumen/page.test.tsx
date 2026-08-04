// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { addCivilDays, formatDayKey, parseDayKey } from "../../../../convex/lib/fecha";
import {
  BANNER_VISTA_PARCIAL,
  CARGANDO,
  SECCION_ACTIVIDAD,
  SECCION_ETAPAS,
  SECCION_PENDIENTES,
  SECCION_TOTALES,
  SECCION_TOTALES_PARCIAL,
} from "./textos";
import ResumenPage from "./page";

// Como el resto de pantallas: no se monta un proveedor Convex real. `useDayKey`
// se simula porque hay casos —la medianoche— que dependen de que el día cambie.
const { useQueryMock, useDayKeyMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useDayKeyMock: vi.fn(),
}));

vi.mock("convex/react", () => ({ useQuery: useQueryMock }));
vi.mock("@/lib/useDayKey", () => ({ useDayKey: useDayKeyMock }));

type Etapa = "new" | "contacted" | "presented" | "evaluating" | "joined" | "discarded";

const DAY_KEY = "2026-08-04";
const DAY_KEY_SIGUIENTE = "2026-08-05";
const DESDE_SEMANA = "2026-07-29";
const DESDE_MES = "2026-07-06";

const SEMANA = ["2026-07-29", "2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04"];

/** 30 dayKeys correlativos; solo son identificadores válidos, no se afirma nada sobre ellos. */
function treintaDias(): string[] {
  const primero = parseDayKey(DESDE_MES);
  return Array.from({ length: 30 }, (_, i) => formatDayKey(addCivilDays(primero, i)));
}

function serieDe(dias: string[], valores: number[] = []): Array<{ dayKey: string; valor: number }> {
  return dias.map((dayKey, i) => ({ dayKey, valor: valores[i] ?? 0 }));
}

function payload(overrides: {
  porEtapa?: Partial<Record<Etapa, number>>;
  exactoProspectos?: boolean;
  pendientes?: { vencidos: number; hoy: number };
  nuevosEnPeriodo?: number;
  exactoInteracciones?: boolean;
  totalEnPeriodo?: number;
  serie?: Array<{ dayKey: string; valor: number }>;
  diaCompletoDesde?: string | null;
  desde?: string;
} = {}) {
  const porEtapa = {
    new: 0,
    contacted: 0,
    presented: 0,
    evaluating: 0,
    joined: 0,
    discarded: 0,
    ...overrides.porEtapa,
  };
  const leidos = Object.values(porEtapa).reduce((a, b) => a + b, 0);

  return {
    periodo: { desde: overrides.desde ?? DESDE_SEMANA, hastaIncluido: DAY_KEY },
    prospectos: {
      exacto: overrides.exactoProspectos ?? true,
      porEtapa,
      pendientes: overrides.pendientes ?? { vencidos: 0, hoy: 0 },
      nuevosEnPeriodo: overrides.nuevosEnPeriodo ?? 0,
      // Coherentes con porEtapa por construcción, como en el servidor.
      totales: { activos: leidos - porEtapa.discarded, incorporados: porEtapa.joined, descartados: porEtapa.discarded },
    },
    interacciones: {
      exacto: overrides.exactoInteracciones ?? true,
      totalEnPeriodo: overrides.totalEnPeriodo ?? 0,
      serie: overrides.serie ?? serieDe(SEMANA),
      diaCompletoDesde: overrides.diaCompletoDesde ?? null,
    },
  };
}

/** Payload con contenido en todas las secciones, para los casos "normales". */
function payloadPoblado(extra: Parameters<typeof payload>[0] = {}) {
  return payload({
    porEtapa: { new: 4, contacted: 3, presented: 2, evaluating: 1, joined: 1, discarded: 1 },
    pendientes: { vencidos: 2, hoy: 3 },
    nuevosEnPeriodo: 3,
    totalEnPeriodo: 12,
    serie: serieDe(SEMANA, [1, 0, 2, 3, 1, 4, 1]),
    ...extra,
  });
}

function seccion(nombre: string) {
  return within(screen.getByRole("region", { name: nombre }));
}

beforeEach(() => {
  useQueryMock.mockReset();
  useDayKeyMock.mockReset();
  useDayKeyMock.mockReturnValue(DAY_KEY);
});

afterEach(cleanup);

describe("estados de la pantalla", () => {
  it("mientras carga muestra el aviso y ninguna sección", () => {
    useQueryMock.mockReturnValue(undefined);
    render(<ResumenPage />);

    expect(screen.getByRole("status").textContent).toBe(CARGANDO);
    expect(screen.queryByRole("region", { name: SECCION_ETAPAS })).toBeNull();
  });

  it("sin ningún prospecto muestra el vacío con CTA de alta", () => {
    useQueryMock.mockReturnValue(payload());
    render(<ResumenPage />);

    expect(screen.getByText("Aún no tienes prospectos")).toBeDefined();
    expect(screen.getByRole("link", { name: "Añadir prospecto" }).getAttribute("href")).toBe("/prospectos/nuevo");
    expect(screen.queryByRole("region", { name: SECCION_ETAPAS })).toBeNull();
  });

  it("con un solo prospecto ya NO se considera vacío (D1: cero contado = tenant vacío)", () => {
    useQueryMock.mockReturnValue(payload({ porEtapa: { new: 1 } }));
    render(<ResumenPage />);

    expect(screen.queryByText("Aún no tienes prospectos")).toBeNull();
    expect(screen.getByRole("region", { name: SECCION_ETAPAS })).toBeDefined();
  });

  it("con datos pinta las cinco secciones", () => {
    useQueryMock.mockReturnValue(payloadPoblado());
    render(<ResumenPage />);

    expect(screen.getByRole("radiogroup", { name: "Período" })).toBeDefined();
    for (const nombre of [SECCION_ETAPAS, SECCION_PENDIENTES, SECCION_ACTIVIDAD, SECCION_TOTALES]) {
      expect(screen.getByRole("region", { name: nombre })).toBeDefined();
    }
  });

  it("sin actividad en el período lo dice sin dramatismo, y el gráfico sigue ahí", () => {
    useQueryMock.mockReturnValue(payload({ porEtapa: { new: 2 }, totalEnPeriodo: 0, nuevosEnPeriodo: 0 }));
    render(<ResumenPage />);

    const actividad = seccion(SECCION_ACTIVIDAD);
    expect(actividad.getByText("Sin actividad registrada entre el 29 de julio y el 4 de agosto.")).toBeDefined();
    expect(actividad.getByRole("list", { name: "Interacciones por día" })).toBeDefined();
  });
});

describe("el selector de período afecta solo a la sección 4", () => {
  it("las secciones 2, 3 y 5 no varían al cambiar de período", () => {
    // Referencias ESTABLES por período, como las devuelve el useQuery real: se
    // construyen una vez, no en cada llamada.
    const semana = payloadPoblado();
    const mes = payloadPoblado({ totalEnPeriodo: 40, serie: serieDe(treintaDias()), desde: DESDE_MES });
    useQueryMock.mockImplementation((_query: unknown, args: { periodo: string }) => (args.periodo === "semana" ? semana : mes));
    render(<ResumenPage />);

    const antes = [SECCION_ETAPAS, SECCION_PENDIENTES, SECCION_TOTALES].map(
      (n) => screen.getByRole("region", { name: n }).textContent,
    );
    const actividadAntes = screen.getByRole("region", { name: SECCION_ACTIVIDAD }).textContent;

    fireEvent.click(screen.getByRole("radio", { name: "Últimos 30 días" }));

    const despues = [SECCION_ETAPAS, SECCION_PENDIENTES, SECCION_TOTALES].map(
      (n) => screen.getByRole("region", { name: n }).textContent,
    );
    expect(despues).toEqual(antes);
    expect(screen.getByRole("region", { name: SECCION_ACTIVIDAD }).textContent).not.toBe(actividadAntes);
  });
});

describe("parcialidad por métrica (§5.2)", () => {
  it("con prospectos truncados, NINGUNA de sus siete métricas aparece sin marca", () => {
    useQueryMock.mockReturnValue(
      payloadPoblado({ exactoProspectos: false, porEtapa: { new: 500, contacted: 400, presented: 200, evaluating: 60, joined: 30, discarded: 10 } }),
    );
    render(<ResumenPage />);

    // 1-6: los seis recuentos por etapa.
    const etapas = seccion(SECCION_ETAPAS);
    for (const valor of ["500+", "400+", "200+", "60+", "30+", "10+"]) {
      expect(etapas.getByText(valor)).toBeDefined();
    }

    // 7-8: pendientes (total y desglose).
    const pendientes = seccion(SECCION_PENDIENTES);
    expect(pendientes.getByText("5+")).toBeDefined();
    expect(pendientes.getByText("2+ vencidos · 3+ para hoy")).toBeDefined();

    // 9: nuevos del período, dentro de la sección 4.
    expect(seccion(SECCION_ACTIVIDAD).getByText(/3\+ prospectos nuevos/)).toBeDefined();

    // 10-12: los totales, que además dejan de llamarse "totales".
    const totales = seccion(SECCION_TOTALES_PARCIAL);
    expect(totales.getByText("1190+")).toBeDefined();
    expect(totales.getByText("30+")).toBeDefined();
    expect(totales.getByText("10+")).toBeDefined();
    expect(screen.queryByRole("region", { name: SECCION_TOTALES })).toBeNull();

    // Y el banner que explica de dónde sale el corte.
    expect(screen.getByText(BANNER_VISTA_PARCIAL)).toBeDefined();
  });

  it("caso mixto: nuevos marcado e interacciones sin marcar, en la misma sección", () => {
    useQueryMock.mockReturnValue(payloadPoblado({ exactoProspectos: false, exactoInteracciones: true }));
    render(<ResumenPage />);

    expect(seccion(SECCION_ACTIVIDAD).getByText("12 interacciones y 3+ prospectos nuevos entre el 29 de julio y el 4 de agosto.")).toBeDefined();
  });

  it("caso inverso: interacciones marcadas y nuevos sin marcar", () => {
    useQueryMock.mockReturnValue(
      payloadPoblado({ exactoProspectos: true, exactoInteracciones: false, totalEnPeriodo: 500, diaCompletoDesde: "2026-08-02" }),
    );
    render(<ResumenPage />);

    expect(seccion(SECCION_ACTIVIDAD).getByText(/^500\+ interacciones y 3 prospectos nuevos/)).toBeDefined();
  });

  it("las dos lecturas truncadas a la vez marcan las dos cifras", () => {
    useQueryMock.mockReturnValue(
      payloadPoblado({ exactoProspectos: false, exactoInteracciones: false, totalEnPeriodo: 500, diaCompletoDesde: "2026-08-02" }),
    );
    render(<ResumenPage />);

    expect(seccion(SECCION_ACTIVIDAD).getByText(/^500\+ interacciones y 3\+ prospectos nuevos/)).toBeDefined();
  });

  it("las cifras siguen la norma española: separador de millar solo a partir de cinco dígitos", () => {
    // La cota del Resumen (1.200) es justo de cuatro dígitos, así que esta es la
    // frontera que de verdad se ve en pantalla. En español —norma de la RAE, que
    // Intl aplica— los números de cuatro cifras van SIN separador.
    useQueryMock.mockReturnValue(payload({ porEtapa: { new: 1200 } }));
    const { rerender } = render(<ResumenPage />);
    expect(seccion(SECCION_ETAPAS).getByText("1200")).toBeDefined();

    useQueryMock.mockReturnValue(payload({ porEtapa: { new: 1200 }, exactoProspectos: false }));
    rerender(<ResumenPage />);
    expect(seccion(SECCION_ETAPAS).getByText("1200+")).toBeDefined();

    // A partir de cinco dígitos sí lo lleva.
    useQueryMock.mockReturnValue(payload({ porEtapa: { new: 10000 } }));
    rerender(<ResumenPage />);
    expect(seccion(SECCION_ETAPAS).getByText("10.000")).toBeDefined();
  });
});

describe("serie parcial: sin datos nunca es cero", () => {
  it("los días anteriores a diaCompletoDesde se declaran sin datos, no como 0", () => {
    useQueryMock.mockReturnValue(
      payloadPoblado({
        exactoInteracciones: false,
        totalEnPeriodo: 500,
        diaCompletoDesde: "2026-08-02",
        serie: serieDe(SEMANA, [0, 0, 0, 0, 1, 4, 1]),
      }),
    );
    render(<ResumenPage />);

    // 31 de julio es anterior al primer día completo: no se midió.
    expect(screen.getByText("viernes, 31 de julio: sin datos")).toBeDefined();
    // 2 de agosto sí, y ahí un 1 es un 1.
    expect(screen.getByText("domingo, 2 de agosto: 1 interacción")).toBeDefined();
    expect(screen.getByText(/Datos completos desde el 2 de agosto/)).toBeDefined();
  });

  it("un 0 real y un día sin datos producen textos distintos en la misma serie", () => {
    useQueryMock.mockReturnValue(
      payloadPoblado({
        exactoInteracciones: false,
        totalEnPeriodo: 500,
        diaCompletoDesde: "2026-08-02",
        serie: serieDe(SEMANA, [0, 0, 0, 0, 0, 4, 1]),
      }),
    );
    render(<ResumenPage />);

    expect(screen.getByText("viernes, 31 de julio: sin datos")).toBeDefined();
    expect(screen.getByText("domingo, 2 de agosto: sin interacciones")).toBeDefined();
  });

  it("sin ningún día completo, las 30 barras son sin datos y la serie se declara no fiable", () => {
    const dias = treintaDias();
    useQueryMock.mockReturnValue(
      payloadPoblado({
        exactoInteracciones: false,
        totalEnPeriodo: 500,
        diaCompletoDesde: null,
        // Valores presentes en el payload: si se pintaran, mentirían.
        serie: serieDe(dias, dias.map((_, i) => (i % 3 === 0 ? 2 : 0))),
        desde: DESDE_MES,
      }),
    );
    render(<ResumenPage />);

    expect(screen.getAllByText(/: sin datos$/)).toHaveLength(30);
    expect(screen.queryByText(/sin interacciones$/)).toBeNull();
    expect(screen.getByText(/no muestra datos fiables/)).toBeDefined();
  });
});

describe("retención de datos entre recargas (D3)", () => {
  it("al PULSAR el selector, las secciones 2, 3 y 5 no parpadean mientras viaja la consulta", () => {
    // Transición real: la consulta de "semana" ya tiene dato y la de "mes" aún
    // no. Pulsar el pill cambia los argumentos y useQuery pasa a devolver
    // undefined — que es exactamente el instante que la retención cubre.
    const semana = payloadPoblado();
    useQueryMock.mockImplementation((_query: unknown, args: { periodo: string }) => (args.periodo === "semana" ? semana : undefined));
    render(<ResumenPage />);
    expect(seccion(SECCION_PENDIENTES).getByText("5")).toBeDefined();

    fireEvent.click(screen.getByRole("radio", { name: "Últimos 30 días" }));

    expect(screen.queryByRole("status")).toBeNull();
    expect(seccion(SECCION_PENDIENTES).getByText("5")).toBeDefined();
    expect(seccion(SECCION_ETAPAS).getAllByText("4")).toHaveLength(1);
    expect(screen.getByRole("region", { name: SECCION_ACTIVIDAD }).getAttribute("aria-busy")).toBe("true");
  });

  it("cruzada la medianoche NO se retiene nada: los pendientes de ayer serían falsos", () => {
    useQueryMock.mockReturnValue(payloadPoblado());
    const { rerender } = render(<ResumenPage />);
    expect(seccion(SECCION_PENDIENTES).getByText("5")).toBeDefined();

    useDayKeyMock.mockReturnValue(DAY_KEY_SIGUIENTE);
    useQueryMock.mockReturnValue(undefined);
    rerender(<ResumenPage />);

    expect(screen.getByRole("status").textContent).toBe(CARGANDO);
    expect(screen.queryByRole("region", { name: SECCION_PENDIENTES })).toBeNull();
  });
});

describe("accesibilidad y navegación", () => {
  it("los siete valores del gráfico están disponibles sin visión", () => {
    useQueryMock.mockReturnValue(payloadPoblado());
    render(<ResumenPage />);

    expect(screen.getByText("miércoles, 29 de julio: 1 interacción")).toBeDefined();
    expect(screen.getByText("jueves, 30 de julio: sin interacciones")).toBeDefined();
    expect(screen.getByText("viernes, 31 de julio: 2 interacciones")).toBeDefined();
    expect(screen.getByText("sábado, 1 de agosto: 3 interacciones")).toBeDefined();
    expect(screen.getByText("domingo, 2 de agosto: 1 interacción")).toBeDefined();
    expect(screen.getByText("lunes, 3 de agosto: 4 interacciones")).toBeDefined();
    expect(screen.getByText("martes, 4 de agosto: 1 interacción")).toBeDefined();
  });

  it("el enlace a Actividad Diaria navega y no escribe nada", () => {
    useQueryMock.mockReturnValue(payloadPoblado());
    render(<ResumenPage />);

    const enlace = seccion(SECCION_PENDIENTES).getByRole("link", { name: "Ver en Actividad Diaria →" });
    expect(enlace.getAttribute("href")).toBe("/actividad");
    // La pantalla es de solo lectura: no hay botones de acción en ninguna sección.
    expect(seccion(SECCION_PENDIENTES).queryByRole("button")).toBeNull();
  });

  it("sin seguimientos pendientes lo dice en texto, no con un cero desnudo", () => {
    useQueryMock.mockReturnValue(payload({ porEtapa: { new: 2 }, pendientes: { vencidos: 0, hoy: 0 } }));
    render(<ResumenPage />);

    expect(seccion(SECCION_PENDIENTES).getByText("No tienes seguimientos pendientes.")).toBeDefined();
  });
});

describe("una lectura truncada NUNCA afirma una ausencia", () => {
  it("con ceros observados pero lectura parcial, NO dice que no haya pendientes", () => {
    // Los 1.200 leídos no tienen ningún seguimiento vencido ni para hoy, pero
    // quedan prospectos sin leer: afirmar "no tienes pendientes" sería mentir.
    useQueryMock.mockReturnValue(
      payloadPoblado({ exactoProspectos: false, pendientes: { vencidos: 0, hoy: 0 } }),
    );
    render(<ResumenPage />);

    const pendientes = seccion(SECCION_PENDIENTES);
    expect(pendientes.queryByText("No tienes seguimientos pendientes.")).toBeNull();
    expect(pendientes.getByText("0+ vencidos · 0+ para hoy")).toBeDefined();
  });

  it("con lectura exacta y ceros reales, sí puede afirmarlo", () => {
    useQueryMock.mockReturnValue(payloadPoblado({ exactoProspectos: true, pendientes: { vencidos: 0, hoy: 0 } }));
    render(<ResumenPage />);

    expect(seccion(SECCION_PENDIENTES).getByText("No tienes seguimientos pendientes.")).toBeDefined();
  });

  it("con prospectos truncados y cero altas observadas, NO declara 'sin actividad'", () => {
    // Las interacciones sí son exactas (0 de verdad), pero las altas del período
    // salen de la lectura truncada: puede haber prospectos nuevos sin leer.
    useQueryMock.mockReturnValue(
      payloadPoblado({ exactoProspectos: false, exactoInteracciones: true, totalEnPeriodo: 0, nuevosEnPeriodo: 0 }),
    );
    render(<ResumenPage />);

    const actividad = seccion(SECCION_ACTIVIDAD);
    expect(actividad.queryByText(/Sin actividad registrada/)).toBeNull();
    expect(actividad.getByText(/^0 interacciones y 0\+ prospectos nuevos/)).toBeDefined();
  });

  it("con las dos lecturas exactas y todo a cero, sí declara 'sin actividad'", () => {
    useQueryMock.mockReturnValue(
      payloadPoblado({ exactoProspectos: true, exactoInteracciones: true, totalEnPeriodo: 0, nuevosEnPeriodo: 0 }),
    );
    render(<ResumenPage />);

    expect(seccion(SECCION_ACTIVIDAD).getByText(/^Sin actividad registrada/)).toBeDefined();
  });
});
