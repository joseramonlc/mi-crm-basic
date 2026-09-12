"use client";

import * as React from "react";
import { registrarError } from "@/lib/observabilidad";

/**
 * Red de seguridad si falla el propio `layout.tsx` raíz (Clerk, Convex, la
 * fuente, `globals.css`...). Next exige que este boundary defina su propio
 * `<html>`/`<body>` porque SUSTITUYE al layout entero cuando actúa — por eso
 * es deliberadamente autocontenido:
 *   - Nada de `@/components/ui` (Button, Icon): dependen de los tokens de
 *     `globals.css`, que puede ser precisamente lo que falló.
 *   - Nada de `var(--font-sans)` ni la fuente Inter: mismo motivo.
 *   - Nada de `ClerkProvider`/`ConvexClientProvider`: no están montados aquí.
 * `registrarError` sí es seguro: no depende de React ni de contexto, solo de
 * `@sentry/nextjs` y `console`.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  React.useEffect(() => {
    registrarError(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 8,
            padding: "48px 24px",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>Algo salió mal</h2>
          <p style={{ fontSize: 15, color: "#555555", maxWidth: 300, lineHeight: 1.5, margin: 0 }}>
            Ha ocurrido un error inesperado. Puedes intentarlo de nuevo.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              marginTop: 12,
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
