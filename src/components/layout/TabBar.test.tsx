// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TabBar } from "./TabBar";
import { NAV_ITEMS } from "./nav";

const { pathnameMock } = vi.hoisted(() => ({ pathnameMock: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => pathnameMock() }));

// Aquí se comprueba que la barra CONECTA el manejador al destino activo y solo
// a él. Lo que el manejador hace por dentro (cancelar y subir) lo fija
// scrollArriba.test.ts. El mock cancela igual para que jsdom no intente navegar.
const { alPulsarMock } = vi.hoisted(() => ({
  alPulsarMock: vi.fn((e: { preventDefault: () => void }) => e.preventDefault()),
}));
vi.mock("./scrollArriba", () => ({ alPulsarDestinoActivo: alPulsarMock }));

// jsdom no implementa la navegación: sin esto, pulsar un enlace NO interceptado
// emite "Not implemented: navigation". No altera nada de lo que se mide.
beforeAll(() => document.addEventListener("click", (e) => e.preventDefault()));

afterEach(() => {
  cleanup();
  alPulsarMock.mockClear();
});

function pintar(pathname: string) {
  pathnameMock.mockReturnValue(pathname);
  return render(<TabBar />);
}

const enlace = (nombre: string) => screen.getByRole("link", { name: nombre });

describe("TabBar: los 3 destinos raíz (JOS-25)", () => {
  it("renderiza los 3 con su etiqueta y su href", () => {
    pintar("/actividad");
    for (const item of NAV_ITEMS) {
      expect(enlace(item.label).getAttribute("href")).toBe(item.href);
    }
  });

  it("marca el activo con aria-current y deja limpios los demás", () => {
    pintar("/prospectos");
    expect(enlace("Prospectos").getAttribute("aria-current")).toBe("page");
    expect(enlace("Inicio").getAttribute("aria-current")).toBeNull();
    expect(enlace("Resumen").getAttribute("aria-current")).toBeNull();
  });
});

describe("TabBar: pulsar la sección ya activa vuelve arriba (JOS-25)", () => {
  it("el destino activo lleva el manejador", () => {
    pintar("/resumen");
    fireEvent.click(enlace("Resumen"));
    expect(alPulsarMock).toHaveBeenCalledOnce();
  });

  it("los destinos no activos navegan como siempre: no lo llevan", () => {
    pintar("/resumen");
    fireEvent.click(enlace("Inicio"));
    fireEvent.click(enlace("Prospectos"));
    expect(alPulsarMock).not.toHaveBeenCalled();
  });
});
