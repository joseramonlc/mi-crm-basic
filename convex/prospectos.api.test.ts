// @vitest-environment edge-runtime
import { convexTest, type TestConvex } from "convex-test";
import { ConvexError } from "convex/values";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { APP_TZ, ventanaDia } from "./lib/fecha";
import { calcularFechaProximoSeguimiento } from "./lib/seguimiento";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.{js,ts}", "!./**/*.test.ts", "!./**/*.d.ts"]);

const DAY_KEY = "2026-07-12";
const { hoyInicio } = ventanaDia(DAY_KEY, APP_TZ);
const AHORA = hoyInicio + 12 * 3_600_000; // mediodía civil del 2026-07-12

/** Cita acordada a 14 días (JOS-67): medianoche del 2026-07-26, ya normalizada. */
const ACORDADA = ventanaDia("2026-07-26", APP_TZ).hoyInicio;

// Identidades de prueba: `tokenIdentifier` explícito (no se deja deducir a
// convex-test) porque es literalmente el `usuarioId` que persisten las filas.
const TENANT_A = "https://test.clerk|user_a";
const TENANT_B = "https://test.clerk|user_b";
const IDENT_A = { subject: "user_a", issuer: "https://test.clerk", tokenIdentifier: TENANT_A };
const IDENT_B = { subject: "user_b", issuer: "https://test.clerk", tokenIdentifier: TENANT_B };

/** Instancia con sesión: es lo que devuelve `withIdentity` (ya no expone `withIdentity`). */
type TestSesion = ReturnType<TestConvex<typeof schema>["withIdentity"]>;

/** El caso normal: toda la API exige sesión, así que `t` ya viene autenticado. */
function nuevoTest(): TestSesion {
  return convexTest(schema, modules).withIdentity(IDENT_A);
}

/** Dos sesiones sobre la MISMA base de datos, para los tests de aislamiento. */
function dosTenants(): { a: TestSesion; b: TestSesion; base: TestConvex<typeof schema> } {
  const base = convexTest(schema, modules);
  return { a: base.withIdentity(IDENT_A), b: base.withIdentity(IDENT_B), base };
}

/** data del ConvexError lanzado, o falla si no lanza / no es ConvexError. */
async function dataDeError(promesa: Promise<unknown>): Promise<Record<string, string>> {
  try {
    await promesa;
  } catch (e) {
    expect(e).toBeInstanceOf(ConvexError);
    return (e as ConvexError<Record<string, string>>).data;
  }
  throw new Error("se esperaba un error y la llamada tuvo éxito");
}

const ARGS_MINIMOS = {
  nombre: "Ana Test",
  comoSeConocio: "Referido",
  canalContactoPreferido: "phone",
} as const;

function crear(t: TestSesion, extra: Record<string, unknown> = {}) {
  return t.mutation(api.prospectos.crear, { ...ARGS_MINIMOS, ...extra } as never);
}

const PAGINA = { numItems: 100, cursor: null };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AHORA);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("prospectos.crear", () => {
  it("aborta sin identidad", async () => {
    const sinSesion = convexTest(schema, modules);
    const data = await dataDeError(sinSesion.mutation(api.prospectos.crear, ARGS_MINIMOS as never));
    expect(data).toEqual({ code: "UNAUTHENTICATED", message: "Se requiere sesión" });
    // Aborta antes de tocar la base: no queda nada escrito.
    expect(await sinSesion.run((ctx) => ctx.db.query("prospectos").collect())).toEqual([]);
  });

  it("defaults: etapa new forzada, fechaAlta=now, seguimiento del motor, sin último contacto", async () => {
    const p = await crear(nuevoTest());
    expect(p.etapaActual).toBe("new");
    expect(p.fechaAlta).toBe(AHORA);
    expect(p.fechaProximoSeguimiento).toBe(calcularFechaProximoSeguimiento("new", AHORA));
    expect(p.fechaUltimoContacto).toBeUndefined();
  });

  it("proyección pública: con id, sin usuarioId/_id/_creationTime", async () => {
    const p = await crear(nuevoTest(), { telefono: "600123123", notas: "hola" });
    expect(p.id).toBeDefined();
    // `prioridad` está SIEMPRE (JOS-50), aunque el documento no la guarde: la
    // proyección la resuelve. Los demás opcionales solo aparecen si tienen valor.
    expect(Object.keys(p).sort()).toEqual(
      [
        "canalContactoPreferido",
        "comoSeConocio",
        "etapaActual",
        "fechaAlta",
        "fechaProximoSeguimiento",
        "id",
        "nombre",
        "notas",
        "prioridad",
        "telefono",
      ].sort(),
    );
  });

  it("almacena los textos recortados y omite opcionales vacíos", async () => {
    const t = nuevoTest();
    const p = await crear(t, { nombre: "  Ana Test  ", comoSeConocio: " Evento ", telefono: "   ", email: " a@b.co ", notas: "" });
    expect(p.nombre).toBe("Ana Test");
    expect(p.comoSeConocio).toBe("Evento");
    expect(p.email).toBe("a@b.co");
    expect(p.telefono).toBeUndefined();
    expect(p.notas).toBeUndefined();
  });

  it.each([
    [{ nombre: "   " }, "nombre"],
    [{ comoSeConocio: "" }, "comoSeConocio"],
    [{ email: "no-es-email" }, "email"],
  ])("validación de negocio: %o → VALIDATION_ERROR en %s", async (extra, field) => {
    const data = await dataDeError(crear(nuevoTest(), extra));
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.field).toBe(field);
  });

  it("capa 1: enum inválido lo rechaza el validador de args, no nuestro data", async () => {
    await expect(crear(nuevoTest(), { canalContactoPreferido: "paloma" })).rejects.toSatisfy(
      (e) => !(e instanceof ConvexError),
    );
  });
});

describe("prospectos.listar", () => {
  it("pagina por cursor hasta isDone con orden _creationTime descendente", async () => {
    const t = nuevoTest();
    for (const n of ["P1", "P2", "P3", "P4", "P5"]) {
      vi.setSystemTime(Date.now() + 1000);
      await crear(t, { nombre: n });
    }
    const pag1 = await t.query(api.prospectos.listar, { paginationOpts: { numItems: 2, cursor: null } });
    expect(pag1.page.map((p) => p.nombre)).toEqual(["P5", "P4"]);
    expect(pag1.isDone).toBe(false);
    const pag2 = await t.query(api.prospectos.listar, { paginationOpts: { numItems: 2, cursor: pag1.continueCursor } });
    expect(pag2.page.map((p) => p.nombre)).toEqual(["P3", "P2"]);
    const pag3 = await t.query(api.prospectos.listar, { paginationOpts: { numItems: 2, cursor: pag2.continueCursor } });
    expect(pag3.page.map((p) => p.nombre)).toEqual(["P1"]);
    expect(pag3.isDone).toBe(true);
  });

  it("filtra por etapa", async () => {
    const t = nuevoTest();
    const creado = await crear(t, { nombre: "Avanza" });
    await crear(t, { nombre: "SigueNew" });
    await t.mutation(api.prospectos.cambiarEtapa, { id: creado.id, etapa: "contacted" });
    const contactados = await t.query(api.prospectos.listar, { etapa: "contacted", paginationOpts: PAGINA });
    expect(contactados.page.map((p) => p.nombre)).toEqual(["Avanza"]);
    const nuevos = await t.query(api.prospectos.listar, { etapa: "new", paginationOpts: PAGINA });
    expect(nuevos.page.map((p) => p.nombre)).toEqual(["SigueNew"]);
  });

  it("aísla tenants entre páginas", async () => {
    const t = nuevoTest();
    await crear(t, { nombre: "Mío" });
    await t.run(async (ctx) => {
      await ctx.db.insert("prospectos", {
        usuarioId: TENANT_B,
        nombre: "Ajeno",
        comoSeConocio: "Test",
        canalContactoPreferido: "phone",
        etapaActual: "new",
        fechaAlta: AHORA,
      });
    });
    const r = await t.query(api.prospectos.listar, { paginationOpts: PAGINA });
    expect(r.page.map((p) => p.nombre)).toEqual(["Mío"]);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 2.5, 0, -1, 101])(
    "numItems=%s → VALIDATION_ERROR",
    async (numItems) => {
      const data = await dataDeError(nuevoTest().query(api.prospectos.listar, { paginationOpts: { numItems, cursor: null } }));
      expect(data).toMatchObject({ code: "VALIDATION_ERROR", field: "numItems" });
    },
  );

  it("numItems=100 (el máximo) se acepta", async () => {
    const t = nuevoTest();
    await crear(t);
    const r = await t.query(api.prospectos.listar, { paginationOpts: { numItems: 100, cursor: null } });
    expect(r.page).toHaveLength(1);
    expect(r.isDone).toBe(true);
  });
});

describe("prospectos.obtener", () => {
  it("devuelve el prospecto propio proyectado", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    const leido = await t.query(api.prospectos.obtener, { id: creado.id });
    expect(leido).toEqual(creado);
  });

  it("NOT_FOUND idéntico para inexistente y para ajeno", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    const borradoId = creado.id;
    await t.run(async (ctx) => {
      await ctx.db.delete(borradoId);
      await ctx.db.insert("prospectos", {
        usuarioId: TENANT_B,
        nombre: "Ajeno",
        comoSeConocio: "Test",
        canalContactoPreferido: "phone",
        etapaActual: "new",
        fechaAlta: AHORA,
      });
    });
    const ajenoId = await t.run(async (ctx) => (await ctx.db.query("prospectos").first())!._id);
    const dataInexistente = await dataDeError(t.query(api.prospectos.obtener, { id: borradoId }));
    const dataAjeno = await dataDeError(t.query(api.prospectos.obtener, { id: ajenoId }));
    expect(dataInexistente).toEqual({ code: "NOT_FOUND", message: "Prospecto no encontrado" });
    expect(dataAjeno).toEqual(dataInexistente);
  });
});

describe("prospectos.actualizar", () => {
  it("actualiza los campos permitidos con trim y deja intactos etapa y fechas", async () => {
    const t = nuevoTest();
    const creado = await crear(t, { email: "a@b.co" });
    const actualizado = await t.mutation(api.prospectos.actualizar, {
      id: creado.id,
      nombre: "  Renombrada  ",
      notas: " nueva nota ",
    });
    expect(actualizado.nombre).toBe("Renombrada");
    expect(actualizado.notas).toBe("nueva nota");
    expect(actualizado.email).toBe("a@b.co");
    expect(actualizado.etapaActual).toBe(creado.etapaActual);
    expect(actualizado.fechaAlta).toBe(creado.fechaAlta);
    expect(actualizado.fechaProximoSeguimiento).toBe(creado.fechaProximoSeguimiento);
  });

  it("cadena vacía elimina el campo opcional", async () => {
    const t = nuevoTest();
    const creado = await crear(t, { telefono: "600123123", email: "a@b.co" });
    const actualizado = await t.mutation(api.prospectos.actualizar, { id: creado.id, telefono: "", email: "   " });
    expect(actualizado.telefono).toBeUndefined();
    expect(actualizado.email).toBeUndefined();
    const doc = await t.run((ctx) => ctx.db.get(creado.id));
    expect(doc).not.toHaveProperty("telefono");
    expect(doc).not.toHaveProperty("email");
  });

  it("capa 1: etapaActual no es un argumento aceptado", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    await expect(
      t.mutation(api.prospectos.actualizar, { id: creado.id, etapaActual: "joined" } as unknown as never),
    ).rejects.toSatisfy((e) => !(e instanceof ConvexError));
  });

  it("nombre vacío → VALIDATION_ERROR y no persiste nada", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    const data = await dataDeError(t.mutation(api.prospectos.actualizar, { id: creado.id, nombre: " " }));
    expect(data).toMatchObject({ code: "VALIDATION_ERROR", field: "nombre" });
    expect((await t.run((ctx) => ctx.db.get(creado.id)))!.nombre).toBe("Ana Test");
  });
});

describe("prospectos.cambiarEtapa", () => {
  it("recalcula desde fechaUltimoContacto si existe (caso 4 de JOS-8)", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    const contacto = AHORA - 2 * 24 * 3_600_000;
    await t.run((ctx) => ctx.db.patch(creado.id, { fechaUltimoContacto: contacto }));
    const cambiado = await t.mutation(api.prospectos.cambiarEtapa, { id: creado.id, etapa: "presented" });
    expect(cambiado.fechaProximoSeguimiento).toBe(calcularFechaProximoSeguimiento("presented", contacto));
    expect(cambiado.fechaUltimoContacto).toBe(contacto);
  });

  it("recalcula desde fechaAlta si nunca hubo contacto", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    const cambiado = await t.mutation(api.prospectos.cambiarEtapa, { id: creado.id, etapa: "evaluating" });
    expect(cambiado.fechaProximoSeguimiento).toBe(calcularFechaProximoSeguimiento("evaluating", creado.fechaAlta));
  });

  it("etapa terminal elimina fechaProximoSeguimiento", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    const cambiado = await t.mutation(api.prospectos.cambiarEtapa, { id: creado.id, etapa: "joined" });
    expect(cambiado.fechaProximoSeguimiento).toBeUndefined();
    const doc = await t.run((ctx) => ctx.db.get(creado.id));
    expect(doc).not.toHaveProperty("fechaProximoSeguimiento");
  });

  it("capa 1: etapa fuera del enum la rechaza el validador de args", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    await expect(
      t.mutation(api.prospectos.cambiarEtapa, { id: creado.id, etapa: "otra" } as unknown as never),
    ).rejects.toSatisfy((e) => !(e instanceof ConvexError));
  });

  it("tenant: cambiar etapa de un prospecto ajeno → NOT_FOUND", async () => {
    const t = nuevoTest();
    const ajenoId = await t.run((ctx) =>
      ctx.db.insert("prospectos", {
        usuarioId: TENANT_B,
        nombre: "Ajeno",
        comoSeConocio: "Test",
        canalContactoPreferido: "phone",
        etapaActual: "new",
        fechaAlta: AHORA,
      }),
    );
    const data = await dataDeError(t.mutation(api.prospectos.cambiarEtapa, { id: ajenoId, etapa: "contacted" }));
    expect(data).toEqual({ code: "NOT_FOUND", message: "Prospecto no encontrado" });
  });

  /* ── Precedencia de la fecha acordada (JOS-67) ──────────────────────────── */

  it("con acuerdo activo NO recalcula: la fecha acordada gana sobre la regla de etapa", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    const acordada = await t.mutation(api.prospectos.fijarSeguimientoAcordado, {
      id: creado.id,
      fecha: ACORDADA,
    });
    const cambiado = await t.mutation(api.prospectos.cambiarEtapa, { id: creado.id, etapa: "presented" });
    expect(cambiado.etapaActual).toBe("presented");
    expect(cambiado.fechaProximoSeguimiento).toBe(acordada.fechaProximoSeguimiento);
    expect(cambiado.seguimientoManual).toBe(true);
    // Y NO es lo que habría dicho el motor.
    expect(cambiado.fechaProximoSeguimiento).not.toBe(
      calcularFechaProximoSeguimiento("presented", creado.fechaAlta),
    );
  });

  it("a etapa terminal con acuerdo activo: se borran la fecha Y el booleano", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    await t.mutation(api.prospectos.fijarSeguimientoAcordado, { id: creado.id, fecha: ACORDADA });
    const cambiado = await t.mutation(api.prospectos.cambiarEtapa, { id: creado.id, etapa: "discarded" });
    expect(cambiado.fechaProximoSeguimiento).toBeUndefined();
    expect(cambiado.seguimientoManual).toBeUndefined();
    const doc = await t.run((ctx) => ctx.db.get(creado.id));
    expect(doc).not.toHaveProperty("fechaProximoSeguimiento");
    expect(doc).not.toHaveProperty("seguimientoManual");
  });

  it("recuperar un prospecto descartado lo devuelve al motor, no lo deja huérfano", async () => {
    // El escenario que justifica limpiar el booleano en terminales: si quedase
    // colgado, este prospecto se quedaría sin fecha y sin motor para siempre.
    const t = nuevoTest();
    const creado = await crear(t);
    await t.mutation(api.prospectos.fijarSeguimientoAcordado, { id: creado.id, fecha: ACORDADA });
    await t.mutation(api.prospectos.cambiarEtapa, { id: creado.id, etapa: "discarded" });
    const recuperado = await t.mutation(api.prospectos.cambiarEtapa, { id: creado.id, etapa: "contacted" });
    expect(recuperado.fechaProximoSeguimiento).toBe(
      calcularFechaProximoSeguimiento("contacted", creado.fechaAlta),
    );
    expect(recuperado.seguimientoManual).toBeUndefined();
  });
});

describe("prospectos.fijarSeguimientoAcordado (JOS-67)", () => {
  it("aborta sin identidad", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    const sinSesion = convexTest(schema, modules);
    const data = await dataDeError(
      sinSesion.mutation(api.prospectos.fijarSeguimientoAcordado, { id: creado.id, fecha: ACORDADA }),
    );
    expect(data).toEqual({ code: "UNAUTHENTICATED", message: "Se requiere sesión" });
  });

  it("fija la fecha y marca el seguimiento como manual", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    const p = await t.mutation(api.prospectos.fijarSeguimientoAcordado, { id: creado.id, fecha: ACORDADA });
    expect(p.fechaProximoSeguimiento).toBe(ACORDADA);
    expect(p.seguimientoManual).toBe(true);
  });

  it("normaliza a medianoche de APP_TZ: la hora que mande el cliente se descarta", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    const p = await t.mutation(api.prospectos.fijarSeguimientoAcordado, {
      id: creado.id,
      fecha: ACORDADA + 17 * 3_600_000 + 43 * 60_000, // 17:43 de ese día
    });
    expect(p.fechaProximoSeguimiento).toBe(ACORDADA);
  });

  it("acepta HOY entero, no solo el futuro", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    // AHORA es mediodía; la medianoche de hoy ya pasó y aun así se acepta.
    const p = await t.mutation(api.prospectos.fijarSeguimientoAcordado, { id: creado.id, fecha: AHORA });
    expect(p.fechaProximoSeguimiento).toBe(hoyInicio);
  });

  it("rechaza una fecha pasada", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    const data = await dataDeError(
      t.mutation(api.prospectos.fijarSeguimientoAcordado, { id: creado.id, fecha: hoyInicio - 1 }),
    );
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.field).toBe("fecha");
    // No persiste nada: la mutation aborta la transacción entera.
    const doc = await t.run((ctx) => ctx.db.get(creado.id));
    expect(doc).not.toHaveProperty("seguimientoManual");
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 9e15])(
    "rechaza %p como fecha",
    async (fecha) => {
      const t = nuevoTest();
      const creado = await crear(t);
      const data = await dataDeError(
        t.mutation(api.prospectos.fijarSeguimientoAcordado, { id: creado.id, fecha }),
      );
      expect(data.code).toBe("VALIDATION_ERROR");
      expect(data.field).toBe("fecha");
    },
  );

  it.each(["joined", "discarded"] as const)(
    "rechaza fijar en la etapa terminal %s: rompería el contrato de JOS-8",
    async (etapa) => {
      const t = nuevoTest();
      const creado = await crear(t);
      await t.mutation(api.prospectos.cambiarEtapa, { id: creado.id, etapa });
      const data = await dataDeError(
        t.mutation(api.prospectos.fijarSeguimientoAcordado, { id: creado.id, fecha: ACORDADA }),
      );
      expect(data.code).toBe("VALIDATION_ERROR");
      expect(data.field).toBe("etapaActual");
      // Sigue fuera de la Actividad Diaria.
      const doc = await t.run((ctx) => ctx.db.get(creado.id));
      expect(doc).not.toHaveProperty("fechaProximoSeguimiento");
      expect(doc).not.toHaveProperty("seguimientoManual");
    },
  );

  it("tenant: fijar en un prospecto ajeno → NOT_FOUND", async () => {
    const t = nuevoTest();
    const ajenoId = await t.run((ctx) =>
      ctx.db.insert("prospectos", {
        usuarioId: TENANT_B,
        nombre: "Ajeno",
        comoSeConocio: "Test",
        canalContactoPreferido: "phone",
        etapaActual: "new",
        fechaAlta: AHORA,
      }),
    );
    const data = await dataDeError(
      t.mutation(api.prospectos.fijarSeguimientoAcordado, { id: ajenoId, fecha: ACORDADA }),
    );
    expect(data).toEqual({ code: "NOT_FOUND", message: "Prospecto no encontrado" });
  });
});

describe("prospectos.quitarSeguimientoAcordado (JOS-67)", () => {
  it("aborta sin identidad", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    const sinSesion = convexTest(schema, modules);
    const data = await dataDeError(
      sinSesion.mutation(api.prospectos.quitarSeguimientoAcordado, { id: creado.id }),
    );
    expect(data).toEqual({ code: "UNAUTHENTICATED", message: "Se requiere sesión" });
  });

  it("RESTAURA la fecha del motor, no se limita a borrar la marca", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    await t.mutation(api.prospectos.fijarSeguimientoAcordado, { id: creado.id, fecha: ACORDADA });
    const p = await t.mutation(api.prospectos.quitarSeguimientoAcordado, { id: creado.id });
    expect(p.seguimientoManual).toBeUndefined();
    // Lo importante: la fecha ya NO es la acordada, sino la del motor.
    expect(p.fechaProximoSeguimiento).not.toBe(ACORDADA);
    expect(p.fechaProximoSeguimiento).toBe(calcularFechaProximoSeguimiento("new", creado.fechaAlta));
    const doc = await t.run((ctx) => ctx.db.get(creado.id));
    expect(doc).not.toHaveProperty("seguimientoManual");
  });

  it("recalcula desde fechaUltimoContacto cuando existe (caso 4 de JOS-8)", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    const contacto = AHORA - 2 * 24 * 3_600_000;
    await t.run((ctx) => ctx.db.patch(creado.id, { fechaUltimoContacto: contacto }));
    await t.mutation(api.prospectos.fijarSeguimientoAcordado, { id: creado.id, fecha: ACORDADA });
    const p = await t.mutation(api.prospectos.quitarSeguimientoAcordado, { id: creado.id });
    expect(p.fechaProximoSeguimiento).toBe(calcularFechaProximoSeguimiento("new", contacto));
  });

  it("en etapa terminal deja la fecha ausente", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    await t.mutation(api.prospectos.cambiarEtapa, { id: creado.id, etapa: "joined" });
    const p = await t.mutation(api.prospectos.quitarSeguimientoAcordado, { id: creado.id });
    expect(p.fechaProximoSeguimiento).toBeUndefined();
    expect(p.seguimientoManual).toBeUndefined();
  });

  it("es idempotente sobre un prospecto que nunca tuvo acuerdo", async () => {
    const t = nuevoTest();
    const creado = await crear(t);
    const p = await t.mutation(api.prospectos.quitarSeguimientoAcordado, { id: creado.id });
    expect(p.fechaProximoSeguimiento).toBe(creado.fechaProximoSeguimiento);
    expect(p.seguimientoManual).toBeUndefined();
  });

  it("tenant: quitar en un prospecto ajeno → NOT_FOUND", async () => {
    const t = nuevoTest();
    const ajenoId = await t.run((ctx) =>
      ctx.db.insert("prospectos", {
        usuarioId: TENANT_B,
        nombre: "Ajeno",
        comoSeConocio: "Test",
        canalContactoPreferido: "phone",
        etapaActual: "new",
        fechaAlta: AHORA,
      }),
    );
    const data = await dataDeError(
      t.mutation(api.prospectos.quitarSeguimientoAcordado, { id: ajenoId }),
    );
    expect(data).toEqual({ code: "NOT_FOUND", message: "Prospecto no encontrado" });
  });
});

describe("aislamiento del tenant en escrituras", () => {
  it("nunca se persiste un usuarioId distinto del servidor", async () => {
    const t = nuevoTest();
    await crear(t);
    const docs = await t.run((ctx) => ctx.db.query("prospectos").collect());
    expect(docs.map((d) => d.usuarioId)).toEqual([TENANT_A]);
  });

  it("el usuarioId no se acepta del cliente ni siquiera como argumento extra", async () => {
    const t = nuevoTest();
    // Capa 1: args extra los rechaza el validador de Convex antes del handler.
    await expect(crear(t, { usuarioId: TENANT_B })).rejects.toSatisfy((e) => !(e instanceof ConvexError));
  });
});

/**
 * Aislamiento entre dos sesiones reales sobre la MISMA base (JOS-66, tarea 8).
 * Ambas identidades pasan por `ctx.auth`, como en producción: aquí no se
 * insertan filas "a mano" para simular al otro usuario.
 */
describe("aislamiento multi-tenant · dos sesiones", () => {
  it("lecturas: cada sesión solo ve lo suyo", async () => {
    const { a, b } = dosTenants();
    await crear(a, { nombre: "De A" });
    await crear(b, { nombre: "De B" });

    const listaA = await a.query(api.prospectos.listar, { paginationOpts: PAGINA });
    const listaB = await b.query(api.prospectos.listar, { paginationOpts: PAGINA });
    expect(listaA.page.map((p) => p.nombre)).toEqual(["De A"]);
    expect(listaB.page.map((p) => p.nombre)).toEqual(["De B"]);

    const actividadB = await b.query(api.prospectos.actividadDiaria, { dayKey: DAY_KEY });
    expect(actividadB.tieneProspectos).toBe(true);
    expect(actividadB.hoy.map((p) => p.nombre)).toEqual([]);
  });

  it.each([
    ["obtener", (t: TestSesion, id: never) => t.query(api.prospectos.obtener, { id })],
    ["actualizar", (t: TestSesion, id: never) => t.mutation(api.prospectos.actualizar, { id, nombre: "Secuestrado" })],
    ["cambiarEtapa", (t: TestSesion, id: never) => t.mutation(api.prospectos.cambiarEtapa, { id, etapa: "joined" })],
  ])("%s con el id de otro tenant → NOT_FOUND opaco", async (_nombre, llamar) => {
    const { a, b } = dosTenants();
    const deA = await crear(a, { nombre: "De A" });
    const data = await dataDeError(llamar(b, deA.id as never));
    expect(data).toEqual({ code: "NOT_FOUND", message: "Prospecto no encontrado" });
  });

  it("una escritura rechazada no altera el documento del otro tenant", async () => {
    const { a, b, base } = dosTenants();
    const deA = await crear(a, { nombre: "De A", notas: "intacta" });

    await expect(b.mutation(api.prospectos.actualizar, { id: deA.id, nombre: "Secuestrado" })).rejects.toThrow();
    await expect(b.mutation(api.prospectos.cambiarEtapa, { id: deA.id, etapa: "joined" })).rejects.toThrow();

    const doc = await base.run((ctx) => ctx.db.get(deA.id));
    expect(doc).toMatchObject({ usuarioId: TENANT_A, nombre: "De A", notas: "intacta", etapaActual: "new" });
  });
});

describe("prioridad (JOS-50)", () => {
  /** Documento CRUDO, sin pasar por la proyección: es donde se ve la ausencia. */
  async function doc(t: TestSesion, id: unknown) {
    return t.run((ctx) => ctx.db.get(id as Id<"prospectos">));
  }

  it("sin prioridad: la API devuelve media y el documento NO guarda el campo", async () => {
    const t = nuevoTest();
    const p = await crear(t);

    expect(p.prioridad).toBe("medium");
    // La clave del diseño: "medium" es la AUSENCIA, no un valor almacenado.
    // Por eso los prospectos anteriores a M10 son válidos sin migración.
    expect(await doc(t, p.id)).not.toHaveProperty("prioridad");
  });

  it.each(["high", "low"] as const)("crear con prioridad %s la persiste tal cual", async (prioridad) => {
    const t = nuevoTest();
    const p = await crear(t, { prioridad });
    expect(p.prioridad).toBe(prioridad);
    expect((await doc(t, p.id))!.prioridad).toBe(prioridad);
  });

  it("crear con «medium» explícito tampoco lo escribe: una sola representación del defecto", async () => {
    const t = nuevoTest();
    const p = await crear(t, { prioridad: "medium" });
    expect(p.prioridad).toBe("medium");
    expect(await doc(t, p.id)).not.toHaveProperty("prioridad");
  });

  it("actualizar de ausente a high la persiste", async () => {
    const t = nuevoTest();
    const p = await crear(t);
    const r = await t.mutation(api.prospectos.actualizar, { id: p.id, prioridad: "high" } as never);
    expect(r.prioridad).toBe("high");
    expect((await doc(t, p.id))!.prioridad).toBe("high");
  });

  it("actualizar a «medium» BORRA el campo del documento, no lo reescribe", async () => {
    const t = nuevoTest();
    const p = await crear(t, { prioridad: "high" });
    expect((await doc(t, p.id))!.prioridad).toBe("high");

    const r = await t.mutation(api.prospectos.actualizar, { id: p.id, prioridad: "medium" } as never);

    expect(r.prioridad).toBe("medium");
    expect(await doc(t, p.id)).not.toHaveProperty("prioridad");
  });

  it("no tocar la prioridad en un actualizar la deja intacta", async () => {
    const t = nuevoTest();
    const p = await crear(t, { prioridad: "low" });
    const r = await t.mutation(api.prospectos.actualizar, { id: p.id, nombre: "Otro nombre" } as never);
    expect(r.prioridad).toBe("low");
  });

  it("un prospecto ANTERIOR a M10 (insertado sin el campo) se lee como media", async () => {
    const t = nuevoTest();
    const id = await t.run((ctx) =>
      ctx.db.insert("prospectos", {
        usuarioId: TENANT_A,
        nombre: "Prospecto viejo",
        comoSeConocio: "Evento",
        canalContactoPreferido: "phone",
        etapaActual: "contacted",
        fechaAlta: AHORA - 30 * 24 * 3_600_000,
      }),
    );
    const r = await t.query(api.prospectos.obtener, { id });
    expect(r.prioridad).toBe("medium");
  });

  it("valor inválido: lo rechaza el validador de Convex y no escribe nada", async () => {
    const t = nuevoTest();
    // El enum lo impone el validador de argumentos, igual que en etapa y canal:
    // el rechazo llega ANTES del handler y con el formato de error de Convex,
    // no con el VALIDATION_ERROR del contrato de M2.
    await expect(crear(t, { prioridad: "urgente" })).rejects.toThrow();
    expect(await t.run((ctx) => ctx.db.query("prospectos").collect())).toEqual([]);
  });

  it("las CUATRO puertas de lectura y escritura devuelven siempre la prioridad", async () => {
    const t = nuevoTest();
    const creado = await crear(t, { prioridad: "high" });
    const obtenido = await t.query(api.prospectos.obtener, { id: creado.id });
    const listado = await t.query(api.prospectos.listar, { paginationOpts: PAGINA });
    const actualizado = await t.mutation(api.prospectos.actualizar, { id: creado.id, nombre: "Ana" } as never);

    expect(creado.prioridad).toBe("high");
    expect(obtenido.prioridad).toBe("high");
    expect(listado.page[0].prioridad).toBe("high");
    expect(actualizado.prioridad).toBe("high");
  });

  it("la prioridad NO toca el motor de seguimiento (regla de negocio de JOS-50)", async () => {
    const t = nuevoTest();
    const sinPrioridad = await crear(t);
    const conPrioridad = await crear(t, { prioridad: "high" });

    expect(conPrioridad.fechaProximoSeguimiento).toBe(sinPrioridad.fechaProximoSeguimiento);

    // Y cambiarla después tampoco mueve la fecha.
    const tras = await t.mutation(api.prospectos.actualizar, { id: sinPrioridad.id, prioridad: "low" } as never);
    expect(tras.fechaProximoSeguimiento).toBe(sinPrioridad.fechaProximoSeguimiento);
    expect(tras.fechaUltimoContacto).toBe(sinPrioridad.fechaUltimoContacto);
  });
});
