// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConvexError } from "convex/values";
import {
  BANNER_ERROR_RED,
  ERROR_EMAIL_FORMATO,
  ERROR_NOMBRE_OBLIGATORIO,
} from "./textos";
import NuevoProspectoPage from "./page";

// Sin proveedor Convex real (estrategia de JOS-22): se mockean useMutation y
// el router, y se inspeccionan el payload y las navegaciones.
const { mutateMock, pushMock, replaceMock } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("convex/react", () => ({ useMutation: () => mutateMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, replace: replaceMock }) }));

beforeEach(() => {
  mutateMock.mockReset();
  pushMock.mockReset();
  replaceMock.mockReset();
});

afterEach(cleanup);

function boton(): HTMLButtonElement {
  return screen.getByRole("button", { name: /Guardar prospecto|Guardando/ }) as HTMLButtonElement;
}

/** Rellena los 3 obligatorios con valores válidos. */
function rellenarObligatorios() {
  fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ana Pérez" } });
  fireEvent.change(screen.getByLabelText("Canal de contacto preferido"), { target: { value: "whatsapp" } });
  fireEvent.change(screen.getByLabelText("Cómo se le conoció"), { target: { value: "Evento" } });
}

describe("estados y validación en cliente (JOS-15)", () => {
  it("el campo Nombre recibe el foco automáticamente al abrir", () => {
    render(<NuevoProspectoPage />);
    expect(document.activeElement).toBe(screen.getByLabelText("Nombre"));
  });

  it("los dos selects son elementos <select> NATIVOS (rev. 2, bloqueo 1)", () => {
    render(<NuevoProspectoPage />);
    expect((screen.getByLabelText("Canal de contacto preferido") as HTMLElement).tagName).toBe("SELECT");
    expect((screen.getByLabelText("Cómo se le conoció") as HTMLElement).tagName).toBe("SELECT");
  });

  it("Guardar está deshabilitado hasta completar los 3 obligatorios (estados de JOS-60)", () => {
    render(<NuevoProspectoPage />);
    expect(boton().disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ana Pérez" } });
    expect(boton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Canal de contacto preferido"), { target: { value: "whatsapp" } });
    expect(boton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Cómo se le conoció"), { target: { value: "Evento" } });
    expect(boton().disabled).toBe(false);
  });

  it("nombre vacío al perder el foco muestra el error inline (letra de JOS-15)", () => {
    render(<NuevoProspectoPage />);
    fireEvent.blur(screen.getByLabelText("Nombre"));
    expect(screen.getByText(ERROR_NOMBRE_OBLIGATORIO)).toBeDefined();

    // Escribir limpia el error.
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ana" } });
    expect(screen.queryByText(ERROR_NOMBRE_OBLIGATORIO)).toBeNull();
  });

  it("email con formato inválido bloquea el envío con error inline y no llama a la API", () => {
    render(<NuevoProspectoPage />);
    rellenarObligatorios();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "no-es-email" } });
    fireEvent.submit(boton().closest("form") as HTMLFormElement);

    expect(screen.getByText(ERROR_EMAIL_FORMATO)).toBeDefined();
    expect(mutateMock).not.toHaveBeenCalled();
  });
});

describe("guardado (JOS-15)", () => {
  it("envía el payload exacto (trims, opcionales vacíos OMITIDOS) y navega a la ficha con push", async () => {
    mutateMock.mockResolvedValue({ id: "p42", nombre: "Ana Pérez" });
    render(<NuevoProspectoPage />);

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "  Ana Pérez  " } });
    fireEvent.change(screen.getByLabelText("Canal de contacto preferido"), { target: { value: "phone" } });
    fireEvent.change(screen.getByLabelText("Cómo se le conoció"), { target: { value: "Referido" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: " ana@ejemplo.com " } });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText("Nota inicial"), { target: { value: "  " } });
    fireEvent.submit(boton().closest("form") as HTMLFormElement);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/prospectos/p42"));
    expect(mutateMock).toHaveBeenCalledTimes(1);
    // Igualdad estricta del payload: los opcionales vacíos NO viajan.
    expect(mutateMock.mock.calls[0][0]).toEqual({
      nombre: "Ana Pérez",
      comoSeConocio: "Referido",
      canalContactoPreferido: "phone",
      email: "ana@ejemplo.com",
    });
  });

  it("VALIDATION_ERROR del servidor con field se mapea inline y conserva los datos", async () => {
    mutateMock.mockRejectedValue(new ConvexError({ code: "VALIDATION_ERROR", field: "email", message: "Email no válido" }));
    render(<NuevoProspectoPage />);
    rellenarObligatorios();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@ejemplo.com" } });
    fireEvent.submit(boton().closest("form") as HTMLFormElement);

    await waitFor(() => expect(screen.getByText(ERROR_EMAIL_FORMATO)).toBeDefined());
    expect(screen.queryByRole("alert")).toBeNull();
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Ana Pérez");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("ana@ejemplo.com");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("error de red: banner claro, datos intactos y botón re-habilitado", async () => {
    mutateMock.mockRejectedValue(new Error("fetch failed"));
    render(<NuevoProspectoPage />);
    rellenarObligatorios();
    fireEvent.submit(boton().closest("form") as HTMLFormElement);

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(BANNER_ERROR_RED));
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Ana Pérez");
    expect(boton().disabled).toBe(false);
    expect(boton().textContent).toContain("Guardar prospecto");
  });

  it("sin doble envío: durante el guardado el botón queda deshabilitado con 'Guardando…'", async () => {
    let resolver: (v: { id: string }) => void = () => {};
    mutateMock.mockImplementation(() => new Promise((r) => (resolver = r)));
    render(<NuevoProspectoPage />);
    rellenarObligatorios();

    const form = boton().closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => expect(boton().disabled).toBe(true));
    expect(boton().textContent).toContain("Guardando…");

    fireEvent.submit(form);
    expect(mutateMock).toHaveBeenCalledTimes(1);

    resolver({ id: "p1" });
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/prospectos/p1"));
  });

  it("dos submits SÍNCRONOS en la misma tarea ejecutan UNA sola mutación (guarda useRef)", async () => {
    // Reproduce el bloqueo 2 del NO-GO: sin flush entre eventos, el estado
    // `guardando` aún es false en el segundo submit; solo el ref lo corta.
    let resolver: (v: { id: string }) => void = () => {};
    mutateMock.mockImplementation(() => new Promise((r) => (resolver = r)));
    render(<NuevoProspectoPage />);
    rellenarObligatorios();

    const form = boton().closest("form") as HTMLFormElement;
    act(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(mutateMock).toHaveBeenCalledTimes(1);

    resolver({ id: "p9" });
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/prospectos/p9"));
  });
});

describe("cancelar determinista (rev. 2, bloqueo 2)", () => {
  it("URL directa (montaje limpio): cancelar hace replace a /actividad", () => {
    render(<NuevoProspectoPage />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar y volver" }));
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/actividad");
  });

  it("entrada interna (historial previo): mismo destino, sin consultar el historial", () => {
    window.history.pushState({}, "", "/actividad");
    window.history.pushState({}, "", "/prospectos/nuevo");
    render(<NuevoProspectoPage />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar y volver" }));
    expect(replaceMock).toHaveBeenCalledWith("/actividad");
    expect(pushMock).not.toHaveBeenCalled();
  });
});
