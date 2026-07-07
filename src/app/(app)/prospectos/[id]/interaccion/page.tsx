"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Card, Input, Select, Button, Icon } from "@/components/ui";

export default function RegistrarInteraccionPage() {
  return (
    <React.Suspense>
      <RegistrarInteraccionForm />
    </React.Suspense>
  );
}

const TIPOS = [
  { value: "llamada", label: "Llamada" },
  { value: "mensaje", label: "Mensaje" },
  { value: "reunion", label: "Reunión" },
];
const RESULTADOS = [
  { value: "interesado", label: "Interesado" },
  { value: "necesita_pensar", label: "Necesita pensar" },
  { value: "no_interesado", label: "No interesado" },
  { value: "otro", label: "Otro" },
];

function hoyInputDate() {
  return new Date().toISOString().slice(0, 10);
}

/** Registrar Interacción — log de contacto (JOS-16). La fecha puede ser anterior a hoy (JOS-11). */
function RegistrarInteraccionForm() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const prospectoId = id as Id<"prospectos">;
  const crear = useMutation(api.interacciones.create);

  const [fecha, setFecha] = React.useState(hoyInputDate());
  const [tipo, setTipo] = React.useState(searchParams.get("tipo") ?? "llamada");
  const [queOcurrio, setQueOcurrio] = React.useState("");
  const [resultado, setResultado] = React.useState("interesado");
  const [siguientePaso, setSiguientePaso] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await crear({
        prospectoId,
        fecha: new Date(fecha).getTime(),
        tipo: tipo as (typeof TIPOS)[number]["value"],
        queOcurrio,
        resultado: resultado as (typeof RESULTADOS)[number]["value"],
        siguientePasoAcordado: siguientePaso || undefined,
      });
      router.push(`/prospectos/${prospectoId}`);
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
          Registrar interacción
        </h1>
      </div>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Fecha" type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <Select label="Tipo" value={tipo} options={TIPOS} onChange={setTipo} />
          <Input label="Qué ocurrió" multiline rows={4} required value={queOcurrio} onChange={(e) => setQueOcurrio(e.target.value)} />
          <Select label="Resultado" value={resultado} options={RESULTADOS} onChange={setResultado} />
          <Input label="Siguiente paso acordado" value={siguientePaso} onChange={(e) => setSiguientePaso(e.target.value)} />
          <Button type="submit" fullWidth loading={saving} disabled={!queOcurrio}>
            Guardar
          </Button>
        </form>
      </Card>
    </div>
  );
}
