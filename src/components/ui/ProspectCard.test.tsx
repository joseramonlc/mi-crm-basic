// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Badge } from "./Badge";
import { ProspectCard } from "./ProspectCard";

afterEach(cleanup);

describe("ProspectCard", () => {
  it("muestra la etapa por defecto (retrocompatible con Actividad Diaria)", () => {
    render(<ProspectCard name="Ana García" stage="presented" />);
    expect(screen.getByText("Presentación realizada")).toBeDefined();
  });

  it("showStage={false} oculta la etapa sin tocar el resto de la tarjeta", () => {
    render(<ProspectCard name="Ana García" stage="presented" showStage={false} lastInteraction="Vencido hace 3 días" />);
    expect(screen.queryByText("Presentación realizada")).toBeNull();
    expect(screen.getByText("Ana García")).toBeDefined();
    expect(screen.getByText("Vencido hace 3 días")).toBeDefined();
  });

  it("accessory se renderiza en la fila de metadatos y por defecto no hay ninguno", () => {
    const { rerender } = render(<ProspectCard name="Ana García" />);
    expect(screen.queryByText("Vencido")).toBeNull();

    rerender(<ProspectCard name="Ana García" accessory={<Badge tone="error">Vencido</Badge>} />);
    expect(screen.getByText("Vencido")).toBeDefined();
  });

  it("onOpen se dispara al pulsar la tarjeta", () => {
    const onOpen = vi.fn();
    render(<ProspectCard name="Ana García" onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
