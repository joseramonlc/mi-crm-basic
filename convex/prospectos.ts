import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import type { Doc, Id } from "./_generated/dataModel";
import { MAX_ACTIVIDAD } from "./lib/constants";
import { APP_TZ, diffCalendarDays, ventanaDia } from "./lib/fecha";
import { calcularFechaProximoSeguimiento } from "./lib/seguimiento";
import { requireUsuario } from "./lib/usuario";
import { prospectoDelUsuario } from "./lib/acceso";
import { prospectoPublicoValidator, toProspectoPublico } from "./lib/proyecciones";
import { conLimites, emailOpcional, textoObligatorio, textoOpcional, validarNumItems } from "./lib/validacion";
import { canalContacto, etapaProspecto } from "./schema";

export interface ProspectoActividad {
  id: Id<"prospectos">;
  nombre: string;
  etapaActual: Doc<"prospectos">["etapaActual"];
  canalContactoPreferido: Doc<"prospectos">["canalContactoPreferido"];
  fechaUltimoContacto?: number;
  diasVencido?: number;
}

/** Antigüedad para ordenar: quien lleva más tiempo sin contacto va primero (JOS-22). */
function antiguedad(p: Doc<"prospectos">): number {
  return p.fechaUltimoContacto ?? p.fechaAlta;
}

/**
 * Lee hasta MAX_ACTIVIDAD+1 filas de un rango, descarta el centinela y señala
 * truncamiento. El orden por antigüedad solo se aplica DESPUÉS del descarte:
 * si no hay truncamiento se leyó el conjunto completo y el orden es globalmente
 * correcto; si lo hay, la UI presenta vista parcial (nunca como completa).
 */
function acotar(leidos: Doc<"prospectos">[]): { filas: Doc<"prospectos">[]; truncado: boolean } {
  const truncado = leidos.length > MAX_ACTIVIDAD;
  const filas = (truncado ? leidos.slice(0, MAX_ACTIVIDAD) : leidos).sort((a, b) => antiguedad(a) - antiguedad(b));
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
      // cumplidos — seguirá siendo aproximado hasta que JOS-23 lo compute
      // directamente sobre `interacciones`.
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
  },
  returns: prospectoPublicoValidator,
  handler: async (ctx, args) => {
    const usuarioId = await requireUsuario(ctx);
    const nombre = textoObligatorio(args.nombre, "nombre");
    const comoSeConocio = textoObligatorio(args.comoSeConocio, "comoSeConocio");
    const telefono = textoOpcional(args.telefono);
    const email = emailOpcional(args.email);
    const notas = textoOpcional(args.notas);

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
 * PATCH /prospectos/:id (JOS-13). Solo datos de contacto y notas; etapaActual
 * y las tres fechas son de solo lectura aquí. En los opcionales, cadena vacía
 * (o solo espacios) elimina el campo — patch con `undefined` lo borra.
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
  },
  returns: prospectoPublicoValidator,
  handler: async (ctx, args) => {
    const usuarioId = await requireUsuario(ctx);
    const doc = await prospectoDelUsuario(ctx, args.id, usuarioId);

    const patch: Partial<Doc<"prospectos">> = {};
    if (args.nombre !== undefined) patch.nombre = textoObligatorio(args.nombre, "nombre");
    if (args.comoSeConocio !== undefined) patch.comoSeConocio = textoObligatorio(args.comoSeConocio, "comoSeConocio");
    if (args.canalContactoPreferido !== undefined) patch.canalContactoPreferido = args.canalContactoPreferido;
    if (args.telefono !== undefined) patch.telefono = textoOpcional(args.telefono);
    if (args.email !== undefined) patch.email = emailOpcional(args.email);
    if (args.notas !== undefined) patch.notas = textoOpcional(args.notas);

    await ctx.db.patch(doc._id, patch);
    return toProspectoPublico((await ctx.db.get(doc._id))!);
  },
});

/**
 * PATCH /prospectos/:id/etapa (JOS-13). Recalcula el seguimiento con la nueva
 * etapa y la referencia fechaUltimoContacto ?? fechaAlta (caso 4 de JOS-8,
 * invocación 3 de JOS-12). NO toca fechaUltimoContacto. En etapas terminales
 * el motor devuelve `undefined` y el patch elimina el campo (sale de la
 * Actividad Diaria).
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
      fechaProximoSeguimiento: calcularFechaProximoSeguimiento(etapa, referencia),
    });
    return toProspectoPublico((await ctx.db.get(doc._id))!);
  },
});
