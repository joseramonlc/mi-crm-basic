"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ProspectCard, EmptyState, FilterChip } from "@/components/ui";
import type { PipelineStage } from "@/components/ui";
import { CHANNEL_LABEL, CHANNEL_TO_ICON, formatRelativo } from "@/lib/format";

const ETAPAS: { value: PipelineStage; label: string }[] = [
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "presented", label: "Presentación realizada" },
  { value: "evaluating", label: "En valoración" },
  { value: "joined", label: "Incorporado" },
  { value: "discarded", label: "Descartado" },
];

/** Pipeline de Prospectos — vista agrupada por etapas (JOS-21). */
export default function ProspectosPage() {
  const router = useRouter();
  const prospectos = useQuery(api.prospectos.list);
  const [filtro, setFiltro] = React.useState<PipelineStage | "todas">("todas");

  const visibles = prospectos?.filter((p) => filtro === "todas" || p.etapaActual === filtro) ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h1-size)", fontWeight: 700, color: "var(--color-neutral-900)" }}>
          Prospectos
        </h1>
      </div>

      <div className="flex gap-2 overflow-x-auto py-4 -mx-4 px-4">
        <FilterChip active={filtro === "todas"} onClick={() => setFiltro("todas")}>
          Todas
        </FilterChip>
        {ETAPAS.map((e) => (
          <FilterChip key={e.value} active={filtro === e.value} onClick={() => setFiltro(e.value)}>
            {e.label}
          </FilterChip>
        ))}
      </div>

      {prospectos === undefined ? null : prospectos.length === 0 ? (
        <EmptyState
          icon="users"
          title="Todavía no tienes prospectos"
          description="Añade tu primer prospecto para empezar a construir tu pipeline."
          ctaLabel="Añadir prospecto"
          onCta={() => router.push("/prospectos/nuevo")}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visibles.map((p) => (
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
