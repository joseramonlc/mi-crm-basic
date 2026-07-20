import { describe, expect, it } from "vitest";
import { nombreDeUsuario } from "./usuario";

describe("nombreDeUsuario", () => {
  it("prefiere el nombre completo", () => {
    expect(nombreDeUsuario({ fullName: "Laura Giménez", firstName: "Laura" })).toBe("Laura Giménez");
  });

  it("cae al nombre de pila y luego al email", () => {
    expect(nombreDeUsuario({ fullName: null, firstName: "Laura" })).toBe("Laura");
    expect(
      nombreDeUsuario({ fullName: null, firstName: null, primaryEmailAddress: { emailAddress: "laura@ejemplo.com" } }),
    ).toBe("laura@ejemplo.com");
  });

  it("nunca deja el hueco vacío mientras Clerk carga o si no hay datos", () => {
    expect(nombreDeUsuario(undefined)).toBe("Mi cuenta");
    expect(nombreDeUsuario(null)).toBe("Mi cuenta");
    expect(nombreDeUsuario({ fullName: "", firstName: "" })).toBe("Mi cuenta");
  });
});
