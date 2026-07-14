"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { buttonStyle, Toast } from "@/components/ui";
import { consumirFlash } from "@/lib/flash";

/**
 * Stub navegable de la ficha de prospecto (M4) — destino del onOpen de las
 * tarjetas y del guardado de M3. Cambios de M3 (P9, únicos permitidos):
 * entrada a "Registrar interacción" (JOS-16) y toast del flash. El resto de
 * la ficha (datos, historial reactivo) llega con JOS-17..20.
 */
export default function FichaProspectoPage() {
  const { id } = useParams<{ id: string }>();
  const [aviso, setAviso] = React.useState<string | null>(null);
  const flashConsumido = React.useRef(false);

  React.useEffect(() => {
    // Lectura única de un sistema externo (sessionStorage) tras el commit (en
    // un initializer divergiría del HTML del servidor en la hidratación). La
    // guarda del ref hace la lectura idempotente: en Strict Mode el efecto
    // corre dos veces y, sin ella, la segunda pasada consumiría un flash ya
    // vacío y pisaría el aviso con null.
    if (flashConsumido.current) return;
    flashConsumido.current = true;
    const mensaje = consumirFlash();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mensaje !== null) setAviso(mensaje);
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6 md:py-8" style={{ fontFamily: "var(--font-sans)" }}>
      <h1 style={{ fontSize: "var(--text-h2-size)", fontWeight: 600, color: "var(--color-neutral-900)", marginBottom: 8 }}>
        Ficha de prospecto
      </h1>
      <p style={{ fontSize: 15, color: "var(--color-neutral-500)", marginBottom: 16 }}>
        Esta pantalla aún no está construida.
      </p>
      <div className="flex flex-col items-start gap-4">
        <Link href={`/prospectos/${id}/interacciones/nueva`} style={buttonStyle({ size: "lg" })}>
          Registrar interacción
        </Link>
        <Link href="/actividad" style={{ color: "var(--color-primary-600)", fontWeight: 600 }}>
          Volver a Inicio
        </Link>
      </div>
      {aviso !== null && <Toast mensaje={aviso} onClose={() => setAviso(null)} />}
    </div>
  );
}
