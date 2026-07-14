// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { consumirFlash, escribirFlash } from "./flash";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("flash (mensaje de una sola lectura)", () => {
  it("escribir + consumir devuelve el mensaje y lo borra (la segunda lectura es null)", () => {
    escribirFlash("Interacción registrada");
    expect(consumirFlash()).toBe("Interacción registrada");
    expect(consumirFlash()).toBeNull();
  });

  it("consumir sin nada pendiente devuelve null", () => {
    expect(consumirFlash()).toBeNull();
  });

  it("el último escrito gana (no se acumulan)", () => {
    escribirFlash("primero");
    escribirFlash("segundo");
    expect(consumirFlash()).toBe("segundo");
    expect(consumirFlash()).toBeNull();
  });
});
