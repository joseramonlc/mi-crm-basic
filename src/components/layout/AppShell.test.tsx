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

afterEach(cleanup);

/** La TabBar es el único nav fijo al borde inferior (el del Sidebar no lo es). */
function tabBar(container: HTMLElement) {
  return container.querySelector("nav.fixed.bottom-0");
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
