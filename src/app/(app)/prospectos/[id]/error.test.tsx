// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConvexError } from "convex/values";
import FichaProspectoError from "./error";

afterEach(cleanup);

describe("error.tsx de la ficha (contrato del fallback, P14)", () => {
  it("error genérico: 'Reintentar' invoca unstable_retry exactamente una vez", () => {
    const retry = vi.fn();
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<FichaProspectoError error={new Error("boom")} unstable_retry={retry} />);
    expect(screen.getByText("No se pudo cargar la pantalla")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);

    silencio.mockRestore();
  });

  it("NOT_FOUND (id inexistente o ajeno, contrato opaco de M2): sin Reintentar, con vuelta a Inicio", () => {
    const retry = vi.fn();
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new ConvexError({ code: "NOT_FOUND", message: "Prospecto no encontrado" }) as Error & {
      digest?: string;
    };

    render(<FichaProspectoError error={error} unstable_retry={retry} />);
    expect(screen.getByText("Prospecto no encontrado")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();

    const enlace = screen.getByRole("link", { name: "Ir a Inicio" });
    expect(enlace.getAttribute("href")).toBe("/actividad");

    silencio.mockRestore();
  });
});
