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
