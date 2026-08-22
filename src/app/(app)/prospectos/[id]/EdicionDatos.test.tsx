// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConvexError } from "convex/values";
import type { ProspectoPublico } from "../../../../../convex/lib/proyecciones";
import {
  BANNER_ERROR_RED,
  ERROR_EMAIL_FORMATO,
  ERROR_NOMBRE_OBLIGATORIO,
  OPCIONES_COMO_SE_CONOCIO,
} from "../nuevo/textos";
import { GUARDAR_CAMBIOS, TITULO_EDICION } from "./textos";
import { EdicionDatos } from "./EdicionDatos";

afterEach(cleanup);

const PROSPECTO: ProspectoPublico = {
  id: "p7" as ProspectoPublico["id"],
  nombre: "Ana Pérez",
  telefono: "+34 600 111 222",
  email: "ana@ejemplo.com",
  comoSeConocio: "Evento",
  canalContactoPreferido: "whatsapp",
  etapaActual: "contacted",
  notas: "Nota previa.",
  fechaAlta: Date.UTC(2026, 5, 15, 10),
  fechaUltimoContacto: Date.UTC(2026, 6, 10, 10),
  fechaProximoSeguimiento: Date.UTC(2026, 6, 20, 10),
  // JOS-50: la API siempre la resuelve, así que el fixture también la trae.
  prioridad: "medium",
};

/** Copia del fixture sin los campos indicados (opcionales ausentes de la API). */
function sin<T extends object, K extends keyof T>(objeto: T, ...claves: K[]): Omit<T, K> {
  const copia = { ...objeto };
  for (const clave of claves) delete copia[clave];
  return copia;
}

function montar(props: Partial<React.ComponentProps<typeof EdicionDatos>> = {}) {
  const onGuardar = vi.fn().mockResolvedValue(PROSPECTO);
  const onCerrar = vi.fn();
  render(<EdicionDatos prospecto={PROSPECTO} onGuardar={onGuardar} onCerrar={onCerrar} {...props} />);
  return { onGuardar, onCerrar, formulario: () => screen.getByRole("form", { name: TITULO_EDICION }) };
}

describe("EdicionDatos (JOS-18): formulario co-localizado de la ficha", () => {
  it("precarga EXACTAMENTE los 7 campos editables con los valores actuales; los del sistema no están (P9)", () => {
    montar();
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Ana Pérez");
    expect((screen.getByLabelText("Teléfono") as HTMLInputElement).value).toBe("+34 600 111 222");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("ana@ejemplo.com");
    expect((screen.getByLabelText("Notas") as HTMLTextAreaElement).value).toBe("Nota previa.");
    expect((screen.getByLabelText("Canal de contacto preferido") as HTMLSelectElement).value).toBe("whatsapp");
    expect((screen.getByLabelText("Cómo se le conoció") as HTMLSelectElement).value).toBe("Evento");
    // JOS-52: la prioridad actual (Media, del fixture) es la pastilla marcada.
    expect(screen.getByRole("radio", { name: "Media" }).getAttribute("aria-checked")).toBe("true");
    // 4 cajas de texto (nombre, teléfono, email, notas) + 2 selects + 3 pastillas
    // de prioridad: nada más es editable — ni fechas ni etapa aparecen como campos.
    expect(screen.getAllByRole("textbox")).toHaveLength(4);
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("opcionales ausentes en la API → campos vacíos", () => {
    montar({ prospecto: sin(PROSPECTO, "telefono", "email", "notas") as ProspectoPublico });
    expect((screen.getByLabelText("Teléfono") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Notas") as HTMLTextAreaElement).value).toBe("");
  });

  it("nombre vaciado: error inline en blur, Guardar deshabilitado y el submit no llama (P4)", () => {
    const { onGuardar, formulario } = montar();
    const nombre = screen.getByLabelText("Nombre");
    fireEvent.change(nombre, { target: { value: "  " } });
    fireEvent.blur(nombre);
    expect(screen.getByText(ERROR_NOMBRE_OBLIGATORIO)).toBeDefined();
    expect((screen.getByRole("button", { name: GUARDAR_CAMBIOS }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(formulario());
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it("email inválido: error inline en blur y el submit no llama (P4)", () => {
    const { onGuardar, formulario } = montar();
    const email = screen.getByLabelText("Email");
    fireEvent.change(email, { target: { value: "sin-arroba" } });
    fireEvent.blur(email);
    expect(screen.getByText(ERROR_EMAIL_FORMATO)).toBeDefined();
    fireEvent.submit(formulario());
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it("diff: SOLO el campo cambiado viaja en el patch (P5)", () => {
    const { onGuardar, formulario } = montar();
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "  Ana P. López  " } });
    fireEvent.submit(formulario());
    expect(onGuardar).toHaveBeenCalledTimes(1);
    // Un único par clave-valor, con trim: el resto de campos NO viaja.
    expect(onGuardar).toHaveBeenCalledWith({ nombre: "Ana P. López" });
  });

  it("diff de prioridad: cambiar la pastilla viaja SOLO ese campo (JOS-52)", () => {
    const { onGuardar, formulario } = montar();
    // El fixture arranca en "Media"; elegir "Alta" es el único cambio.
    fireEvent.click(screen.getByRole("radio", { name: "Alta" }));
    fireEvent.submit(formulario());
    expect(onGuardar).toHaveBeenCalledTimes(1);
    expect(onGuardar).toHaveBeenCalledWith({ prioridad: "high" });
  });

  it("vaciar un opcional viaja como cadena vacía — el backend lo elimina por contrato M2 (P5)", () => {
    const { onGuardar, formulario } = montar();
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "" } });
    fireEvent.submit(formulario());
    expect(onGuardar).toHaveBeenCalledWith({ telefono: "" });
  });

  it("sin cambios: sale a lectura SIN llamada ni toast (D2)", () => {
    const { onGuardar, onCerrar, formulario } = montar();
    fireEvent.submit(formulario());
    expect(onGuardar).not.toHaveBeenCalled();
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("doble submit en la misma tarea síncrona → UNA llamada (guarda useRef, lección M3)", () => {
    const onGuardar = vi.fn().mockImplementation(() => new Promise(() => {}));
    const { formulario } = montar({ onGuardar });
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Otro Nombre" } });
    fireEvent.submit(formulario());
    fireEvent.submit(formulario());
    expect(onGuardar).toHaveBeenCalledTimes(1);
  });

  it("durante el guardado, «Cancelar» queda deshabilitado (pulido: no cerrar a mitad de guardado)", () => {
    const onGuardar = vi.fn().mockImplementation(() => new Promise(() => {}));
    const { onCerrar, formulario } = montar({ onGuardar });
    const cancelar = screen.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement;
    expect(cancelar.disabled).toBe(false);

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Otro Nombre" } });
    fireEvent.submit(formulario());
    expect(cancelar.disabled).toBe(true);
    fireEvent.click(cancelar);
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it("rechazo genérico: banner exacto, sigue en edición y conserva lo tecleado (P7)", async () => {
    const onGuardar = vi.fn().mockRejectedValue(new Error("fetch failed"));
    montar({ onGuardar });
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ana López" } });
    fireEvent.submit(screen.getByRole("form", { name: TITULO_EDICION }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(BANNER_ERROR_RED));
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Ana López");
    expect((screen.getByRole("button", { name: GUARDAR_CAMBIOS }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("VALIDATION_ERROR del servidor con field → error inline mapeado, sin banner (P7)", async () => {
    const onGuardar = vi.fn().mockRejectedValue(new ConvexError({ code: "VALIDATION_ERROR", field: "email", message: "Email no válido" }));
    montar({ onGuardar });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana2@ejemplo.com" } });
    fireEvent.submit(screen.getByRole("form", { name: TITULO_EDICION }));

    await waitFor(() => expect(screen.getByText(ERROR_EMAIL_FORMATO)).toBeDefined());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("defensa comoSeConocio (observación del GO): un valor fuera de las opciones fijas se representa sin cambio silencioso", () => {
    const { onGuardar, onCerrar, formulario } = montar({
      prospecto: { ...PROSPECTO, comoSeConocio: "Recomendación de un cliente" },
    });
    const select = screen.getByLabelText("Cómo se le conoció") as HTMLSelectElement;
    expect(select.value).toBe("Recomendación de un cliente");
    // Se excluye la opción placeholder vacía y deshabilitada que NativeSelect
    // antepone siempre (no seleccionable): el valor libre encabeza las reales.
    const valores = Array.from(select.options)
      .filter((o) => o.value !== "")
      .map((o) => o.value);
    expect(valores).toEqual(["Recomendación de un cliente", ...OPCIONES_COMO_SE_CONOCIO]);
    // Guardar sin tocar nada sigue siendo un no-op: el valor libre NO genera diff.
    fireEvent.submit(formulario());
    expect(onGuardar).not.toHaveBeenCalled();
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("cancelar descarta y cierra sin llamada (P8, D3)", () => {
    const { onGuardar, onCerrar } = montar();
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Cambio descartado" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCerrar).toHaveBeenCalledTimes(1);
    expect(onGuardar).not.toHaveBeenCalled();
  });
});
