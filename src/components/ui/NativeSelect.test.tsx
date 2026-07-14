// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NativeSelect } from "./NativeSelect";

afterEach(cleanup);

const OPCIONES = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Llamada" },
];

function Arnes({ onChange }: { onChange?: (v: string) => void }) {
  const [valor, setValor] = React.useState<string>("");
  return (
    <NativeSelect
      label="Canal de contacto preferido"
      options={OPCIONES}
      value={valor}
      placeholder="Selecciona un canal"
      onChange={(v) => {
        setValor(v);
        onChange?.(v);
      }}
    />
  );
}

describe("NativeSelect (select nativo, JOS-15)", () => {
  it("renderiza un <select> NATIVO con placeholder deshabilitado seleccionado por defecto", () => {
    render(<Arnes />);
    const select = screen.getByRole("combobox", { name: "Canal de contacto preferido" }) as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(select.value).toBe("");
    const placeholder = screen.getByRole("option", { name: "Selecciona un canal" }) as HTMLOptionElement;
    expect(placeholder.disabled).toBe(true);
  });

  it("cambiar la opción notifica el value de la API, no la etiqueta", () => {
    const onChange = vi.fn();
    render(<Arnes onChange={onChange} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "phone" } });
    expect(onChange).toHaveBeenCalledWith("phone");
    expect(select.value).toBe("phone");
  });

  it("error inline visible bajo el campo", () => {
    render(<NativeSelect label="Canal" options={OPCIONES} value="" error="Elige un canal de contacto" />);
    expect(screen.getByText("Elige un canal de contacto")).toBeDefined();
  });
});
