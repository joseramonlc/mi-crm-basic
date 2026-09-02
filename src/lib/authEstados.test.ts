import { describe, expect, it } from "vitest";
import {
  MSG_COMPROBACION_SEGURIDAD,
  MSG_ESTADO_GENERICO,
  MSG_INTENTO_CADUCADO,
  MSG_NUEVA_CONTRASENA,
  MSG_SEGUNDO_FACTOR_DESCONOCIDO,
  MSG_SEGUNDO_FACTOR_ENLACE,
  eligeSegundoFactor,
  exigeReinicio,
  mensajeDeEstado,
  pideSegundoFactor,
  textoSegundoFactor,
} from "./authEstados";

/** Los siete valores de SignInStatus con @clerk/nextjs 7.5.20. */
const LOS_SIETE = [
  "needs_identifier",
  "needs_first_factor",
  "needs_second_factor",
  "needs_client_trust",
  "needs_new_password",
  "needs_protect_check",
  "complete",
] as const;

describe("mensajeDeEstado", () => {
  it("needs_new_password pide crear contraseña nueva, no reintentar", () => {
    expect(mensajeDeEstado("needs_new_password")).toBe(MSG_NUEVA_CONTRASENA);
    expect(mensajeDeEstado("needs_new_password")).not.toBe(MSG_ESTADO_GENERICO);
  });

  it("needs_protect_check habla de comprobación de seguridad", () => {
    expect(mensajeDeEstado("needs_protect_check")).toBe(MSG_COMPROBACION_SEGURIDAD);
    expect(mensajeDeEstado("needs_protect_check")).not.toBe(MSG_ESTADO_GENERICO);
  });

  it("los dos estados incoherentes tras la contraseña dicen que el intento caducó", () => {
    expect(mensajeDeEstado("needs_identifier")).toBe(MSG_INTENTO_CADUCADO);
    expect(mensajeDeEstado("needs_first_factor")).toBe(MSG_INTENTO_CADUCADO);
  });

  it("un estado que Clerk añada en el futuro cae en el genérico (nunca en un callejón mudo)", () => {
    expect(mensajeDeEstado("needs_algo_que_no_existe_aun")).toBe(MSG_ESTADO_GENERICO);
  });

  it("un estado con nombre de método de Object.prototype no devuelve el método heredado", () => {
    // Regresión defensiva: acceso directo o `in` devolverían una función.
    expect(mensajeDeEstado("toString")).toBe(MSG_ESTADO_GENERICO);
    expect(mensajeDeEstado("constructor")).toBe(MSG_ESTADO_GENERICO);
  });
});

describe("clasificación de los siete estados", () => {
  it("solo needs_second_factor y needs_client_trust van a la pantalla del código", () => {
    const van = LOS_SIETE.filter(pideSegundoFactor);
    expect(van).toEqual(["needs_second_factor", "needs_client_trust"]);
  });

  it("solo needs_identifier y needs_first_factor exigen reiniciar el intento", () => {
    const reinician = LOS_SIETE.filter(exigeReinicio);
    expect(reinician).toEqual(["needs_identifier", "needs_first_factor"]);
  });

  it("complete no pide segundo factor ni reinicio", () => {
    expect(pideSegundoFactor("complete")).toBe(false);
    expect(exigeReinicio("complete")).toBe(false);
  });
});

describe("eligeSegundoFactor", () => {
  it("respeta la preferencia email_code → phone_code → totp → backup_code", () => {
    const todos = [
      { strategy: "backup_code" },
      { strategy: "totp" },
      { strategy: "phone_code", safeIdentifier: "••• ••• 123" },
      { strategy: "email_code", safeIdentifier: "j***@gmail.com" },
    ];
    expect(eligeSegundoFactor(todos)).toEqual({
      tipo: "codigo",
      estrategia: "email_code",
      safeIdentifier: "j***@gmail.com",
    });
    // Sin email: manda el teléfono. Sin teléfono: la app. Sin app: los de recuperación.
    expect(eligeSegundoFactor(todos.slice(0, 3))).toMatchObject({ tipo: "codigo", estrategia: "phone_code" });
    expect(eligeSegundoFactor(todos.slice(0, 2))).toMatchObject({ tipo: "codigo", estrategia: "totp" });
    expect(eligeSegundoFactor(todos.slice(0, 1))).toMatchObject({ tipo: "codigo", estrategia: "backup_code" });
  });

  it("lista vacía o ausente → red de seguridad (se intentará el código por email)", () => {
    expect(eligeSegundoFactor([])).toEqual({ tipo: "red-de-seguridad" });
    expect(eligeSegundoFactor(undefined)).toEqual({ tipo: "red-de-seguridad" });
  });

  it("SOLO email_link → no soportado, y NO la red de seguridad", () => {
    // Clave del bloqueante nº2 de la auditoría: si aquí saliera «red-de-seguridad»,
    // la página llamaría a sendEmailCode() sobre una cuenta que no ofrece código.
    const eleccion = eligeSegundoFactor([{ strategy: "email_link", safeIdentifier: "j***@gmail.com" }]);
    expect(eleccion).toEqual({
      tipo: "no-soportado",
      estrategias: ["email_link"],
      mensaje: MSG_SEGUNDO_FACTOR_ENLACE,
    });
  });

  it("una estrategia desconocida (sin ser enlace) → no soportado con mensaje genérico", () => {
    const eleccion = eligeSegundoFactor([{ strategy: "estrategia_futura" }, { strategy: "email_link" }]);
    expect(eleccion).toMatchObject({ tipo: "no-soportado", mensaje: MSG_SEGUNDO_FACTOR_DESCONOCIDO });
    expect(eleccion).toMatchObject({ estrategias: ["estrategia_futura", "email_link"] });
  });

  it("email_code sin safeIdentifier sigue siendo utilizable", () => {
    expect(eligeSegundoFactor([{ strategy: "email_code" }])).toEqual({
      tipo: "codigo",
      estrategia: "email_code",
      safeIdentifier: undefined,
    });
  });
});

describe("textoSegundoFactor", () => {
  it("el texto del teléfono NO habla de email, y el del email NO habla de SMS", () => {
    const sms = textoSegundoFactor("phone_code", "••• ••• 123");
    expect(sms.descripcion).toContain("SMS");
    expect(sms.descripcion).toContain("••• ••• 123");
    expect(sms.descripcion.toLowerCase()).not.toContain("email");
    expect(sms.descripcion.toLowerCase()).not.toContain("correo");

    const correo = textoSegundoFactor("email_code", "j***@gmail.com");
    expect(correo.descripcion).toContain("j***@gmail.com");
    expect(correo.descripcion).not.toContain("SMS");
  });

  it("sin safeIdentifier el texto sigue teniendo sentido (red de seguridad)", () => {
    const correo = textoSegundoFactor("email_code");
    expect(correo.descripcion).toContain("correo");
    expect(correo.descripcion).not.toContain("undefined");
  });

  it("solo email y teléfono permiten reenviar: TOTP y códigos de recuperación no envían nada", () => {
    expect(textoSegundoFactor("email_code").permiteReenviar).toBe(true);
    expect(textoSegundoFactor("phone_code").permiteReenviar).toBe(true);
    expect(textoSegundoFactor("totp").permiteReenviar).toBe(false);
    expect(textoSegundoFactor("backup_code").permiteReenviar).toBe(false);
  });

  it("los códigos de RECUPERACIÓN piden teclado de texto, no numérico", () => {
    // `verifyBackupCode` recibe `code: string` a secas: nada dice que sean dígitos.
    // Un teclado numérico dejaría al usuario sin poder teclearlo justo en el rescate.
    const recuperacion = textoSegundoFactor("backup_code");
    expect(recuperacion.modoTeclado).toBe("text");
    expect(recuperacion.autocompletado).toBe("off");
  });

  it("los códigos que SÍ son numéricos piden teclado numérico y autorrelleno", () => {
    for (const estrategia of ["email_code", "phone_code", "totp"] as const) {
      const texto = textoSegundoFactor(estrategia);
      expect(texto.modoTeclado).toBe("numeric");
      expect(texto.autocompletado).toBe("one-time-code");
    }
  });

  it("cada estrategia etiqueta su campo de forma distinguible", () => {
    expect(textoSegundoFactor("totp").etiquetaCampo).toBe("Código de la aplicación");
    expect(textoSegundoFactor("backup_code").etiquetaCampo).toBe("Código de recuperación");
    expect(textoSegundoFactor("email_code").etiquetaCampo).toBe("Código de verificación");
  });
});
