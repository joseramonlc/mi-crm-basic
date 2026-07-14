// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PillSelect, type PillOption } from "./PillSelect";

afterEach(cleanup);

const OPCIONES: Array<PillOption> = [
  { value: "call", label: "Llamada" },
  { value: "message", label: "Mensaje" },
  { value: "meeting", label: "Reunión" },
];

/** Arnés controlado: PillSelect no guarda estado propio. */
function Arnes({ onChange, error }: { onChange?: (v: string) => void; error?: string }) {
  const [valor, setValor] = React.useState<string | undefined>(undefined);
  return (
    <PillSelect
      label="Tipo de contacto"
      options={OPCIONES}
      value={valor}
      onChange={(v) => {
        setValor(v);
        onChange?.(v);
      }}
      error={error}
    />
  );
}

describe("PillSelect (radiogroup accesible)", () => {
  it("selección única: el click marca aria-checked y notifica el value", () => {
    const onChange = vi.fn();
    render(<Arnes onChange={onChange} />);

    const grupo = screen.getByRole("radiogroup", { name: "Tipo de contacto" });
    expect(grupo).toBeDefined();

    fireEvent.click(screen.getByRole("radio", { name: "Mensaje" }));
    expect(onChange).toHaveBeenCalledWith("message");
    expect(screen.getByRole("radio", { name: "Mensaje" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Llamada" }).getAttribute("aria-checked")).toBe("false");

    fireEvent.click(screen.getByRole("radio", { name: "Reunión" }));
    expect(screen.getByRole("radio", { name: "Mensaje" }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("radio", { name: "Reunión" }).getAttribute("aria-checked")).toBe("true");
  });

  it("roving tabindex: solo un pill es tabulable; las flechas mueven y seleccionan con envoltura", () => {
    render(<Arnes />);

    // Sin selección, el primero es el tabulable.
    expect(screen.getByRole("radio", { name: "Llamada" }).getAttribute("tabindex")).toBe("0");
    expect(screen.getByRole("radio", { name: "Mensaje" }).getAttribute("tabindex")).toBe("-1");

    fireEvent.keyDown(screen.getByRole("radio", { name: "Llamada" }), { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "Mensaje" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Mensaje" }).getAttribute("tabindex")).toBe("0");
    expect(screen.getByRole("radio", { name: "Llamada" }).getAttribute("tabindex")).toBe("-1");

    // Envoltura hacia atrás desde el primero.
    fireEvent.keyDown(screen.getByRole("radio", { name: "Mensaje" }), { key: "ArrowLeft" });
    fireEvent.keyDown(screen.getByRole("radio", { name: "Llamada" }), { key: "ArrowUp" });
    expect(screen.getByRole("radio", { name: "Reunión" }).getAttribute("aria-checked")).toBe("true");
  });

  it("error inline: visible y vinculado al grupo por aria-describedby", () => {
    render(<Arnes error="Elige un tipo de contacto" />);
    const grupo = screen.getByRole("radiogroup", { name: "Tipo de contacto" });
    const describedBy = grupo.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const errorEl = document.getElementById(describedBy as string);
    expect(errorEl?.textContent).toBe("Elige un tipo de contacto");
  });
});
