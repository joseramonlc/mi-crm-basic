"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ProspectCard, EmptyState } from "@/components/ui";
import { CHANNEL_LABEL, CHANNEL_TO_ICON, formatRelativo } from "@/lib/format";

/** Actividad Diaria (Inicio) — prospectos con seguimiento vencido o para hoy (JOS-22). */
export default function ActividadPage() {
  const router = useRouter();
  const prospectos = useQuery(api.prospectos.listSeguimientosHoy);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h1-size)", fontWeight: 700, color: "var(--color-neutral-900)" }}>
        Actividad diaria
      </h1>
      <p style={{ color: "var(--color-neutral-500)", marginTop: 4, marginBottom: 20 }}>Prospectos a contactar hoy o con seguimiento vencido.</p>

      {prospectos === undefined ? null : prospectos.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="Sin seguimientos pendientes"
          description="No tienes prospectos que contactar hoy. Vuelve mañana o añade uno nuevo."
          ctaLabel="Añadir prospecto"
          onCta={() => router.push("/prospectos/nuevo")}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {prospectos.map((p) => (
            <ProspectCard
              key={p._id}
              name={p.nombre}
              stage={p.etapaActual}
              priority={p.prioridad}
              channel={CHANNEL_TO_ICON[p.canalContactoPreferido]}
              lastInteraction={CHANNEL_LABEL[p.canalContactoPreferido]}
              timeAgo={p.fechaUltimoContacto ? formatRelativo(p.fechaUltimoContacto) : ""}
              onOpen={() => router.push(`/prospectos/${p._id}`)}
              onCall={() => router.push(`/prospectos/${p._id}/interaccion?tipo=llamada`)}
              onWhatsApp={() => router.push(`/prospectos/${p._id}/interaccion?tipo=mensaje`)}
              onNote={() => router.push(`/prospectos/${p._id}/interaccion`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
