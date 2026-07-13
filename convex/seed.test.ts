// @vitest-environment edge-runtime
import { convexTest, type TestConvex } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import { calcularFechaProximoSeguimiento } from "./lib/seguimiento";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.{js,ts}", "!./**/*.test.ts", "!./**/*.d.ts"]);

const DAY_KEY = "2026-07-12";

function nuevoTest(): TestConvex<typeof schema> {
  return convexTest(schema, modules);
}

function sembrar(t: TestConvex<typeof schema>, scenario: "populated" | "empty" | "alDia") {
  return t.mutation(internal.seed.seed, { scenario, dayKey: DAY_KEY });
}

beforeEach(() => {
  process.env.APP_ENV = "development";
  process.env.ALLOW_SEED = "true";
});

describe("seed · guardas", () => {
  it("aborta fuera de APP_ENV=development", async () => {
    process.env.APP_ENV = "production";
    await expect(sembrar(nuevoTest(), "empty")).rejects.toThrow(/APP_ENV no es 'development'/);
  });

  it("aborta sin ALLOW_SEED", async () => {
    delete process.env.ALLOW_SEED;
    await expect(sembrar(nuevoTest(), "empty")).rejects.toThrow(/falta ALLOW_SEED/);
  });
});

describe("seed · invariantes fixture ↔ campos derivados (rev. 4 §10)", () => {
  it("populated: último contacto = máxima fecha de interacciones; seguimiento del motor; histórica estrictamente anterior", async () => {
    const t = nuevoTest();
    const r = await sembrar(t, "populated");
    expect(r.insertados).toBe(7);

    const prospectos = await t.run((ctx) => ctx.db.query("prospectos").collect());
    const interacciones = await t.run((ctx) => ctx.db.query("interacciones").collect());
    expect(interacciones.length).toBeGreaterThanOrEqual(3);

    let conHistorial = 0;
    let conTresOMas = 0;
    for (const p of prospectos) {
      const suyas = interacciones.filter((i) => i.prospectoId === p._id);
      if (suyas.length === 0) {
        expect(p.fechaUltimoContacto).toBeUndefined();
        continue;
      }
      conHistorial++;
      if (suyas.length >= 3) conTresOMas++;

      // (a) fechaUltimoContacto = máxima fecha del historial sembrado.
      const maxima = Math.max(...suyas.map((i) => i.fecha));
      expect(p.fechaUltimoContacto).toBe(maxima);

      // (b) fechaProximoSeguimiento derivado de esa misma referencia y la etapa.
      expect(p.fechaProximoSeguimiento).toBe(calcularFechaProximoSeguimiento(p.etapaActual, maxima));

      // (c) la más reciente es única: ninguna histórica puede convertirse
      // accidentalmente en el último contacto.
      expect(suyas.filter((i) => i.fecha === maxima)).toHaveLength(1);
    }
    expect(conHistorial).toBeGreaterThan(0);
    // Al menos un prospecto de etapa avanzada con 3+ interacciones (JOS-9).
    expect(conTresOMas).toBeGreaterThanOrEqual(3);
  });

  it("alDia cumple las mismas invariantes", async () => {
    const t = nuevoTest();
    await sembrar(t, "alDia");
    const prospectos = await t.run((ctx) => ctx.db.query("prospectos").collect());
    const interacciones = await t.run((ctx) => ctx.db.query("interacciones").collect());
    for (const p of prospectos) {
      const suyas = interacciones.filter((i) => i.prospectoId === p._id);
      const esperado = suyas.length > 0 ? Math.max(...suyas.map((i) => i.fecha)) : undefined;
      expect(p.fechaUltimoContacto).toBe(esperado);
      expect(p.fechaProximoSeguimiento).toBe(
        calcularFechaProximoSeguimiento(p.etapaActual, esperado ?? p.fechaAlta),
      );
    }
  });
});

describe("seed · limpieza con cascada", () => {
  it("re-sembrar no duplica: borra prospectos e interacciones del tenant", async () => {
    const t = nuevoTest();
    const r1 = await sembrar(t, "populated");
    const interacciones1 = (await t.run((ctx) => ctx.db.query("interacciones").collect())).length;
    const r2 = await sembrar(t, "populated");
    expect(r2).toEqual(r1);
    const prospectos = await t.run((ctx) => ctx.db.query("prospectos").collect());
    const interacciones = await t.run((ctx) => ctx.db.query("interacciones").collect());
    expect(prospectos).toHaveLength(r1.insertados);
    expect(interacciones).toHaveLength(interacciones1);
  });

  it("empty tras populated deja ambas tablas vacías (sin huérfanas)", async () => {
    const t = nuevoTest();
    await sembrar(t, "populated");
    await sembrar(t, "empty");
    expect(await t.run((ctx) => ctx.db.query("prospectos").collect())).toEqual([]);
    expect(await t.run((ctx) => ctx.db.query("interacciones").collect())).toEqual([]);
  });
});
