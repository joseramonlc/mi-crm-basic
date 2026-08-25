import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { notFound } from "./errores";

/**
 * Prospecto del tenant, o NOT_FOUND opaco: un id inexistente y un id de otro
 * usuario producen exactamente el mismo error (no se revela existencia).
 */
export async function prospectoDelUsuario(
  ctx: Pick<QueryCtx, "db">,
  id: Id<"prospectos">,
  usuarioId: string,
): Promise<Doc<"prospectos">> {
  const doc = await ctx.db.get(id);
  if (doc === null || doc.usuarioId !== usuarioId) {
    throw notFound("Prospecto no encontrado");
  }
  return doc;
}

/**
 * Interacción del tenant, o NOT_FOUND opaco (JOS-80 Trozo B). Gemela de
 * `prospectoDelUsuario`: la tenencia se resuelve con el `usuarioId` denormalizado en la
 * propia fila (siempre escrito en servidor por `interacciones.crear`), sin releer el
 * prospecto para autorizar. Un id inexistente y uno de otro usuario dan el mismo error.
 */
export async function interaccionDelUsuario(
  ctx: Pick<QueryCtx, "db">,
  id: Id<"interacciones">,
  usuarioId: string,
): Promise<Doc<"interacciones">> {
  const doc = await ctx.db.get(id);
  if (doc === null || doc.usuarioId !== usuarioId) {
    throw notFound("Interacción no encontrada");
  }
  return doc;
}
