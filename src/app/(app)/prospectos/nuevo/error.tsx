"use client";

import * as React from "react";
import { Button, Icon } from "@/components/ui";

/**
 * Error boundary del segmento /prospectos/nuevo (contrato Next 16:
 * error + unstable_retry), mismo patrón que el de /actividad.
 */
export default function NuevoProspectoError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="flex flex-col items-center text-center gap-2"
      style={{ padding: "48px 24px", fontFamily: "var(--font-sans)" }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "var(--color-error-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Icon name="alert-circle" size={32} color="var(--color-error-text)" />
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-neutral-900)" }}>
        No se pudo cargar la pantalla
      </h2>
      <p style={{ fontSize: 15, color: "var(--color-neutral-500)", maxWidth: 300, lineHeight: 1.5 }}>
        Ha ocurrido un error inesperado. Puedes intentarlo de nuevo.
      </p>
      <div style={{ marginTop: 12 }}>
        <Button variant="primary" onClick={() => unstable_retry()}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}
