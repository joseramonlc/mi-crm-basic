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
