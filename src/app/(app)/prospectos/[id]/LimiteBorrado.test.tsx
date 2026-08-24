// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ConvexError } from "convex/values";
import { LimiteBorrado } from "./LimiteBorrado";

afterEach(cleanup);

/** Hijo que lanza en render el error indicado (simula la invalidación reactiva de `obtener`). */
function Explota({ error }: { error: unknown }): React.ReactNode {
  throw error;
}

/** Límite envolvente que hace de `error.tsx` de la RUTA en la prueba. */
class LimiteDePrueba extends React.Component<{ children: React.ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  render() {
    return this.state.fallo ? <p>ruta-capturó</p> : this.props.children;
  }
}

function montar(error: unknown, borrando: boolean) {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  render(
    <LimiteDePrueba>
      <LimiteBorrado borrandoRef={{ current: borrando }} fallback={<p>Eliminando…</p>}>
        <Explota error={error} />
      </LimiteBorrado>
    </LimiteDePrueba>,
  );
  return spy;
}

const NOT_FOUND = new ConvexError({ code: "NOT_FOUND" });

describe("LimiteBorrado (JOS-80 §6.1)", () => {
  it("borrando + ConvexError NOT_FOUND: lo absorbe y muestra el fallback (no propaga)", () => {
    const spy = montar(NOT_FOUND, true);
    expect(screen.getByText("Eliminando…")).toBeDefined();
    expect(screen.queryByText("ruta-capturó")).toBeNull();
    spy.mockRestore();
  });

  it("borrando + OTRO error (no NOT_FOUND): RE-LANZA a la ruta (no enmascara fallos reales)", () => {
    // El caso que pidió el auditor: un UNAUTHENTICATED / red / fallo de render NO debe quedar
    // atrapado en «Eliminando…».
    const spy = montar(new Error("boom"), true);
    expect(screen.queryByText("Eliminando…")).toBeNull();
    expect(screen.getByText("ruta-capturó")).toBeDefined();
    spy.mockRestore();
  });

  it("fuera de un borrado (borrandoRef=false): RE-LANZA aunque sea NOT_FOUND", () => {
    const spy = montar(NOT_FOUND, false);
    expect(screen.queryByText("Eliminando…")).toBeNull();
    expect(screen.getByText("ruta-capturó")).toBeDefined();
    spy.mockRestore();
  });
});
