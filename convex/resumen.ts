import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { MAX_RESUMEN_INTERACCIONES, MAX_RESUMEN_PROSPECTOS } from "./lib/constants";
import { APP_TZ, addCivilDays, civilDate, formatDayKey, parseDayKey, ventanaDia, zonedMidnightToMs } from "./lib/fecha";
import { requireUsuario } from "./lib/usuario";

/**
 * Datos de la pantalla Resumen (JOS-24). Vista de diagnóstico, SOLO LECTURA.
 *
 * Dos lecturas acotadas y nada más:
 *   1. `prospectos` por `by_usuario` → etapas, pendientes, nuevos del período y totales.
 *   2. `interacciones` por `by_usuario_fecha` → total del período y serie del gráfico.
 * Todo lo demás se calcula en memoria sobre esas filas: cero lecturas adicionales.
 *
 * ⚠️ UNA SOLA PASADA SOBRE PROSPECTOS, a propósito. Repartir estas métricas en
 * lecturas separadas por índice costaría MÁS documentos en el peor caso (6×201 por
 * etapas + 2×cota por pendientes + cota por nuevos) y, sobre todo, permitiría que la
 * pantalla mostrase un conjunto internamente inconsistente: totales exactos junto a
 * etapas truncadas que no suman. Con una pasada, un único `exacto` gobierna todo lo
 * derivado de ella (bloqueantes 1-3 de la 1ª auditoría del plan).
 *
 * `dayKey` existe por reactividad, no por tenancy: las queries Convex re-corren al
 * cambiar los DATOS, no el reloj, así que el cliente pasa el día visible y lo renueva
 * a medianoche. El handler es puro sobre (dayKey, periodo, datos) — sin Date.now().
 */

const conteoPorEtapaValidator = v.object({
  new: v.number(),
  contacted: v.number(),
  presented: v.number(),
  evaluating: v.number(),
  joined: v.number(),
  discarded: v.number(),
});

/** Días naturales que abarca cada período, contando el día visible incluido. */
const DIAS_DEL_PERIODO = { semana: 7, mes: 30 } as const;

/** dayKey civil de un timestamp en la zona de la app. */
function dayKeyDe(ms: number): string {
  return formatDayKey(civilDate(ms, APP_TZ));
}

export const resumen = query({
  args: {
    dayKey: v.string(),
    periodo: v.union(v.literal("semana"), v.literal("mes")),
  },
  returns: v.object({
    // Rótulo del período: días REALES mostrados, ambos incluidos. La frontera de
    // consulta (semiabierta, en ms) es interna al handler y NO cruza el contrato —
    // separar ambos vocabularios es lo que cierra el bloqueante de la rev. 3 del plan.
    periodo: v.object({ desde: v.string(), hastaIncluido: v.string() }),
    prospectos: v.object({
      exacto: v.boolean(),
      porEtapa: conteoPorEtapaValidator,
      pendientes: v.object({ vencidos: v.number(), hoy: v.number() }),
      nuevosEnPeriodo: v.number(),
      totales: v.object({ activos: v.number(), incorporados: v.number(), descartados: v.number() }),
    }),
    interacciones: v.object({
      exacto: v.boolean(),
      totalEnPeriodo: v.number(),
      serie: v.array(v.object({ dayKey: v.string(), valor: v.number() })),
      diaCompletoDesde: v.union(v.string(), v.null()),
    }),
  }),
  handler: async (ctx, { dayKey, periodo }) => {
    const usuarioId = await requireUsuario(ctx);

    // parseDayKey rechaza formato inválido Y fechas irreales ("2026-02-31"): el
    // contrato de dayKey se hereda de fecha.ts, no se reimplementa aquí.
    const civilHasta = parseDayKey(dayKey);
    const { hoyInicio, mananaInicio } = ventanaDia(dayKey, APP_TZ);

    const dias = DIAS_DEL_PERIODO[periodo];
    // Ventana MÓVIL que incluye el día visible. En dominio civil vía addCivilDays,
    // nunca sumando múltiplos fijos de 24 h: correcto ante cambios de hora.
    const civilDesde = addCivilDays(civilHasta, -(dias - 1));
    const desdeMs = zonedMidnightToMs(civilDesde, APP_TZ);
    const hastaExclusivoMs = mananaInicio;
    const desde = formatDayKey(civilDesde);
    const hastaIncluido = formatDayKey(civilHasta);

    // ---- Lectura 1: prospectos, una sola pasada ----
    const leidosProspectos = await ctx.db
      .query("prospectos")
      .withIndex("by_usuario", (q) => q.eq("usuarioId", usuarioId))
      .take(MAX_RESUMEN_PROSPECTOS + 1);

    const prospectosTruncados = leidosProspectos.length > MAX_RESUMEN_PROSPECTOS;
    const filas = prospectosTruncados ? leidosProspectos.slice(0, MAX_RESUMEN_PROSPECTOS) : leidosProspectos;

    const porEtapa = { new: 0, contacted: 0, presented: 0, evaluating: 0, joined: 0, discarded: 0 };
    let vencidos = 0;
    let hoy = 0;
    let nuevosEnPeriodo = 0;

    for (const p of filas) {
      porEtapa[p.etapaActual] += 1;

      // Ausencia de fecha (etapas terminales) no cuenta en ningún grupo.
      const proxima: number | undefined = p.fechaProximoSeguimiento;
      if (proxima !== undefined) {
        if (proxima < hoyInicio) vencidos += 1;
        else if (proxima < mananaInicio) hoy += 1;
      }

      if (p.fechaAlta >= desdeMs && p.fechaAlta < hastaExclusivoMs) nuevosEnPeriodo += 1;
    }

    const totales = {
      activos: filas.length - porEtapa.discarded,
      incorporados: porEtapa.joined,
      descartados: porEtapa.discarded,
    };

    // ---- Lectura 2: interacciones del período ----
    // ⚠️ ORDEN DESCENDENTE: es contrato, no detalle. Al truncar, la pérdida cae
    // siempre en los días MÁS ANTIGUOS del rango; leer ascendente sacrificaría los
    // días recientes, que son justo los que el usuario mira.
    const leidasInteracciones = await ctx.db
      .query("interacciones")
      .withIndex("by_usuario_fecha", (q) =>
        q.eq("usuarioId", usuarioId).gte("fecha", desdeMs).lt("fecha", hastaExclusivoMs),
      )
      .order("desc")
      .take(MAX_RESUMEN_INTERACCIONES + 1);

    const interaccionesTruncadas = leidasInteracciones.length > MAX_RESUMEN_INTERACCIONES;
    const retenidas: Doc<"interacciones">[] = interaccionesTruncadas
      ? leidasInteracciones.slice(0, MAX_RESUMEN_INTERACCIONES)
      : leidasInteracciones;

    // Serie con TODOS los días del rango, incluidos los de valor 0: un día sin
    // actividad es información, no un hueco.
    const conteoPorDia = new Map<string, number>();
    for (const i of retenidas) {
      const clave = dayKeyDe(i.fecha);
      conteoPorDia.set(clave, (conteoPorDia.get(clave) ?? 0) + 1);
    }
    const serie = Array.from({ length: dias }, (_, indice) => {
      const clave = formatDayKey(addCivilDays(civilDesde, indice));
      return { dayKey: clave, valor: conteoPorDia.get(clave) ?? 0 };
    });

    return {
      periodo: { desde, hastaIncluido },
      prospectos: {
        exacto: !prospectosTruncados,
        porEtapa,
        pendientes: { vencidos, hoy },
        nuevosEnPeriodo,
        totales,
      },
      interacciones: {
        exacto: !interaccionesTruncadas,
        totalEnPeriodo: retenidas.length,
        serie,
        diaCompletoDesde: calcularDiaCompletoDesde(
          interaccionesTruncadas ? retenidas[retenidas.length - 1] : undefined,
          interaccionesTruncadas ? leidasInteracciones[MAX_RESUMEN_INTERACCIONES] : undefined,
          hastaIncluido,
        ),
      },
    };
  },
});

/**
 * Primer día del rango íntegramente medido cuando la lectura de interacciones se
 * trunca; `null` si no hay truncamiento (o si no queda ningún día completo).
 *
 * Se compara el día del documento más antiguo RETENIDO con el del CENTINELA
 * descartado, que es el inmediatamente anterior en el orden descendente:
 *
 *  - Mismo día  → el corte parte ese día por la mitad; el primero fiable es el siguiente.
 *  - Días distintos → ese día está ÍNTEGRO. Al venir ordenados por fecha descendente,
 *    todo documento de ese día tiene `fecha` mayor que la del centinela y por tanto cae
 *    dentro del conjunto retenido. Darlo por parcial ocultaría datos sí medidos
 *    (mayor 2 de la 2ª auditoría del plan).
 *
 * Si el día resultante cae más allá del final del período, ningún día está completo:
 * se devuelve `null`, y es el flag `exacto: false` quien distingue ese caso del
 * `null` de "todo exacto" — la UI declara entonces la serie entera no fiable.
 */
function calcularDiaCompletoDesde(
  masAntiguoRetenido: Doc<"interacciones"> | undefined,
  centinela: Doc<"interacciones"> | undefined,
  hastaIncluido: string,
): string | null {
  if (masAntiguoRetenido === undefined || centinela === undefined) return null;

  const diaRetenido = dayKeyDe(masAntiguoRetenido.fecha);
  const candidato =
    diaRetenido === dayKeyDe(centinela.fecha)
      ? formatDayKey(addCivilDays(parseDayKey(diaRetenido), 1))
      : diaRetenido;

  // Comparación lexicográfica: válida y exacta en formato YYYY-MM-DD.
  return candidato > hastaIncluido ? null : candidato;
}
