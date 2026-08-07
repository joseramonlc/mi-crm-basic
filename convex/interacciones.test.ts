// @vitest-environment edge-runtime
import { convexTest, type TestConvex } from "convex-test";
import { ConvexError } from "convex/values";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import { APP_TZ, ventanaDia } from "./lib/fecha";
import { calcularFechaProximoSeguimiento } from "./lib/seguimiento";
import { FUTURO_MARGEN_MS, LONGITUD_MAX_TEXTO_INTERACCION } from "./lib/validacion";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.{js,ts}", "!./**/*.test.ts", "!./**/*.d.ts"]);

const DAY_KEY = "2026-07-12";
const { hoyInicio } = ventanaDia(DAY_KEY, APP_TZ);
const AHORA = hoyInicio + 12 * 3_600_000;
const DIA = 24 * 3_600_000;

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

async function dataDeError(promesa: Promise<unknown>): Promise<Record<string, string>> {
  try {
    await promesa;
  } catch (e) {
    expect(e).toBeInstanceOf(ConvexError);
    return (e as ConvexError<Record<string, string>>).data;
  }
  throw new Error("se esperaba un error y la llamada tuvo éxito");
}

async function conProspecto(t: TestSesion, extra: Record<string, unknown> = {}) {
  return t.run((ctx) =>
    ctx.db.insert("prospectos", {
      usuarioId: TENANT_A,
      nombre: "Base",
      comoSeConocio: "Test",
      canalContactoPreferido: "phone",
      etapaActual: "contacted",
      fechaAlta: AHORA - 10 * DIA,
      ...extra,
    }),
  );
}

const INTERACCION = {
  tipo: "call",
  resultado: "interested",
  queOcurrio: "Llamada de prueba",
} as const;

function crear(t: TestSesion, prospectoId: unknown, extra: Record<string, unknown> = {}) {
  return t.mutation(api.interacciones.crear, { prospectoId, fecha: AHORA, ...INTERACCION, ...extra } as never);
}

const PAGINA = { numItems: 100, cursor: null };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AHORA);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("interacciones.crear · efectos en el prospecto", () => {
  it("inserta y actualiza fechaUltimoContacto + fechaProximoSeguimiento en la misma mutation", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);
    const r = await crear(t, prospectoId, { siguientePasoAcordado: " llamar el jueves " });

    expect(r.interaccion.prospectoId).toEqual(prospectoId);
    expect(r.interaccion.queOcurrio).toBe("Llamada de prueba");
    expect(r.interaccion.siguientePasoAcordado).toBe("llamar el jueves");
    expect(r.prospecto.fechaUltimoContacto).toBe(AHORA);
    expect(r.prospecto.fechaProximoSeguimiento).toBe(calcularFechaProximoSeguimiento("contacted", AHORA));

    const doc = await t.run((ctx) => ctx.db.get(prospectoId));
    expect(doc!.fechaUltimoContacto).toBe(AHORA);
  });

  it("sin contacto previo, la referencia es la fecha de la interacción", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);
    const antigua = AHORA - 6 * DIA;
    const r = await crear(t, prospectoId, { fecha: antigua });
    expect(r.prospecto.fechaUltimoContacto).toBe(antigua);
    expect(r.prospecto.fechaProximoSeguimiento).toBe(calcularFechaProximoSeguimiento("contacted", antigua));
  });

  it("max(): un registro tardío no retrocede el último contacto ni el seguimiento", async () => {
    const t = nuevoTest();
    const reciente = AHORA - 1 * DIA;
    const prospectoId = await conProspecto(t, { fechaUltimoContacto: reciente });
    const r = await crear(t, prospectoId, { fecha: AHORA - 5 * DIA });
    expect(r.prospecto.fechaUltimoContacto).toBe(reciente);
    expect(r.prospecto.fechaProximoSeguimiento).toBe(calcularFechaProximoSeguimiento("contacted", reciente));
  });

  it("en etapa terminal la interacción se registra y el seguimiento queda ausente", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t, { etapaActual: "joined" });
    const r = await crear(t, prospectoId);
    expect(r.prospecto.fechaProximoSeguimiento).toBeUndefined();
    const doc = await t.run((ctx) => ctx.db.get(prospectoId));
    expect(doc).not.toHaveProperty("fechaProximoSeguimiento");
  });

  it("copia usuarioId del prospecto en servidor", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);
    await crear(t, prospectoId);
    const filas = await t.run((ctx) => ctx.db.query("interacciones").collect());
    expect(filas.map((f) => f.usuarioId)).toEqual([TENANT_A]);
  });

  /* ── Consumo de la cita acordada (JOS-67) ───────────────────────────────── */

  it("CONSUME el acuerdo: el contacto ya ocurrió, así que el motor vuelve a mandar", async () => {
    const t = nuevoTest();
    const acordada = ventanaDia("2026-07-26", APP_TZ).hoyInicio;
    const prospectoId = await conProspecto(t, {
      fechaProximoSeguimiento: acordada,
      seguimientoManual: true,
    });

    const r = await crear(t, prospectoId);

    expect(r.prospecto.seguimientoManual).toBeUndefined();
    expect(r.prospecto.fechaProximoSeguimiento).not.toBe(acordada);
    expect(r.prospecto.fechaProximoSeguimiento).toBe(calcularFechaProximoSeguimiento("contacted", AHORA));
    const doc = await t.run((ctx) => ctx.db.get(prospectoId));
    expect(doc).not.toHaveProperty("seguimientoManual");
  });

  it("en etapa terminal con acuerdo activo, la interacción lo consume y no deja fecha", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t, {
      etapaActual: "joined",
      fechaProximoSeguimiento: ventanaDia("2026-07-26", APP_TZ).hoyInicio,
      seguimientoManual: true,
    });
    const r = await crear(t, prospectoId);
    expect(r.prospecto.fechaProximoSeguimiento).toBeUndefined();
    expect(r.prospecto.seguimientoManual).toBeUndefined();
  });

  it("sin acuerdo, registrar una interacción no introduce el campo", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);
    const r = await crear(t, prospectoId);
    expect(r.prospecto.seguimientoManual).toBeUndefined();
    const doc = await t.run((ctx) => ctx.db.get(prospectoId));
    expect(doc).not.toHaveProperty("seguimientoManual");
  });
});

describe("interacciones.crear · fecha acordada en el registro (JOS-68)", () => {
  const FUTURO_DAY_KEY = "2026-07-20";
  const { hoyInicio: FUTURO_MEDIANOCHE } = ventanaDia(FUTURO_DAY_KEY, APP_TZ);
  const FUTURO_MEDIODIA = FUTURO_MEDIANOCHE + 12 * 3_600_000;

  it("con fecha acordada: manda el acuerdo, no el motor, y se guarda a medianoche", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);

    const r = await crear(t, prospectoId, { fechaAcordada: FUTURO_MEDIODIA });

    expect(r.prospecto.fechaProximoSeguimiento).toBe(FUTURO_MEDIANOCHE);
    expect(r.prospecto.seguimientoManual).toBe(true);
    // Lo que habría puesto el motor queda descartado: es la precedencia de JOS-67.
    expect(r.prospecto.fechaProximoSeguimiento).not.toBe(calcularFechaProximoSeguimiento("contacted", AHORA));
    // El resto del registro sigue igual: la interacción no guarda esta fecha.
    expect(r.prospecto.fechaUltimoContacto).toBe(AHORA);
    expect(r.interaccion).not.toHaveProperty("fechaAcordada");

    const doc = await t.run((ctx) => ctx.db.get(prospectoId));
    expect(doc!.fechaProximoSeguimiento).toBe(FUTURO_MEDIANOCHE);
    expect(doc!.seguimientoManual).toBe(true);
  });

  it("acordar para HOY se acepta: el suelo es la medianoche de hoy, no el instante", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);
    const r = await crear(t, prospectoId, { fechaAcordada: AHORA });
    expect(r.prospecto.fechaProximoSeguimiento).toBe(hoyInicio);
    expect(r.prospecto.seguimientoManual).toBe(true);
  });

  it("sustituye un acuerdo anterior en vez de consumirlo", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t, {
      fechaProximoSeguimiento: ventanaDia("2026-07-26", APP_TZ).hoyInicio,
      seguimientoManual: true,
    });
    const r = await crear(t, prospectoId, { fechaAcordada: FUTURO_MEDIODIA });
    expect(r.prospecto.fechaProximoSeguimiento).toBe(FUTURO_MEDIANOCHE);
    expect(r.prospecto.seguimientoManual).toBe(true);
  });

  it.each([
    ["ayer", AHORA - DIA],
    ["NaN", Number.NaN],
    ["+Infinity", Number.POSITIVE_INFINITY],
    ["fuera del rango de Date", 9e15],
  ])("rechaza la fecha acordada %s con field fechaAcordada y sin escribir nada", async (_nombre, fechaAcordada) => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);

    const data = await dataDeError(crear(t, prospectoId, { fechaAcordada }));

    // field PROPIO: compartir "fecha" con la fecha de la interacción haría que el
    // cliente pintara el campo equivocado con el mensaje contrario.
    expect(data).toMatchObject({ code: "VALIDATION_ERROR", field: "fechaAcordada" });
    expect(await t.run((ctx) => ctx.db.query("interacciones").collect())).toEqual([]);
    // Y el prospecto tampoco se mueve: hoy la validación va antes del insert y
    // antes del patch, y este test lo fija para que siga siendo así.
    const doc = await t.run((ctx) => ctx.db.get(prospectoId));
    expect(doc!.fechaUltimoContacto).toBeUndefined();
    expect(doc).not.toHaveProperty("fechaProximoSeguimiento");
    expect(doc).not.toHaveProperty("seguimientoManual");
  });

  it("carrera con la UI: si el prospecto pasó a etapa terminal, rechaza sin registrar nada", async () => {
    const t = nuevoTest();
    // La pantalla oculta el campo en etapas terminales; esto cubre el hueco de
    // haberla abierto antes del cambio de etapa.
    const prospectoId = await conProspecto(t, { etapaActual: "joined" });

    const data = await dataDeError(crear(t, prospectoId, { fechaAcordada: FUTURO_MEDIODIA }));

    expect(data).toMatchObject({ code: "VALIDATION_ERROR", field: "etapaActual" });
    expect(await t.run((ctx) => ctx.db.query("interacciones").collect())).toEqual([]);
    const doc = await t.run((ctx) => ctx.db.get(prospectoId));
    expect(doc!.fechaUltimoContacto).toBeUndefined();
    expect(doc).not.toHaveProperty("fechaProximoSeguimiento");
    expect(doc).not.toHaveProperty("seguimientoManual");
  });
});

describe("interacciones.crear · validación de fecha (reloj fijado)", () => {
  it("acepta exactamente now + margen de 5 minutos", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);
    const r = await crear(t, prospectoId, { fecha: AHORA + FUTURO_MARGEN_MS });
    expect(r.interaccion.fecha).toBe(AHORA + FUTURO_MARGEN_MS);
  });

  it.each([
    ["now+5min+1ms", AHORA + FUTURO_MARGEN_MS + 1],
    ["NaN", Number.NaN],
    ["+Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
    ["negativa", -1],
  ])("rechaza fecha %s con VALIDATION_ERROR en fecha", async (_nombre, fecha) => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);
    const data = await dataDeError(crear(t, prospectoId, { fecha }));
    expect(data).toMatchObject({ code: "VALIDATION_ERROR", field: "fecha" });
    expect(await t.run((ctx) => ctx.db.query("interacciones").collect())).toEqual([]);
  });

  it("queOcurrio vacío → VALIDATION_ERROR sin escrituras", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);
    const data = await dataDeError(crear(t, prospectoId, { queOcurrio: "   " }));
    expect(data).toMatchObject({ code: "VALIDATION_ERROR", field: "queOcurrio" });
    expect(await t.run((ctx) => ctx.db.query("interacciones").collect())).toEqual([]);
  });
});

describe("interacciones.crear · tope de los campos libres (JOS-24)", () => {
  // Cierra el círculo del presupuesto de lectura del Resumen: ese test acota el peor
  // caso ADMISIBLE, y "admisible" tiene que imponerlo el servidor, no la buena
  // voluntad del cliente. Sin estos topes no existe un peor caso que medir.
  const LARGO = "x".repeat(LONGITUD_MAX_TEXTO_INTERACCION + 1);
  const TOPE = "x".repeat(LONGITUD_MAX_TEXTO_INTERACCION);

  it("queOcurrio por encima del tope → VALIDATION_ERROR sin escrituras", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);
    const data = await dataDeError(crear(t, prospectoId, { queOcurrio: LARGO }));
    expect(data).toMatchObject({ code: "VALIDATION_ERROR", field: "queOcurrio" });
    expect(await t.run((ctx) => ctx.db.query("interacciones").collect())).toEqual([]);
  });

  it("siguientePasoAcordado por encima del tope → VALIDATION_ERROR sin escrituras", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);
    const data = await dataDeError(crear(t, prospectoId, { siguientePasoAcordado: LARGO }));
    expect(data).toMatchObject({ code: "VALIDATION_ERROR", field: "siguientePasoAcordado" });
    expect(await t.run((ctx) => ctx.db.query("interacciones").collect())).toEqual([]);
  });

  it("justo en el tope entra, y el trim se aplica ANTES de medir", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);

    // Con espacios alrededor supera el tope en bruto; tras el trim cabe justo.
    const r = await crear(t, prospectoId, {
      queOcurrio: `   ${TOPE}   `,
      siguientePasoAcordado: `  ${TOPE}  `,
    });

    expect(r.interaccion.queOcurrio).toHaveLength(LONGITUD_MAX_TEXTO_INTERACCION);
    expect(r.interaccion.siguientePasoAcordado).toHaveLength(LONGITUD_MAX_TEXTO_INTERACCION);
  });
});

describe("interacciones · tenant y NOT_FOUND", () => {
  it("prospecto ajeno e inexistente producen el mismo data", async () => {
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
    const mioId = await conProspecto(t);
    await t.run((ctx) => ctx.db.delete(mioId));
    const dataAjeno = await dataDeError(crear(t, ajenoId));
    const dataInexistente = await dataDeError(crear(t, mioId));
    expect(dataAjeno).toEqual({ code: "NOT_FOUND", message: "Prospecto no encontrado" });
    expect(dataInexistente).toEqual(dataAjeno);
    expect(await t.run((ctx) => ctx.db.query("interacciones").collect())).toEqual([]);
  });
});

describe("interacciones.listarPorProspecto", () => {
  it("orden fecha descendente y paginación por cursor", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);
    for (const dias of [5, 2, 8]) {
      await crear(t, prospectoId, { fecha: AHORA - dias * DIA, queOcurrio: `hace ${dias}d` });
    }
    const pag1 = await t.query(api.interacciones.listarPorProspecto, {
      prospectoId,
      paginationOpts: { numItems: 2, cursor: null },
    } as never);
    expect(pag1.page.map((i: { queOcurrio: string }) => i.queOcurrio)).toEqual(["hace 2d", "hace 5d"]);
    expect(pag1.isDone).toBe(false);
    const pag2 = await t.query(api.interacciones.listarPorProspecto, {
      prospectoId,
      paginationOpts: { numItems: 2, cursor: pag1.continueCursor },
    } as never);
    expect(pag2.page.map((i: { queOcurrio: string }) => i.queOcurrio)).toEqual(["hace 8d"]);
    expect(pag2.isDone).toBe(true);
  });

  it("proyección pública sin usuarioId/_id/_creationTime", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);
    await crear(t, prospectoId, { siguientePasoAcordado: "seguir" });
    const r = await t.query(api.interacciones.listarPorProspecto, { prospectoId, paginationOpts: PAGINA } as never);
    expect(Object.keys(r.page[0]).sort()).toEqual(
      ["fecha", "id", "prospectoId", "queOcurrio", "resultado", "siguientePasoAcordado", "tipo"].sort(),
    );
  });

  it("prospecto ajeno → NOT_FOUND (no revela el historial)", async () => {
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
      t.query(api.interacciones.listarPorProspecto, { prospectoId: ajenoId, paginationOpts: PAGINA } as never),
    );
    expect(data).toEqual({ code: "NOT_FOUND", message: "Prospecto no encontrado" });
  });

  it("numItems inválido → VALIDATION_ERROR", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);
    const data = await dataDeError(
      t.query(api.interacciones.listarPorProspecto, { prospectoId, paginationOpts: { numItems: 101, cursor: null } } as never),
    );
    expect(data).toMatchObject({ code: "VALIDATION_ERROR", field: "numItems" });
  });
});

/**
 * Aislamiento entre dos sesiones reales sobre la MISMA base (JOS-66, tarea 8):
 * el historial es tan sensible como la ficha, y el prospecto ajeno se comprueba
 * antes de leer o escribir nada.
 */
describe("aislamiento multi-tenant · dos sesiones", () => {
  it("sin identidad, ni se registra ni se lista", async () => {
    const sinSesion = convexTest(schema, modules);
    const prospectoId = await sinSesion.run((ctx) =>
      ctx.db.insert("prospectos", {
        usuarioId: TENANT_A,
        nombre: "Base",
        comoSeConocio: "Test",
        canalContactoPreferido: "phone",
        etapaActual: "contacted",
        fechaAlta: AHORA - 10 * DIA,
      }),
    );
    const alCrear = await dataDeError(
      sinSesion.mutation(api.interacciones.crear, { prospectoId, fecha: AHORA, ...INTERACCION } as never),
    );
    const alListar = await dataDeError(
      sinSesion.query(api.interacciones.listarPorProspecto, { prospectoId, paginationOpts: PAGINA } as never),
    );
    expect(alCrear).toEqual({ code: "UNAUTHENTICATED", message: "Se requiere sesión" });
    expect(alListar).toEqual(alCrear);
    expect(await sinSesion.run((ctx) => ctx.db.query("interacciones").collect())).toEqual([]);
  });

  it("B no puede registrar una interacción sobre un prospecto de A", async () => {
    const { a, b, base } = dosTenants();
    const prospectoId = await conProspecto(a);
    await crear(a, prospectoId, { queOcurrio: "Contacto legítimo de A" });

    const data = await dataDeError(crear(b, prospectoId, { queOcurrio: "Intruso" }));
    expect(data).toEqual({ code: "NOT_FOUND", message: "Prospecto no encontrado" });

    const filas = await base.run((ctx) => ctx.db.query("interacciones").collect());
    expect(filas.map((f) => f.queOcurrio)).toEqual(["Contacto legítimo de A"]);
    expect(filas.every((f) => f.usuarioId === TENANT_A)).toBe(true);
  });

  it("B no ve el historial de A ni con el id del prospecto en la mano", async () => {
    const { a, b } = dosTenants();
    const prospectoId = await conProspecto(a);
    await crear(a, prospectoId);

    const data = await dataDeError(
      b.query(api.interacciones.listarPorProspecto, { prospectoId, paginationOpts: PAGINA } as never),
    );
    expect(data).toEqual({ code: "NOT_FOUND", message: "Prospecto no encontrado" });
  });
});

describe("transaccionalidad (rollback)", () => {
  it("un fallo POSTERIOR al insert no deja ninguna escritura", async () => {
    const t = nuevoTest();
    const prospectoId = await conProspecto(t);
    await expect(
      t.run(async (ctx) => {
        await ctx.db.insert("interacciones", {
          usuarioId: TENANT_A,
          prospectoId,
          fecha: AHORA,
          tipo: "call",
          resultado: "interested",
          queOcurrio: "se insertó y luego falló",
        });
        await ctx.db.patch(prospectoId, { fechaUltimoContacto: AHORA });
        throw new Error("fallo simulado tras escribir");
      }),
    ).rejects.toThrow("fallo simulado tras escribir");

    expect(await t.run((ctx) => ctx.db.query("interacciones").collect())).toEqual([]);
    const prospecto = await t.run((ctx) => ctx.db.get(prospectoId));
    expect(prospecto).not.toHaveProperty("fechaUltimoContacto");
  });
});
