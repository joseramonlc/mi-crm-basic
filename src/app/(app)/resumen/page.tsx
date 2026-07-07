"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, StageBadge } from "@/components/ui";
import type { PipelineStage } from "@/components/ui";

const ETAPAS: PipelineStage[] = ["new", "contacted", "presented", "evaluating", "joined", "discarded"];

/** Resumen — embudo por etapa y conversión (JOS-24). */
export default function ResumenPage() {
  const prospectos = useQuery(api.prospectos.list);

  if (prospectos === undefined) return null;

  const total = prospectos.length;
  const porEtapa = Object.fromEntries(ETAPAS.map((e) => [e, prospectos.filter((p) => p.etapaActual === e).length])) as Record<
    PipelineStage,
    number
  >;
  const incorporados = porEtapa.joined;
  const conversion = total > 0 ? Math.round((incorporados / total) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 flex flex-col gap-4">
      <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h1-size)", fontWeight: 700, color: "var(--color-neutral-900)" }}>
        Resumen
      </h1>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div style={{ fontFamily: "var(--font-numeric)", fontFeatureSettings: "var(--num-features)", fontSize: 28, fontWeight: 700, color: "var(--color-neutral-900)" }}>
            {total}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-neutral-500)" }}>Prospectos totales</div>
        </Card>
        <Card>
          <div style={{ fontFamily: "var(--font-numeric)", fontFeatureSettings: "var(--num-features)", fontSize: 28, fontWeight: 700, color: "var(--color-primary-600)" }}>
            {conversion}%
          </div>
          <div style={{ fontSize: 13, color: "var(--color-neutral-500)" }}>Conversión a incorporado</div>
        </Card>
      </div>

      <Card>
        <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h3-size)", fontWeight: 600, color: "var(--color-neutral-900)", marginBottom: 12 }}>
          Embudo por etapa
        </h2>
        <div className="flex flex-col gap-3">
          {ETAPAS.map((etapa) => (
            <div key={etapa} className="flex items-center justify-between">
              <StageBadge stage={etapa} />
              <span style={{ fontFamily: "var(--font-numeric)", fontFeatureSettings: "var(--num-features)", fontWeight: 600, color: "var(--color-neutral-900)" }}>
                {porEtapa[etapa]}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
