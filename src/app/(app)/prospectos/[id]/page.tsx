import Link from "next/link";

/** Stub navegable de la ficha de prospecto (M4) — destino del onOpen de las tarjetas. */
export default function FichaProspectoPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6 md:py-8" style={{ fontFamily: "var(--font-sans)" }}>
      <h1 style={{ fontSize: "var(--text-h2-size)", fontWeight: 600, color: "var(--color-neutral-900)", marginBottom: 8 }}>
        Ficha de prospecto
      </h1>
      <p style={{ fontSize: 15, color: "var(--color-neutral-500)", marginBottom: 16 }}>
        Esta pantalla aún no está construida.
      </p>
      <Link href="/actividad" style={{ color: "var(--color-primary-600)", fontWeight: 600 }}>
        Volver a Inicio
      </Link>
    </div>
  );
}
