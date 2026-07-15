// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SelectorEtapa } from "./SelectorEtapa";

afterEach(cleanup);

const ETIQUETAS = ["Nuevo", "Contactado", "Presentación realizada", "En valoración", "Incorporado", "Descartado"];

describe("SelectorEtapa (JOS-19): radiogroup con activación MANUAL", () => {
  it("muestra las 6 etapas en el orden de la metodología, con la actual marcada (aria-checked)", () => {
    render(<SelectorEtapa etapaActual="contacted" onCambiar={vi.fn()} />);
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.textContent)).toEqual(ETIQUETAS);
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true", "false", "false", "false", "false"]);
    // Roving tabindex: solo la actual entra en el orden de tabulación.
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1, -1, -1, -1]);
  });

  it("las FLECHAS solo mueven el foco: ninguna llamada (condición de auditoría)", () => {
    const onCambiar = vi.fn();
    render(<SelectorEtapa etapaActual="new" onCambiar={onCambiar} />);
    const radios = screen.getAllByRole("radio");
    act(() => radios[0].focus());

    fireEvent.keyDown(radios[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(radios[1]);
    fireEvent.keyDown(radios[1], { key: "ArrowDown" });
    expect(document.activeElement).toBe(radios[2]);
    fireEvent.keyDown(radios[2], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(radios[1]);
    fireEvent.keyDown(radios[0], { key: "ArrowUp" }); // circular: de la primera a la última
    expect(document.activeElement).toBe(radios[5]);

    expect(onCambiar).not.toHaveBeenCalled();
  });

  it("roving tabindex REAL: el tabindex sigue al foco movido con flechas (hallazgo 2 del NO-GO)", () => {
    render(<SelectorEtapa etapaActual="new" onCambiar={vi.fn()} />);
    const radios = screen.getAllByRole("radio");
    act(() => radios[0].focus());

    fireEvent.keyDown(radios[0], { key: "ArrowRight" });
    // El botón enfocado es el ÚNICO tabulable; la etapa actual deja de serlo.
    expect(document.activeElement).toBe(radios[1]);
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1, -1, -1, -1]);

    fireEvent.keyDown(radios[1], { key: "ArrowUp" }); // circular hacia atrás
    expect(document.activeElement).toBe(radios[0]);
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1, -1, -1, -1]);
  });

  it("Enter y Espacio activan la etapa enfocada con UNA sola llamada (condición de auditoría)", () => {
    const onCambiar = vi.fn();
    render(<SelectorEtapa etapaActual="new" onCambiar={onCambiar} />);
    const radios = screen.getAllByRole("radio");

    fireEvent.keyDown(radios[1], { key: "Enter" });
    expect(onCambiar).toHaveBeenCalledTimes(1);
    expect(onCambiar).toHaveBeenCalledWith("contacted");

    fireEvent.keyDown(radios[3], { key: " " });
    expect(onCambiar).toHaveBeenCalledTimes(2);
    expect(onCambiar).toHaveBeenLastCalledWith("evaluating");
  });

  it("el toque activa una etapa distinta; tocar la ACTUAL es no-op", () => {
    const onCambiar = vi.fn();
    render(<SelectorEtapa etapaActual="contacted" onCambiar={onCambiar} />);

    fireEvent.click(screen.getByRole("radio", { name: "Descartado" }));
    expect(onCambiar).toHaveBeenCalledTimes(1);
    expect(onCambiar).toHaveBeenCalledWith("discarded");

    fireEvent.click(screen.getByRole("radio", { name: "Contactado" }));
    fireEvent.keyDown(screen.getByRole("radio", { name: "Contactado" }), { key: "Enter" });
    expect(onCambiar).toHaveBeenCalledTimes(1); // sin llamadas nuevas
  });

  it("deshabilitado (guardando): las activaciones se ignoran pero los botones siguen enfocables", () => {
    const onCambiar = vi.fn();
    render(<SelectorEtapa etapaActual="new" deshabilitado onCambiar={onCambiar} />);
    const contactado = screen.getByRole("radio", { name: "Contactado" });

    expect(contactado.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(contactado);
    fireEvent.keyDown(contactado, { key: "Enter" });
    expect(onCambiar).not.toHaveBeenCalled();

    // aria-disabled (no `disabled`): el foco del teclado no se pierde a mitad de guardado.
    act(() => contactado.focus());
    expect(document.activeElement).toBe(contactado);
  });
});
