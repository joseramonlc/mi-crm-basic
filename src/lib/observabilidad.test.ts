import { afterEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/nextjs";
import { registrarError, sanearEvento } from "./observabilidad";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("registrarError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registra el error en consola y lo manda a Sentry", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("boom");

    registrarError(error);

    expect(consoleError).toHaveBeenCalledWith(error);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    consoleError.mockRestore();
  });

  it("funciona igual con un valor que no es una instancia de Error", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    registrarError("algo que no es un Error");

    expect(Sentry.captureException).toHaveBeenCalledWith("algo que no es un Error");
    consoleError.mockRestore();
  });
});

function eventoConMensaje(mensaje: string): Sentry.ErrorEvent {
  return { message: mensaje } as Sentry.ErrorEvent;
}

function eventoConExcepcion(valor: string): Sentry.ErrorEvent {
  return { exception: { values: [{ value: valor }] } } as Sentry.ErrorEvent;
}

describe("sanearEvento", () => {
  it("tapa un email en event.message", () => {
    const evento = sanearEvento(eventoConMensaje("fallo al notificar a ana@example.com"));
    expect(evento.message).toBe("fallo al notificar a [email]");
  });

  it("tapa un teléfono en event.message", () => {
    const evento = sanearEvento(eventoConMensaje("no se pudo llamar al 600 11 12 22"));
    expect(evento.message).toBe("no se pudo llamar al [teléfono]");
  });

  it("tapa un email dentro de event.exception.values[].value", () => {
    const evento = sanearEvento(eventoConExcepcion("email inválido: ana@example.com"));
    expect(evento.exception?.values?.[0].value).toBe("email inválido: [email]");
  });

  it("deja intacto un mensaje sin datos personales", () => {
    const evento = sanearEvento(eventoConMensaje("fallo de red al guardar el prospecto"));
    expect(evento.message).toBe("fallo de red al guardar el prospecto");
  });

  it("no revienta si el evento no tiene mensaje ni excepción", () => {
    expect(() => sanearEvento({} as Sentry.ErrorEvent)).not.toThrow();
  });
});
