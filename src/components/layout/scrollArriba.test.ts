// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { alPulsarDestinoActivo, scrollArriba } from "./scrollArriba";

type Clic = Parameters<typeof alPulsarDestinoActivo>[0];
type Modificador = "metaKey" | "ctrlKey" | "shiftKey" | "altKey";

function clic(modificadores: Partial<Record<Modificador, boolean>> = {}) {
  const preventDefault = vi.fn();
  const evento = {
    preventDefault,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...modificadores,
  } as unknown as Clic;
  return { evento, preventDefault };
}

function espiarScrollTo() {
  return vi.spyOn(window, "scrollTo").mockImplementation(() => {});
}

/** jsdom no trae `matchMedia`; instalarlo es la única forma de recorrer la rama. */
function fingirMovimientoReducido(reduce: boolean) {
  vi.stubGlobal("matchMedia", vi.fn((media: string) => ({ matches: reduce, media })));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("scrollArriba", () => {
  it("sube al principio de la ventana", () => {
    const scrollTo = espiarScrollTo();
    scrollArriba();
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });

  it("anima el movimiento por defecto", () => {
    const scrollTo = espiarScrollTo();
    fingirMovimientoReducido(false);
    scrollArriba();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("no anima si el sistema pide movimiento reducido", () => {
    const scrollTo = espiarScrollTo();
    fingirMovimientoReducido(true);
    scrollArriba();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });

  it("sin matchMedia no lanza, y anima", () => {
    const scrollTo = espiarScrollTo();
    // Estado real de jsdom: window.matchMedia no existe.
    expect(window.matchMedia).toBeUndefined();
    expect(() => scrollArriba()).not.toThrow();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});

describe("alPulsarDestinoActivo", () => {
  it("cancela la navegación y sube (pulsación simple)", () => {
    const scrollTo = espiarScrollTo();
    const { evento, preventDefault } = clic();
    alPulsarDestinoActivo(evento);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledOnce();
  });

  it.each<Modificador>(["metaKey", "ctrlKey", "shiftKey", "altKey"])(
    "con %s deja pasar el clic al navegador: ni cancela ni sube",
    (modificador) => {
      const scrollTo = espiarScrollTo();
      const { evento, preventDefault } = clic({ [modificador]: true });
      alPulsarDestinoActivo(evento);
      expect(preventDefault).not.toHaveBeenCalled();
      expect(scrollTo).not.toHaveBeenCalled();
    },
  );
});
