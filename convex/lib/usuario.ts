import type { QueryCtx } from "../_generated/server";
import { DEV_USUARIO_ID } from "./constants";

/**
 * Único punto de obtención del tenant (`usuarioId`). Contrato del ADR 0001:
 * se deriva SIEMPRE en servidor; ninguna función lo acepta del cliente.
 *
 * Hoy (sin auth): aborta fuera de APP_ENV=development y resuelve al usuario
 * provisional DEV_USUARIO_ID; `_ctx` no se usa todavía.
 *
 * Con JOS-66: `ctx.auth.getUserIdentity()` → `identity.tokenIdentifier`,
 * abortando sin identidad. Cambiará solo el cuerpo de esta función — la firma
 * (async, `Pick<QueryCtx, "auth">`) ya es la definitiva y MutationCtx es
 * estructuralmente compatible.
 */
// `_ctx` queda sin uso hasta JOS-66 (la firma es la definitiva, fijada en auditoría).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function requireUsuario(_ctx: Pick<QueryCtx, "auth">): Promise<string> {
  if (process.env.APP_ENV !== "development") {
    throw new Error("solo está disponible en desarrollo (APP_ENV=development) hasta que exista auth (JOS-66)");
  }
  return DEV_USUARIO_ID;
}
