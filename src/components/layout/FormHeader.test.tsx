// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FormHeader } from "./FormHeader";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));

beforeEach(() => replaceMock.mockReset());
afterEach(cleanup);

describe("FormHeader (contrato determinista de cancelar, rev. 2)", () => {
  it("muestra el título y cancela con replace hacia el destino recibido", () => {
    render(<FormHeader titulo="Nuevo prospecto" hrefCancelar="/actividad" />);
    expect(screen.getByRole("heading", { name: "Nuevo prospecto" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar y volver" }));
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/actividad");
  });

  it("etiquetaAtras personaliza el aria-label sin cambiar el contrato de navegación (M4, P2)", () => {
    render(<FormHeader titulo="Ana Pérez" hrefCancelar="/actividad" etiquetaAtras="Volver a Inicio" />);
    fireEvent.click(screen.getByRole("button", { name: "Volver a Inicio" }));
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/actividad");
  });

  it("no consulta el historial: mismo destino aunque exista una entrada previa", () => {
    window.history.pushState({}, "", "/actividad");
    window.history.pushState({}, "", "/prospectos/nuevo");
    render(<FormHeader titulo="Nuevo prospecto" hrefCancelar="/actividad" />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar y volver" }));
    expect(replaceMock).toHaveBeenCalledWith("/actividad");
  });
});
