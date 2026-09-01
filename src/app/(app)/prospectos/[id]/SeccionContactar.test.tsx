// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ProspectoPublico } from "../../../../../convex/lib/proyecciones";
import { SeccionContactar } from "./SeccionContactar";
import {
  AVISO_EMAIL_NO_VALIDO,
  AVISO_TELEFONO_NO_VALIDO,
  CTA_REGISTRAR,
  ETIQUETA_CONTACTAR_EMAIL,
  ETIQUETA_CONTACTAR_WHATSAPP,
  PREGUNTA_YA_ENVIADO,
  SIN_DATOS_CONTACTO,
} from "./textos";

const RUTA_REGISTRAR = "/prospectos/p7/interacciones/nueva";

/**
 * `telefono` y `email` son OPCIONALES en el esquema, así que la base no los trae:
 * cada prueba añade solo lo que necesita. Si el fixture los llevara siempre, un
 * componente que se olvidara de leerlos podría pasar igualmente.
 */
const BASE: ProspectoPublico = {
  id: "p7",
  nombre: "Ana Pérez",
  comoSeConocio: "Evento",
  canalContactoPreferido: "whatsapp",
  etapaActual: "contacted",
  fechaAlta: Date.UTC(2026, 5, 15, 10),
} as ProspectoPublico;

function pintar(prospecto: ProspectoPublico) {
  return render(<SeccionContactar prospecto={prospecto} rutaRegistrar={RUTA_REGISTRAR} />);
}

afterEach(cleanup);

describe("qué botones aparecen", () => {
  it("con teléfono y email, los dos", () => {
    pintar({ ...BASE, telefono: "600 11 12 22", email: "ana@ejemplo.com" } as ProspectoPublico);
    expect(screen.getByRole("link", { name: ETIQUETA_CONTACTAR_WHATSAPP })).toBeTruthy();
    expect(screen.getByRole("link", { name: ETIQUETA_CONTACTAR_EMAIL })).toBeTruthy();
  });

  it("solo con teléfono, no aparece el de correo", () => {
    pintar({ ...BASE, telefono: "600 11 12 22" } as ProspectoPublico);
    expect(screen.getByRole("link", { name: ETIQUETA_CONTACTAR_WHATSAPP })).toBeTruthy();
    expect(screen.queryByText(ETIQUETA_CONTACTAR_EMAIL)).toBeNull();
  });

  it("solo con email, no aparece el de WhatsApp", () => {
    pintar({ ...BASE, email: "ana@ejemplo.com" } as ProspectoPublico);
    expect(screen.getByRole("link", { name: ETIQUETA_CONTACTAR_EMAIL })).toBeTruthy();
    expect(screen.queryByText(ETIQUETA_CONTACTAR_WHATSAPP)).toBeNull();
  });

  it("sin teléfono ni email, ningún botón y un aviso de qué falta", () => {
    pintar(BASE);
    expect(screen.getByText(SIN_DATOS_CONTACTO)).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("a dónde apuntan", () => {
  it("WhatsApp lleva al número normalizado y abre en pestaña nueva", () => {
    pintar({ ...BASE, telefono: "600 11 12 22" } as ProspectoPublico);
    const enlace = screen.getByRole("link", { name: ETIQUETA_CONTACTAR_WHATSAPP });
    expect(enlace.getAttribute("href")).toBe("https://wa.me/34600111222");
    expect(enlace.getAttribute("target")).toBe("_blank");
    expect(enlace.getAttribute("rel")).toBe("noopener");
  });

  it("el correo lleva un mailto con el destinatario codificado y SIN target", () => {
    pintar({ ...BASE, email: "ana@ejemplo.com" } as ProspectoPublico);
    const enlace = screen.getByRole("link", { name: ETIQUETA_CONTACTAR_EMAIL });
    expect(enlace.getAttribute("href")).toBe("mailto:ana%40ejemplo.com");
    expect(enlace.getAttribute("target")).toBeNull();
  });

  it("hoy los enlaces van sin texto: JOS-36 aún no existe", () => {
    pintar({ ...BASE, telefono: "+34600111222", email: "ana@ejemplo.com" } as ProspectoPublico);
    expect(screen.getByRole("link", { name: ETIQUETA_CONTACTAR_WHATSAPP }).getAttribute("href")).not.toContain("?text=");
    expect(screen.getByRole("link", { name: ETIQUETA_CONTACTAR_EMAIL }).getAttribute("href")).not.toContain("?");
  });
});

describe("datos que no sirven para construir el enlace", () => {
  it("teléfono no normalizable: botón visible pero DESACTIVADO y explicado", () => {
    pintar({ ...BASE, telefono: "600abc111" } as ProspectoPublico);

    // Visible: el usuario debe ver que existe la vía y por qué no funciona.
    const boton = screen.getByRole("button", { name: ETIQUETA_CONTACTAR_WHATSAPP });
    expect((boton as HTMLButtonElement).disabled).toBe(true);
    // Y no hay ningún enlace navegable hacia WhatsApp.
    expect(screen.queryByRole("link", { name: ETIQUETA_CONTACTAR_WHATSAPP })).toBeNull();
    expect(screen.getByText(AVISO_TELEFONO_NO_VALIDO)).toBeTruthy();
  });

  it("email con un surrogate suelto: botón DESACTIVADO y el render NO lanza", () => {
    // Es el hallazgo de rev. 4: encodeURIComponent lanzaría URIError y se caería
    // la Ficha entera. Aquí debe degradar a botón apagado, nada más.
    expect(() => pintar({ ...BASE, email: "a\uD800@ejemplo.com" } as ProspectoPublico)).not.toThrow();

    const boton = screen.getByRole("button", { name: ETIQUETA_CONTACTAR_EMAIL });
    expect((boton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(AVISO_EMAIL_NO_VALIDO)).toBeTruthy();
  });

  it("email con CR/LF: botón DESACTIVADO (no se fabrica un mailto con cabeceras)", () => {
    pintar({ ...BASE, email: "ana@ejemplo.com\r\nbcc: malo@x.com" } as ProspectoPublico);
    const boton = screen.getByRole("button", { name: ETIQUETA_CONTACTAR_EMAIL });
    expect((boton as HTMLButtonElement).disabled).toBe(true);
  });

  it("un dato malo no arrastra al otro", () => {
    pintar({ ...BASE, telefono: "600abc111", email: "ana@ejemplo.com" } as ProspectoPublico);
    expect((screen.getByRole("button", { name: ETIQUETA_CONTACTAR_WHATSAPP }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("link", { name: ETIQUETA_CONTACTAR_EMAIL }).getAttribute("href")).toBe(
      "mailto:ana%40ejemplo.com",
    );
    expect(screen.queryByText(AVISO_EMAIL_NO_VALIDO)).toBeNull();
  });
});

describe("el registro al volver (§6)", () => {
  it("no se ofrece hasta que se abre la otra app", () => {
    pintar({ ...BASE, telefono: "600 11 12 22" } as ProspectoPublico);
    expect(screen.queryByText(PREGUNTA_YA_ENVIADO)).toBeNull();
    expect(screen.queryByRole("link", { name: CTA_REGISTRAR })).toBeNull();
  });

  it("tras pulsar WhatsApp aparece el enlace a registrar interacción", () => {
    pintar({ ...BASE, telefono: "600 11 12 22" } as ProspectoPublico);
    fireEvent.click(screen.getByRole("link", { name: ETIQUETA_CONTACTAR_WHATSAPP }));

    expect(screen.getByText(PREGUNTA_YA_ENVIADO)).toBeTruthy();
    // La MISMA pantalla del CTA de la Ficha (JOS-23): no hay registro nuevo inventado.
    expect(screen.getByRole("link", { name: CTA_REGISTRAR }).getAttribute("href")).toBe(RUTA_REGISTRAR);
  });

  it("tras pulsar Correo aparece igual", () => {
    pintar({ ...BASE, email: "ana@ejemplo.com" } as ProspectoPublico);
    fireEvent.click(screen.getByRole("link", { name: ETIQUETA_CONTACTAR_EMAIL }));
    expect(screen.getByRole("link", { name: CTA_REGISTRAR }).getAttribute("href")).toBe(RUTA_REGISTRAR);
  });

  it("un botón DESACTIVADO no ofrece registrar nada", () => {
    pintar({ ...BASE, telefono: "600abc111" } as ProspectoPublico);
    fireEvent.click(screen.getByRole("button", { name: ETIQUETA_CONTACTAR_WHATSAPP }));
    expect(screen.queryByText(PREGUNTA_YA_ENVIADO)).toBeNull();
  });
});
