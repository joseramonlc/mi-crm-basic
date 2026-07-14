// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Toast } from "./Toast";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Toast (confirmación flotante)", () => {
  it("anuncia el mensaje como status y se auto-cierra tras la duración avisando a onClose", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Toast mensaje="Interacción registrada" duracionMs={4000} onClose={onClose} />);

    expect(screen.getByRole("status").textContent).toContain("Interacción registrada");

    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(screen.queryByRole("status")).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole("status")).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("posición por variable CSS (P16.c): fallbacks idénticos a la posición de siempre en móvil y escritorio", () => {
    // jsdom no resuelve var(); el contrato verificable aquí es el cableado de
    // las clases — la resolución visual la cubre el E2E del bocado 1 de M4.
    render(<Toast mensaje="Hola" />);
    const el = screen.getByRole("status");
    expect(el.className).toContain("bottom-[var(--toast-bottom,calc(var(--layout-tabbar)+16px))]");
    expect(el.className).toContain("md:bottom-[var(--toast-bottom,1.5rem)]");
  });

  it("una pantalla con barra propia puede definir --toast-bottom en un ancestro y el toast la hereda", () => {
    render(
      <div style={{ ["--toast-bottom" as string]: "calc(var(--ficha-cta) + 16px)" }}>
        <Toast mensaje="Hola" />
      </div>,
    );
    const contenedor = screen.getByRole("status").parentElement as HTMLElement;
    expect(contenedor.style.getPropertyValue("--toast-bottom")).toBe("calc(var(--ficha-cta) + 16px)");
  });

  it("desmontar antes del auto-cierre no dispara onClose (timer limpiado)", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { unmount } = render(<Toast mensaje="Hola" onClose={onClose} />);
    unmount();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
