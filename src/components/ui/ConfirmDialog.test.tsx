// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog";

afterEach(cleanup);

function props(over: Partial<ConfirmDialogProps> = {}): ConfirmDialogProps {
  return {
    titulo: "¿Eliminar?",
    mensaje: "No se puede deshacer.",
    etiquetaConfirmar: "Eliminar",
    onConfirmar: vi.fn(),
    onCancelar: vi.fn(),
    ...over,
  };
}

describe("ConfirmDialog (JOS-80)", () => {
  it("es un diálogo modal con etiqueta y descripción asociadas", () => {
    render(<ConfirmDialog {...props()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const labelId = dialog.getAttribute("aria-labelledby");
    const descId = dialog.getAttribute("aria-describedby");
    expect(labelId).not.toBeNull();
    expect(document.getElementById(labelId as string)?.textContent).toBe("¿Eliminar?");
    expect(document.getElementById(descId as string)?.textContent).toContain("No se puede deshacer");
  });

  it("mete el foco dentro al abrir y lo DEVUELVE al invocador al cerrar", () => {
    const invocador = document.createElement("button");
    document.body.appendChild(invocador);
    invocador.focus();
    expect(document.activeElement).toBe(invocador);

    const { unmount } = render(<ConfirmDialog {...props()} />);
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);

    unmount();
    expect(document.activeElement).toBe(invocador);
    invocador.remove();
  });

  it("confirmar dispara SOLO onConfirmar; cancelar SOLO onCancelar", () => {
    const p = props();
    render(<ConfirmDialog {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(p.onConfirmar).toHaveBeenCalledTimes(1);
    expect(p.onCancelar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(p.onCancelar).toHaveBeenCalledTimes(1);
  });

  it("Escape y clic en el fondo equivalen a Cancelar", () => {
    const p = props();
    render(<ConfirmDialog {...p} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(p.onCancelar).toHaveBeenCalledTimes(1);

    const overlay = screen.getByRole("dialog").parentElement as HTMLElement;
    fireEvent.mouseDown(overlay);
    expect(p.onCancelar).toHaveBeenCalledTimes(2);
    expect(p.onConfirmar).not.toHaveBeenCalled();
  });

  it("procesando: bloquea botones, Escape y fondo; muestra error accesible", () => {
    const p = props({ procesando: true, error: "No se pudo eliminar." });
    render(<ConfirmDialog {...p} />);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    const overlay = screen.getByRole("dialog").parentElement as HTMLElement;
    fireEvent.mouseDown(overlay);
    expect(p.onCancelar).not.toHaveBeenCalled();

    expect(screen.getByRole("alert").textContent).toBe("No se pudo eliminar.");
    expect(screen.getByRole("button", { name: "Eliminar" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveProperty("disabled", true);
  });
});
