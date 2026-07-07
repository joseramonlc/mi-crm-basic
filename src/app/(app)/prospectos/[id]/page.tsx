"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Avatar, Badge, Button, Card, Divider, Icon, Input, PriorityBadge, Select, StageBadge } from "@/components/ui";
import type { PipelineStage } from "@/components/ui";
import { formatFecha } from "@/lib/format";

const ETAPAS = [
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "presented", label: "Presentación realizada" },
  { value: "evaluating", label: "En valoración" },
  { value: "joined", label: "Incorporado" },
  { value: "discarded", label: "Descartado" },
];

const PRIORIDADES = [
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];

const TIPO_LABEL: Record<string, string> = { llamada: "Llamada", mensaje: "Mensaje", reunion: "Reunión" };
const RESULTADO_TONE: Record<string, "success" | "warning" | "error" | "neutral"> = {
  interesado: "success",
  necesita_pensar: "warning",
  no_interesado: "error",
  otro: "neutral",
};
const RESULTADO_LABEL: Record<string, string> = {
  interesado: "Interesado",
  necesita_pensar: "Necesita pensar",
  no_interesado: "No interesado",
  otro: "Otro",
};

/** Ficha del Prospecto — cabecera, datos, cambio de etapa, notas e historial (JOS-17/18/19/20). */
export default function FichaProspectoPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const prospectoId = id as Id<"prospectos">;

  const prospecto = useQuery(api.prospectos.get, { id: prospectoId });
  const interacciones = useQuery(api.interacciones.listByProspecto, { prospectoId });
  const actualizar = useMutation(api.prospectos.update);
  const cambiarEtapa = useMutation(api.prospectos.changeStage);
  const eliminar = useMutation(api.prospectos.remove);

  const [notas, setNotas] = React.useState<string>();

  if (prospecto === undefined) return null;
  if (prospecto === null) {
    return <p className="p-6" style={{ color: "var(--color-neutral-500)" }}>Prospecto no encontrado.</p>;
  }

  async function guardarNotas() {
    if (notas === undefined) return;
    await actualizar({ id: prospectoId, notas });
    setNotas(undefined);
  }

  async function handleEliminar() {
    if (!confirm("¿Eliminar este prospecto y todo su historial de interacciones?")) return;
    await eliminar({ id: prospectoId });
    router.push("/prospectos");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Volver">
          <Icon name="arrow-left" size={20} />
        </button>
        <div className="flex-1" />
        <button type="button" onClick={handleEliminar} aria-label="Eliminar prospecto" style={{ color: "var(--color-error-text)" }}>
          <Icon name="trash-2" size={20} />
        </button>
      </div>

      <Card>
        <div className="flex items-start gap-4">
          <Avatar name={prospecto.nombre} size="lg" priority={prospecto.prioridad} />
          <div className="flex-1 min-w-0">
            <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h2-size)", fontWeight: 600, color: "var(--color-neutral-900)" }}>
              {prospecto.nombre}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StageBadge stage={prospecto.etapaActual} />
              <PriorityBadge level={prospecto.prioridad} />
            </div>
          </div>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        <div className="flex flex-col gap-3">
          {prospecto.telefono && (
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--color-neutral-600)" }}>{prospecto.telefono}</span>
              <div className="flex gap-3">
                <a href={`tel:${prospecto.telefono}`} aria-label="Llamar"><Icon name="phone" size={18} color="var(--color-primary-600)" /></a>
                <a href={`https://wa.me/${prospecto.telefono.replace(/\D/g, "")}`} aria-label="WhatsApp" target="_blank" rel="noreferrer">
                  <Icon name="message-circle" size={18} color="var(--color-primary-600)" />
                </a>
              </div>
            </div>
          )}
          {prospecto.email && (
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--color-neutral-600)" }}>{prospecto.email}</span>
              <a href={`mailto:${prospecto.email}`} aria-label="Email"><Icon name="mail" size={18} color="var(--color-primary-600)" /></a>
            </div>
          )}
          <div style={{ fontSize: 13, color: "var(--color-neutral-500)" }}>Cómo se conoció: {prospecto.comoSeConocio}</div>
          <div style={{ fontSize: 13, color: "var(--color-neutral-500)" }}>Añadido: {formatFecha(prospecto._creationTime)}</div>
        </div>
      </Card>

      <Card>
        <Select
          label="Etapa"
          value={prospecto.etapaActual}
          options={ETAPAS}
          onChange={(v) => cambiarEtapa({ id: prospectoId, etapaActual: v as PipelineStage })}
        />
        <div style={{ marginTop: 16 }}>
          <Select
            label="Prioridad"
            value={prospecto.prioridad}
            options={PRIORIDADES}
            onChange={(v) => actualizar({ id: prospectoId, prioridad: v as (typeof PRIORIDADES)[number]["value"] })}
          />
        </div>
      </Card>

      <Card>
        <Input
          label="Notas"
          multiline
          rows={4}
          value={notas ?? prospecto.notas ?? ""}
          onChange={(e) => setNotas(e.target.value)}
          onBlur={guardarNotas}
        />
      </Card>

      <div className="flex items-center justify-between">
        <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h3-size)", fontWeight: 600, color: "var(--color-neutral-900)" }}>
          Historial de interacciones
        </h2>
        <Button size="sm" iconLeft={<Icon name="plus" size={16} />} onClick={() => router.push(`/prospectos/${prospectoId}/interaccion`)}>
          Registrar
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {interacciones?.length === 0 && <p style={{ color: "var(--color-neutral-500)" }}>Todavía no hay interacciones registradas.</p>}
        {interacciones?.map((it) => (
          <Card key={it._id} elevation={1}>
            <div className="flex items-center justify-between">
              <span style={{ fontWeight: 600, color: "var(--color-neutral-900)" }}>{TIPO_LABEL[it.tipo]}</span>
              <Badge tone={RESULTADO_TONE[it.resultado]}>{RESULTADO_LABEL[it.resultado]}</Badge>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-neutral-500)", marginTop: 4 }}>{formatFecha(it.fecha)}</p>
            <p style={{ marginTop: 8, color: "var(--color-neutral-700)" }}>{it.queOcurrio}</p>
            {it.siguientePasoAcordado && (
              <p style={{ marginTop: 8, fontSize: 13, color: "var(--color-neutral-500)" }}>Siguiente paso: {it.siguientePasoAcordado}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
