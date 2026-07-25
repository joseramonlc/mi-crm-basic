import { describe, expect, it } from "vitest";
import { mensajeDeError, esEmailNoEncontrado, MSG_CODIGO_INCORRECTO } from "./authErrores";

const PASS_INCORRECTA = "Email o contraseña incorrectos.";
const GENERICO = "No hemos podido completar la operación. Inténtalo de nuevo.";
const SIN_RED = "No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.";

/** Forma PLANA: `ClerkError` con `code` en el nivel superior (el tipo declarado
 *  por los métodos Future). El helper debe cubrirla vía el fallback. */
function errorDeClerk(code: string) {
  return { code, message: "in English", longMessage: "in English, longer" };
}

/** Forma REAL en runtime: `ClerkAPIResponseError`. El `code` superior es el
 *  genérico `api_response_error` y el/los específicos viajan anidados en `errors[]`. */
function errorApiClerk(...codes: string[]) {
  return {
    code: "api_response_error",
    status: 422,
    errors: codes.map((code) => ({ code, message: "in English", longMessage: "in English, longer" })),
  };
}

describe("mensajeDeError", () => {
  it("traduce los códigos conocidos — forma plana (code superior)", () => {
    expect(mensajeDeError(errorDeClerk("form_password_incorrect"))).toBe(PASS_INCORRECTA);
    expect(mensajeDeError(errorDeClerk("form_identifier_exists"))).toBe("Ya existe una cuenta con ese email.");
    expect(mensajeDeError(errorDeClerk("form_code_incorrect"))).toBe(MSG_CODIGO_INCORRECTO);
  });

  it("traduce los códigos conocidos — forma anidada real (errors[])", () => {
    expect(mensajeDeError(errorApiClerk("form_password_incorrect"))).toBe(PASS_INCORRECTA);
    expect(mensajeDeError(errorApiClerk("form_code_incorrect"))).toBe(MSG_CODIGO_INCORRECTO);
  });

  it("no distingue email inexistente de contraseña incorrecta (ambas formas)", () => {
    expect(mensajeDeError(errorDeClerk("form_identifier_not_found"))).toBe(PASS_INCORRECTA);
    expect(mensajeDeError(errorApiClerk("form_identifier_not_found"))).toBe(PASS_INCORRECTA);
  });

  it("prioridad: con varios errores, gana el primer código con traducción conocida", () => {
    // El específico no está el primero: igualmente se traduce.
    expect(mensajeDeError(errorApiClerk("codigo_desconocido", "form_password_incorrect"))).toBe(PASS_INCORRECTA);
    // Si el primero ya mapea, ese gana.
    expect(mensajeDeError(errorApiClerk("form_code_incorrect", "form_password_incorrect"))).toBe(MSG_CODIGO_INCORRECTO);
  });

  it("cae al texto genérico ante un código desconocido, sin filtrar el mensaje de la API (ambas formas)", () => {
    for (const err of [errorDeClerk("codigo_que_no_mapeamos"), errorApiClerk("codigo_que_no_mapeamos")]) {
      const mensaje = mensajeDeError(err);
      expect(mensaje).toBe(GENERICO);
      expect(mensaje).not.toContain("English");
    }
  });

  it("distingue el fallo de red del error genérico", () => {
    expect(mensajeDeError(new TypeError("Failed to fetch"))).toBe(SIN_RED);
  });

  it("no rompe con null, formas inesperadas o errors vacío", () => {
    expect(mensajeDeError(null)).toBe(GENERICO);
    expect(mensajeDeError({ sinCodigo: true })).toBe(GENERICO);
    expect(mensajeDeError({ errors: [] })).toBe(GENERICO);
  });

  it("un código que colisiona con Object.prototype (toString/constructor) cae al genérico", () => {
    // No debe devolver el método heredado del mapa: solo cuentan claves propias.
    expect(mensajeDeError(errorDeClerk("toString"))).toBe(GENERICO);
    expect(mensajeDeError(errorApiClerk("constructor"))).toBe(GENERICO);
    expect(mensajeDeError(errorDeClerk("hasOwnProperty"))).toBe(GENERICO);
  });
});

describe("esEmailNoEncontrado", () => {
  it("es true para form_identifier_not_found — forma plana y anidada", () => {
    expect(esEmailNoEncontrado(errorDeClerk("form_identifier_not_found"))).toBe(true);
    expect(esEmailNoEncontrado(errorApiClerk("form_identifier_not_found"))).toBe(true);
  });

  it("es true aunque form_identifier_not_found NO sea el primer elemento del array (seguridad)", () => {
    expect(esEmailNoEncontrado(errorApiClerk("form_param_format_invalid", "form_identifier_not_found"))).toBe(true);
  });

  it("es false para otros códigos (ambas formas)", () => {
    expect(esEmailNoEncontrado(errorDeClerk("form_code_incorrect"))).toBe(false);
    expect(esEmailNoEncontrado(errorApiClerk("form_password_incorrect"))).toBe(false);
    // El code superior genérico por sí solo no debe activarlo.
    expect(esEmailNoEncontrado({ code: "api_response_error", errors: [] })).toBe(false);
  });

  it("es false ante formas sin código, null o errores de red", () => {
    expect(esEmailNoEncontrado(null)).toBe(false);
    expect(esEmailNoEncontrado({ sinCodigo: true })).toBe(false);
    expect(esEmailNoEncontrado(new TypeError("Failed to fetch"))).toBe(false);
  });
});
