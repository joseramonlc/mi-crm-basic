// @vitest-environment jsdom
import * as React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_PIPELINE, PIPELINE_VISIBLES } from "../../../../convex/lib/constants";
import { BANNER_VISTA_PARCIAL, SIN_PROSPECTOS_ETAPA } from "./textos";
import PipelinePage from "./page";

// Como el resto de pantallas: no se monta un proveedor Convex real.
const { useQueryMock, pushMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("convex/react", () => ({ useQuery: useQueryMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

type Etapa = "new" | "contacted" | "presented" | "evaluating" | "joined" | "discarded";

type Prospecto = {
  id: string;
  nombre: string;
  etapaActual: Etapa;
  canalContactoPreferido: "phone" | "whatsapp" | "mail" | "instagram" | "otro";
  prioridad: "high" | "medium" | "low";
  fechaUltimoContacto?: number;
  fechaProximoSeguimiento?: number;
  diasVencido?: number;
};

type Grupo = { prospectos: Prospecto[]; total: number; truncado: boolean };

const DAY_KEY = "2026-07-12";
// Medianoche del 2026-07-12 en Europe/Madrid, coherente con DAY_KEY.
const HOY_INICIO = Date.UTC(2026, 6, 11, 22, 0, 0);
const DIA = 86_400_000;
const ETAPAS: Etapa[] = ["new", "contacted", "presented", "evaluating", "joined", "discarded"];

function grupo(prospectos: Prospecto[] = [], truncado = false): Grupo {
  return { prospectos, total: prospectos.length, truncado };
}

function payload(grupos: Partial<Record<Etapa, Grupo>> = {}, overrides: { tieneProspectos?: boolean } = {}) {
  return {
    dayKey: DAY_KEY,
    tieneProspectos: overrides.tieneProspectos ?? true,
    grupos: Object.fromEntries(ETAPAS.map((e) => [e, grupos[e] ?? grupo()])) as Record<Etapa, Grupo>,
  };
}

function prospecto(id: string, nombre: string, extra: Partial<Prospecto> = {}): Prospecto {
  return { id, nombre, etapaActual: "new", canalContactoPreferido: "phone", prioridad: "medium", ...extra };
}

/** La cabecera de cada etapa es el disclosure: <h2> con un <button aria-expanded>. */
function cabecera(nombre: RegExp) {
  return screen.getByRole("button", { name: nombre });
}

beforeEach(() => {
  useQueryMock.mockReset();
  pushMock.mockReset();
});

afterEach(cleanup);

describe("estados de la pantalla", () => {
  it("mientras carga muestra el aviso y ninguna sección", () => {
    useQueryMock.mockReturnValue(undefined);
    render(<PipelinePage />);

    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.queryByRole("heading", { name: /Nuevo/ })).toBeNull();
  });

  it("sin prospectos muestra el vacío con CTA de alta (lo afirma el servidor)", () => {
    useQueryMock.mockReturnValue(payload({}, { tieneProspectos: false }));
    render(<PipelinePage />);

    expect(screen.getByText("Aún no tienes prospectos")).toBeDefined();
    expect(screen.getByRole("link", { name: "Añadir prospecto" }).getAttribute("href")).toBe("/prospectos/nuevo");
  });

  it("pinta las 6 etapas con su contador", () => {
    useQueryMock.mockReturnValue(
      payload({
        new: grupo([prospecto("1", "Ana"), prospecto("2", "Beatriz")]),
        contacted: grupo([prospecto("3", "Carlos", { etapaActual: "contacted" })]),
      }),
    );
    render(<PipelinePage />);

    expect(cabecera(/^Nuevo \(2\)$/)).toBeDefined();
    expect(cabecera(/^Contactado \(1\)$/)).toBeDefined();
    expect(cabecera(/^Presentación realizada \(0\)$/)).toBeDefined();
    expect(cabecera(/^En valoración \(0\)$/)).toBeDefined();
    expect(cabecera(/^Incorporado \(0\)$/)).toBeDefined();
    expect(cabecera(/^Descartado \(0\)$/)).toBeDefined();
  });

  it("una etapa vacía muestra su texto sin afectar a las demás", () => {
    useQueryMock.mockReturnValue(payload({ new: grupo([prospecto("1", "Ana")]) }));
    render(<PipelinePage />);

    expect(screen.getByText("Ana")).toBeDefined();
    // Nuevo tiene contenido; las otras tres no terminales están vacías y visibles.
    expect(screen.getAllByText(SIN_PROSPECTOS_ETAPA)).toHaveLength(3);
  });
});

describe("colapso de secciones", () => {
  it("Incorporado y Descartado arrancan colapsadas; el resto expandidas", () => {
    useQueryMock.mockReturnValue(payload());
    render(<PipelinePage />);

    expect(cabecera(/^Incorporado/).getAttribute("aria-expanded")).toBe("false");
    expect(cabecera(/^Descartado/).getAttribute("aria-expanded")).toBe("false");
    expect(cabecera(/^Nuevo/).getAttribute("aria-expanded")).toBe("true");
    expect(cabecera(/^Contactado/).getAttribute("aria-expanded")).toBe("true");
  });

  it("una etapa colapsada oculta sus tarjetas y al pulsar las muestra", () => {
    useQueryMock.mockReturnValue(
      payload({ joined: grupo([prospecto("9", "Incorporada Inés", { etapaActual: "joined" })]) }),
    );
    render(<PipelinePage />);

    expect(screen.queryByText("Incorporada Inés")).toBeNull();

    fireEvent.click(cabecera(/^Incorporado \(1\)$/));
    expect(screen.getByText("Incorporada Inés")).toBeDefined();
    expect(cabecera(/^Incorporado \(1\)$/).getAttribute("aria-expanded")).toBe("true");
  });

  it("una etapa expandida se puede plegar", () => {
    useQueryMock.mockReturnValue(payload({ new: grupo([prospecto("1", "Ana")]) }));
    render(<PipelinePage />);

    expect(screen.getByText("Ana")).toBeDefined();
    fireEvent.click(cabecera(/^Nuevo \(1\)$/));
    expect(screen.queryByText("Ana")).toBeNull();
  });
});

describe("tarjetas: urgencia y navegación", () => {
  it("el badge 'Vencido' aparece solo en los vencidos", () => {
    useQueryMock.mockReturnValue(
      payload({
        new: grupo([
          prospecto("1", "Vencida Vera", { fechaProximoSeguimiento: HOY_INICIO - 3 * DIA, diasVencido: 3 }),
          prospecto("2", "Futura Fina", { fechaProximoSeguimiento: HOY_INICIO + 5 * DIA }),
        ]),
      }),
    );
    render(<PipelinePage />);

    expect(screen.getAllByText("Vencido")).toHaveLength(1);
    expect(screen.getByText("Vencido hace 3 días")).toBeDefined();
    expect(screen.getByText("En 5 días")).toBeDefined();
  });

  it("cada tarjeta muestra el puntito de SU prioridad, no el «medium» fijo de antes (JOS-53)", () => {
    useQueryMock.mockReturnValue(
      payload({
        new: grupo([
          prospecto("1", "Alta Uno", { prioridad: "high" }),
          prospecto("2", "Media Dos", { prioridad: "medium" }),
        ]),
        contacted: grupo([prospecto("3", "Baja Tres", { etapaActual: "contacted", prioridad: "low" })]),
      }),
    );
    render(<PipelinePage />);
    // El puntito de ProspectCard expone la prioridad por su aria-label (new y contacted
    // arrancan expandidas, así que las tres tarjetas se ven).
    expect(screen.getByLabelText("Prioridad Alta")).toBeDefined();
    expect(screen.getByLabelText("Prioridad Baja")).toBeDefined();
    // Exactamente UNA «Media»: antes salían todas iguales, con el valor fijo.
    expect(screen.getAllByLabelText("Prioridad Media")).toHaveLength(1);
  });

  it("la etapa no se repite dentro de la tarjeta (la declara la sección)", () => {
    useQueryMock.mockReturnValue(payload({ new: grupo([prospecto("1", "Ana")]) }));
    render(<PipelinePage />);

    // La etiqueta de etapa vive en la cabecera de la sección; dentro de la
    // tarjeta no debe repetirse como pill (showStage={false}).
    const seccion = screen.getByRole("region", { name: "Nuevo" });
    const tarjeta = within(seccion).getByRole("button", { name: /Ana/ });
    expect(within(tarjeta).queryByText(/^Nuevo$/)).toBeNull();
  });

  it("los terminales muestran que no tienen seguimiento", () => {
    useQueryMock.mockReturnValue(
      payload({ discarded: grupo([prospecto("7", "Descartado Dani", { etapaActual: "discarded" })]) }),
    );
    render(<PipelinePage />);

    fireEvent.click(cabecera(/^Descartado \(1\)$/));
    expect(screen.getByText("Sin seguimiento")).toBeDefined();
  });

  it("pulsar una tarjeta navega a su ficha", () => {
    useQueryMock.mockReturnValue(payload({ new: grupo([prospecto("abc123", "Ana")]) }));
    render(<PipelinePage />);

    const seccion = screen.getByRole("region", { name: "Nuevo" });
    fireEvent.click(within(seccion).getByRole("button", { name: /Ana/ }));
    expect(pushMock).toHaveBeenCalledWith("/prospectos/abc123");
  });
});

describe("corte por grupo y vista parcial", () => {
  it("muestra PIPELINE_VISIBLES y expande con 'Ver todos'", () => {
    const muchos = Array.from({ length: PIPELINE_VISIBLES + 5 }, (_, i) => prospecto(String(i), `Prospecto ${i}`));
    useQueryMock.mockReturnValue(payload({ new: grupo(muchos) }));
    render(<PipelinePage />);

    expect(screen.queryByText(`Prospecto ${PIPELINE_VISIBLES}`)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: `Ver todos (${PIPELINE_VISIBLES + 5})` }));
    expect(screen.getByText(`Prospecto ${PIPELINE_VISIBLES}`)).toBeDefined();
  });

  it("con truncamiento avisa de vista parcial y declara el contador como '500+'", () => {
    const muchos = Array.from({ length: PIPELINE_VISIBLES + 1 }, (_, i) => prospecto(String(i), `Prospecto ${i}`));
    useQueryMock.mockReturnValue(payload({ new: { prospectos: muchos, total: MAX_PIPELINE, truncado: true } }));
    render(<PipelinePage />);

    expect(screen.getByText(BANNER_VISTA_PARCIAL)).toBeDefined();
    expect(cabecera(new RegExp(`^Nuevo \\(${MAX_PIPELINE}\\+\\)$`))).toBeDefined();
    // El botón cuenta lo que despliega de verdad (lo cargado), no el total con
    // "+": expandir no puede mostrar más de lo que trajo la query.
    expect(screen.getByRole("button", { name: `Ver todos (${muchos.length})` })).toBeDefined();
  });
});

describe("consulta", () => {
  it("pide el pipeline con el dayKey del día visible", () => {
    useQueryMock.mockReturnValue(payload());
    render(<PipelinePage />);

    const args = useQueryMock.mock.calls[useQueryMock.mock.calls.length - 1][1] as { dayKey: string };
    expect(args.dayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
