// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { AppShell } from "./AppShell";

const { pathnameMock } = vi.hoisted(() => ({ pathnameMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
// El logo del Sidebar usa next/image; un <img> plano basta para el shell.
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => React.createElement("img", { ...props, alt: (props.alt as string) ?? "" }),
}));
// Sidebar y MobileHeader leen la sesión de Clerk (JOS-66). Al shell solo le
// importa el layout, así que basta un usuario fijo y un signOut espía.
const { signOutMock } = vi.hoisted(() => ({ signOutMock: vi.fn() }));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { fullName: "Laura Giménez" } }),
  useClerk: () => ({ signOut: signOutMock }),
}));

afterEach(cleanup);

/** La TabBar es el único nav fijo al borde inferior (el del Sidebar no lo es). */
function tabBar(container: HTMLElement) {
  return container.querySelector("nav.fixed.bottom-0");
}

/** El FAB es el único enlace circular fijo (el CTA del Sidebar es rectangular). */
function fab(container: HTMLElement) {
  return container.querySelector<HTMLAnchorElement>("a.fixed.rounded-full");
}

function pintar(pathname: string) {
  pathnameMock.mockReturnValue(pathname);
  return render(
    <AppShell>
      <p>contenido</p>
    </AppShell>,
  );
}

describe("AppShell: TabBar oculta SOLO en la ficha (M4 bocado 1, P16)", () => {
  it.each(["/actividad", "/prospectos/nuevo", "/prospectos/p7/interacciones/nueva"])(
    "en %s la TabBar sigue presente y el main reserva su altura",
    (ruta) => {
      pathnameMock.mockReturnValue(ruta);
      const { container } = render(
        <AppShell>
          <p>contenido</p>
        </AppShell>,
      );
      expect(tabBar(container)).not.toBeNull();
      expect(container.querySelector("main")!.className).toContain("pb-20");
    },
  );

  it("en la ficha (/prospectos/{id}) no hay TabBar ni padding reservado para ella", () => {
    pathnameMock.mockReturnValue("/prospectos/p7");
    const { container } = render(
      <AppShell>
        <p>contenido</p>
      </AppShell>,
    );
    expect(tabBar(container)).toBeNull();
    expect(container.querySelector("main")!.className).not.toContain("pb-20");
  });
});

describe("AppShell: dónde sale el FAB en móvil (JOS-26)", () => {
  it.each(["/actividad", "/prospectos", "/resumen", "/prospectos/p7"])("sale en %s", (ruta) => {
    const { container } = pintar(ruta);
    expect(fab(container)).not.toBeNull();
  });

  it.each(["/prospectos/nuevo", "/prospectos/p7/interacciones/nueva"])(
    "NO sale en %s: son las pantallas con formulario a medio rellenar",
    (ruta) => {
      const { container } = pintar(ruta);
      expect(fab(container)).toBeNull();
    },
  );

  it("apunta al alta de prospecto y es alcanzable sin visión", () => {
    const { container } = pintar("/actividad");
    expect(fab(container)!.getAttribute("href")).toBe("/prospectos/nuevo");
    expect(fab(container)!.getAttribute("aria-label")).toBe("Añadir prospecto");
  });
});

describe("AppShell: el FAB se apoya en lo que hay debajo (JOS-26)", () => {
  it("en las rutas raíz se ancla sobre la TabBar", () => {
    const { container } = pintar("/actividad");
    expect(fab(container)!.style.bottom).toBe("calc(var(--layout-tabbar) + 16px)");
  });

  it("en la ficha se ancla sobre su barra CTA, NO sobre una TabBar que no existe", () => {
    const { container } = pintar("/prospectos/p7");
    expect(fab(container)!.style.bottom).toBe("calc(var(--layout-ficha-cta) + 16px)");
  });
});

describe("AppShell: FAB y TabBar son contratos independientes", () => {
  // La regresión que se vigila: que aparecer/desaparecer el FAB arrastre a la
  // TabBar o a su padding rompería JOS-59 y el contrato de M4.
  it("en /prospectos/nuevo no hay FAB, pero la TabBar y su padding siguen ahí", () => {
    const { container } = pintar("/prospectos/nuevo");
    expect(fab(container)).toBeNull();
    expect(tabBar(container)).not.toBeNull();
    expect(container.querySelector("main")!.className).toContain("pb-20");
  });

  it("en la ficha hay FAB, y aun así sigue sin TabBar ni padding", () => {
    const { container } = pintar("/prospectos/p7");
    expect(fab(container)).not.toBeNull();
    expect(tabBar(container)).toBeNull();
    expect(container.querySelector("main")!.className).not.toContain("pb-20");
  });
});
