import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { DEV_USUARIO_ID, MAX_ACTIVIDAD } from "./lib/constants";
import { APP_TZ, diffCalendarDays, ventanaDia } from "./lib/fecha";

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
 * SOLO DESARROLLO: aborta fuera de APP_ENV=development. Sin auth (JOS-5), el
 * tenant es la constante de servidor DEV_USUARIO_ID; el cliente no elige usuario.
 */
export const actividadDiaria = query({
  args: { dayKey: v.string() },
  handler: async (ctx, { dayKey }) => {
    if (process.env.APP_ENV !== "development") {
      throw new Error("actividadDiaria solo está disponible en desarrollo (APP_ENV=development)");
    }
    const usuarioId = DEV_USUARIO_ID;
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
      // cumplidos — exacto solo cuando exista `interacciones` (JOS-23).
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
