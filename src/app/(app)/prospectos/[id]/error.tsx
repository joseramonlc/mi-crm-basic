"use client";

import * as React from "react";
import Link from "next/link";
import { Button, buttonStyle, Icon } from "@/components/ui";

/**
 * Error boundary del segmento (contrato Next 16: error + unstable_retry).
 * Las queries de la ficha lanzan aquí cuando el id no existe o es de otro
 * tenant (NOT_FOUND opaco de M2): ese caso no se reintenta — se ofrece volver
 * a Inicio. El resto sigue el patrón genérico (espejo de interacciones/nueva).
 */
export default function FichaProspectoError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  const noEncontrado = (error as { data?: { code?: string } }).data?.code === "NOT_FOUND";

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
      {noEncontrado ? (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-neutral-900)" }}>Prospecto no encontrado</h2>
          <p style={{ fontSize: 15, color: "var(--color-neutral-500)", maxWidth: 300, lineHeight: 1.5 }}>
            El prospecto no existe o ya no está disponible.
          </p>
          <div style={{ marginTop: 12 }}>
            <Link href="/actividad" style={buttonStyle({ variant: "primary" })}>
              Ir a Inicio
            </Link>
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
