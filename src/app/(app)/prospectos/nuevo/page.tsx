"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, Input, Select, Button, Icon } from "@/components/ui";

const COMO_SE_CONOCIO = ["Referido", "Red social", "Evento", "Conocido", "Otro"];
const CANALES = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "llamada", label: "Llamada" },
  { value: "email", label: "Email" },
  { value: "instagram", label: "Instagram" },
  { value: "otro", label: "Otro" },
];
const PRIORIDADES = [
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];

/** Formulario de captura rápida — Nuevo Prospecto (JOS-15). Etapa inicial siempre "Nuevo" (JOS-10). */
export default function NuevoProspectoPage() {
  const router = useRouter();
  const crear = useMutation(api.prospectos.create);

  const [nombre, setNombre] = React.useState("");
  const [telefono, setTelefono] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [comoSeConocio, setComoSeConocio] = React.useState("");
  const [canal, setCanal] = React.useState("whatsapp");
  const [prioridad, setPrioridad] = React.useState("medium");
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const id = await crear({
        nombre,
        telefono: telefono || undefined,
        email: email || undefined,
        comoSeConocio,
        canalContactoPreferido: canal as (typeof CANALES)[number]["value"],
        prioridad: prioridad as (typeof PRIORIDADES)[number]["value"],
      });
      router.push(`/prospectos/${id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 md:py-10">
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={() => router.back()} aria-label="Volver">
          <Icon name="arrow-left" size={20} />
        </button>
        <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-h2-size)", fontWeight: 600, color: "var(--color-neutral-900)" }}>
          Nuevo prospecto
        </h1>
      </div>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Input label="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select label="Cómo se conoció" value={comoSeConocio} onChange={setComoSeConocio} options={COMO_SE_CONOCIO} placeholder="Selecciona…" />
          <Select label="Canal de contacto preferido" value={canal} onChange={setCanal} options={CANALES} />
          <Select label="Prioridad" value={prioridad} onChange={setPrioridad} options={PRIORIDADES} />
          <Button type="submit" fullWidth loading={saving} disabled={!nombre || !comoSeConocio}>
            Guardar
          </Button>
        </form>
      </Card>
    </div>
  );
}
