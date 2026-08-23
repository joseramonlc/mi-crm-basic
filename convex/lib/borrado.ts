import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

/**
 * Borra un prospecto y TODAS sus interacciones en la transacción en curso (JOS-80).
 *
 * Orden interacciones→prospecto (mismo patrón probado que `seed.ts`): primero la
 * cascada, después el documento raíz. El llamador debe haber verificado la tenencia
 * (`prospectoDelUsuario`) — este helper NO comprueba autorización, solo ejecuta la
 * cascada del documento que se le pasa.
 *
 * `collect()` (no paginar ni limitar) está ACOTADO por MAX_INTERACCIONES_POR_PROSPECTO,
 * que `interacciones.crear` hace cumplir; por eso el borrado completo cabe en una única
 * transacción atómica (Convex = todo o nada). La cota la certifica el gate de JOS-80,
 * que mide ESTE mismo helper con `getTransactionMetrics()` sobre el peor caso real.
 *
 * Se factoriza aparte a propósito: `prospectos.eliminar` (producción) y la medición del
 * gate (entorno desechable) ejecutan exactamente la misma ruta de borrado, así que la
 * medición no se desvía del código real.
 */
export async function eliminarProspectoEnCascada(
  ctx: Pick<MutationCtx, "db">,
  prospecto: Doc<"prospectos">,
): Promise<void> {
  const interacciones = await ctx.db
    .query("interacciones")
    .withIndex("by_usuario_prospecto_fecha", (q) =>
      q.eq("usuarioId", prospecto.usuarioId).eq("prospectoId", prospecto._id),
    )
    .collect();
  for (const interaccion of interacciones) {
    await ctx.db.delete(interaccion._id);
  }
  await ctx.db.delete(prospecto._id);
}
