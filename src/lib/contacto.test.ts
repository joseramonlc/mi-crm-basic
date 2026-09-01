import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { enlaceEmail, enlaceWhatsApp, normalizarTelefonoES } from "./contacto";

/**
 * Estas pruebas son el contrato de seguridad de JOS-83, no una comprobación de
 * cortesía. El teléfono y el email del prospecto llegan SIN validar de verdad
 * (`EMAIL_RE` acepta `?`, `#`, `&` y `%`; `telefono` es texto libre), así que lo
 * que se ejercita aquí es exactamente lo que impide que un dato escrito a mano
 * fabrique un enlace a otro destinatario o reviente el render de la Ficha.
 */

/** Todos los caracteres tras `mailto:` que permitirían inyectar en un enlace de correo. */
const PELIGROSOS_EN_DESTINATARIO = ["?", "&", "=", "@", "#"];

function destinatarioDe(href: string): string {
  const sinEsquema = href.slice("mailto:".length);
  const corte = sinEsquema.indexOf("?");
  return corte === -1 ? sinEsquema : sinEsquema.slice(0, corte);
}

describe("normalizarTelefonoES — la tabla cerrada del plan (§5.1)", () => {
  it("nacional de 9 dígitos: le pone el +34 y quita los separadores", () => {
    expect(normalizarTelefonoES("600 11 12 22")).toBe("34600111222");
    expect(normalizarTelefonoES("600-11-12-22")).toBe("34600111222");
    expect(normalizarTelefonoES("(600) 111.222")).toBe("34600111222");
  });

  it("respeta el prefijo cuando ya viene, con + o con 00", () => {
    expect(normalizarTelefonoES("+34600111222")).toBe("34600111222");
    expect(normalizarTelefonoES("0034600111222")).toBe("34600111222");
  });

  it("respeta un número extranjero", () => {
    expect(normalizarTelefonoES("+44 7700 900123")).toBe("447700900123");
  });

  it("rechaza un nacional que no tenga exactamente 9 dígitos", () => {
    // Ambiguo: no se adivina si falta prefijo o sobra un dígito.
    expect(normalizarTelefonoES("600 111")).toBeNull();
    expect(normalizarTelefonoES("6001112223")).toBeNull();
  });

  it("rechaza por debajo de 8 dígitos y por encima de 15 (límites E.164)", () => {
    expect(normalizarTelefonoES("+1 234")).toBeNull();
    expect(normalizarTelefonoES("+1234567")).toBeNull(); // 7 dígitos
    expect(normalizarTelefonoES("+12345678")).toBe("12345678"); // 8, el suelo
    expect(normalizarTelefonoES("+123456789012345")).toBe("123456789012345"); // 15, el techo
    expect(normalizarTelefonoES("+1234567890123456")).toBeNull(); // 16
  });

  it("rechaza el 0 inicial que queda tras resolver el prefijo (hallazgo de rev. 3)", () => {
    // El caso que un rango 8–15 «a secas» dejaba pasar: E.164 no admite 0 inicial,
    // y wa.me daría un enlace roto con aspecto de habilitado.
    expect(normalizarTelefonoES("+00 12345678")).toBeNull();
    expect(normalizarTelefonoES("000123456789")).toBeNull();
  });

  it("RECHAZA los caracteres no permitidos en vez de borrarlos", () => {
    // Clave: limpiar `600abc111` daría `600111`, un número que nadie escribió.
    expect(normalizarTelefonoES("600abc111")).toBeNull();
    expect(normalizarTelefonoES("+34+600111222")).toBeNull();
    expect(normalizarTelefonoES("++34600111222")).toBeNull();
    expect(normalizarTelefonoES("a@b")).toBeNull();
    expect(normalizarTelefonoES("600111222/33")).toBeNull();
    expect(normalizarTelefonoES("600111222#")).toBeNull();
    expect(normalizarTelefonoES("600111222?x=1")).toBeNull();
    expect(normalizarTelefonoES("600111\r\n222")).toBeNull();
    expect(normalizarTelefonoES("600111\u0000222")).toBeNull();
  });

  it("trata como vacío lo que no tiene contenido", () => {
    expect(normalizarTelefonoES(undefined)).toBeNull();
    expect(normalizarTelefonoES("")).toBeNull();
    expect(normalizarTelefonoES("   ")).toBeNull();
    expect(normalizarTelefonoES("+")).toBeNull();
    expect(normalizarTelefonoES("00")).toBeNull();
  });
});

describe("enlaceWhatsApp — se defiende solo (§5.1)", () => {
  it("construye el enlace con dígitos ya normalizados", () => {
    expect(enlaceWhatsApp("34600111222")).toBe("https://wa.me/34600111222");
  });

  it("devuelve null aunque el llamante NO haya normalizado", () => {
    // No confía en su llamante: una integración futura podría pasarle crudo.
    expect(enlaceWhatsApp("0034600111222")).toBeNull(); // 0 inicial
    expect(enlaceWhatsApp("+34600111222")).toBeNull(); // el + no es dígito
    expect(enlaceWhatsApp("600 111 222")).toBeNull(); // espacios
    expect(enlaceWhatsApp("1234567")).toBeNull(); // 7 dígitos
    expect(enlaceWhatsApp("1234567890123456")).toBeNull(); // 16 dígitos
    expect(enlaceWhatsApp("")).toBeNull();
    expect(enlaceWhatsApp("abc")).toBeNull();
  });

  it("codifica el texto opcional que traerá JOS-36", () => {
    expect(enlaceWhatsApp("34600111222", "Hola Ana & Co")).toBe(
      "https://wa.me/34600111222?text=Hola%20Ana%20%26%20Co",
    );
  });
});

describe("enlaceEmail — serialización segura (§5.2)", () => {
  it("codifica el destinatario entero", () => {
    expect(enlaceEmail("ana@ejemplo.com")).toBe("mailto:ana%40ejemplo.com");
  });

  it("NEUTRALIZA el vector de inyección de parámetros", () => {
    const href = enlaceEmail("ana@ejemplo.com?subject=Pwned&body=Evil&cc=malo@x.com");
    expect(href).not.toBeNull();

    // Queda UN solo destinatario: ningún carácter de direccionamiento sobrevive sin escapar.
    const destinatario = destinatarioDe(href!);
    for (const caracter of PELIGROSOS_EN_DESTINATARIO) {
      expect(destinatario).not.toContain(caracter);
    }
    expect(href).not.toContain("cc=");
    expect(href).toContain("%3Fsubject%3DPwned");
  });

  it("codifica el fragmento y el porcentaje literal", () => {
    expect(enlaceEmail("ana@ejemplo.com#fragmento")).toContain("%23fragmento");
    expect(enlaceEmail("ana%40otro@ejemplo.com")).toContain("%2540");
  });

  it("codifica el Unicode del destinatario", () => {
    const href = enlaceEmail("añez@ejemplo.com");
    expect(href).toBe("mailto:a%C3%B1ez%40ejemplo.com");
  });

  it("RECHAZA un destinatario con control o CR/LF (falla en cerrado)", () => {
    // El vector clásico de inyección de cabeceras. Se rechaza en el
    // direccionamiento en vez de sanearse: un email así es basura, no contenido.
    expect(enlaceEmail("ana@ejemplo.com\r\nbcc: malo@x.com")).toBeNull();
    expect(enlaceEmail("ana@ejemplo.com\u0000")).toBeNull();
    expect(enlaceEmail("ana@ejemplo.com\u007F")).toBeNull();
  });

  it("trata como vacío lo que no tiene contenido", () => {
    expect(enlaceEmail("")).toBeNull();
    expect(enlaceEmail("   ")).toBeNull();
  });

  it("SANEA el asunto y el cuerpo en vez de rechazarlos (son contenido)", () => {
    const href = enlaceEmail("ana@ejemplo.com", "Hola & adiós", "Linea uno\r\nLinea dos");
    expect(href).toBe(
      "mailto:ana%40ejemplo.com?subject=Hola%20%26%20adi%C3%B3s&body=Linea%20uno%0D%0ALinea%20dos",
    );
  });

  it("el espacio del cuerpo va como %20 y no como +", () => {
    // Por eso no se usa URLSearchParams: codifica el espacio como + y algunos
    // clientes de correo lo muestran literal.
    const href = enlaceEmail("ana@ejemplo.com", undefined, "dos palabras");
    expect(href).toContain("body=dos%20palabras");
    expect(href).not.toContain("+");
  });

  it("omite los parámetros que no se pasan", () => {
    expect(enlaceEmail("ana@ejemplo.com")).not.toContain("?");
    expect(enlaceEmail("ana@ejemplo.com", "Asunto")).toBe("mailto:ana%40ejemplo.com?subject=Asunto");
  });
});

describe("surrogates UTF-16 sueltos (hallazgo de rev. 4)", () => {
  it("RECHAZA el destinatario que contiene un surrogate suelto", () => {
    // encodeURIComponent lanzaría URIError; el render de la Ficha se caería.
    expect(enlaceEmail("a\uD800@ejemplo.com")).toBeNull();
    expect(enlaceEmail("\uD800")).toBeNull();
  });

  it("SANEA el surrogate suelto del asunto y del cuerpo, sin lanzar", () => {
    const href = enlaceEmail("ana@ejemplo.com", "\uD800", "\uDC00");
    expect(href).toBe("mailto:ana%40ejemplo.com?subject=%EF%BF%BD&body=%EF%BF%BD");
  });

  it("no altera un par de surrogates VÁLIDO", () => {
    const href = enlaceEmail("ana@ejemplo.com", "😀");
    expect(href).toBe("mailto:ana%40ejemplo.com?subject=%F0%9F%98%80");
  });
});

describe("invariante transversal: ninguna de las tres funciones lanza", () => {
  const HOSTILES = [
    "",
    "   ",
    "\uD800",
    "\uDC00",
    "a\uD800@ejemplo.com",
    "𐀀",
    "😀",
    "ana@ejemplo.com?subject=x&cc=y",
    "ana@ejemplo.com\r\nbcc: malo@x.com",
    "\u0000\u001F\u007F",
    "%%%",
    "#".repeat(500),
    "6".repeat(500),
  ];

  it.each(HOSTILES)("no lanza con %j", (entrada) => {
    expect(() => normalizarTelefonoES(entrada)).not.toThrow();
    expect(() => enlaceWhatsApp(entrada)).not.toThrow();
    expect(() => enlaceWhatsApp("34600111222", entrada)).not.toThrow();
    expect(() => enlaceEmail(entrada)).not.toThrow();
    expect(() => enlaceEmail("ana@ejemplo.com", entrada, entrada)).not.toThrow();
  });
});

describe("rama de respaldo sin ES2024 (hallazgo de rev. 5)", () => {
  // El plan exige que NADA llame a String.prototype.toWellFormed sin comprobar
  // antes que existe. Aquí se le quita al runtime y se comprueba que el saneado
  // sigue funcionando igual, en vez de estallar con un TypeError.
  const original = Object.getOwnPropertyDescriptor(String.prototype, "toWellFormed");

  beforeEach(() => {
    // @ts-expect-error se retira a propósito para ejercitar la sustitución manual
    delete String.prototype.toWellFormed;
  });

  afterEach(() => {
    if (original !== undefined) Object.defineProperty(String.prototype, "toWellFormed", original);
  });

  it("el método está realmente ausente durante esta suite", () => {
    expect((("x" as unknown) as { toWellFormed?: unknown }).toWellFormed).toBeUndefined();
  });

  it("surrogate ALTO aislado: se sustituye por U+FFFD sin lanzar", () => {
    expect(() => enlaceEmail("ana@ejemplo.com", "\uD800")).not.toThrow();
    expect(enlaceEmail("ana@ejemplo.com", "\uD800")).toBe("mailto:ana%40ejemplo.com?subject=%EF%BF%BD");
  });

  it("surrogate BAJO aislado: se sustituye por U+FFFD sin lanzar", () => {
    expect(() => enlaceEmail("ana@ejemplo.com", "\uDC00")).not.toThrow();
    expect(enlaceEmail("ana@ejemplo.com", "\uDC00")).toBe("mailto:ana%40ejemplo.com?subject=%EF%BF%BD");
  });

  it("par VÁLIDO (emoji): NO se toca — el respaldo no rompe Unicode legítimo", () => {
    expect(enlaceEmail("ana@ejemplo.com", "😀")).toBe("mailto:ana%40ejemplo.com?subject=%F0%9F%98%80");
  });

  it("sigue rechazando el destinatario con surrogate suelto", () => {
    expect(enlaceEmail("a\uD800@ejemplo.com")).toBeNull();
  });

  it("mezcla de sueltos y válidos: solo caen los sueltos", () => {
    expect(enlaceEmail("ana@ejemplo.com", "a\uD800b😀c")).toBe(
      "mailto:ana%40ejemplo.com?subject=a%EF%BF%BDb%F0%9F%98%80c",
    );
  });
});
