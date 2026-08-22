// @vitest-environment jsdom
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_ACTIVIDAD, VENCIDOS_VISIBLES } from "../../../../convex/lib/constants";
import { consumirFlash, escribirFlash } from "@/lib/flash";
import { BANNER_VISTA_PARCIAL } from "./textos";
import ActividadPage from "./page";

// La página no monta un proveedor Convex real: se mockea useQuery (estrategia
// fijada en el plan) y se inspeccionan sus argumentos para el dayKey.
const { useQueryMock, pushMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("convex/react", () => ({ useQuery: useQueryMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

type Payload = {
  dayKey: string;
  tieneProspectos: boolean;
  ritmo: {
    completados: number;
    pendientes: number;
    total: number;
    completadosTruncados: boolean;
    pendientesTruncados: boolean;
    aproximado: true;
  };
  hoy: Prospecto[];
  vencidos: Prospecto[];
  truncado: { hoy: boolean; vencidos: boolean };
};

type Prospecto = {
  id: string;
  nombre: string;
  etapaActual: "new" | "contacted" | "presented" | "evaluating" | "joined" | "discarded";
  canalContactoPreferido: "phone" | "whatsapp" | "mail" | "instagram" | "otro";
  prioridad: "high" | "medium" | "low";
  fechaUltimoContacto?: number;
  diasVencido?: number;
};

function payload(overrides: Partial<Payload> = {}): Payload {
  return {
    dayKey: "2026-07-12",
    tieneProspectos: true,
    ritmo: { completados: 0, pendientes: 0, total: 0, completadosTruncados: false, pendientesTruncados: false, aproximado: true },
    hoy: [],
    vencidos: [],
    truncado: { hoy: false, vencidos: false },
    ...overrides,
  };
}

function prospecto(id: string, nombre: string, extra: Partial<Prospecto> = {}): Prospecto {
  return { id, nombre, etapaActual: "new", canalContactoPreferido: "phone", prioridad: "medium", ...extra };
}

function ultimoDayKey(): string {
  const llamadas = useQueryMock.mock.calls;
  return (llamadas[llamadas.length - 1][1] as { dayKey: string }).dayKey;
}

beforeEach(() => {
  useQueryMock.mockReset();
  pushMock.mockReset();
  // El flash vive en sessionStorage: sin limpiar, un toast se filtraría de un
  // test al siguiente.
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("estados de la pantalla", () => {
  it("carga: placeholder mientras la query no responde", () => {
    useQueryMock.mockReturnValue(undefined);
    render(<ActividadPage />);
    expect(screen.getByText("Cargando actividad…")).toBeDefined();
  });

  it("sin prospectos: EmptyState con CTA de alta", () => {
    useQueryMock.mockReturnValue(payload({ tieneProspectos: false }));
    render(<ActividadPage />);
    expect(screen.getByText("Aún no tienes prospectos")).toBeDefined();
    const cta = screen.getByRole("link", { name: /Añadir prospecto/ });
    expect(cta.getAttribute("href")).toBe("/prospectos/nuevo");
  });

  it("todo al día: mensaje positivo, ritmo visible, CTA de alta y sin afirmar que no hay prospectos", () => {
    useQueryMock.mockReturnValue(
      payload({ ritmo: { completados: 2, pendientes: 0, total: 2, completadosTruncados: false, pendientesTruncados: false, aproximado: true } }),
    );
    render(<ActividadPage />);
    expect(screen.getByText("¡Todo al día!")).toBeDefined();
    expect(screen.getByText("No tienes seguimientos pendientes.")).toBeDefined();
    expect(screen.getByText("2 de 2 seguimientos de hoy (aprox.)")).toBeDefined();
    // Botón de alta exigido por JOS-22 también en este estado
    const cta = screen.getByRole("link", { name: /Añadir prospecto/ });
    expect(cta.getAttribute("href")).toBe("/prospectos/nuevo");
    expect(screen.queryByText("Aún no tienes prospectos")).toBeNull();
  });

  it("todo al día sin contactos hechos: el ritmo no se muestra pero el CTA de alta sí", () => {
    useQueryMock.mockReturnValue(payload());
    render(<ActividadPage />);
    expect(screen.getByText("¡Todo al día!")).toBeDefined();
    expect(screen.queryByText(/aprox\./)).toBeNull();
    expect(screen.getByRole("link", { name: /Añadir prospecto/ })).toBeDefined();
  });

  it("actividad: secciones, tarjetas, ritmo y navegación a la ficha", () => {
    useQueryMock.mockReturnValue(
      payload({
        ritmo: { completados: 1, pendientes: 2, total: 3, completadosTruncados: false, pendientesTruncados: false, aproximado: true },
        hoy: [prospecto("p1", "Marta Ruiz"), prospecto("p2", "Carlos Vega", { etapaActual: "contacted" })],
        vencidos: [prospecto("p3", "Elena Prat", { etapaActual: "presented", diasVencido: 7 })],
      }),
    );
    render(<ActividadPage />);
    expect(screen.getByRole("heading", { name: /Para hoy \(2\)/ })).toBeDefined();
    expect(screen.getByRole("heading", { name: /Seguimientos vencidos \(1\)/ })).toBeDefined();
    expect(screen.getByText("Marta Ruiz")).toBeDefined();
    expect(screen.getByText("Elena Prat")).toBeDefined();
    expect(screen.getByText("Vencido hace 7 días")).toBeDefined();
    expect(screen.getByText("1 de 3 seguimientos de hoy (aprox.)")).toBeDefined();
    expect(screen.queryByText(BANNER_VISTA_PARCIAL)).toBeNull();

    fireEvent.click(screen.getByText("Elena Prat"));
    expect(pushMock).toHaveBeenCalledWith("/prospectos/p3");
  });

  it("cada tarjeta muestra el puntito de SU prioridad, no el «medium» fijo de antes (JOS-54)", () => {
    useQueryMock.mockReturnValue(
      payload({
        hoy: [
          prospecto("p1", "Alta Uno", { prioridad: "high" }),
          prospecto("p2", "Media Dos", { prioridad: "medium" }),
        ],
        vencidos: [prospecto("p3", "Baja Tres", { prioridad: "low", diasVencido: 2 })],
      }),
    );
    render(<ActividadPage />);
    // El puntito de ProspectCard expone la prioridad por su aria-label.
    expect(screen.getByLabelText("Prioridad Alta")).toBeDefined();
    expect(screen.getByLabelText("Prioridad Baja")).toBeDefined();
    // Exactamente UNA «Media» (la tarjeta p2): antes salían tres, con el valor fijo.
    expect(screen.getAllByLabelText("Prioridad Media")).toHaveLength(1);
  });

  it("actividad truncada: banner exacto de vista parcial y '≥' solo en la cantidad truncada", () => {
    useQueryMock.mockReturnValue(
      payload({
        ritmo: { completados: 3, pendientes: MAX_ACTIVIDAD, total: MAX_ACTIVIDAD + 3, completadosTruncados: false, pendientesTruncados: true, aproximado: true },
        hoy: Array.from({ length: 30 }, (_, i) => prospecto(`h${i}`, `Hoy ${i}`)),
        truncado: { hoy: true, vencidos: false },
      }),
    );
    render(<ActividadPage />);
    expect(screen.getByText(BANNER_VISTA_PARCIAL)).toBeDefined();
    expect(screen.getByText(`3 completados · ≥${MAX_ACTIVIDAD} pendientes (aprox.)`)).toBeDefined();
  });
});

describe("vencidos: VENCIDOS_VISIBLES y expansión local", () => {
  it("muestra 25, expande con 'Ver todos (N)' sin volver a pedir datos", () => {
    const vencidos = Array.from({ length: VENCIDOS_VISIBLES + 3 }, (_, i) =>
      prospecto(`v${i}`, `Vencido ${i + 1}`, { diasVencido: 2 }),
    );
    useQueryMock.mockReturnValue(payload({ vencidos }));
    render(<ActividadPage />);

    expect(screen.getByText("Vencido 25")).toBeDefined();
    expect(screen.queryByText("Vencido 26")).toBeNull();

    const llamadasAntes = useQueryMock.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: `Ver todos (${vencidos.length})` }));

    expect(screen.getByText("Vencido 26")).toBeDefined();
    expect(screen.getByText("Vencido 28")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Ver todos/ })).toBeNull();
    // Expansión local: el re-render usa el mismo array ya recibido
    expect(useQueryMock.mock.calls.length - llamadasAntes).toBeLessThanOrEqual(1);
  });
});

describe("renovación de día a medianoche (Europe/Madrid)", () => {
  it("re-suscribe la query con el dayKey recomputado y se re-arma", async () => {
    vi.useFakeTimers();
    // 23:59 de Madrid del 12-jul-2026 (UTC+2 en verano) = 21:59 UTC
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 12, 21, 59)));
    useQueryMock.mockReturnValue(undefined);
    render(<ActividadPage />);
    expect(ultimoDayKey()).toBe("2026-07-12");

    await act(async () => {
      vi.advanceTimersByTime(61_000); // cruza la medianoche
    });
    expect(ultimoDayKey()).toBe("2026-07-13");

    await act(async () => {
      vi.advanceTimersByTime(24 * 3_600_000); // el timer se re-armó: siguiente medianoche
    });
    expect(ultimoDayKey()).toBe("2026-07-14");
  });
});

describe("acción rápida «Ya contacté» (JOS-23)", () => {
  it("lleva al formulario del prospecto marcando el origen, sin abrir la ficha", () => {
    useQueryMock.mockReturnValue(payload({ hoy: [prospecto("p1", "Marta Ruiz")] }));
    render(<ActividadPage />);

    fireEvent.click(screen.getByRole("button", { name: "Ya contacté con Marta Ruiz" }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/prospectos/p1/interacciones/nueva?volver=actividad");
    // La ficha NO se abre: ese sería el flujo de 4 pasos que JOS-23 evita.
    expect(pushMock).not.toHaveBeenCalledWith("/prospectos/p1");
  });

  it("también está en los vencidos, que son igualmente prospectos a contactar", () => {
    useQueryMock.mockReturnValue(
      payload({ vencidos: [prospecto("p3", "Elena Prat", { etapaActual: "presented", diasVencido: 7 })] }),
    );
    render(<ActividadPage />);

    fireEvent.click(screen.getByRole("button", { name: "Ya contacté con Elena Prat" }));

    expect(pushMock).toHaveBeenCalledWith("/prospectos/p3/interacciones/nueva?volver=actividad");
  });

  it("cada tarjeta lleva su propio botón, distinguible por el nombre", () => {
    useQueryMock.mockReturnValue(
      payload({ hoy: [prospecto("p1", "Marta Ruiz"), prospecto("p2", "Carlos Vega")] }),
    );
    render(<ActividadPage />);

    expect(screen.getAllByRole("button", { name: /^Ya contacté con/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Ya contacté con Carlos Vega" }));
    expect(pushMock).toHaveBeenCalledWith("/prospectos/p2/interacciones/nueva?volver=actividad");
  });
});

describe("reactividad tras registrar el contacto (JOS-23, puntos 7 y 8)", () => {
  const ritmo = (completados: number, pendientes: number) => ({
    completados,
    pendientes,
    total: completados + pendientes,
    completadosTruncados: false,
    pendientesTruncados: false,
    aproximado: true as const,
  });

  it("cuando la query se reemite sin el prospecto contactado, este sale de «Para hoy» y el ritmo sube", () => {
    useQueryMock.mockReturnValue(
      payload({ ritmo: ritmo(0, 2), hoy: [prospecto("p1", "Marta Ruiz"), prospecto("p2", "Carlos Vega")] }),
    );
    const { rerender } = render(<ActividadPage />);
    expect(screen.getByText("Marta Ruiz")).toBeDefined();
    expect(screen.getByText("0 de 2 seguimientos de hoy (aprox.)")).toBeDefined();

    // Lo que hace Convex por su cuenta al confirmarse la mutación: reemite la
    // query ya recalculada. No hay refresco manual en la pantalla.
    useQueryMock.mockReturnValue(payload({ ritmo: ritmo(1, 1), hoy: [prospecto("p2", "Carlos Vega")] }));
    rerender(<ActividadPage />);

    expect(screen.queryByText("Marta Ruiz")).toBeNull();
    expect(screen.getByText("Carlos Vega")).toBeDefined();
    expect(screen.getByRole("heading", { name: /Para hoy \(1\)/ })).toBeDefined();
    expect(screen.getByText("1 de 2 seguimientos de hoy (aprox.)")).toBeDefined();
  });

  it("si era el último pendiente, la pantalla pasa a «¡Todo al día!»", () => {
    useQueryMock.mockReturnValue(payload({ ritmo: ritmo(0, 1), hoy: [prospecto("p1", "Marta Ruiz")] }));
    const { rerender } = render(<ActividadPage />);
    expect(screen.getByText("Marta Ruiz")).toBeDefined();

    useQueryMock.mockReturnValue(payload({ ritmo: ritmo(1, 0), hoy: [] }));
    rerender(<ActividadPage />);

    expect(screen.queryByText("Marta Ruiz")).toBeNull();
    expect(screen.getByText("¡Todo al día!")).toBeDefined();
    expect(screen.getByText("1 de 1 seguimiento de hoy (aprox.)")).toBeDefined();
  });
});

describe("toast de confirmación al volver del formulario (JOS-23)", () => {
  const MENSAJE = "Interacción registrada, próximo contacto: 17 jul 2026";

  it("«¡Todo al día!»: se ve aunque no quede ni una tarjeta", () => {
    // El caso límite que motivó subir el consumo del flash a ActividadPage:
    // se contacta al último prospecto pendiente y <Actividad> ni se monta.
    escribirFlash(MENSAJE);
    useQueryMock.mockReturnValue(payload());
    render(<ActividadPage />);

    expect(screen.getByText("¡Todo al día!")).toBeDefined();
    expect(screen.getByText(MENSAJE)).toBeDefined();
  });

  it("sin prospectos: se ve sobre el estado vacío", () => {
    escribirFlash(MENSAJE);
    useQueryMock.mockReturnValue(payload({ tieneProspectos: false }));
    render(<ActividadPage />);

    expect(screen.getByText("Aún no tienes prospectos")).toBeDefined();
    expect(screen.getByText(MENSAJE)).toBeDefined();
  });

  it("cargando: se ve antes de que la query responda", () => {
    escribirFlash(MENSAJE);
    useQueryMock.mockReturnValue(undefined);
    render(<ActividadPage />);

    expect(screen.getByText("Cargando actividad…")).toBeDefined();
    expect(screen.getByText(MENSAJE)).toBeDefined();
  });

  it("con actividad: se ve junto a las tarjetas restantes", () => {
    escribirFlash(MENSAJE);
    useQueryMock.mockReturnValue(payload({ hoy: [prospecto("p2", "Carlos Vega")] }));
    render(<ActividadPage />);

    expect(screen.getByText("Carlos Vega")).toBeDefined();
    expect(screen.getByText(MENSAJE)).toBeDefined();
  });

  it("Strict Mode: el flash se consume una sola vez y el mensaje sigue visible", () => {
    escribirFlash(MENSAJE);
    useQueryMock.mockReturnValue(payload());
    render(
      <React.StrictMode>
        <ActividadPage />
      </React.StrictMode>,
    );

    // Sin la guarda de ref, la segunda pasada del efecto leería un flash ya
    // vacío y pisaría el aviso con null.
    expect(screen.getByText(MENSAJE)).toBeDefined();
    // Y se consumió: no queda residuo que reaparezca en la siguiente visita.
    expect(consumirFlash()).toBeNull();
  });

  it("sin flash pendiente no aparece ningún toast", () => {
    useQueryMock.mockReturnValue(payload({ hoy: [prospecto("p1", "Marta Ruiz")] }));
    render(<ActividadPage />);

    expect(screen.queryByText(MENSAJE)).toBeNull();
  });
});
