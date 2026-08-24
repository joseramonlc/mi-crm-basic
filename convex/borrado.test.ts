// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.{js,ts}", "!./**/*.test.ts", "!./**/*.d.ts"]);

const TENANT_A = "https://test.clerk|user_a";
const TENANT_B = "https://test.clerk|user_b";
const IDENT_A = { subject: "user_a", issuer: "https://test.clerk", tokenIdentifier: TENANT_A };

// Pasado fijo: `interacciones.crear` valida que la fecha no esté en el futuro.
const AHORA = Date.UTC(2026, 6, 12, 12);
const DIA = 24 * 3_600_000;

function nuevo() {
  return convexTest(schema, modules);
}

function prospecto(usuarioId: string, nombre = "X") {
  return {
    usuarioId,
    nombre,
    comoSeConocio: "T",
    canalContactoPreferido: "phone" as const,
    etapaActual: "contacted" as const,
    fechaAlta: AHORA - 10 * DIA,
  };
}
function interaccion(usuarioId: string, prospectoId: Id<"prospectos">, i = 0) {
  return {
    usuarioId,
    prospectoId,
    fecha: AHORA - i * 1000,
    tipo: "message" as const,
    resultado: "thinking" as const,
    queOcurrio: "x",
  };
}

/** Código de un ConvexError esperado, o falla si la promesa tuvo éxito. */
async function codigo(promesa: Promise<unknown>): Promise<string> {
  try {
    await promesa;
  } catch (e) {
    expect(e).toBeInstanceOf(ConvexError);
    return (e as ConvexError<{ code: string }>).data.code;
  }
  throw new Error("se esperaba un error y la llamada tuvo éxito");
}

describe("prospectos.eliminar (JOS-80)", () => {
  it("borra el prospecto y su historial; deja intacto OTRO prospecto del MISMO usuario", async () => {
    const t = nuevo();
    const { objetivo, vecino } = await t.run(async (ctx) => {
      const objetivo = await ctx.db.insert("prospectos", prospecto(TENANT_A, "Objetivo"));
      const vecino = await ctx.db.insert("prospectos", prospecto(TENANT_A, "Vecino"));
      for (const pid of [objetivo, vecino]) {
        for (let i = 0; i < 3; i++) await ctx.db.insert("interacciones", interaccion(TENANT_A, pid, i));
      }
      return { objetivo, vecino };
    });

    const r = await t.withIdentity(IDENT_A).mutation(api.prospectos.eliminar, { id: objetivo });
    expect(r).toBeNull();

    const estado = await t.run(async (ctx) => ({
      objetivo: await ctx.db.get(objetivo),
      inters: await ctx.db.query("interacciones").collect(),
    }));
    expect(estado.objetivo).toBeNull();
    // Solo sobreviven las 3 del vecino — la cascada no arrastró al de al lado.
    expect(estado.inters).toHaveLength(3);
    expect(estado.inters.every((i) => i.prospectoId === vecino)).toBe(true);
  });

  it("no toca las interacciones de OTRO tenant", async () => {
    const t = nuevo();
    const { propio } = await t.run(async (ctx) => {
      const propio = await ctx.db.insert("prospectos", prospecto(TENANT_A));
      const ajeno = await ctx.db.insert("prospectos", prospecto(TENANT_B));
      await ctx.db.insert("interacciones", interaccion(TENANT_A, propio));
      await ctx.db.insert("interacciones", interaccion(TENANT_B, ajeno));
      return { propio };
    });

    await t.withIdentity(IDENT_A).mutation(api.prospectos.eliminar, { id: propio });

    const restantes = await t.run((ctx) => ctx.db.query("interacciones").collect());
    expect(restantes).toHaveLength(1);
    expect(restantes[0].usuarioId).toBe(TENANT_B);
  });

  it("NOT_FOUND opaco para un prospecto de otro tenant (no revela existencia, no lo borra)", async () => {
    const t = nuevo();
    const ajeno = await t.run((ctx) => ctx.db.insert("prospectos", prospecto(TENANT_B)));
    expect(await codigo(t.withIdentity(IDENT_A).mutation(api.prospectos.eliminar, { id: ajeno }))).toBe("NOT_FOUND");
    expect(await t.run((ctx) => ctx.db.get(ajeno))).not.toBeNull();
  });

  it("NOT_FOUND para un id inexistente (mismo error que el ajeno)", async () => {
    const t = nuevo();
    const id = await t.run(async (ctx) => {
      const x = await ctx.db.insert("prospectos", prospecto(TENANT_A));
      await ctx.db.delete(x);
      return x;
    });
    expect(await codigo(t.withIdentity(IDENT_A).mutation(api.prospectos.eliminar, { id }))).toBe("NOT_FOUND");
  });
});
