import * as Sentry from "@sentry/nextjs";

/**
 * Arranque del servidor (contrato Next 16, estable desde Next 15). Carga la
 * configuración de Sentry que corresponda al runtime en el que arranca esta
 * instancia — no se puede importar `sentry.edge.config` en Node ni al revés.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Errores del servidor que no llegan a ningún `error.tsx` (Server Components,
 * y en el futuro Route Handlers/Server Actions si se añaden — hoy no existe
 * ninguno en el proyecto).
 */
export const onRequestError = Sentry.captureRequestError;
