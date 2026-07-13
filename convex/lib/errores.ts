import { ConvexError } from "convex/values";

/**
 * Contrato de errores de la API (M2). Tres capas:
 *  1. Forma, tipo, enum, Id malformado y args extra → los rechaza el validador
 *     de `args` de Convex ANTES del handler (error automático, sin este `data`).
 *  2. Negocio en el handler → VALIDATION_ERROR, con `field` cuando aplica.
 *  3. Id válido pero inexistente O de otro tenant → NOT_FOUND opaco (no revela
 *     si el documento existe).
 * El `data` de ConvexError llega al cliente también en producción y, lanzado
 * desde una mutation, aborta la transacción completa.
 */

export function validationError(message: string, field?: string): ConvexError<Record<string, string>> {
  return new ConvexError({
    code: "VALIDATION_ERROR",
    ...(field !== undefined ? { field } : {}),
    message,
  });
}

export function notFound(message: string): ConvexError<Record<string, string>> {
  return new ConvexError({ code: "NOT_FOUND", message });
}
