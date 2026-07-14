// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import NuevoProspectoError from "./error";

// Mismo alcance que el boundary de /actividad: SOLO el contrato del fallback.
afterEach(cleanup);

describe("error.tsx de /prospectos/nuevo (contrato del fallback)", () => {
  it("pulsar 'Reintentar' invoca unstable_retry exactamente una vez", () => {
    const retry = vi.fn();
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<NuevoProspectoError error={new Error("boom")} unstable_retry={retry} />);
    expect(screen.getByText("No se pudo cargar la pantalla")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);

    silencio.mockRestore();
  });
});
