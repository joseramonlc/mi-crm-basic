import { describe, expect, it } from "vitest";
import { OPCIONES_CANAL, OPCIONES_RESULTADO, OPCIONES_TIPO, formatearFechaEs } from "./etiquetas";

describe("etiquetas de dominio (P4 — única fuente compartida)", () => {
  it("canal: los 5 valores del enum de la API con su etiqueta de producto (JOS-15)", () => {
    expect(OPCIONES_CANAL.map((o) => [o.value, o.label])).toEqual([
      ["whatsapp", "WhatsApp"],
      ["phone", "Llamada"],
      ["mail", "Email"],
      ["instagram", "Instagram"],
      ["otro", "Otro"],
    ]);
  });

  it("tipo: los 3 valores del enum con etiqueta e icono (JOS-16/JOS-61)", () => {
    expect(OPCIONES_TIPO.map((o) => [o.value, o.label, o.icon])).toEqual([
      ["call", "Llamada", "phone"],
      ["message", "Mensaje", "message-circle"],
      ["meeting", "Reunión", "calendar"],
    ]);
  });

  it("resultado: los 4 valores del enum con etiqueta y tono semántico (JOS-16/JOS-61)", () => {
    expect(OPCIONES_RESULTADO.map((o) => [o.value, o.label, o.tone])).toEqual([
      ["interested", "Interesado", "verde"],
      ["thinking", "Necesita pensar", "ambar"],
      ["not_interested", "No interesado", "slate"],
      ["other", "Otro", "slate-suave"],
    ]);
  });

  it("formatearFechaEs: fecha civil de Madrid en es-ES largo", () => {
    // 2026-07-20 a las 10:00 UTC = 12:00 en Madrid (CEST) — lunes.
    expect(formatearFechaEs(Date.UTC(2026, 6, 20, 10))).toBe("lunes, 20 de julio");
  });
});
