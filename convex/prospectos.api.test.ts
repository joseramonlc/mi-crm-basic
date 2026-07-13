// @vitest-environment edge-runtime
import { convexTest, type TestConvex } from "convex-test";
import { ConvexError } from "convex/values";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import { DEV_USUARIO_ID } from "./lib/constants";
import { APP_TZ, ventanaDia } from "./lib/fecha";
import { calcularFechaProximoSeguimiento } from "./lib/seguimiento";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.{js,ts}", "!./**/*.test.ts", "!./**/*.d.ts"]);

const DAY_KEY = "2026-07-12";
const { hoyInicio } = ventanaDia(DAY_KEY, APP_TZ);
const AHORA = hoyInicio + 12 * 3_600_000; // mediodía civil del 2026-07-12

function nuevoTest(): TestConvex<typeof schema> {
  return convexTest(schema, modules);
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

function crear(t: TestConvex<typeof schema>, extra: Record<string, unknown> = {}) {
  return t.mutation(api.prospectos.crear, { ...ARGS_MINIMOS, ...extra } as never);
}

const PAGINA = { numItems: 100, cursor: null };

beforeEach(() => {
  process.env.APP_ENV = "development";
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AHORA);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("prospectos.crear", () => {
  it("aborta fuera de desarrollo", async () => {
    process.env.APP_ENV = "production";
    await expect(crear(nuevoTest())).rejects.toThrow(/solo está disponible en desarrollo/);
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
    expect(Object.keys(p).sort()).toEqual(
      ["canalContactoPreferido", "comoSeConocio", "etapaActual", "fechaAlta", "fechaProximoSeguimiento", "id", "nombre", "notas", "telefono"].sort(),
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
        usuarioId: "otro-usuario",
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
        usuarioId: "otro-usuario",
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
        usuarioId: "otro-usuario",
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
});

describe("aislamiento del tenant en escrituras", () => {
  it("nunca se persiste un usuarioId distinto del servidor", async () => {
    const t = nuevoTest();
    await crear(t);
    const docs = await t.run((ctx) => ctx.db.query("prospectos").collect());
    expect(docs.map((d) => d.usuarioId)).toEqual([DEV_USUARIO_ID]);
  });
});
