// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { MAX_INTERACCIONES_POR_PROSPECTO } from "./lib/constants";
import schema from "./schema";

// Tope de interacciones por prospecto (JOS-80), parte del bocado A1: la guarda hacia
// delante que acota la cascada de borrado. Se despliega ANTES que `prospectos.eliminar`.
const modules = import.meta.glob(["./**/*.{js,ts}", "!./**/*.test.ts", "!./**/*.d.ts"]);

const TENANT_A = "https://test.clerk|user_a";
const IDENT_A = { subject: "user_a", issuer: "https://test.clerk", tokenIdentifier: TENANT_A };
const AHORA = Date.UTC(2026, 6, 12, 12); // pasado fijo: `crear` rechaza fechas futuras
const DIA = 24 * 3_600_000;

function nuevo() {
  return convexTest(schema, modules);
}
function prospecto() {
  return {
    usuarioId: TENANT_A,
    nombre: "X",
    comoSeConocio: "T",
    canalContactoPreferido: "phone" as const,
    etapaActual: "contacted" as const,
    fechaAlta: AHORA - 10 * DIA,
  };
}
function interaccion(prospectoId: Id<"prospectos">, i: number) {
  return {
    usuarioId: TENANT_A,
    prospectoId,
    fecha: AHORA - i * 1000,
    tipo: "message" as const,
    resultado: "thinking" as const,
    queOcurrio: "x",
  };
}

describe("interacciones.crear · tope por prospecto (JOS-80, A1)", () => {
  it(`rechaza al alcanzar ${MAX_INTERACCIONES_POR_PROSPECTO} (VALIDATION_ERROR en prospectoId)`, async () => {
    const t = nuevo();
    const prospectoId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("prospectos", prospecto());
      for (let i = 0; i < MAX_INTERACCIONES_POR_PROSPECTO; i++) {
        await ctx.db.insert("interacciones", interaccion(id, i));
      }
      return id;
    });
    let data: Record<string, string> = {};
    try {
      await t.withIdentity(IDENT_A).mutation(api.interacciones.crear, {
        prospectoId,
        fecha: AHORA,
        tipo: "call",
        resultado: "interested",
        queOcurrio: "una más",
      });
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      data = (e as ConvexError<Record<string, string>>).data;
    }
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.field).toBe("prospectoId");
  });

  it("permite crear justo por debajo del tope", async () => {
    const t = nuevo();
    const prospectoId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("prospectos", prospecto());
      for (let i = 0; i < MAX_INTERACCIONES_POR_PROSPECTO - 1; i++) {
        await ctx.db.insert("interacciones", interaccion(id, i));
      }
      return id;
    });
    const r = await t.withIdentity(IDENT_A).mutation(api.interacciones.crear, {
      prospectoId,
      fecha: AHORA,
      tipo: "call",
      resultado: "interested",
      queOcurrio: "cabe",
    });
    expect(r.interaccion.prospectoId).toBe(prospectoId);
  });
});
