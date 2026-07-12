// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ActividadError from "./error";

// Alcance verificable del boundary (plan, Mayor #2): SOLO el contrato del
// fallback. La recuperación real de Next (reconstrucción del segmento) queda
// como procedimiento exploratorio, fuera de la aceptación.
afterEach(cleanup);

describe("error.tsx (contrato del fallback)", () => {
  it("pulsar 'Reintentar' invoca unstable_retry exactamente una vez", () => {
    const retry = vi.fn();
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ActividadError error={new Error("boom")} unstable_retry={retry} />);
    expect(screen.getByText("No se pudo cargar la actividad")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);

    silencio.mockRestore();
  });
});
