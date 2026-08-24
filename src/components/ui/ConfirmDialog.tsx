import * as React from "react";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  titulo: string;
  mensaje: React.ReactNode;
  etiquetaConfirmar: string;
  /** @default "Cancelar" */
  etiquetaCancelar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  /** Operación en curso: bloquea botones, Escape y clic en el fondo. @default false */
  procesando?: boolean;
  /** Error accesible (role="alert") tras un fallo; el diálogo NO se cierra. */
  error?: string | null;
  /** @default "destructive" */
  varianteConfirmar?: "primary" | "destructive";
}

/**
 * Ventana de confirmación para acciones destructivas (JOS-80). El kit no traía un
 * diálogo modal; este cumple los requisitos de accesibilidad que exige una acción sin
 * papelera: `role="dialog"` + `aria-modal`, etiqueta y descripción asociadas, trampa de
 * foco, y RESTAURACIÓN del foco al elemento que lo abrió al cerrarse. Escape y clic en el
 * fondo equivalen a «Cancelar», y se desactivan mientras hay una operación en curso.
 *
 * No gestiona su propia visibilidad: el padre lo monta/desmonta. Reutilizable (lo usará
 * también el Trozo B de JOS-80 para borrar interacciones).
 */
export function ConfirmDialog({
  titulo,
  mensaje,
  etiquetaConfirmar,
  etiquetaCancelar = "Cancelar",
  onConfirmar,
  onCancelar,
  procesando = false,
  error = null,
  varianteConfirmar = "destructive",
}: ConfirmDialogProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const invocadorRef = React.useRef<Element | null>(null);
  const tituloId = React.useId();
  const mensajeId = React.useId();

  // Al abrir: recuerda el foco de origen y lo lleva dentro (primer botón = Cancelar, la
  // opción segura). Al desmontar: lo devuelve al invocador. El ref del invocador se lee en
  // el commit, no en render, para no divergir en la hidratación.
  React.useEffect(() => {
    invocadorRef.current = document.activeElement;
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      const invocador = invocadorRef.current;
      if (invocador instanceof HTMLElement) invocador.focus();
    };
  }, []);

  function alPulsarTecla(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      if (!procesando) onCancelar();
      return;
    }
    if (e.key !== "Tab") return;
    // Trampa de foco: cicla entre los elementos enfocables del diálogo.
    const enfocables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    if (enfocables === undefined || enfocables.length === 0) return;
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  return (
    <div
      // Clic en el fondo (no en la tarjeta) = Cancelar, salvo operación en curso.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !procesando) onCancelar();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.45)",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={mensajeId}
        onKeyDown={alPulsarTecla}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--surface-card)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-2)",
          padding: 24,
          fontFamily: "var(--font-sans)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <h2 id={tituloId} style={{ fontSize: "var(--text-h3-size)", fontWeight: 600, color: "var(--color-neutral-900)", margin: 0 }}>
          {titulo}
        </h2>
        <div id={mensajeId} style={{ fontSize: 15, lineHeight: 1.55, color: "var(--color-neutral-700)" }}>
          {mensaje}
        </div>
        {error !== null && (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              background: "var(--color-error-bg)",
              color: "var(--color-error-text)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {error}
          </p>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <Button variant="secondary" onClick={onCancelar} disabled={procesando}>
            {etiquetaCancelar}
          </Button>
          <Button variant={varianteConfirmar} onClick={onConfirmar} loading={procesando} disabled={procesando}>
            {etiquetaConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
