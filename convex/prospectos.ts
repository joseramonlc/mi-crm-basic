import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import type { Doc, Id } from "./_generated/dataModel";
import { MAX_ACTIVIDAD, MAX_PIPELINE } from "./lib/constants";
import { APP_TZ, diffCalendarDays, ventanaDia } from "./lib/fecha";
import { calcularFechaProximoSeguimiento, esTerminal, seguimientoTrasCambioEtapa } from "./lib/seguimiento";
import { requireUsuario } from "./lib/usuario";
import { prospectoDelUsuario } from "./lib/acceso";
import { prospectoPublicoValidator, toProspectoPublico } from "./lib/proyecciones";
import {
  LONGITUD_MAX_COMO_SE_CONOCIO,
  LONGITUD_MAX_NOMBRE,
  LONGITUD_MAX_TELEFONO,
  conLimites,
  emailOpcional,
  fechaAcordadaValidada,
  notasOpcional,
  textoObligatorioAcotado,
  textoOpcionalAcotado,
  validarNumItems,
} from "./lib/validacion";
import { validationError } from "./lib/errores";
import { prioridadAPersistir, prioridadDe, type Prioridad } from "./lib/prioridad";
import { canalContacto, etapaProspecto, prioridadProspecto } from "./schema";

export interface ProspectoActividad {
  id: Id<"prospectos">;
  nombre: string;
  etapaActual: Doc<"prospectos">["etapaActual"];
  canalContactoPreferido: Doc<"prospectos">["canalContactoPreferido"];
  prioridad: Prioridad;
  fechaUltimoContacto?: number;
  diasVencido?: number;
}

/** Antigüedad para ordenar: quien lleva más tiempo sin contacto va primero (JOS-22). */
function antiguedad(p: Doc<"prospectos">): number {
  return p.fechaUltimoContacto ?? p.fechaAlta;
}

/** Rango de orden por prioridad (JOS-54): Alta(0) → Media(1) → Baja(2), defecto resuelto. */
const RANGO_PRIORIDAD: Record<Prioridad, number> = { high: 0, medium: 1, low: 2 };
function rangoPrioridad(p: Doc<"prospectos">): number {
  return RANGO_PRIORIDAD[prioridadDe(p)];
}

/**
 * Lee hasta MAX_ACTIVIDAD+1 filas de un rango, descarta el centinela y señala
 * truncamiento. El orden (prioridad, luego antigüedad) solo se aplica DESPUÉS del
 * descarte: si no hay truncamiento se leyó el conjunto completo y el orden es
 * globalmente correcto; si lo hay, la UI presenta vista parcial (nunca como completa).
 *
 * INVARIANTE (JOS-54): el .sort() va DESPUÉS del slice A PROPÓSITO. La MEMBRESÍA la
 * decide la fecha —el índice by_usuario_seguimiento trae los más urgentes antes del
 * corte—; la prioridad SOLO reordena a los supervivientes para pintarlos. Ordenar por
 * prioridad ANTES del corte expulsaría un seguimiento más urgente por fecha para colar un
 * Alta menos urgente (lo cubre el test del invariante de truncamiento). Desempates en
 * cascada: prioridad → antigüedad → _creationTime → _id, orden total y determinista que no
 * depende de que el sort del motor sea estable.
 */
function acotar(leidos: Doc<"prospectos">[]): { filas: Doc<"prospectos">[]; truncado: boolean } {
  const truncado = leidos.length > MAX_ACTIVIDAD;
  const filas = (truncado ? leidos.slice(0, MAX_ACTIVIDAD) : leidos).sort(
    (a, b) =>
      rangoPrioridad(a) - rangoPrioridad(b) ||
      antiguedad(a) - antiguedad(b) ||
      a._creationTime - b._creationTime ||
      (a._id < b._id ? -1 : a._id > b._id ? 1 : 0),
  );
  return { filas, truncado };
}

/**
 * Datos de la pantalla de inicio (Actividad Diaria, JOS-22).
 *
 * `dayKey` existe por reactividad, no por tenancy: las queries Convex re-corren
 * al cambiar los DATOS, no el reloj, así que el cliente pasa el día visible y lo
 * renueva a medianoche. El handler es puro sobre (dayKey, datos) — sin Date.now().
 *
 * El patrón de truncamiento (take MAX+1, vista parcial declarada) es exclusivo
 * de esta pantalla; la API core pagina por cursor (rev. 4 de M2).
 */
export const actividadDiaria = query({
  args: { dayKey: v.string() },
  handler: async (ctx, { dayKey }) => {
    const usuarioId = await requireUsuario(ctx);
    const { hoyInicio, mananaInicio } = ventanaDia(dayKey, APP_TZ);

    const tieneProspectos =
      (await ctx.db
        .query("prospectos")
        .withIndex("by_usuario", (q) => q.eq("usuarioId", usuarioId))
        .first()) !== null;

    // gte(1) excluye los docs sin fechaProximoSeguimiento (ausente ordena antes que todo valor).
    const vencidosLeidos = await ctx.db
      .query("prospectos")
      .withIndex("by_usuario_seguimiento", (q) =>
        q.eq("usuarioId", usuarioId).gte("fechaProximoSeguimiento", 1).lt("fechaProximoSeguimiento", hoyInicio),
      )
      .take(MAX_ACTIVIDAD + 1);
    const vencidosAcotado = acotar(vencidosLeidos);

    const hoyLeidos = await ctx.db
      .query("prospectos")
      .withIndex("by_usuario_seguimiento", (q) =>
        q.eq("usuarioId", usuarioId).gte("fechaProximoSeguimiento", hoyInicio).lt("fechaProximoSeguimiento", mananaInicio),
      )
      .take(MAX_ACTIVIDAD + 1);
    const hoyAcotado = acotar(hoyLeidos);

    const completadosLeidos = await ctx.db
      .query("prospectos")
      .withIndex("by_usuario_ultimo_contacto", (q) =>
        q.eq("usuarioId", usuarioId).gte("fechaUltimoContacto", hoyInicio).lt("fechaUltimoContacto", mananaInicio),
      )
      .take(MAX_ACTIVIDAD + 1);
    const completados = Math.min(completadosLeidos.length, MAX_ACTIVIDAD);

    const proyectar = (p: Doc<"prospectos">, vencido: boolean): ProspectoActividad => ({
      id: p._id,
      nombre: p.nombre,
      etapaActual: p.etapaActual,
      canalContactoPreferido: p.canalContactoPreferido,
      // Resuelta aquí (ausente = media, JOS-50): la tarjeta nunca recibe undefined.
      prioridad: prioridadDe(p),
      fechaUltimoContacto: p.fechaUltimoContacto,
      ...(vencido && p.fechaProximoSeguimiento !== undefined
        ? { diasVencido: diffCalendarDays(p.fechaProximoSeguimiento, hoyInicio, APP_TZ) }
        : {}),
    });

    const pendientes = hoyAcotado.filas.length;
    return {
      dayKey,
      tieneProspectos,
      // "Completados" aproxima contactos de hoy, no seguimientos planificados
      // cumplidos. JOS-23 (acción rápida "Ya contacté") NO cambia este cálculo:
      // computarlo directamente sobre `interacciones` es JOS-77.
      ritmo: {
        completados,
        pendientes,
        total: completados + pendientes,
        completadosTruncados: completadosLeidos.length > MAX_ACTIVIDAD,
        pendientesTruncados: hoyAcotado.truncado,
        aproximado: true as const,
      },
      hoy: hoyAcotado.filas.map((p) => proyectar(p, false)),
      vencidos: vencidosAcotado.filas.map((p) => proyectar(p, true)),
      truncado: { hoy: hoyAcotado.truncado, vencidos: vencidosAcotado.truncado },
    };
  },
});

/* ── Pipeline de Prospectos (JOS-21) ──────────────────────────────────────── */

const prospectoPipelineValidator = v.object({
  id: v.id("prospectos"),
  nombre: v.string(),
  etapaActual: etapaProspecto,
  canalContactoPreferido: canalContacto,
  fechaUltimoContacto: v.optional(v.number()),
  fechaProximoSeguimiento: v.optional(v.number()),
  diasVencido: v.optional(v.number()),
});

const grupoPipelineValidator = v.object({
  prospectos: v.array(prospectoPipelineValidator),
  /** Exacto por debajo de MAX_PIPELINE; con `truncado` la UI muestra "500+". */
  total: v.number(),
  truncado: v.boolean(),
});

/**
 * Datos de la pantalla Pipeline (JOS-21): los 6 grupos por etapa ya formados.
 *
 * `dayKey` está aquí por el mismo motivo que en actividadDiaria —reactividad, no
 * tenancy— y sirve para marcar los vencidos. El handler es puro sobre
 * (dayKey, datos), sin Date.now().
 *
 * ⚠️ INVARIANTE DEL ORDEN — no introducir un `.sort()` posterior al `.take()`.
 * El orden lo da el índice by_usuario_etapa_seguimiento ANTES del corte, de modo
 * que al truncar se descartan los MENOS urgentes. Ordenar después del corte solo
 * reordena lo que el corte ya decidió y puede ocultar vencidos (bloqueante de la
 * 1ª auditoría del plan; lo cubre el test "no oculta vencidos al truncar").
 */
export const pipeline = query({
  args: { dayKey: v.string() },
  returns: v.object({
    dayKey: v.string(),
    tieneProspectos: v.boolean(),
    grupos: v.object({
      new: grupoPipelineValidator,
      contacted: grupoPipelineValidator,
      presented: grupoPipelineValidator,
      evaluating: grupoPipelineValidator,
      joined: grupoPipelineValidator,
      discarded: grupoPipelineValidator,
    }),
  }),
  handler: async (ctx, { dayKey }) => {
    const usuarioId = await requireUsuario(ctx);
    const { hoyInicio } = ventanaDia(dayKey, APP_TZ);

    const tieneProspectos =
      (await ctx.db
        .query("prospectos")
        .withIndex("by_usuario", (q) => q.eq("usuarioId", usuarioId))
        .first()) !== null;

    const proyectar = (p: Doc<"prospectos">) => {
      const proxima = p.fechaProximoSeguimiento;
      return {
        id: p._id,
        nombre: p.nombre,
        etapaActual: p.etapaActual,
        canalContactoPreferido: p.canalContactoPreferido,
        ...(p.fechaUltimoContacto !== undefined ? { fechaUltimoContacto: p.fechaUltimoContacto } : {}),
        ...(proxima !== undefined ? { fechaProximoSeguimiento: proxima } : {}),
        ...(proxima !== undefined && proxima < hoyInicio
          ? { diasVencido: diffCalendarDays(proxima, hoyInicio, APP_TZ) }
          : {}),
      };
    };

    const grupoDe = async (etapa: Doc<"prospectos">["etapaActual"]) => {
      // Con usuarioId y etapaActual fijados por igualdad, el índice ordena por
      // fechaProximoSeguimiento. Ascendente en no terminales = lo más vencido
      // primero, así el centinela se lleva a los menos urgentes. En terminales
      // nadie tiene fecha: todas empatan y decide el desempate implícito de
      // Convex (_creationTime), que en "desc" deja arriba lo más reciente.
      const leidos = await ctx.db
        .query("prospectos")
        .withIndex("by_usuario_etapa_seguimiento", (q) => q.eq("usuarioId", usuarioId).eq("etapaActual", etapa))
        .order(esTerminal(etapa) ? "desc" : "asc")
        .take(MAX_PIPELINE + 1);

      const truncado = leidos.length > MAX_PIPELINE;
      const filas = truncado ? leidos.slice(0, MAX_PIPELINE) : leidos;
      return { prospectos: filas.map(proyectar), total: filas.length, truncado };
    };

    return {
      dayKey,
      tieneProspectos,
      grupos: {
        new: await grupoDe("new"),
        contacted: await grupoDe("contacted"),
        presented: await grupoDe("presented"),
        evaluating: await grupoDe("evaluating"),
        joined: await grupoDe("joined"),
        discarded: await grupoDe("discarded"),
      },
    };
  },
});

/**
 * POST /prospectos (JOS-13/JOS-10). Etapa forzada "new" — el cliente no la
 * envía; fechaAlta automática; el motor calcula el primer seguimiento
 * (invocación 1 de JOS-12); fechaUltimoContacto empieza ausente.
 */
export const crear = mutation({
  args: {
    nombre: v.string(),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    comoSeConocio: v.string(),
    canalContactoPreferido: canalContacto,
    notas: v.optional(v.string()),
    prioridad: v.optional(prioridadProspecto),
  },
  returns: prospectoPublicoValidator,
  handler: async (ctx, args) => {
    const usuarioId = await requireUsuario(ctx);
    const nombre = textoObligatorioAcotado(args.nombre, "nombre", LONGITUD_MAX_NOMBRE);
    const comoSeConocio = textoObligatorioAcotado(args.comoSeConocio, "comoSeConocio", LONGITUD_MAX_COMO_SE_CONOCIO);
    const telefono = textoOpcionalAcotado(args.telefono, "telefono", LONGITUD_MAX_TELEFONO);
    const email = emailOpcional(args.email);
    const notas = notasOpcional(args.notas);

    // JOS-50: "medium" NO se guarda — la ausencia ES el defecto.
    const prioridad = prioridadAPersistir(args.prioridad);

    const fechaAlta = Date.now();
    const fechaProximoSeguimiento = calcularFechaProximoSeguimiento("new", fechaAlta);
    const id = await ctx.db.insert("prospectos", {
      usuarioId,
      nombre,
      comoSeConocio,
      canalContactoPreferido: args.canalContactoPreferido,
      etapaActual: "new",
      fechaAlta,
      ...(telefono !== undefined ? { telefono } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(notas !== undefined ? { notas } : {}),
      ...(fechaProximoSeguimiento !== undefined ? { fechaProximoSeguimiento } : {}),
      ...(prioridad !== undefined ? { prioridad } : {}),
    });
    return toProspectoPublico((await ctx.db.get(id))!);
  },
});

/**
 * GET /prospectos (JOS-13), con filtro opcional por etapa. Paginación por
 * cursor con topes de lectura del servidor; orden _creationTime descendente
 * dentro del tenant (el índice fija el prefijo; "desc" invierte el resto).
 */
export const listar = query({
  args: { etapa: v.optional(etapaProspecto), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(prospectoPublicoValidator),
  handler: async (ctx, { etapa, paginationOpts }) => {
    const usuarioId = await requireUsuario(ctx);
    validarNumItems(paginationOpts.numItems);
    const consulta =
      etapa !== undefined
        ? ctx.db
            .query("prospectos")
            .withIndex("by_usuario_etapa", (q) => q.eq("usuarioId", usuarioId).eq("etapaActual", etapa))
        : ctx.db.query("prospectos").withIndex("by_usuario", (q) => q.eq("usuarioId", usuarioId));
    const resultado = await consulta.order("desc").paginate(conLimites(paginationOpts));
    return { ...resultado, page: resultado.page.map(toProspectoPublico) };
  },
});

/** GET /prospectos/:id (JOS-13). NOT_FOUND opaco para inexistente o ajeno. */
export const obtener = query({
  args: { id: v.id("prospectos") },
  returns: prospectoPublicoValidator,
  handler: async (ctx, { id }) => {
    const usuarioId = await requireUsuario(ctx);
    return toProspectoPublico(await prospectoDelUsuario(ctx, id, usuarioId));
  },
});

/**
 * PATCH /prospectos/:id (JOS-13). Datos de contacto, notas y —desde JOS-50—
 * prioridad; etapaActual y las tres fechas siguen siendo de solo lectura aquí.
 * En los opcionales, cadena vacía (o solo espacios) elimina el campo — patch con
 * `undefined` lo borra.
 *
 * La prioridad aprovecha esa misma mecánica: pedir "medium" no escribe "medium",
 * escribe `undefined` y con ello ELIMINA el campo, que es como se representa el
 * defecto (JOS-50). No es un caso especial del patch, es el patch de siempre.
 */
export const actualizar = mutation({
  args: {
    id: v.id("prospectos"),
    nombre: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    comoSeConocio: v.optional(v.string()),
    canalContactoPreferido: v.optional(canalContacto),
    notas: v.optional(v.string()),
    prioridad: v.optional(prioridadProspecto),
  },
  returns: prospectoPublicoValidator,
  handler: async (ctx, args) => {
    const usuarioId = await requireUsuario(ctx);
    const doc = await prospectoDelUsuario(ctx, args.id, usuarioId);

    const patch: Partial<Doc<"prospectos">> = {};
    if (args.nombre !== undefined) patch.nombre = textoObligatorioAcotado(args.nombre, "nombre", LONGITUD_MAX_NOMBRE);
    if (args.comoSeConocio !== undefined)
      patch.comoSeConocio = textoObligatorioAcotado(args.comoSeConocio, "comoSeConocio", LONGITUD_MAX_COMO_SE_CONOCIO);
    if (args.canalContactoPreferido !== undefined) patch.canalContactoPreferido = args.canalContactoPreferido;
    if (args.telefono !== undefined)
      patch.telefono = textoOpcionalAcotado(args.telefono, "telefono", LONGITUD_MAX_TELEFONO);
    if (args.email !== undefined) patch.email = emailOpcional(args.email);
    if (args.notas !== undefined) patch.notas = notasOpcional(args.notas);
    if (args.prioridad !== undefined) patch.prioridad = prioridadAPersistir(args.prioridad);

    await ctx.db.patch(doc._id, patch);
    return toProspectoPublico((await ctx.db.get(doc._id))!);
  },
});

/**
 * PATCH /prospectos/:id/etapa (JOS-13). Recalcula el seguimiento con la nueva
 * etapa y la referencia fechaUltimoContacto ?? fechaAlta (caso 4 de JOS-8,
 * invocación 3 de JOS-12). NO toca fechaUltimoContacto.
 *
 * Desde JOS-67 la decisión completa (terminal / acuerdo activo / motor) vive en
 * `seguimientoTrasCambioEtapa`; aquí solo se aplica su patch. En etapas
 * terminales devuelve `undefined` en ambos campos y el patch los elimina.
 */
export const cambiarEtapa = mutation({
  args: { id: v.id("prospectos"), etapa: etapaProspecto },
  returns: prospectoPublicoValidator,
  handler: async (ctx, { id, etapa }) => {
    const usuarioId = await requireUsuario(ctx);
    const doc = await prospectoDelUsuario(ctx, id, usuarioId);
    const referencia = doc.fechaUltimoContacto ?? doc.fechaAlta;
    await ctx.db.patch(doc._id, {
      etapaActual: etapa,
      ...seguimientoTrasCambioEtapa(etapa, referencia, doc),
    });
    return toProspectoPublico((await ctx.db.get(doc._id))!);
  },
});

/**
 * PATCH /prospectos/:id/seguimiento — FIJAR una cita acordada (JOS-67).
 *
 * Escribe la fecha en `fechaProximoSeguimiento` (el MISMO campo que usa el
 * motor) y marca `seguimientoManual`. Así ninguna pantalla de lectura cambia:
 * Actividad Diaria, Pipeline y Resumen siguen consultando por rango sobre
 * `by_usuario_seguimiento` sin saber quién puso la fecha.
 *
 * Se rechaza en etapas terminales: allí el contrato de JOS-8 es "sin
 * seguimiento", y aceptar una fecha devolvería a la Actividad Diaria un
 * prospecto ya incorporado o descartado. La comprobación va ANTES de validar la
 * fecha para que el error hable del problema de verdad.
 */
export const fijarSeguimientoAcordado = mutation({
  args: { id: v.id("prospectos"), fecha: v.number() },
  returns: prospectoPublicoValidator,
  handler: async (ctx, { id, fecha }) => {
    const usuarioId = await requireUsuario(ctx);
    const doc = await prospectoDelUsuario(ctx, id, usuarioId);
    if (esTerminal(doc.etapaActual)) {
      throw validationError(
        "No se puede fijar un contacto acordado en una etapa terminal",
        "etapaActual",
      );
    }
    await ctx.db.patch(doc._id, {
      fechaProximoSeguimiento: fechaAcordadaValidada(fecha, Date.now()),
      seguimientoManual: true,
    });
    return toProspectoPublico((await ctx.db.get(doc._id))!);
  },
});

/**
 * PATCH /prospectos/:id/seguimiento — QUITAR la cita acordada (JOS-67).
 *
 * No basta con borrar el booleano: hay que RECALCULAR con el motor y escribir el
 * resultado. Si solo se limpiase la marca, la fecha fijada a mano seguiría ahí
 * disfrazada de automática, y el usuario creería haber vuelto al cálculo del
 * motor sin haberlo hecho.
 *
 * Misma referencia que el resto del motor: fechaUltimoContacto ?? fechaAlta
 * (caso 4 de JOS-8). En etapa terminal el motor devuelve `undefined` y la fecha
 * queda ausente. Idempotente: sobre un prospecto sin acuerdo solo reafirma la
 * fecha que el motor ya habría calculado.
 */
export const quitarSeguimientoAcordado = mutation({
  args: { id: v.id("prospectos") },
  returns: prospectoPublicoValidator,
  handler: async (ctx, { id }) => {
    const usuarioId = await requireUsuario(ctx);
    const doc = await prospectoDelUsuario(ctx, id, usuarioId);
    const referencia = doc.fechaUltimoContacto ?? doc.fechaAlta;
    await ctx.db.patch(doc._id, {
      fechaProximoSeguimiento: calcularFechaProximoSeguimiento(doc.etapaActual, referencia),
      seguimientoManual: undefined,
    });
    return toProspectoPublico((await ctx.db.get(doc._id))!);
  },
});
