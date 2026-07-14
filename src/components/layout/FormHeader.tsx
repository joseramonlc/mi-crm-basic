"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";

export interface FormHeaderProps {
  titulo: string;
  /**
   * Destino DETERMINISTA de cancelar/atrás (contrato rev. 2 de M3): se navega
   * SIEMPRE aquí con replace — nunca history.back() ni inferencias de
   * historial, que no distinguen una entrada directa de un historial externo.
   */
  hrefCancelar: string;
}

/** Cabecera de pantalla de formulario: flecha atrás + título (design.md §2, header de detalle/form). */
export function FormHeader({ titulo, hrefCancelar }: FormHeaderProps) {
  const router = useRouter();
  return (
    <header
      style={{ height: "var(--layout-header)", borderColor: "var(--border-default)" }}
      className="flex items-center gap-3 px-4 md:px-6 border-b bg-white sticky top-0 z-20"
    >
      <button
        type="button"
        aria-label="Cancelar y volver"
        onClick={() => router.replace(hrefCancelar)}
        style={{
          display: "inline-flex",
          padding: 4,
          color: "var(--color-neutral-700)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <Icon name="arrow-left" size={22} />
      </button>
      <h1 style={{ fontFamily: "var(--font-sans)", fontSize: 17, fontWeight: 700, color: "var(--color-neutral-900)" }}>{titulo}</h1>
    </header>
  );
}
