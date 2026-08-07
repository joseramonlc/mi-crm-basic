// @vitest-environment edge-runtime
import { convexTest, type TestConvex } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { MAX_RESUMEN_INTERACCIONES, MAX_RESUMEN_PROSPECTOS } from "./lib/constants";
import {
  LONGITUD_MAX_COMO_SE_CONOCIO,
  LONGITUD_MAX_EMAIL,
  LONGITUD_MAX_NOMBRE,
  LONGITUD_MAX_NOTAS,
  LONGITUD_MAX_TELEFONO,
  LONGITUD_MAX_TEXTO_INTERACCION,
} from "./lib/validacion";
import { APP_TZ, ventanaDia } from "./lib/fecha";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.{js,ts}", "!./**/*.test.ts", "!./**/*.d.ts"]);

const TENANT_A = "https://test.clerk|user_a";
const TENANT_B = "https://test.clerk|user_b";
const IDENT_A = { subject: "user_a", issuer: "https://test.clerk", tokenIdentifier: TENANT_A };
const IDENT_B = { subject: "user_b", issuer: "https://test.clerk", tokenIdentifier: TENANT_B };

const DAY_KEY = "2026-07-12";
const { hoyInicio, mananaInicio } = ventanaDia(DAY_KEY, APP_TZ);
const MINUTO = 60_000;
const DIA = 24 * 60 * MINUTO;

type Etapa = Doc<"prospectos">["etapaActual"];

type NuevoProspecto = {
  nombre?: string;
  usuarioId?: string;
  etapaActual?: Etapa;
  fechaAlta?: number;
  fechaProximoSeguimiento?: number;
};

function nuevoTest(): TestConvex<typeof schema> {
  return convexTest(schema, modules);
}

async function insertarProspectos(t: TestConvex<typeof schema>, docs: NuevoProspecto[]) {
  await t.run(async (ctx) => {
    for (const [i, d] of docs.entries()) {
      await ctx.db.insert("prospectos", {
        usuarioId: d.usuarioId ?? TENANT_A,
        nombre: d.nombre ?? `Prospecto ${i}`,
        comoSeConocio: "Test",
        canalContactoPreferido: "phone",
        etapaActual: d.etapaActual ?? "contacted",
        // Por defecto fuera de cualquier ventana del período, para que los tests
        // de "nuevos" solo cuenten lo que declaran explícitamente.
        fechaAlta: d.fechaAlta ?? hoyInicio - 365 * DIA,
        ...(d.fechaProximoSeguimiento !== undefined
          ? { fechaProximoSeguimiento: d.fechaProximoSeguimiento }
          : {}),
      });
    }
  });
}

/** Crea un prospecto contenedor y le cuelga interacciones en las fechas dadas. */
async function insertarInteracciones(t: TestConvex<typeof schema>, fechas: number[], usuarioId = TENANT_A) {
  await t.run(async (ctx) => {
    const prospectoId: Id<"prospectos"> = await ctx.db.insert("prospectos", {
      usuarioId,
      nombre: "Contenedor",
      comoSeConocio: "Test",
      canalContactoPreferido: "phone",
      etapaActual: "contacted",
      fechaAlta: hoyInicio - 365 * DIA,
    });
    for (const fecha of fechas) {
      await ctx.db.insert("interacciones", {
        usuarioId,
        prospectoId,
        fecha,
        tipo: "call",
        queOcurrio: "Llamada de prueba",
        resultado: "interested",
      });
    }
  });
}

function resumen(t: TestConvex<typeof schema>, periodo: "semana" | "mes" = "mes", dayKey = DAY_KEY) {
  return t.withIdentity(IDENT_A).query(api.resumen.resumen, { dayKey, periodo });
}

/** N fechas dentro de un mismo día civil, separadas por minutos. */
function nEnElDia(inicioDelDia: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => inicioDelDia + i * MINUTO);
}

beforeEach(() => {
  process.env.APP_ENV = "development";
});

describe("resumen · recuentos de prospectos", () => {
  it("cuenta por etapa, incluidas las etapas vacías", async () => {
    const t = nuevoTest();
    await insertarProspectos(t, [
      { etapaActual: "new" },
      { etapaActual: "new" },
      { etapaActual: "contacted" },
      { etapaActual: "joined" },
      { etapaActual: "discarded" },
    ]);

    const r = await resumen(t);

    expect(r.prospectos.porEtapa).toEqual({
      new: 2,
      contacted: 1,
      presented: 0,
      evaluating: 0,
      joined: 1,
      discarded: 1,
    });
    expect(r.prospectos.exacto).toBe(true);
  });

  it("los totales excluyen descartados de activos", async () => {
    const t = nuevoTest();
    await insertarProspectos(t, [
      { etapaActual: "new" },
      { etapaActual: "presented" },
      { etapaActual: "joined" },
      { etapaActual: "discarded" },
      { etapaActual: "discarded" },
    ]);

    const r = await resumen(t);

    expect(r.prospectos.totales).toEqual({ activos: 3, incorporados: 1, descartados: 2 });
  });
});

describe("resumen · seguimientos pendientes", () => {
  it("separa vencidos y hoy en la frontera exacta de medianoche", async () => {
    const t = nuevoTest();
    await insertarProspectos(t, [
      { nombre: "Ayer 23:59", fechaProximoSeguimiento: hoyInicio - MINUTO },
      { nombre: "Hoy 00:00", fechaProximoSeguimiento: hoyInicio },
      { nombre: "Hoy 23:59", fechaProximoSeguimiento: mananaInicio - MINUTO },
      { nombre: "Mañana 00:00", fechaProximoSeguimiento: mananaInicio },
    ]);

    const r = await resumen(t);

    expect(r.prospectos.pendientes).toEqual({ vencidos: 1, hoy: 2 });
  });

  it("un prospecto sin fecha de próximo seguimiento no cuenta en ningún grupo", async () => {
    const t = nuevoTest();
    await insertarProspectos(t, [{ etapaActual: "joined" }, { etapaActual: "discarded" }]);

    const r = await resumen(t);

    expect(r.prospectos.pendientes).toEqual({ vencidos: 0, hoy: 0 });
  });

  it("no cambian al cambiar de período: dependen del día, no del rango", async () => {
    const t = nuevoTest();
    await insertarProspectos(t, [
      { fechaProximoSeguimiento: hoyInicio - 10 * DIA },
      { fechaProximoSeguimiento: hoyInicio },
    ]);

    const semana = await resumen(t, "semana");
    const mes = await resumen(t, "mes");

    expect(semana.prospectos.pendientes).toEqual({ vencidos: 1, hoy: 1 });
    expect(mes.prospectos.pendientes).toEqual(semana.prospectos.pendientes);
  });
});

describe("resumen · contrato del período y serie", () => {
  it("semana abarca 7 días y mes 30, ambos terminando en el día visible", async () => {
    const t = nuevoTest();

    const semana = await resumen(t, "semana");
    expect(semana.periodo).toEqual({ desde: "2026-07-06", hastaIncluido: DAY_KEY });
    expect(semana.interacciones.serie).toHaveLength(7);

    const mes = await resumen(t, "mes");
    expect(mes.periodo).toEqual({ desde: "2026-06-13", hastaIncluido: DAY_KEY });
    expect(mes.interacciones.serie).toHaveLength(30);
  });

  it("la frontera es semiabierta: entra el primer instante del rango, no el posterior al último", async () => {
    const t = nuevoTest();
    const { hoyInicio: desdeMs } = ventanaDia("2026-07-06", APP_TZ);
    await insertarInteracciones(t, [
      desdeMs, // primer instante del rango → dentro
      desdeMs - MINUTO, // justo antes → fuera
      mananaInicio - MINUTO, // 23:59 del día visible → dentro
      mananaInicio, // frontera exclusiva → fuera
    ]);

    const r = await resumen(t, "semana");

    expect(r.interacciones.totalEnPeriodo).toBe(2);
    expect(r.interacciones.serie[0]).toEqual({ dayKey: "2026-07-06", valor: 1 });
    expect(r.interacciones.serie[6]).toEqual({ dayKey: DAY_KEY, valor: 1 });
  });

  it("los días sin actividad aparecen con valor 0, no ausentes", async () => {
    const t = nuevoTest();
    await insertarInteracciones(t, [hoyInicio + 60 * MINUTO]);

    const r = await resumen(t, "semana");

    expect(r.interacciones.serie).toHaveLength(7);
    expect(r.interacciones.serie.filter((d) => d.valor === 0)).toHaveLength(6);
    expect(r.interacciones.serie.at(-1)).toEqual({ dayKey: DAY_KEY, valor: 1 });
  });

  it("la ventana móvil es correcta a través de un cambio de hora", async () => {
    // 2026-03-29: cambio a horario de verano en Europe/Madrid. La ventana se
    // calcula en dominio civil (addCivilDays), no sumando 24 h fijas.
    const t = nuevoTest();
    const DIA_DST = "2026-03-31";
    const { hoyInicio: inicioPrimerDia } = ventanaDia("2026-03-25", APP_TZ);
    await insertarInteracciones(t, [inicioPrimerDia]);

    const r = await t.withIdentity(IDENT_A).query(api.resumen.resumen, { dayKey: DIA_DST, periodo: "semana" });

    expect(r.periodo).toEqual({ desde: "2026-03-25", hastaIncluido: DIA_DST });
    expect(r.interacciones.serie).toHaveLength(7);
    expect(r.interacciones.serie[0]).toEqual({ dayKey: "2026-03-25", valor: 1 });
    expect(r.interacciones.totalEnPeriodo).toBe(1);
  });

  it("nuevosEnPeriodo cuenta por fechaAlta dentro de la ventana", async () => {
    const t = nuevoTest();
    await insertarProspectos(t, [
      { fechaAlta: hoyInicio },
      { fechaAlta: hoyInicio - 6 * DIA },
      { fechaAlta: hoyInicio - 7 * DIA }, // fuera de la semana, dentro del mes
    ]);

    expect((await resumen(t, "semana")).prospectos.nuevosEnPeriodo).toBe(2);
    expect((await resumen(t, "mes")).prospectos.nuevosEnPeriodo).toBe(3);
  });
});

describe("resumen · frontera de la cota de prospectos", () => {
  it(`${MAX_RESUMEN_PROSPECTOS} prospectos: exacto`, async () => {
    const t = nuevoTest();
    await insertarProspectos(t, Array.from({ length: MAX_RESUMEN_PROSPECTOS }, () => ({})));

    const r = await resumen(t);

    expect(r.prospectos.exacto).toBe(true);
    expect(r.prospectos.porEtapa.contacted).toBe(MAX_RESUMEN_PROSPECTOS);
    expect(r.prospectos.totales.activos).toBe(MAX_RESUMEN_PROSPECTOS);
  });

  it(`${MAX_RESUMEN_PROSPECTOS + 1} prospectos: parcial`, async () => {
    const t = nuevoTest();
    await insertarProspectos(t, Array.from({ length: MAX_RESUMEN_PROSPECTOS + 1 }, () => ({})));

    const r = await resumen(t);

    expect(r.prospectos.exacto).toBe(false);
    expect(r.prospectos.porEtapa.contacted).toBe(MAX_RESUMEN_PROSPECTOS);
  });

  it("200 en cada una de las 6 etapas suma justo la cota y sigue siendo exacto", async () => {
    const t = nuevoTest();
    const etapas: Etapa[] = ["new", "contacted", "presented", "evaluating", "joined", "discarded"];
    await insertarProspectos(
      t,
      etapas.flatMap((etapaActual) => Array.from({ length: 200 }, () => ({ etapaActual }))),
    );

    const r = await resumen(t);

    expect(r.prospectos.exacto).toBe(true);
    for (const etapa of etapas) expect(r.prospectos.porEtapa[etapa]).toBe(200);
    expect(r.prospectos.totales).toEqual({ activos: 1000, incorporados: 200, descartados: 200 });
  });

  it("201 en una etapa + 200 en las otras cinco (=1.201) es parcial", async () => {
    const t = nuevoTest();
    const resto: Etapa[] = ["contacted", "presented", "evaluating", "joined", "discarded"];
    await insertarProspectos(t, [
      ...Array.from({ length: 201 }, () => ({ etapaActual: "new" as Etapa })),
      ...resto.flatMap((etapaActual) => Array.from({ length: 200 }, () => ({ etapaActual }))),
    ]);

    const r = await resumen(t);

    expect(r.prospectos.exacto).toBe(false);
  });

  it("201 en una etapa con el resto vacío es EXACTO y reporta 201 (divergencia esperada con el Pipeline)", async () => {
    // El Pipeline acota POR ETAPA (MAX_PIPELINE=200) y mostraría "200+"; el Resumen
    // acota POR TOTAL y aquí es exacto. "200+" y "201" no se contradicen: el Resumen
    // es más preciso. Se fija en un test para que no se lea después como un bug.
    const t = nuevoTest();
    await insertarProspectos(t, Array.from({ length: 201 }, () => ({ etapaActual: "new" as Etapa })));

    const r = await resumen(t);

    expect(r.prospectos.exacto).toBe(true);
    expect(r.prospectos.porEtapa.new).toBe(201);
  });
});

describe("resumen · truncamiento de interacciones y diaCompletoDesde", () => {
  it("sin truncar: exacto y sin marca de día", async () => {
    const t = nuevoTest();
    await insertarInteracciones(t, nEnElDia(hoyInicio, 5));

    const r = await resumen(t, "mes");

    expect(r.interacciones.exacto).toBe(true);
    expect(r.interacciones.diaCompletoDesde).toBeNull();
    expect(r.interacciones.totalEnPeriodo).toBe(5);
  });

  it("centinela de OTRO día: el día más antiguo retenido está completo", async () => {
    // La cota se llena con el día visible; el centinela cae en el día anterior, así
    // que el día visible está íntegro. La rev. 2 del plan lo marcaba mal como parcial.
    const t = nuevoTest();
    await insertarInteracciones(t, [
      ...nEnElDia(hoyInicio, MAX_RESUMEN_INTERACCIONES),
      hoyInicio - DIA + 60 * MINUTO,
    ]);

    const r = await resumen(t, "mes");

    expect(r.interacciones.exacto).toBe(false);
    expect(r.interacciones.diaCompletoDesde).toBe(DAY_KEY);
    expect(r.interacciones.totalEnPeriodo).toBe(MAX_RESUMEN_INTERACCIONES);
  });

  it("centinela del MISMO día: el primer día fiable es el siguiente", async () => {
    const t = nuevoTest();
    const inicioAyer = hoyInicio - DIA;
    await insertarInteracciones(t, nEnElDia(inicioAyer, MAX_RESUMEN_INTERACCIONES + 2));

    const r = await resumen(t, "mes");

    expect(r.interacciones.exacto).toBe(false);
    expect(r.interacciones.diaCompletoDesde).toBe(DAY_KEY);
  });

  it("si ningún día del rango queda completo: exacto=false y diaCompletoDesde=null", async () => {
    // Todo el corte cae dentro del ÚLTIMO día del período: el día siguiente ya está
    // fuera del rango, así que no hay ningún día íntegramente medido.
    const t = nuevoTest();
    await insertarInteracciones(t, nEnElDia(hoyInicio, MAX_RESUMEN_INTERACCIONES + 2));

    const r = await resumen(t, "mes");

    expect(r.interacciones.exacto).toBe(false);
    expect(r.interacciones.diaCompletoDesde).toBeNull();
  });

  it("al truncar se pierden los días ANTIGUOS, nunca los recientes", async () => {
    const t = nuevoTest();
    const inicioAntiguo = hoyInicio - 10 * DIA;
    await insertarInteracciones(t, [
      ...nEnElDia(inicioAntiguo, MAX_RESUMEN_INTERACCIONES),
      ...nEnElDia(hoyInicio, 3),
    ]);

    const r = await resumen(t, "mes");

    expect(r.interacciones.exacto).toBe(false);
    // Los 3 del día visible sobreviven; el recorte se lo lleva el día antiguo.
    expect(r.interacciones.serie.at(-1)).toEqual({ dayKey: DAY_KEY, valor: 3 });
  });
});

describe("resumen · sesión y aislamiento multi-tenant", () => {
  it("sin identidad aborta", async () => {
    const t = nuevoTest();
    await insertarProspectos(t, [{}]);

    await expect(t.query(api.resumen.resumen, { dayKey: DAY_KEY, periodo: "mes" })).rejects.toThrow();
  });

  it("no cuenta prospectos ni interacciones de otro tenant", async () => {
    const t = nuevoTest();
    await insertarProspectos(t, [
      { etapaActual: "new", fechaAlta: hoyInicio, fechaProximoSeguimiento: hoyInicio },
      { usuarioId: TENANT_B, etapaActual: "new", fechaAlta: hoyInicio, fechaProximoSeguimiento: hoyInicio },
      { usuarioId: TENANT_B, etapaActual: "joined", fechaAlta: hoyInicio },
    ]);
    await insertarInteracciones(t, [hoyInicio + MINUTO]);
    await insertarInteracciones(t, [hoyInicio + MINUTO, hoyInicio + 2 * MINUTO], TENANT_B);

    const a = await resumen(t, "mes");

    expect(a.prospectos.porEtapa.new).toBe(1);
    expect(a.prospectos.porEtapa.joined).toBe(0);
    expect(a.prospectos.pendientes).toEqual({ vencidos: 0, hoy: 1 });
    expect(a.prospectos.nuevosEnPeriodo).toBe(1);
    expect(a.interacciones.totalEnPeriodo).toBe(1);

    // Y el contrario ve lo suyo: la separación no es "A no ve nada", es "cada uno ve lo suyo".
    const b = await t.withIdentity(IDENT_B).query(api.resumen.resumen, { dayKey: DAY_KEY, periodo: "mes" });
    expect(b.prospectos.porEtapa.new).toBe(1);
    expect(b.interacciones.totalEnPeriodo).toBe(2);
  });
});

describe("resumen · presupuesto de lectura", () => {
  it("MEDICIÓN del peor caso admisible", async () => {
    const t = nuevoTest();
    // TODOS los campos libres en su tope: es el documento más grande que las
    // mutaciones permiten crear. Medir con valores "realistas" daba el peor caso
    // realista, no el admisible — bloqueante de la 2ª auditoría del bocado A.
    const NOTAS = "x".repeat(LONGITUD_MAX_NOTAS);
    const TEXTO = "x".repeat(LONGITUD_MAX_TEXTO_INTERACCION);
    const NOMBRE = "x".repeat(LONGITUD_MAX_NOMBRE);
    const COMO = "x".repeat(LONGITUD_MAX_COMO_SE_CONOCIO);
    const TELEFONO = "9".repeat(LONGITUD_MAX_TELEFONO);
    // Email en el tope y con formato válido: 254 = 242 + "@" + "ejemplo.com".
    const EMAIL = `${"x".repeat(LONGITUD_MAX_EMAIL - "@ejemplo.com".length)}@ejemplo.com`;

    // `seguimientoManual: true` forma parte del peor caso desde JOS-67: el campo
    // es opcional, así que el documento MÁS grande que las mutaciones permiten
    // crear es el que lo lleva presente, no el que lo omite.
    //
    // `prioridad: "medium"` entra en JOS-50 con un matiz: las mutations NUNCA
    // persisten "medium" (la ausencia ES el defecto), así que el documento más
    // grande que pueden crear lleva "high" o "low", dos bytes MENOS. Se mide con
    // "medium" a propósito —la cadena más larga del enum— por dos razones: la
    // guarda queda del lado conservador, y sobrevive si algún día se decidiera
    // persistir el defecto. Si esa regla cambia, este fixture ya la contempla.
    await t.run(async (ctx) => {
      const prospectoId = await ctx.db.insert("prospectos", {
        usuarioId: TENANT_A,
        nombre: NOMBRE,
        comoSeConocio: COMO,
        canalContactoPreferido: "whatsapp",
        etapaActual: "contacted",
        telefono: TELEFONO,
        email: EMAIL,
        notas: NOTAS,
        fechaAlta: hoyInicio - 10 * DIA,
        fechaProximoSeguimiento: hoyInicio,
        seguimientoManual: true,
        prioridad: "medium",
      });
      for (let i = 1; i < MAX_RESUMEN_PROSPECTOS + 1; i++) {
        await ctx.db.insert("prospectos", {
          usuarioId: TENANT_A,
          nombre: NOMBRE,
          comoSeConocio: COMO,
          canalContactoPreferido: "whatsapp",
          etapaActual: "contacted",
          telefono: TELEFONO,
          email: EMAIL,
          notas: NOTAS,
          fechaAlta: hoyInicio - 10 * DIA,
          fechaProximoSeguimiento: hoyInicio,
          seguimientoManual: true,
          prioridad: "medium",
        });
      }
      for (let i = 0; i < MAX_RESUMEN_INTERACCIONES + 1; i++) {
        await ctx.db.insert("interacciones", {
          usuarioId: TENANT_A,
          prospectoId,
          fecha: hoyInicio - 5 * DIA + i * MINUTO,
          tipo: "call",
          queOcurrio: TEXTO,
          resultado: "interested",
          siguientePasoAcordado: TEXTO,
        });
      }
    });

    const bytes = await t.run(async (ctx) => ({
      prospecto: JSON.stringify(await ctx.db.query("prospectos").first()).length,
      interaccion: JSON.stringify(await ctx.db.query("interacciones").first()).length,
    }));

    const docsProspectos = MAX_RESUMEN_PROSPECTOS + 1;
    const docsInteracciones = MAX_RESUMEN_INTERACCIONES + 1;
    const totalDocs = docsProspectos + docsInteracciones;
    const totalBytes = docsProspectos * bytes.prospecto + docsInteracciones * bytes.interaccion;

    // Límites por query de Convex: 32.000 documentos escaneados y 16 MiB leídos
    // (docs.convex.dev/production/state/limits).
    //
    // DOCUMENTOS: holgadísimo, mismo margen 4× que el test del Pipeline.
    expect(totalDocs).toBeLessThan(32_000 / 4);

    // BYTES: el Resumen es la primera pantalla que lee DOS tablas en la misma query,
    // y ambas suman contra el mismo límite.
    //
    // Medición 2026-08-07 (JOS-50), con TODOS los campos libres en su tope,
    // `seguimientoManual` presente y `prioridad` presente:
    //   prospectos    1.201 × 2.832 B = 3.401.232 B
    //   interacciones   501 × 4.265 B = 2.136.765 B
    //   total = 5.537.997 B = 33,0 % del límite → margen 3,03×
    //
    // Medición anterior (2026-08-06, JOS-67): 2.811 B/prospecto, total 5.512.776 B
    // = 32,9 %. El campo de prioridad cuesta +21 B por documento, que es
    // exactamente lo que ocupa `,"prioridad":"medium"` en la serialización.
    //
    // Medición anterior (2026-08-03, antes de JOS-67): 2.786 B/prospecto, total
    // 5.485.256 B = 32,7 %. El campo booleano nuevo cuesta +25 B por documento, que
    // es exactamente lo que ocupa `,"seguimientoManual":true` en la serialización.
    //
    // Y antes de eso, la primera medición daba 2.383 B/prospecto (29,8 %) porque se
    // hacía con valores realistas sobre un documento que aún no era finito: era el
    // peor caso REALISTA, no el ADMISIBLE. Al acotar nombre/comoSeConocio/telefono/
    // email la cifra subió, y esa subida fue señal de que la medición pasó a ser
    // exhaustiva, no de que algo empeorase.
    //
    // La guarda va a 1/3 del límite (5.592.405 B). Holgura restante: 54.408 B, un
    // 0,97 % — se estrecha otra vez (era 1,4 % tras JOS-67 y ~107 KB antes). Es
    // deliberada: cualquier campo nuevo en el documento de prospecto la rompe y
    // obliga a volver a medir, que es justo su función.
    //
    // AVISO PARA EL PRÓXIMO CAMPO: a ~21 B por campo escalar (25.221 B sobre los
    // 1.201 documentos) caben DOS más, no tres. El tercero no entra. A partir de
    // ahí no hay ajuste fino posible: habrá que rebajar MAX_RESUMEN_INTERACCIONES
    // —cada interacción cuesta 4.265 B, así que bajar de 500 a 450 libera ~213 KB—
    // o repensar qué lee el Resumen. Conviene decidirlo ANTES de planificar el
    // campo, no al ver el test en rojo.
    //
    // Rompe también si se sube cualquiera de las SIETE constantes implicadas: las dos
    // cotas de lectura y los cinco topes de texto.
    expect(totalBytes).toBeLessThan((16 * 1024 * 1024) / 3);

    // Y el peor caso es alcanzable de verdad: ambas lecturas truncan a la vez.
    const r = await resumen(t, "mes");
    expect(r.prospectos.exacto).toBe(false);
    expect(r.interacciones.exacto).toBe(false);
  });
});

describe("resumen · contrato de dayKey", () => {
  it("rechaza un dayKey con formato inválido", async () => {
    const t = nuevoTest();
    await expect(
      t.withIdentity(IDENT_A).query(api.resumen.resumen, { dayKey: "12/07/2026", periodo: "mes" }),
    ).rejects.toThrow(/dayKey inválido/);
  });

  it("rechaza una fecha con formato correcto pero irreal", async () => {
    const t = nuevoTest();
    await expect(
      t.withIdentity(IDENT_A).query(api.resumen.resumen, { dayKey: "2026-02-31", periodo: "mes" }),
    ).rejects.toThrow(/no es una fecha real/);
  });
});
