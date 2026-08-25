// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";
import { APP_TZ, ventanaDia } from "../../../../../../../../convex/lib/fecha";
import { consumirFlash } from "@/lib/flash";
import { BANNER_ERROR_RED, ERROR_FECHA_FUTURA, ERROR_QUE_OCURRIO_OBLIGATORIO, TOAST_CAMBIOS_GUARDADOS } from "./textos";
import CorregirInteraccionPage from "./page";

// Sin proveedor Convex real: se mockean las DOS queries (prospecto + interacción, distinguidas por
// su nombre canónico), la mutation y el router. Los ids llegan por useParams.
const { useQueryMock, actualizarMock, replaceMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  actualizarMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("convex/react", () => ({ useQuery: useQueryMock, useMutation: () => actualizarMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useParams: () => ({ id: "p7", interaccionId: "i1" }),
}));

// Martes 2026-07-14, 10:00 Madrid (08:00 UTC).
const AHORA = Date.UTC(2026, 6, 14, 8, 0);
const HOY = "2026-07-14";
// Interacción registrada un día pasado: su dayKey es 2026-07-10 (mediodía de Madrid).
const FECHA_MS = ventanaDia("2026-07-10", APP_TZ).hoyInicio + 12 * 3_600_000;

const PROSPECTO = {
  id: "p7",
  nombre: "Lucía Ferrer",
  comoSeConocio: "Evento",
  canalContactoPreferido: "whatsapp",
  etapaActual: "contacted",
  fechaAlta: 1_000,
  prioridad: "medium",
};

const INTERACCION = {
  id: "i1",
  prospectoId: "p7",
  fecha: FECHA_MS,
  tipo: "call",
  resultado: "interested",
  queOcurrio: "Llamada original",
  siguientePasoAcordado: "Enviar propuesta",
};

function mockQueries(interaccion: unknown = INTERACCION, prospecto: unknown = PROSPECTO) {
  useQueryMock.mockImplementation((ref: unknown) => {
    const name = getFunctionName(ref as never);
    if (name === "prospectos:obtener") return prospecto;
    if (name === "interacciones:obtener") return interaccion;
    return undefined;
  });
}

function boton(): HTMLButtonElement {
  return screen.getByRole("button", { name: /Guardar cambios|Guardando/ }) as HTMLButtonElement;
}

beforeEach(() => {
  useQueryMock.mockReset();
  actualizarMock.mockReset();
  replaceMock.mockReset();
  window.sessionStorage.clear();
  vi.spyOn(Date, "now").mockReturnValue(AHORA);
  mockQueries();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("carga y precarga (JOS-80 Trozo B)", () => {
  it("mientras carga la interacción: placeholder de carga", () => {
    // La interacción aún no ha llegado (el prospecto sí): la pantalla espera antes de montar el form.
    useQueryMock.mockImplementation((ref: unknown) =>
      getFunctionName(ref as never) === "prospectos:obtener" ? PROSPECTO : undefined,
    );
    render(<CorregirInteraccionPage />);
    expect(screen.getByText("Cargando interacción…")).toBeDefined();
  });

  it("precarga los campos con los valores de la interacción y el contexto del prospecto", () => {
    render(<CorregirInteraccionPage />);
    expect(screen.getByText("Lucía Ferrer")).toBeDefined();
    expect((screen.getByLabelText("Fecha del contacto") as HTMLInputElement).value).toBe("2026-07-10");
    expect((screen.getByLabelText("Qué ocurrió") as HTMLTextAreaElement).value).toBe("Llamada original");
    expect((screen.getByLabelText("Siguiente paso acordado") as HTMLTextAreaElement).value).toBe("Enviar propuesta");
    // La interacción es una llamada con resultado "Interesado": ambas pills marcadas.
    expect(screen.getByRole("radio", { name: "Llamada" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Interesado" }).getAttribute("aria-checked")).toBe("true");
  });

  it("NO ofrece el campo «Próximo contacto acordado»: corregir no reabre el acuerdo (JOS-69)", () => {
    render(<CorregirInteraccionPage />);
    expect(screen.queryByLabelText("Próximo contacto acordado")).toBeNull();
  });

  it("el input de fecha no admite más allá de hoy", () => {
    render(<CorregirInteraccionPage />);
    expect((screen.getByLabelText("Fecha del contacto") as HTMLInputElement).getAttribute("max")).toBe(HOY);
  });

  it("pide la interacción CON el prospecto de la ruta (validación de relación en el backend)", () => {
    render(<CorregirInteraccionPage />);
    const llamada = useQueryMock.mock.calls.find((c) => getFunctionName(c[0] as never) === "interacciones:obtener");
    expect(llamada?.[1]).toEqual({ prospectoId: "p7", id: "i1" });
  });
});

describe("guardado (JOS-80 Trozo B)", () => {
  it("solo cambia «Qué ocurrió»: envía SOLO ese campo (diff), sin fecha; flash y replace a la Ficha", async () => {
    actualizarMock.mockResolvedValue(INTERACCION);
    render(<CorregirInteraccionPage />);
    fireEvent.change(screen.getByLabelText("Qué ocurrió"), { target: { value: "Llamada corregida" } });
    fireEvent.submit(boton().closest("form") as HTMLFormElement);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/prospectos/p7"));
    // Diff-only: no reenvía tipo/resultado/siguientePaso, así una edición concurrente de otro campo
    // no se pisa con la copia antigua.
    expect(actualizarMock.mock.calls[0][0]).toEqual({ id: "i1", queOcurrio: "Llamada corregida" });
    expect(consumirFlash()).toBe(TOAST_CAMBIOS_GUARDADOS);
  });

  it("sin cambios reales: envía SOLO { id } (no-op idempotente en el backend)", async () => {
    actualizarMock.mockResolvedValue(INTERACCION);
    render(<CorregirInteraccionPage />);
    fireEvent.submit(boton().closest("form") as HTMLFormElement);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/prospectos/p7"));
    expect(actualizarMock.mock.calls[0][0]).toEqual({ id: "i1" });
  });

  it("cambiando SOLO la fecha a otro día pasado: envía SOLO `fecha` = mediodía de Madrid del día elegido", async () => {
    actualizarMock.mockResolvedValue(INTERACCION);
    render(<CorregirInteraccionPage />);
    fireEvent.change(screen.getByLabelText("Fecha del contacto"), { target: { value: "2026-07-12" } });
    fireEvent.submit(boton().closest("form") as HTMLFormElement);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/prospectos/p7"));
    expect(actualizarMock.mock.calls[0][0]).toEqual({
      id: "i1",
      fecha: ventanaDia("2026-07-12", APP_TZ).hoyInicio + 12 * 3_600_000,
    });
  });

  it("vaciar «Siguiente paso» (que tenía valor): viaja SOLO ese campo como cadena vacía (el backend lo elimina)", async () => {
    actualizarMock.mockResolvedValue(INTERACCION);
    render(<CorregirInteraccionPage />);
    fireEvent.change(screen.getByLabelText("Siguiente paso acordado"), { target: { value: "" } });
    fireEvent.submit(boton().closest("form") as HTMLFormElement);

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
    expect(actualizarMock.mock.calls[0][0]).toEqual({ id: "i1", siguientePasoAcordado: "" });
  });

  it("fecha futura: bloqueada en cliente con error inline y sin llamar a la API", () => {
    render(<CorregirInteraccionPage />);
    fireEvent.change(screen.getByLabelText("Fecha del contacto"), { target: { value: "2026-07-15" } });
    expect(boton().disabled).toBe(true);
    fireEvent.submit(boton().closest("form") as HTMLFormElement);
    expect(screen.getByText(ERROR_FECHA_FUTURA)).toBeDefined();
    expect(actualizarMock).not.toHaveBeenCalled();
  });

  it("VALIDATION_ERROR del servidor con field se mapea inline y conserva lo tecleado", async () => {
    actualizarMock.mockRejectedValue(
      new ConvexError({ code: "VALIDATION_ERROR", field: "queOcurrio", message: "queOcurrio es obligatorio" }),
    );
    render(<CorregirInteraccionPage />);
    fireEvent.change(screen.getByLabelText("Qué ocurrió"), { target: { value: "Nuevo texto" } });
    fireEvent.submit(boton().closest("form") as HTMLFormElement);

    await waitFor(() => expect(screen.getByText(ERROR_QUE_OCURRIO_OBLIGATORIO)).toBeDefined());
    expect((screen.getByLabelText("Qué ocurrió") as HTMLTextAreaElement).value).toBe("Nuevo texto");
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("error de red: banner claro y sin navegar", async () => {
    actualizarMock.mockRejectedValue(new Error("fetch failed"));
    render(<CorregirInteraccionPage />);
    fireEvent.change(screen.getByLabelText("Qué ocurrió"), { target: { value: "Otro" } });
    fireEvent.submit(boton().closest("form") as HTMLFormElement);

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(BANNER_ERROR_RED));
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
