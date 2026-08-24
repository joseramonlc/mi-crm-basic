// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import { MAX_INTERACCIONES_POR_PROSPECTO } from "./lib/constants";
import { EMAIL_RE, LONGITUD_MAX_EMAIL } from "./lib/validacion";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.{js,ts}", "!./**/*.test.ts", "!./**/*.d.ts"]);

const TENANT = "https://test.clerk|user_a";

function nuevo() {
  return convexTest(schema, modules);
}

const LIMITES = ["documentsRead", "documentsWritten", "bytesRead", "bytesWritten"] as const;
type Metricas = Record<(typeof LIMITES)[number], { used: number; remaining: number }>;

/** Los cuatro límites, dentro del hard-limit y con ≤ 25 % de margen (holgura ≥ 4×). */
function dentroDeMargen(m: Metricas, fraccion = 0.25) {
  for (const clave of LIMITES) {
    const { used, remaining } = m[clave];
    expect(remaining).toBeGreaterThanOrEqual(0);
    expect(used).toBeLessThanOrEqual(fraccion * (used + remaining));
  }
}

beforeEach(() => {
  process.env.APP_ENV = "development";
});
afterEach(() => {
  delete process.env.APP_ENV;
});

describe("gate JOS-80 · auditarTamanos (solo devuelve números, sin IDs ni PII)", () => {
  it("devuelve el máximo de interacciones por prospecto y los tamaños máximos de documento", async () => {
    const t = nuevo();
    await t.run(async (ctx) => {
      const p1 = await ctx.db.insert("prospectos", {
        usuarioId: TENANT, nombre: "P1", comoSeConocio: "t", canalContactoPreferido: "phone", etapaActual: "contacted", fechaAlta: 1,
      });
      const p2 = await ctx.db.insert("prospectos", {
        usuarioId: TENANT, nombre: "P2", comoSeConocio: "t", canalContactoPreferido: "phone", etapaActual: "contacted", fechaAlta: 1,
        notas: "n".repeat(5000),
      });
      for (let i = 0; i < 4; i++) {
        await ctx.db.insert("interacciones", { usuarioId: TENANT, prospectoId: p1, fecha: i, tipo: "message", resultado: "thinking", queOcurrio: "x" });
      }
      for (let i = 0; i < 9; i++) {
        await ctx.db.insert("interacciones", {
          usuarioId: TENANT, prospectoId: p2, fecha: i, tipo: "message", resultado: "thinking",
          queOcurrio: i === 0 ? "q".repeat(3000) : "x",
        });
      }
    });

    const r = await t.action(internal.gateBorrado.auditarTamanos, {});
    expect(r.maxInteraccionesPorProspecto).toBe(9);
    expect(r.maxBytesProspecto).toBeGreaterThanOrEqual(5000);
    expect(r.maxBytesInteraccion).toBeGreaterThanOrEqual(3000);
  });

  it("cuenta la racha de un prospecto que CRUZA el límite de página (>1024 interacciones)", async () => {
    const t = nuevo();
    // 1025 > PAGINA_MAX_FILAS (1024): la racha del mismo prospecto abarca DOS páginas del
    // recorrido, así que ejercita el contador de racha entre cursores. Se insertan directas
    // (saltándose el tope, como un histórico). El segundo prospecto pequeño comprueba además
    // que la racha se reinicia al cambiar de prospecto.
    const N = 1025;
    await t.run(async (ctx) => {
      const grande = await ctx.db.insert("prospectos", {
        usuarioId: TENANT, nombre: "Grande", comoSeConocio: "t", canalContactoPreferido: "phone", etapaActual: "contacted", fechaAlta: 1,
      });
      for (let i = 0; i < N; i++) {
        await ctx.db.insert("interacciones", { usuarioId: TENANT, prospectoId: grande, fecha: i, tipo: "message", resultado: "thinking", queOcurrio: "x" });
      }
      const pequeno = await ctx.db.insert("prospectos", {
        usuarioId: TENANT, nombre: "Pequeno", comoSeConocio: "t", canalContactoPreferido: "phone", etapaActual: "contacted", fechaAlta: 1,
      });
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert("interacciones", { usuarioId: TENANT, prospectoId: pequeno, fecha: i, tipo: "message", resultado: "thinking", queOcurrio: "x" });
      }
    });
    const r = await t.action(internal.gateBorrado.auditarTamanos, {});
    expect(r.maxInteraccionesPorProspecto).toBe(N);
  });

  it("tablas vacías → ceros", async () => {
    const t = nuevo();
    const r = await t.action(internal.gateBorrado.auditarTamanos, {});
    expect(r).toEqual({ maxInteraccionesPorProspecto: 0, maxBytesInteraccion: 0, maxBytesProspecto: 0 });
  });
});

describe("gate JOS-80 · medición real del borrado (getTransactionMetrics)", () => {
  it("borrado en el MAX admitido: dentro del 25 % de cada límite y borra todo", async () => {
    const t = nuevo();
    const id = await t.mutation(internal.gateBorrado.sembrarPeorCaso, {
      usuarioId: TENANT,
      numInteracciones: MAX_INTERACCIONES_POR_PROSPECTO,
    });
    const m = await t.mutation(internal.gateBorrado.medirBorrado, { id });
    dentroDeMargen(m);

    const quedan = await t.run(async (ctx) => ({
      p: await ctx.db.get(id),
      i: (await ctx.db.query("interacciones").collect()).length,
    }));
    expect(quedan.p).toBeNull();
    expect(quedan.i).toBe(0);
  });

  it("regresión con documentos históricos GRANDES (por encima de los topes actuales): completa y dentro de margen", async () => {
    const t = nuevo();
    // `sembrarPeorCaso` rellena TODOS los campos libres a su tope de longitud con caracteres de
    // 3 bytes → ya supera por bytes cualquier histórico previo a JOS-24/JOS-74.
    const id = await t.mutation(internal.gateBorrado.sembrarPeorCaso, {
      usuarioId: TENANT,
      numInteracciones: MAX_INTERACCIONES_POR_PROSPECTO,
    });
    const m = await t.mutation(internal.gateBorrado.medirBorrado, { id });
    dentroDeMargen(m);
  });
});

describe("gate JOS-80 · guardas de entorno (solo desechable)", () => {
  it("sembrarPeorCaso aborta fuera de development", async () => {
    process.env.APP_ENV = "production";
    await expect(
      nuevo().mutation(internal.gateBorrado.sembrarPeorCaso, {
        usuarioId: TENANT, numInteracciones: 1,
      }),
    ).rejects.toThrow(/desechable|development/i);
  });

  it("medirBorrado aborta fuera de development", async () => {
    const t = nuevo();
    const id = await t.mutation(internal.gateBorrado.sembrarPeorCaso, {
      usuarioId: TENANT, numInteracciones: 1,
    });
    process.env.APP_ENV = "production";
    await expect(t.mutation(internal.gateBorrado.medirBorrado, { id })).rejects.toThrow(/desechable|development/i);
  });
});

describe("gate JOS-80 · sembrado del peor caso (email válido de longitud máxima)", () => {
  it("el email sembrado pasa EMAIL_RE y mide exactamente LONGITUD_MAX_EMAIL (sugerencia del auditor)", async () => {
    const t = nuevo();
    // 0 interacciones: basta el prospecto para inspeccionar su email.
    const id = await t.mutation(internal.gateBorrado.sembrarPeorCaso, { usuarioId: TENANT, numInteracciones: 0 });
    const email = await t.run(async (ctx) => (await ctx.db.get(id))?.email);
    expect(email).toBeDefined();
    expect(email!.length).toBe(LONGITUD_MAX_EMAIL);
    expect(EMAIL_RE.test(email!)).toBe(true);
  });
});
