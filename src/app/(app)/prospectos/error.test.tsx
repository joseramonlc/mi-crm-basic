// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ProspectosError from "./error";

// Mismo alcance que el resto de boundaries del proyecto: SOLO el contrato del
// fallback. La reconstrucción real del segmento por Next queda como exploratorio.
afterEach(cleanup);

describe("error.tsx del Pipeline (contrato del fallback)", () => {
  it("pulsar 'Reintentar' invoca unstable_retry exactamente una vez", () => {
    const retry = vi.fn();
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ProspectosError error={new Error("boom")} unstable_retry={retry} />);
    expect(screen.getByText("No se pudo cargar el pipeline")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);

    silencio.mockRestore();
  });
});
