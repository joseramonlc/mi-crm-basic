import { describe, expect, it } from "vitest";
import { mensajeDeError } from "./authErrores";

/** Los métodos Future devuelven `{ error }`, no lanzan: basta el código. */
function errorDeClerk(code: string) {
  return { code, message: "in English", longMessage: "in English, longer" };
}

describe("mensajeDeError", () => {
  it("traduce los códigos conocidos de Clerk al castellano del producto", () => {
    expect(mensajeDeError(errorDeClerk("form_password_incorrect"))).toBe("Email o contraseña incorrectos.");
    expect(mensajeDeError(errorDeClerk("form_identifier_exists"))).toBe("Ya existe una cuenta con ese email.");
    expect(mensajeDeError(errorDeClerk("form_code_incorrect"))).toBe(
      "El código no es correcto. Revísalo e inténtalo de nuevo.",
    );
  });

  it("no distingue email inexistente de contraseña incorrecta", () => {
    expect(mensajeDeError(errorDeClerk("form_identifier_not_found"))).toBe(
      mensajeDeError(errorDeClerk("form_password_incorrect")),
    );
  });

  it("cae al texto genérico ante un código desconocido, sin filtrar el mensaje de la API", () => {
    const mensaje = mensajeDeError(errorDeClerk("codigo_que_no_mapeamos"));
    expect(mensaje).toBe("No hemos podido completar la operación. Inténtalo de nuevo.");
    expect(mensaje).not.toContain("English");
  });

  it("distingue el fallo de red del error genérico", () => {
    expect(mensajeDeError(new TypeError("Failed to fetch"))).toBe(
      "No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.",
    );
  });

  it("no rompe con null o formas inesperadas", () => {
    expect(mensajeDeError(null)).toBe("No hemos podido completar la operación. Inténtalo de nuevo.");
    expect(mensajeDeError({ sinCodigo: true })).toBe("No hemos podido completar la operación. Inténtalo de nuevo.");
  });
});
