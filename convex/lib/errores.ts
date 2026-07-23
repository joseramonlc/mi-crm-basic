import { ConvexError } from "convex/values";

/**
 * Contrato de errores de la API (M2). Cuatro capas:
 *  1. Forma, tipo, enum, Id malformado y args extra → los rechaza el validador
 *     de `args` de Convex ANTES del handler (error automático, sin este `data`).
 *  2. Sin identidad de sesión → UNAUTHENTICATED, antes de tocar la base (JOS-66).
 *  3. Negocio en el handler → VALIDATION_ERROR, con `field` cuando aplica.
 *  4. Id válido pero inexistente O de otro tenant → NOT_FOUND opaco (no revela
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

/**
 * Falta la identidad de sesión: la función aborta sin leer ni escribir nada.
 * El mensaje es genérico a propósito — no distingue sesión ausente de expirada.
 */
export function unauthenticated(message = "Se requiere sesión"): ConvexError<Record<string, string>> {
  return new ConvexError({ code: "UNAUTHENTICATED", message });
}
