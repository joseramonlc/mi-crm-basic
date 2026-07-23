import type { QueryCtx } from "../_generated/server";
import { unauthenticated } from "./errores";

/**
 * Único punto de obtención del tenant (`usuarioId`). Contrato del ADR 0001:
 * se deriva SIEMPRE en servidor; ninguna función lo acepta del cliente.
 *
 * `tokenIdentifier` combina emisor y sujeto, así que es único entre proveedores
 * e instancias de Clerk (dev y producción emiten identificadores distintos para
 * la misma persona: migración prevista en JOS-32).
 */
export async function requireUsuario(ctx: Pick<QueryCtx, "auth">): Promise<string> {
  const identidad = await ctx.auth.getUserIdentity();
  if (identidad === null) {
    throw unauthenticated();
  }
  return identidad.tokenIdentifier;
}
