// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConvexError } from "convex/values";
import { APP_TZ, ventanaDia, zonedMidnightToMs } from "../../../../../../../convex/lib/fecha";
import { consumirFlash } from "@/lib/flash";
import {
  BANNER_ERROR_RED,
  ERROR_FECHA_FUTURA,
  ERROR_QUE_OCURRIO_OBLIGATORIO,
  MAX_QUE_OCURRIO,
  textoToast,
} from "./textos";
import RegistrarInteraccionPage from "./page";

// Sin proveedor Convex real (estrategia de JOS-22): se mockean useQuery (el
// contexto del prospecto), useMutation y el router. El id llega por useParams.
const { useQueryMock, mutateMock, pushMock, replaceMock, searchParamsMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  mutateMock: vi.fn(),
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  searchParamsMock: vi.fn(),
}));

vi.mock("convex/react", () => ({ useQuery: useQueryMock, useMutation: () => mutateMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useParams: () => ({ id: "p7" }),
  useSearchParams: () => searchParamsMock(),
}));

/** Monta la pantalla con el parámetro `volver` que traería la URL (JOS-23). */
function renderConOrigen(origen?: string) {
  searchParamsMock.mockReturnValue(new URLSearchParams(origen === undefined ? "" : `volver=${origen}`));
  return render(<RegistrarInteraccionPage />);
}

const PROSPECTO = {
  id: "p7",
  nombre: "Lucía Ferrer",
  comoSeConocio: "Evento",
  canalContactoPreferido: "whatsapp",
  etapaActual: "contacted",
  fechaAlta: 1_000,
};

// Martes 2026-07-14 a las 10:00 de Madrid (08:00 UTC) — Date.now() fijado por
// espía (sin fake timers: waitFor sigue funcionando con timers reales).
const AHORA = Date.UTC(2026, 6, 14, 8, 0);
const HOY = "2026-07-14";

beforeEach(() => {
  useQueryMock.mockReset();
  mutateMock.mockReset();
  pushMock.mockReset();
  replaceMock.mockReset();
  useQueryMock.mockReturnValue(PROSPECTO);
  // Sin parámetro por defecto: el resto de la suite comprueba el contrato de M3
  // (salida a la Ficha), que JOS-23 no debe alterar.
  searchParamsMock.mockReturnValue(new URLSearchParams());
  window.sessionStorage.clear();
  vi.spyOn(Date, "now").mockReturnValue(AHORA);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function boton(): HTMLButtonElement {
  return screen.getByRole("button", { name: /Guardar interacción|Guardando/ }) as HTMLButtonElement;
}

/** Rellena los obligatorios (la fecha ya viene por defecto con hoy). */
function rellenarObligatorios() {
  fireEvent.click(screen.getByRole("radio", { name: "Llamada" }));
  fireEvent.change(screen.getByLabelText("Qué ocurrió"), { target: { value: " Llamada corta " } });
  fireEvent.click(screen.getByRole("radio", { name: "Interesado" }));
}

describe("contexto del prospecto y estados (JOS-16)", () => {
  it("mientras carga el contexto: placeholder de carga", () => {
    useQueryMock.mockReturnValue(undefined);
    render(<RegistrarInteraccionPage />);
    expect(screen.getByText("Cargando prospecto…")).toBeDefined();
  });

  it("cabecera con el nombre del prospecto y su etapa (contexto siempre visible)", () => {
    render(<RegistrarInteraccionPage />);
    expect(screen.getByText("Lucía Ferrer")).toBeDefined();
    expect(screen.getByText("Contactado")).toBeDefined();
  });

  it("la fecha por defecto es hoy (Madrid) y el input no admite más allá de hoy", () => {
    render(<RegistrarInteraccionPage />);
    const fecha = screen.getByLabelText("Fecha del contacto") as HTMLInputElement;
    expect(fecha.value).toBe(HOY);
    expect(fecha.getAttribute("max")).toBe(HOY);
  });

  it("'Qué ocurrió' limita a 500 caracteres SOLO en cliente (P11)", () => {
    render(<RegistrarInteraccionPage />);
    expect(screen.getByLabelText("Qué ocurrió").getAttribute("maxlength")).toBe(String(MAX_QUE_OCURRIO));
  });

  it("Guardar deshabilitado hasta completar tipo + qué ocurrió + resultado (estados de JOS-61)", () => {
    render(<RegistrarInteraccionPage />);
    expect(boton().disabled).toBe(true);

    fireEvent.click(screen.getByRole("radio", { name: "Llamada" }));
    expect(boton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Qué ocurrió"), { target: { value: "Le llamé" } });
    expect(boton().disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Interesado" }));
    expect(boton().disabled).toBe(false);
  });

  it("fecha futura: bloqueada en cliente con error inline y sin llamar a la API", () => {
    render(<RegistrarInteraccionPage />);
    rellenarObligatorios();
    fireEvent.change(screen.getByLabelText("Fecha del contacto"), { target: { value: "2026-07-15" } });

    expect(boton().disabled).toBe(true);
    fireEvent.submit(boton().closest("form") as HTMLFormElement);
    expect(screen.getByText(ERROR_FECHA_FUTURA)).toBeDefined();
    expect(mutateMock).not.toHaveBeenCalled();
  });
});

describe("guardado (JOS-16)", () => {
  it("registro de HOY: fecha = ahora, payload exacto, flash y replace a la Ficha", async () => {
    const proximo = zonedMidnightToMs({ y: 2026, m: 7, d: 17 }, APP_TZ); // contactado: +3 días
    mutateMock.mockResolvedValue({
      interaccion: { id: "i1" },
      prospecto: { ...PROSPECTO, fechaUltimoContacto: AHORA, fechaProximoSeguimiento: proximo },
    });
    render(<RegistrarInteraccionPage />);
    rellenarObligatorios();
    fireEvent.submit(boton().closest("form") as HTMLFormElement);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/prospectos/p7"));
    expect(mutateMock).toHaveBeenCalledTimes(1);
    // Igualdad estricta: trim aplicado y el opcional vacío NO viaja.
    expect(mutateMock.mock.calls[0][0]).toEqual({
      prospectoId: "p7",
      fecha: AHORA,
      tipo: "call",
      queOcurrio: "Llamada corta",
      resultado: "interested",
    });
    expect(consumirFlash()).toBe(textoToast(proximo));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("registro TARDÍO: fecha = mediodía de Madrid del día elegido; el siguiente paso viaja con trim", async () => {
    mutateMock.mockResolvedValue({
      interaccion: { id: "i2" },
      prospecto: { ...PROSPECTO, fechaUltimoContacto: AHORA },
    });
    render(<RegistrarInteraccionPage />);
    fireEvent.click(screen.getByRole("radio", { name: "Reunión" }));
    fireEvent.change(screen.getByLabelText("Fecha del contacto"), { target: { value: "2026-07-10" } });
    fireEvent.change(screen.getByLabelText("Qué ocurrió"), { target: { value: "Reunión en cafetería" } });
    fireEvent.click(screen.getByRole("radio", { name: "Necesita pensar" }));
    fireEvent.change(screen.getByLabelText("Siguiente paso acordado"), { target: { value: " Enviar vídeo " } });
    fireEvent.submit(boton().closest("form") as HTMLFormElement);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/prospectos/p7"));
    expect(mutateMock.mock.calls[0][0]).toEqual({
      prospectoId: "p7",
      fecha: ventanaDia("2026-07-10", APP_TZ).hoyInicio + 12 * 3_600_000,
      tipo: "meeting",
      queOcurrio: "Reunión en cafetería",
      resultado: "thinking",
      siguientePasoAcordado: "Enviar vídeo",
    });
    // Sin fechaProximoSeguimiento en la respuesta (etapa terminal): toast corto.
    expect(consumirFlash()).toBe(textoToast(undefined));
  });

  it("VALIDATION_ERROR del servidor con field se mapea inline y conserva los datos", async () => {
    mutateMock.mockRejectedValue(
      new ConvexError({ code: "VALIDATION_ERROR", field: "queOcurrio", message: "queOcurrio es obligatorio" }),
    );
    render(<RegistrarInteraccionPage />);
    rellenarObligatorios();
    fireEvent.submit(boton().closest("form") as HTMLFormElement);

    await waitFor(() => expect(screen.getByText(ERROR_QUE_OCURRIO_OBLIGATORIO)).toBeDefined());
    expect(screen.queryByRole("alert")).toBeNull();
    expect((screen.getByLabelText("Qué ocurrió") as HTMLTextAreaElement).value).toBe(" Llamada corta ");
    expect(replaceMock).not.toHaveBeenCalled();
    expect(consumirFlash()).toBeNull();
  });

  it("error de red: banner claro, datos intactos y botón re-habilitado", async () => {
    mutateMock.mockRejectedValue(new Error("fetch failed"));
    render(<RegistrarInteraccionPage />);
    rellenarObligatorios();
    fireEvent.submit(boton().closest("form") as HTMLFormElement);

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(BANNER_ERROR_RED));
    expect((screen.getByLabelText("Qué ocurrió") as HTMLTextAreaElement).value).toBe(" Llamada corta ");
    expect(boton().disabled).toBe(false);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("sin doble envío: durante el guardado el botón queda deshabilitado con 'Guardando…'", async () => {
    let resolver: (v: unknown) => void = () => {};
    mutateMock.mockImplementation(() => new Promise((r) => (resolver = r)));
    render(<RegistrarInteraccionPage />);
    rellenarObligatorios();

    const form = boton().closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => expect(boton().disabled).toBe(true));
    expect(boton().textContent).toContain("Guardando…");

    fireEvent.submit(form);
    expect(mutateMock).toHaveBeenCalledTimes(1);

    resolver({ interaccion: { id: "i3" }, prospecto: PROSPECTO });
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/prospectos/p7"));
  });

  it("dos submits SÍNCRONOS en la misma tarea ejecutan UNA sola mutación (guarda useRef)", async () => {
    // Reproduce el bloqueo 2 del NO-GO: sin flush entre eventos, el estado
    // `guardando` aún es false en el segundo submit; solo el ref lo corta.
    let resolver: (v: unknown) => void = () => {};
    mutateMock.mockImplementation(() => new Promise((r) => (resolver = r)));
    render(<RegistrarInteraccionPage />);
    rellenarObligatorios();

    const form = boton().closest("form") as HTMLFormElement;
    act(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(mutateMock).toHaveBeenCalledTimes(1);

    resolver({ interaccion: { id: "i4" }, prospecto: PROSPECTO });
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/prospectos/p7"));
  });
});

describe("cancelar determinista (rev. 2, bloqueo 2)", () => {
  it("URL directa (montaje limpio): cancelar hace replace a la Ficha del prospecto", () => {
    render(<RegistrarInteraccionPage />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar y volver" }));
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/prospectos/p7");
  });

  it("entrada interna (historial previo): mismo destino, sin consultar el historial", () => {
    window.history.pushState({}, "", "/prospectos/p7");
    window.history.pushState({}, "", "/prospectos/p7/interacciones/nueva");
    render(<RegistrarInteraccionPage />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar y volver" }));
    expect(replaceMock).toHaveBeenCalledWith("/prospectos/p7");
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe("destino de salida según el origen (JOS-23)", () => {
  it("con origen «actividad»: al guardar vuelve a la Actividad Diaria, no a la Ficha", async () => {
    const proximo = zonedMidnightToMs({ y: 2026, m: 7, d: 17 }, APP_TZ);
    mutateMock.mockResolvedValue({
      interaccion: { id: "i9" },
      prospecto: { ...PROSPECTO, fechaUltimoContacto: AHORA, fechaProximoSeguimiento: proximo },
    });
    renderConOrigen("actividad");
    rellenarObligatorios();
    fireEvent.submit(boton().closest("form") as HTMLFormElement);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/actividad"));
    expect(replaceMock).not.toHaveBeenCalledWith("/prospectos/p7");
    // El flash viaja igual: lo consume la Actividad Diaria en vez de la Ficha.
    expect(consumirFlash()).toBe(textoToast(proximo));
  });

  it("con origen «actividad»: cancelar también vuelve a la Actividad Diaria", () => {
    renderConOrigen("actividad");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar y volver" }));
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/actividad");
  });

  it("un origen inventado se ignora: se mantiene el contrato de M3 (Ficha)", async () => {
    mutateMock.mockResolvedValue({ interaccion: { id: "i10" }, prospecto: { ...PROSPECTO } });
    renderConOrigen("https://ejemplo.invalido");
    rellenarObligatorios();
    fireEvent.submit(boton().closest("form") as HTMLFormElement);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/prospectos/p7"));
    expect(replaceMock).not.toHaveBeenCalledWith("https://ejemplo.invalido");
  });
});
