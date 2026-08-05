// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";
import { NAV_ITEMS } from "./nav";

const { pathnameMock } = vi.hoisted(() => ({ pathnameMock: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => pathnameMock() }));
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => React.createElement("img", { ...props, alt: (props.alt as string) ?? "" }),
}));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { fullName: "Laura Giménez" } }),
  useClerk: () => ({ signOut: vi.fn() }),
}));

// Mismo reparto que en TabBar.test.tsx: aquí se comprueba el cableado, no el efecto.
const { alPulsarMock } = vi.hoisted(() => ({
  alPulsarMock: vi.fn((e: { preventDefault: () => void }) => e.preventDefault()),
}));
vi.mock("./scrollArriba", () => ({ alPulsarDestinoActivo: alPulsarMock }));

beforeAll(() => document.addEventListener("click", (e) => e.preventDefault()));

afterEach(() => {
  cleanup();
  alPulsarMock.mockClear();
});

function pintar(pathname: string) {
  pathnameMock.mockReturnValue(pathname);
  return render(<Sidebar />);
}

const enlace = (nombre: string) => screen.getByRole("link", { name: nombre });

describe("Sidebar: destinos de navegación (JOS-25)", () => {
  it("renderiza los 3 con su href", () => {
    pintar("/actividad");
    for (const item of NAV_ITEMS) {
      expect(enlace(item.label).getAttribute("href")).toBe(item.href);
    }
  });

  it("marca el activo con aria-current y deja limpios los demás", () => {
    pintar("/actividad");
    expect(enlace("Inicio").getAttribute("aria-current")).toBe("page");
    expect(enlace("Prospectos").getAttribute("aria-current")).toBeNull();
  });

  it("pulsar el destino activo llama al manejador; los demás no", () => {
    pintar("/actividad");
    fireEvent.click(enlace("Inicio"));
    expect(alPulsarMock).toHaveBeenCalledOnce();

    alPulsarMock.mockClear();
    fireEvent.click(enlace("Resumen"));
    expect(alPulsarMock).not.toHaveBeenCalled();
  });
});

describe("Sidebar: añadir prospecto en escritorio (JOS-26)", () => {
  it("es un ENLACE a /prospectos/nuevo, no un botón", () => {
    pintar("/actividad");
    const cta = enlace("Añadir prospecto");
    expect(cta.getAttribute("href")).toBe("/prospectos/nuevo");
    expect(cta.tagName).toBe("A");
  });

  it("está presente también fuera de las rutas raíz (ficha y formularios)", () => {
    for (const ruta of ["/prospectos/p7", "/prospectos/nuevo", "/prospectos/p7/interacciones/nueva"]) {
      pintar(ruta);
      expect(enlace("Añadir prospecto").getAttribute("href")).toBe("/prospectos/nuevo");
      cleanup();
    }
  });
});
