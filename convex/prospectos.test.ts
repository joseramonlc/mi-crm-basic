// @vitest-environment edge-runtime
import { convexTest, type TestConvex } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { MAX_ACTIVIDAD, MAX_PIPELINE } from "./lib/constants";
import {
  LONGITUD_MAX_COMO_SE_CONOCIO,
  LONGITUD_MAX_EMAIL,
  LONGITUD_MAX_NOMBRE,
  LONGITUD_MAX_NOTAS,
  LONGITUD_MAX_TELEFONO,
} from "./lib/validacion";
import { APP_TZ, ventanaDia } from "./lib/fecha";
import type { Prioridad } from "./lib/prioridad";
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
  prioridad?: Prioridad;
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
        // JOS-54: "medium" se guarda por AUSENCIA (como en producción); solo persistimos
        // los niveles explícitos high/low para no fabricar un estado que la API no crea.
        ...(d.prioridad !== undefined && d.prioridad !== "medium" ? { prioridad: d.prioridad } : {}),
      });
    }
  });
}

function actividad(t: TestConvex<typeof schema>, dayKey = DAY_KEY) {
  return t.withIdentity(IDENT_A).query(api.prospectos.actividadDiaria, { dayKey });
}

function pipeline(t: TestConvex<typeof schema>, dayKey = DAY_KEY) {
  return t.withIdentity(IDENT_A).query(api.prospectos.pipeline, { dayKey });
}

const nombres = (g: { prospectos: Array<{ nombre: string }> }) => g.prospectos.map((p) => p.nombre);

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

describe("actividadDiaria · orden por prioridad (JOS-54)", () => {
  it("ordena por prioridad (Alta→Media→Baja) y, dentro de cada nivel, por antigüedad", async () => {
    const t = nuevoTest();
    await insertar(t, [
      // Todos "hoy". Prioridades y antigüedades mezcladas; la fechaProximoSeguimiento
      // NO refleja el orden esperado, para demostrar que manda la prioridad, no la fecha.
      { nombre: "Media vieja", fechaProximoSeguimiento: hoyInicio + HORA, fechaUltimoContacto: hoyInicio - 8 * DIA, prioridad: "medium" },
      { nombre: "Alta nueva", fechaProximoSeguimiento: hoyInicio + 2 * HORA, fechaUltimoContacto: hoyInicio - 1 * DIA, prioridad: "high" },
      { nombre: "Baja", fechaProximoSeguimiento: hoyInicio + 3 * HORA, fechaUltimoContacto: hoyInicio - 20 * DIA, prioridad: "low" },
      { nombre: "Alta vieja", fechaProximoSeguimiento: hoyInicio + 4 * HORA, fechaUltimoContacto: hoyInicio - 5 * DIA, prioridad: "high" },
      { nombre: "Media nueva", fechaProximoSeguimiento: hoyInicio + 5 * HORA, fechaUltimoContacto: hoyInicio - 2 * DIA, prioridad: "medium" },
    ]);

    const r = await actividad(t);
    // "Baja" es la MÁS antigua (20 d) y aun así va última: la prioridad domina la antigüedad.
    expect(r.hoy.map((p) => p.nombre)).toEqual(["Alta vieja", "Alta nueva", "Media vieja", "Media nueva", "Baja"]);
  });

  it("la prioridad NO adelanta fechas: un Alta con fecha de mañana sigue FUERA de «hoy»", async () => {
    const t = nuevoTest();
    await insertar(t, [
      { nombre: "Alta hoy", fechaProximoSeguimiento: hoyInicio + 2 * HORA, prioridad: "high" },
      { nombre: "Alta mañana", fechaProximoSeguimiento: mananaInicio + 3 * HORA, prioridad: "high" },
      { nombre: "Media hoy", fechaProximoSeguimiento: hoyInicio + 5 * HORA, prioridad: "medium" },
    ]);

    const r = await actividad(t);
    // "Alta mañana" no está: su FECHA manda, no su prioridad — no salta de grupo.
    expect(r.hoy.map((p) => p.nombre)).toEqual(["Alta hoy", "Media hoy"]);
    expect(r.vencidos.map((p) => p.nombre)).not.toContain("Alta mañana");
  });

  it("los vencidos también se ordenan por prioridad dentro de su grupo", async () => {
    const t = nuevoTest();
    await insertar(t, [
      { nombre: "Venc media", fechaProximoSeguimiento: hoyInicio - 2 * DIA, fechaUltimoContacto: hoyInicio - 5 * DIA, prioridad: "medium" },
      { nombre: "Venc alta", fechaProximoSeguimiento: hoyInicio - 1 * DIA, fechaUltimoContacto: hoyInicio - 3 * DIA, prioridad: "high" },
    ]);

    const r = await actividad(t);
    // "Venc media" está MÁS vencida por fecha (2 d vs 1 d), pero "Venc alta" va primera:
    // dentro del grupo la prioridad manda sobre la antigüedad de la fecha vencida.
    expect(r.vencidos.map((p) => p.nombre)).toEqual(["Venc alta", "Venc media"]);
  });

  it("la proyección de tarjeta incluye la prioridad resuelta (ausente → media)", async () => {
    const t = nuevoTest();
    await insertar(t, [
      { nombre: "Sin prioridad", fechaProximoSeguimiento: hoyInicio + HORA }, // el documento NO guarda el campo
      { nombre: "Con alta", fechaProximoSeguimiento: hoyInicio + 2 * HORA, prioridad: "high" },
    ]);

    const r = await actividad(t);
    expect(r.hoy.find((p) => p.nombre === "Sin prioridad")!.prioridad).toBe("medium");
    expect(r.hoy.find((p) => p.nombre === "Con alta")!.prioridad).toBe("high");
  });

  it("desempate determinista: misma prioridad y antigüedad → orden por _creationTime, no por la fecha del índice", async () => {
    const t = nuevoTest();
    // Mismo nivel (Alta) y misma antigüedad. "A" se inserta ANTES (menor _creationTime) pero
    // con fecha MAYOR (más tarde en el índice); "B" al revés. Si mandara el índice saldría
    // [B, A]; el desempate por _creationTime (A creado antes) fuerza [A, B].
    await insertar(t, [{ nombre: "A", fechaProximoSeguimiento: hoyInicio + 2 * HORA, fechaUltimoContacto: hoyInicio - 4 * DIA, prioridad: "high" }]);
    await insertar(t, [{ nombre: "B", fechaProximoSeguimiento: hoyInicio + HORA, fechaUltimoContacto: hoyInicio - 4 * DIA, prioridad: "high" }]);

    const r = await actividad(t);
    expect(r.hoy.map((p) => p.nombre)).toEqual(["A", "B"]);
  });

  it("INVARIANTE de truncamiento: la MEMBRESÍA la decide la fecha, no la prioridad (centinela Alta menos urgente NO entra)", async () => {
    const t = nuevoTest();
    // 500 supervivientes con fecha MÁS urgente y prioridades mezcladas…
    const supervivientes: Nuevo[] = Array.from({ length: MAX_ACTIVIDAD }, (_, i) => ({
      nombre: `Sup ${i}`,
      fechaProximoSeguimiento: hoyInicio + i * 60_000, // 0..499 min, todos < centinela
      prioridad: (["high", "medium", "low"] as const)[i % 3],
    }));
    // …y un centinela Alta que es el MENOS urgente por fecha (pero aún dentro de "hoy").
    const centinela: Nuevo = { nombre: "Centinela Alta", fechaProximoSeguimiento: mananaInicio - 1, prioridad: "high" };
    await insertar(t, [...supervivientes, centinela]);

    const r = await actividad(t);
    // (b) hay truncamiento y la lista es exactamente MAX_ACTIVIDAD
    expect(r.truncado.hoy).toBe(true);
    expect(r.hoy).toHaveLength(MAX_ACTIVIDAD);
    // (a) el centinela Alta NO entra: ordenar por prioridad ANTES del corte lo colaría,
    // expulsando a un prospecto más urgente por fecha. Ese es el bug que esto mata.
    expect(r.hoy.map((p) => p.nombre)).not.toContain("Centinela Alta");
    expect(r.hoy.every((p) => p.nombre.startsWith("Sup "))).toBe(true);
    // (c) los 500 supervivientes SÍ salen ordenados Alta → Media → Baja (rango no decreciente)
    const rangos = r.hoy.map((p) => ({ high: 0, medium: 1, low: 2 })[p.prioridad]);
    expect(rangos).toEqual([...rangos].sort((a, b) => a - b));
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

describe("pipeline · guardas y aislamiento (JOS-21)", () => {
  it("aborta sin identidad", async () => {
    await expect(nuevoTest().query(api.prospectos.pipeline, { dayKey: DAY_KEY })).rejects.toThrow(/Se requiere sesión/);
  });

  it("base vacía: tieneProspectos false y los 6 grupos a cero", async () => {
    const r = await pipeline(nuevoTest());
    expect(r.tieneProspectos).toBe(false);
    expect(Object.values(r.grupos).every((g) => g.total === 0 && g.prospectos.length === 0 && !g.truncado)).toBe(true);
  });

  it("no cruza tenants: el prefijo usuarioId del índice excluye al otro usuario", async () => {
    const t = nuevoTest();
    await insertar(t, [
      { nombre: "Mío", etapaActual: "new", fechaProximoSeguimiento: hoyInicio },
      { nombre: "Ajeno nuevo", usuarioId: TENANT_B, etapaActual: "new", fechaProximoSeguimiento: hoyInicio },
      { nombre: "Ajeno incorporado", usuarioId: TENANT_B, etapaActual: "joined" },
    ]);

    const r = await pipeline(t);
    expect(nombres(r.grupos.new)).toEqual(["Mío"]);
    expect(r.grupos.joined.total).toBe(0);
  });
});

describe("pipeline · agrupación, orden y proyección (JOS-21)", () => {
  it("reparte por las 6 etapas con su contador", async () => {
    const t = nuevoTest();
    await insertar(t, [
      { nombre: "N1", etapaActual: "new", fechaProximoSeguimiento: hoyInicio },
      { nombre: "N2", etapaActual: "new", fechaProximoSeguimiento: hoyInicio + HORA },
      { nombre: "C1", etapaActual: "contacted", fechaProximoSeguimiento: hoyInicio },
      { nombre: "P1", etapaActual: "presented", fechaProximoSeguimiento: hoyInicio },
      { nombre: "E1", etapaActual: "evaluating", fechaProximoSeguimiento: hoyInicio },
      { nombre: "J1", etapaActual: "joined" },
      { nombre: "D1", etapaActual: "discarded" },
      { nombre: "D2", etapaActual: "discarded" },
    ]);

    const r = await pipeline(t);
    expect(r.tieneProspectos).toBe(true);
    expect(Object.fromEntries(Object.entries(r.grupos).map(([k, g]) => [k, g.total]))).toEqual({
      new: 2,
      contacted: 1,
      presented: 1,
      evaluating: 1,
      joined: 1,
      discarded: 2,
    });
  });

  it("etapa no terminal: ordena por fechaProximoSeguimiento ascendente, no por creación", async () => {
    const t = nuevoTest();
    // Se insertan del menos al más urgente a propósito: si el orden viniera del
    // _creationTime saldría justo al revés.
    await insertar(t, [
      { nombre: "Futuro", etapaActual: "contacted", fechaProximoSeguimiento: mananaInicio + 5 * DIA },
      { nombre: "Hoy", etapaActual: "contacted", fechaProximoSeguimiento: hoyInicio + HORA },
      { nombre: "Vencido", etapaActual: "contacted", fechaProximoSeguimiento: hoyInicio - 3 * DIA },
    ]);

    expect(nombres((await pipeline(t)).grupos.contacted)).toEqual(["Vencido", "Hoy", "Futuro"]);
  });

  it("etapa terminal: sin fecha, ordena por creación descendente (lo más reciente arriba)", async () => {
    const t = nuevoTest();
    await insertar(t, [
      { nombre: "Antiguo", etapaActual: "joined" },
      { nombre: "Medio", etapaActual: "joined" },
      { nombre: "Reciente", etapaActual: "joined" },
    ]);

    const g = (await pipeline(t)).grupos.joined;
    expect(nombres(g)).toEqual(["Reciente", "Medio", "Antiguo"]);
    expect(g.prospectos.every((p) => p.fechaProximoSeguimiento === undefined)).toBe(true);
  });

  it("no terminal SIN fechaProximoSeguimiento encabeza el grupo (anomalía visible, no oculta)", async () => {
    // El esquema permite la ausencia aunque las mutaciones de producción siempre
    // la calculen en etapas no terminales. La Actividad Diaria excluye esos docs
    // (gte(1)), así que el Pipeline es la ÚNICA pantalla donde se ven: van
    // primeros para que el truncamiento no pueda borrarlos. Observación menor de
    // la auditoría del plan.
    const t = nuevoTest();
    await insertar(t, [
      { nombre: "Vencido", etapaActual: "presented", fechaProximoSeguimiento: hoyInicio - DIA },
      { nombre: "Sin fecha", etapaActual: "presented" },
      { nombre: "Futuro", etapaActual: "presented", fechaProximoSeguimiento: mananaInicio + DIA },
    ]);

    const g = (await pipeline(t)).grupos.presented;
    expect(nombres(g)).toEqual(["Sin fecha", "Vencido", "Futuro"]);
    expect(g.prospectos[0].fechaProximoSeguimiento).toBeUndefined();
    expect(g.prospectos[0].diasVencido).toBeUndefined();
  });

  it("proyecta diasVencido solo en los anteriores a hoyInicio y no filtra usuarioId", async () => {
    const t = nuevoTest();
    await insertar(t, [
      { nombre: "Vencido", etapaActual: "new", fechaProximoSeguimiento: hoyInicio - 2 * DIA, fechaUltimoContacto: hoyInicio - 6 * DIA },
      { nombre: "Justo hoy", etapaActual: "new", fechaProximoSeguimiento: hoyInicio },
      { nombre: "Mañana", etapaActual: "new", fechaProximoSeguimiento: mananaInicio },
    ]);

    const [vencido, hoy, manana] = (await pipeline(t)).grupos.new.prospectos;
    expect(vencido).toMatchObject({
      nombre: "Vencido",
      diasVencido: 2,
      etapaActual: "new",
      canalContactoPreferido: "phone",
      fechaUltimoContacto: hoyInicio - 6 * DIA,
    });
    expect(hoy.diasVencido).toBeUndefined();
    expect(manana.diasVencido).toBeUndefined();
    // La proyección no expone el tenant ni los campos de sistema. `prioridad` SÍ va
    // (JOS-53): siempre presente, resuelta.
    expect(Object.keys(vencido).sort()).toEqual(
      ["canalContactoPreferido", "diasVencido", "etapaActual", "fechaProximoSeguimiento", "fechaUltimoContacto", "id", "nombre", "prioridad"],
    );
  });

  it("desempata de forma determinista y estable cuando la fecha coincide", async () => {
    const t = nuevoTest();
    await insertar(
      t,
      ["A", "B", "C", "D"].map((n) => ({ nombre: n, etapaActual: "contacted" as const, fechaProximoSeguimiento: hoyInicio })),
    );

    // Convex añade _creationTime al final de todo índice como desempate, así que
    // el orden es total y se repite entre ejecuciones.
    const primera = nombres((await pipeline(t)).grupos.contacted);
    const segunda = nombres((await pipeline(t)).grupos.contacted);
    expect(primera).toEqual(["A", "B", "C", "D"]);
    expect(segunda).toEqual(primera);
  });
});

describe("pipeline · prioridad (JOS-53)", () => {
  it("la proyección de tarjeta incluye la prioridad resuelta (ausente → media)", async () => {
    const t = nuevoTest();
    await insertar(t, [
      { nombre: "Sin prioridad", etapaActual: "new", fechaProximoSeguimiento: hoyInicio }, // el documento NO guarda el campo
      { nombre: "Con alta", etapaActual: "new", fechaProximoSeguimiento: hoyInicio + HORA, prioridad: "high" },
    ]);

    const g = (await pipeline(t)).grupos.new;
    expect(g.prospectos.find((p) => p.nombre === "Sin prioridad")!.prioridad).toBe("medium");
    expect(g.prospectos.find((p) => p.nombre === "Con alta")!.prioridad).toBe("high");
  });

  it("la prioridad NO reordena el Pipeline: el orden sigue siendo por fecha, no por prioridad", async () => {
    const t = nuevoTest();
    await insertar(t, [
      // El MÁS urgente por fecha es de prioridad BAJA; el menos urgente, ALTA.
      { nombre: "Baja urgente", etapaActual: "contacted", fechaProximoSeguimiento: hoyInicio - DIA, prioridad: "low" },
      { nombre: "Alta futura", etapaActual: "contacted", fechaProximoSeguimiento: hoyInicio + 5 * DIA, prioridad: "high" },
    ]);

    // Si el Pipeline reordenara por prioridad, "Alta futura" iría primera. NO lo hace: aquí
    // manda la fecha (a diferencia de la Actividad Diaria, JOS-54). Es la regla "lo que NO cambia".
    expect(nombres((await pipeline(t)).grupos.contacted)).toEqual(["Baja urgente", "Alta futura"]);
  });
});

describe("pipeline · truncamiento (MAX_PIPELINE+1 leídos, centinela descartado)", () => {
  it("corta en MAX_PIPELINE y lo declara", async () => {
    const t = nuevoTest();
    await insertar(
      t,
      Array.from({ length: MAX_PIPELINE + 1 }, (_, i) => ({
        nombre: `C ${i}`,
        etapaActual: "contacted" as const,
        fechaProximoSeguimiento: hoyInicio + i * 60_000,
      })),
    );

    const r = await pipeline(t);
    expect(r.grupos.contacted.prospectos).toHaveLength(MAX_PIPELINE);
    expect(r.grupos.contacted.total).toBe(MAX_PIPELINE);
    expect(r.grupos.contacted.truncado).toBe(true);
    // El truncamiento de una etapa no contamina a las demás.
    expect(r.grupos.new.truncado).toBe(false);
  });

  it("⭐ NO oculta vencidos al truncar, aunque se hayan creado los últimos", async () => {
    // REGRESIÓN del bloqueante de la 1ª auditoría del plan. La implementación
    // anterior leía por by_usuario_etapa (orden de creación) y ordenaba DESPUÉS
    // del .take(): estos 50 vencidos, creados al final, quedaban fuera del corte
    // y desaparecían de la pantalla. Si alguien vuelve a ese índice o reintroduce
    // un .sort() posterior, este test falla.
    const t = nuevoTest();
    const futuros = Array.from({ length: MAX_PIPELINE }, (_, i) => ({
      nombre: `Futuro ${i}`,
      etapaActual: "contacted" as const,
      fechaProximoSeguimiento: mananaInicio + (i + 1) * 60_000,
    }));
    const vencidos = Array.from({ length: 50 }, (_, i) => ({
      nombre: `Vencido ${i}`,
      etapaActual: "contacted" as const,
      fechaProximoSeguimiento: hoyInicio - DIA - (50 - i) * 60_000,
    }));
    await insertar(t, futuros);
    await insertar(t, vencidos); // creados los ÚLTIMOS, a propósito

    const g = (await pipeline(t)).grupos.contacted;
    expect(g.truncado).toBe(true);
    expect(g.prospectos).toHaveLength(MAX_PIPELINE);

    const devueltos = new Set(nombres(g));
    const faltan = vencidos.map((v) => v.nombre).filter((n) => !devueltos.has(n));
    expect(faltan).toEqual([]);
    // Y además encabezan el grupo: lo urgente arriba.
    expect(nombres(g).slice(0, 50)).toEqual(vencidos.map((v) => v.nombre));
    expect(g.prospectos.slice(0, 50).every((p) => (p.diasVencido ?? 0) >= 1)).toBe(true);
  });
});

describe("pipeline · presupuesto de lectura (condición 2 del GO de auditoría)", () => {
  it("en el PEOR caso admisible (notas al tope) se mantiene lejos de los límites de Convex", async () => {
    // Límites documentados por query: 32.000 documentos escaneados y 16 MiB
    // leídos (docs.convex.dev/production/state/limits). El peor caso de esta
    // query es determinista: 6 etapas × (MAX_PIPELINE+1) + 1 de tieneProspectos.
    //
    // Se usa LONGITUD_MAX_NOTAS, no un tamaño "típico": desde JOS-74 ese es el
    // documento MÁS GRANDE que las mutaciones permiten crear, así que este test
    // acota el peor caso real y no una estimación optimista. Es la razón por la
    // que MAX_PIPELINE y LONGITUD_MAX_NOTAS no se pueden tocar por separado.
    const t = nuevoTest();
    const NOTAS = "x".repeat(LONGITUD_MAX_NOTAS);
    await t.run(async (ctx) => {
      for (let i = 0; i < 600; i++) {
        await ctx.db.insert("prospectos", {
          usuarioId: TENANT_A,
          nombre: `Prospecto ${i}`,
          comoSeConocio: "Evento de networking",
          canalContactoPreferido: "whatsapp",
          etapaActual: "contacted",
          telefono: "+34 600 000 000",
          email: `prospecto${i}@ejemplo.com`,
          notas: NOTAS,
          fechaAlta: hoyInicio - 30 * DIA,
          fechaProximoSeguimiento: hoyInicio + i * 60_000,
        });
      }
    });

    const r = await pipeline(t);
    expect(r.grupos.contacted.prospectos).toHaveLength(MAX_PIPELINE);
    expect(r.grupos.contacted.truncado).toBe(true);

    const docsPeorCaso = 6 * (MAX_PIPELINE + 1) + 1;
    // Guardas sobre las constantes: subir MAX_PIPELINE o LONGITUD_MAX_NOTAS sin
    // volver a medir rompe aquí, que es justo el punto.
    expect(docsPeorCaso).toBeLessThan(32_000 / 4);

    const bytesDoc = await t.run(async (ctx) => JSON.stringify(await ctx.db.query("prospectos").first()).length);
    expect(docsPeorCaso * bytesDoc).toBeLessThan((16 * 1024 * 1024) / 4);
  });

  it("las mutaciones no dejan crear el documento gigante que rompería el presupuesto", async () => {
    // Cierra el círculo: el test anterior acota el peor caso ADMISIBLE; este
    // comprueba que "admisible" lo impone el servidor y no la buena voluntad del
    // cliente (JOS-74).
    const t = nuevoTest().withIdentity(IDENT_A);
    const base = { nombre: "Ana", comoSeConocio: "Evento", canalContactoPreferido: "phone" as const };

    await expect(
      t.mutation(api.prospectos.crear, { ...base, notas: "x".repeat(LONGITUD_MAX_NOTAS + 1) }),
    ).rejects.toThrow(/notas no puede superar/);

    // Justo en el tope sí entra, y el trim se aplica ANTES de medir.
    const creado = await t.mutation(api.prospectos.crear, { ...base, notas: "x".repeat(LONGITUD_MAX_NOTAS) });
    expect(creado.notas).toHaveLength(LONGITUD_MAX_NOTAS);
    const conEspacios = await t.mutation(api.prospectos.crear, {
      ...base,
      notas: `  ${"y".repeat(LONGITUD_MAX_NOTAS)}  `,
    });
    expect(conEspacios.notas).toHaveLength(LONGITUD_MAX_NOTAS);

    // Y tampoco por la puerta de atrás de la edición.
    await expect(
      t.mutation(api.prospectos.actualizar, { id: creado.id, notas: "z".repeat(LONGITUD_MAX_NOTAS + 1) }),
    ).rejects.toThrow(/notas no puede superar/);
  });

  it("el documento de prospecto es FINITO: los cuatro campos restantes también tienen tope (JOS-24)", async () => {
    // JOS-74 acotó solo `notas`, así que el documento seguía sin ser finito y el peor
    // caso medido era el REALISTA, no el admisible. Bloqueante de la 2ª auditoría del
    // bocado A de JOS-24: sin estos topes no se puede afirmar que el presupuesto de
    // lectura del Resumen esté acotado para cualquier dato válido.
    const t = nuevoTest().withIdentity(IDENT_A);
    const base = { nombre: "Ana", comoSeConocio: "Evento", canalContactoPreferido: "phone" as const };

    await expect(
      t.mutation(api.prospectos.crear, { ...base, nombre: "x".repeat(LONGITUD_MAX_NOMBRE + 1) }),
    ).rejects.toThrow(/nombre no puede superar/);
    await expect(
      t.mutation(api.prospectos.crear, { ...base, comoSeConocio: "x".repeat(LONGITUD_MAX_COMO_SE_CONOCIO + 1) }),
    ).rejects.toThrow(/comoSeConocio no puede superar/);
    await expect(
      t.mutation(api.prospectos.crear, { ...base, telefono: "9".repeat(LONGITUD_MAX_TELEFONO + 1) }),
    ).rejects.toThrow(/telefono no puede superar/);

    // El email se validaba de FORMA pero no de longitud: la expresión regular acepta
    // una cadena de cualquier tamaño mientras tenga arroba y punto.
    await expect(
      t.mutation(api.prospectos.crear, { ...base, email: `${"x".repeat(LONGITUD_MAX_EMAIL)}@ejemplo.com` }),
    ).rejects.toThrow(/email no puede superar/);

    // Justo en el tope entran los cuatro, con el trim aplicado ANTES de medir.
    const emailAlTope = `${"x".repeat(LONGITUD_MAX_EMAIL - "@ejemplo.com".length)}@ejemplo.com`;
    const creado = await t.mutation(api.prospectos.crear, {
      nombre: `  ${"n".repeat(LONGITUD_MAX_NOMBRE)}  `,
      comoSeConocio: "c".repeat(LONGITUD_MAX_COMO_SE_CONOCIO),
      canalContactoPreferido: "phone" as const,
      telefono: "9".repeat(LONGITUD_MAX_TELEFONO),
      email: emailAlTope,
    });
    expect(creado.nombre).toHaveLength(LONGITUD_MAX_NOMBRE);
    expect(creado.comoSeConocio).toHaveLength(LONGITUD_MAX_COMO_SE_CONOCIO);
    expect(creado.telefono).toHaveLength(LONGITUD_MAX_TELEFONO);
    expect(creado.email).toHaveLength(LONGITUD_MAX_EMAIL);

    // Tampoco por la puerta de atrás de la edición.
    await expect(
      t.mutation(api.prospectos.actualizar, { id: creado.id, nombre: "x".repeat(LONGITUD_MAX_NOMBRE + 1) }),
    ).rejects.toThrow(/nombre no puede superar/);
    await expect(
      t.mutation(api.prospectos.actualizar, { id: creado.id, telefono: "9".repeat(LONGITUD_MAX_TELEFONO + 1) }),
    ).rejects.toThrow(/telefono no puede superar/);
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

  it("pipeline puebla las 6 etapas (escenario del recorrido manual de JOS-21)", async () => {
    process.env.ALLOW_SEED = "true";
    const t = nuevoTest();
    await t.mutation(internal.seed.seed, { scenario: "pipeline", usuarioId: TENANT_A, dayKey: DAY_KEY });

    const r = await pipeline(t);
    expect(Object.values(r.grupos).every((g) => g.total > 0)).toBe(true);
    // Dentro de Contactado hay vencido, hoy y futuro, y el vencido va primero.
    expect(r.grupos.contacted.prospectos[0].diasVencido).toBeGreaterThanOrEqual(1);
  });

  it("volumen supera el tope y el truncamiento sigue dejando ver los vencidos", async () => {
    process.env.ALLOW_SEED = "true";
    const t = nuevoTest();
    const res = await t.mutation(internal.seed.seed, { scenario: "volumen", usuarioId: TENANT_A, dayKey: DAY_KEY });
    expect(res.insertados).toBe(600);

    const g = (await pipeline(t)).grupos.contacted;
    expect(g.truncado).toBe(true);
    expect(g.prospectos).toHaveLength(MAX_PIPELINE);
    // Los 50 vencidos son los ÚLTIMOS que inserta el seed: deben salir arriba.
    expect(g.prospectos.slice(0, 50).every((p) => p.nombre.includes("(vencido)"))).toBe(true);
  });
});
