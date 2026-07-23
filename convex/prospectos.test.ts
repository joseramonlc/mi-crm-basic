// @vitest-environment edge-runtime
import { convexTest, type TestConvex } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { MAX_ACTIVIDAD } from "./lib/constants";
import { APP_TZ, ventanaDia } from "./lib/fecha";
import schema from "./schema";

// Los tests viven junto a las funciones: convex-test necesita el mapa de módulos
// del directorio convex/ (excluyendo tests y declaraciones, que no son módulos
// ejecutables del deployment).
const modules = import.meta.glob(["./**/*.{js,ts}", "!./**/*.test.ts", "!./**/*.d.ts"]);

// Identidades de prueba: `tokenIdentifier` explícito (no se deja deducir a
// convex-test) porque es literalmente el `usuarioId` que persisten las filas.
const TENANT_A = "https://test.clerk|user_a";
const TENANT_B = "https://test.clerk|user_b";
const IDENT_A = { subject: "user_a", issuer: "https://test.clerk", tokenIdentifier: TENANT_A };

const DAY_KEY = "2026-07-12";
const { hoyInicio, mananaInicio } = ventanaDia(DAY_KEY, APP_TZ);
const HORA = 3_600_000;
const DIA = 24 * HORA;

type Nuevo = {
  nombre: string;
  usuarioId?: string;
  etapaActual?: Doc<"prospectos">["etapaActual"];
  fechaAlta?: number;
  fechaUltimoContacto?: number;
  fechaProximoSeguimiento?: number;
};

function nuevoTest(): TestConvex<typeof schema> {
  return convexTest(schema, modules);
}

async function insertar(t: TestConvex<typeof schema>, docs: Nuevo[]) {
  await t.run(async (ctx) => {
    for (const d of docs) {
      await ctx.db.insert("prospectos", {
        usuarioId: d.usuarioId ?? TENANT_A,
        nombre: d.nombre,
        comoSeConocio: "Test",
        canalContactoPreferido: "phone",
        etapaActual: d.etapaActual ?? "contacted",
        fechaAlta: d.fechaAlta ?? hoyInicio - 30 * DIA,
        ...(d.fechaUltimoContacto !== undefined ? { fechaUltimoContacto: d.fechaUltimoContacto } : {}),
        ...(d.fechaProximoSeguimiento !== undefined ? { fechaProximoSeguimiento: d.fechaProximoSeguimiento } : {}),
      });
    }
  });
}

function actividad(t: TestConvex<typeof schema>, dayKey = DAY_KEY) {
  return t.withIdentity(IDENT_A).query(api.prospectos.actividadDiaria, { dayKey });
}

beforeEach(() => {
  // Las guardas de entorno solo sobreviven en el seed (bloque final): la query
  // de producto ya no las tiene, se protege exigiendo identidad.
  process.env.APP_ENV = "development";
  delete process.env.ALLOW_SEED;
});

describe("actividadDiaria · guardas", () => {
  it("aborta sin identidad", async () => {
    await expect(nuevoTest().query(api.prospectos.actividadDiaria, { dayKey: DAY_KEY })).rejects.toThrow(
      /Se requiere sesión/,
    );
  });

  it("dayKey inválido lanza", async () => {
    await expect(actividad(nuevoTest(), "2026-02-31")).rejects.toThrow(/dayKey inválido/);
  });
});

describe("actividadDiaria · estados de tieneProspectos", () => {
  it("sin filas → tieneProspectos false y todo vacío", async () => {
    const r = await actividad(nuevoTest());
    expect(r).toEqual({
      dayKey: DAY_KEY,
      tieneProspectos: false,
      ritmo: { completados: 0, pendientes: 0, total: 0, completadosTruncados: false, pendientesTruncados: false, aproximado: true },
      hoy: [],
      vencidos: [],
      truncado: { hoy: false, vencidos: false },
    });
  });

  it("solo seguimientos futuros → true con listas vacías", async () => {
    const t = nuevoTest();
    await insertar(t, [{ nombre: "Futura", fechaProximoSeguimiento: mananaInicio + DIA }]);
    const r = await actividad(t);
    expect(r.tieneProspectos).toBe(true);
    expect(r.hoy).toEqual([]);
    expect(r.vencidos).toEqual([]);
  });

  it("solo terminales → true con listas vacías", async () => {
    const t = nuevoTest();
    await insertar(t, [
      { nombre: "Incorporada", etapaActual: "joined", fechaUltimoContacto: hoyInicio - 20 * DIA },
      { nombre: "Descartado", etapaActual: "discarded" },
    ]);
    const r = await actividad(t);
    expect(r.tieneProspectos).toBe(true);
    expect(r.hoy).toEqual([]);
    expect(r.vencidos).toEqual([]);
    expect(r.ritmo.completados).toBe(0);
  });

  it("completados hoy sin pendientes → true, listas vacías y ritmo.completados > 0", async () => {
    const t = nuevoTest();
    await insertar(t, [
      { nombre: "Contactada hoy", fechaUltimoContacto: hoyInicio + 10 * HORA, fechaProximoSeguimiento: mananaInicio + 2 * DIA },
    ]);
    const r = await actividad(t);
    expect(r.tieneProspectos).toBe(true);
    expect(r.hoy).toEqual([]);
    expect(r.vencidos).toEqual([]);
    expect(r.ritmo).toMatchObject({ completados: 1, pendientes: 0, total: 1 });
  });
});

describe("actividadDiaria · partición, orden y proyección", () => {
  it("particiona por ventana semiabierta, filtra tenant y ordena por antigüedad", async () => {
    const t = nuevoTest();
    await insertar(t, [
      // Hoy (antigüedad: Berta 9d por fechaAlta > Carla 5d > Ana 2d)
      { nombre: "Ana", fechaProximoSeguimiento: hoyInicio, fechaUltimoContacto: hoyInicio - 2 * DIA },
      { nombre: "Berta", fechaProximoSeguimiento: mananaInicio - 1, fechaAlta: hoyInicio - 9 * DIA },
      { nombre: "Carla", fechaProximoSeguimiento: hoyInicio + 2 * HORA, fechaUltimoContacto: hoyInicio - 5 * DIA },
      // Vencidos (Elías más antiguo que Diego)
      { nombre: "Diego", fechaProximoSeguimiento: hoyInicio - 1, fechaUltimoContacto: hoyInicio - 5 * DIA },
      { nombre: "Elías", fechaProximoSeguimiento: hoyInicio - 3 * DIA, fechaUltimoContacto: hoyInicio - 10 * DIA },
      // Fuera de ambas ventanas
      { nombre: "Futuro", fechaProximoSeguimiento: mananaInicio },
      { nombre: "Nunca" },
      // Otro tenant con seguimiento hoy: el prefijo del índice lo excluye
      { nombre: "Otro", usuarioId: TENANT_B, fechaProximoSeguimiento: hoyInicio + HORA },
    ]);

    const r = await actividad(t);
    expect(r.hoy.map((p) => p.nombre)).toEqual(["Berta", "Carla", "Ana"]);
    expect(r.vencidos.map((p) => p.nombre)).toEqual(["Elías", "Diego"]);
    expect(r.vencidos.map((p) => p.diasVencido)).toEqual([3, 1]);
    expect(r.truncado).toEqual({ hoy: false, vencidos: false });

    // Proyección por tarjeta: sin diasVencido en "hoy", con él en vencidos
    const ana = r.hoy.find((p) => p.nombre === "Ana")!;
    expect(ana).toMatchObject({
      etapaActual: "contacted",
      canalContactoPreferido: "phone",
      fechaUltimoContacto: hoyInicio - 2 * DIA,
    });
    expect(ana.diasVencido).toBeUndefined();
    expect(ana.id).toBeDefined();
  });

  it("ritmo: completados = contactos dentro de [hoyInicio, mananaInicio)", async () => {
    const t = nuevoTest();
    await insertar(t, [
      { nombre: "Comp dentro", fechaUltimoContacto: hoyInicio + 9 * HORA, fechaProximoSeguimiento: mananaInicio + 2 * DIA },
      { nombre: "Comp límite", fechaUltimoContacto: mananaInicio - 1, fechaProximoSeguimiento: mananaInicio + 2 * DIA },
      { nombre: "Fuera límite", fechaUltimoContacto: mananaInicio, fechaProximoSeguimiento: mananaInicio + 3 * DIA },
      { nombre: "Pendiente hoy", fechaProximoSeguimiento: hoyInicio + HORA, fechaUltimoContacto: hoyInicio - 3 * DIA },
    ]);

    const r = await actividad(t);
    expect(r.ritmo).toEqual({
      completados: 2,
      pendientes: 1,
      total: 3,
      completadosTruncados: false,
      pendientesTruncados: false,
      aproximado: true,
    });
    // Los completados tienen seguimiento futuro: no aparecen en las listas
    expect(r.hoy.map((p) => p.nombre)).toEqual(["Pendiente hoy"]);
  });
});

describe("actividadDiaria · truncamiento (MAX_ACTIVIDAD+1 leídos, centinela descartado)", () => {
  it("hoy truncado: lista exacta de MAX_ACTIVIDAD y señales de ritmo independientes", async () => {
    const t = nuevoTest();
    const muchos: Nuevo[] = Array.from({ length: MAX_ACTIVIDAD + 1 }, (_, i) => ({
      nombre: `Hoy ${i}`,
      fechaProximoSeguimiento: hoyInicio + (i % 20) * 60_000,
      fechaAlta: hoyInicio - (i + 1) * 60_000,
    }));
    await insertar(t, muchos);
    await insertar(t, [
      { nombre: "Comp 1", fechaUltimoContacto: hoyInicio + 9 * HORA, fechaProximoSeguimiento: mananaInicio + 2 * DIA },
      { nombre: "Comp 2", fechaUltimoContacto: hoyInicio + 10 * HORA, fechaProximoSeguimiento: mananaInicio + 2 * DIA },
    ]);

    const r = await actividad(t);
    expect(r.hoy).toHaveLength(MAX_ACTIVIDAD);
    expect(r.truncado).toEqual({ hoy: true, vencidos: false });
    expect(r.ritmo).toEqual({
      completados: 2,
      pendientes: MAX_ACTIVIDAD,
      total: MAX_ACTIVIDAD + 2,
      completadosTruncados: false,
      pendientesTruncados: true,
      aproximado: true,
    });
  });

  it("vencidos truncados: lista exacta de MAX_ACTIVIDAD con diasVencido", async () => {
    const t = nuevoTest();
    const muchos: Nuevo[] = Array.from({ length: MAX_ACTIVIDAD + 1 }, (_, i) => ({
      nombre: `Vencido ${i}`,
      fechaProximoSeguimiento: hoyInicio - DIA - (i % 20) * 60_000,
      fechaAlta: hoyInicio - (i + 2) * DIA,
    }));
    await insertar(t, muchos);

    const r = await actividad(t);
    expect(r.vencidos).toHaveLength(MAX_ACTIVIDAD);
    expect(r.truncado).toEqual({ hoy: false, vencidos: true });
    expect(r.ritmo.pendientesTruncados).toBe(false);
    expect(r.vencidos.every((p) => (p.diasVencido ?? 0) >= 1)).toBe(true);
  });

  it("completados truncados: cota en el ritmo sin tocar las listas", async () => {
    const t = nuevoTest();
    const muchos: Nuevo[] = Array.from({ length: MAX_ACTIVIDAD + 1 }, (_, i) => ({
      nombre: `Comp ${i}`,
      fechaUltimoContacto: hoyInicio + (i % 20) * 60_000,
      fechaProximoSeguimiento: mananaInicio + 2 * DIA,
    }));
    await insertar(t, muchos);

    const r = await actividad(t);
    expect(r.ritmo).toEqual({
      completados: MAX_ACTIVIDAD,
      pendientes: 0,
      total: MAX_ACTIVIDAD,
      completadosTruncados: true,
      pendientesTruncados: false,
      aproximado: true,
    });
    expect(r.hoy).toEqual([]);
    expect(r.vencidos).toEqual([]);
    expect(r.tieneProspectos).toBe(true);
  });
});

describe("seed", () => {
  it("dayKey inválido lanza también en seed", async () => {
    process.env.ALLOW_SEED = "true";
    await expect(
      nuevoTest().mutation(internal.seed.seed, { scenario: "empty", usuarioId: TENANT_A, dayKey: "2026-02-31" }),
    ).rejects.toThrow(/dayKey inválido/);
  });

  it("populated es determinista respecto al dayKey y cuadra con la query", async () => {
    process.env.ALLOW_SEED = "true";
    const t = nuevoTest();
    const res = await t.mutation(internal.seed.seed, { scenario: "populated", usuarioId: TENANT_A, dayKey: DAY_KEY });
    expect(res).toEqual({ dayKey: DAY_KEY, scenario: "populated", insertados: 7 });

    const r = await actividad(t);
    expect(r.tieneProspectos).toBe(true);
    expect(r.hoy.map((p) => p.nombre)).toEqual(["Lucía Ferrer", "Carlos Vega", "Marta Ruiz"]);
    expect(r.vencidos.map((p) => p.nombre)).toEqual(["Elena Prat", "Andrés Molina"]);
    expect(r.vencidos.map((p) => p.diasVencido)).toEqual([7, 2]);
    expect(r.ritmo).toMatchObject({ completados: 1, pendientes: 3, total: 4 });
  });
});
