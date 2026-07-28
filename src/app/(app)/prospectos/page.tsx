"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../convex/_generated/api";
import { PIPELINE_VISIBLES } from "../../../../convex/lib/constants";
import { APP_TZ, ventanaDia } from "../../../../convex/lib/fecha";
import { Badge, Button, EmptyState, Icon, ProspectCard } from "@/components/ui";
import { OPCIONES_ETAPA, type Etapa } from "@/lib/etiquetas";
import { useDayKey } from "@/lib/useDayKey";
import {
  BANNER_VISTA_PARCIAL,
  CARGANDO,
  ETAPAS_COLAPSADAS_INICIO,
  ETIQUETA_VENCIDO,
  SIN_PROSPECTOS_ETAPA,
  TITULO,
  VACIO_CTA,
  VACIO_DESCRIPCION,
  VACIO_TITULO,
  textoSeguimiento,
  textoTotal,
} from "./textos";

type DatosPipeline = FunctionReturnType<typeof api.prospectos.pipeline>;
type Grupo = DatosPipeline["grupos"][Etapa];
type Prospecto = Grupo["prospectos"][number];

export default function PipelinePage() {
  const dayKey = useDayKey();
  const datos = useQuery(api.prospectos.pipeline, { dayKey });

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-none px-4 py-6 md:px-6 md:py-8" style={{ fontFamily: "var(--font-sans)" }}>
      <h1
        style={{
          fontSize: "var(--text-h2-size)",
          fontWeight: "var(--text-h2-weight)" as React.CSSProperties["fontWeight"],
          letterSpacing: "var(--text-h2-ls)",
          color: "var(--color-neutral-900)",
          marginBottom: 16,
        }}
      >
        {TITULO}
      </h1>
      <Contenido datos={datos} />
    </div>
  );
}

function Contenido({ datos }: { datos: DatosPipeline | undefined }) {
  // Tres estados excluyentes: carga / sin prospectos / pipeline.
  if (datos === undefined) {
    return (
      <p role="status" style={{ padding: "48px 0", textAlign: "center", color: "var(--color-neutral-500)", fontSize: 15 }}>
        {CARGANDO}
      </p>
    );
  }

  if (!datos.tieneProspectos) {
    // Lo afirma el servidor: grupos vacíos por sí solos no bastan.
    return (
      <EmptyState icon="users" title={VACIO_TITULO} description={VACIO_DESCRIPCION} ctaLabel={VACIO_CTA} ctaHref="/prospectos/nuevo" />
    );
  }

  return <Pipeline datos={datos} />;
}

function Pipeline({ datos }: { datos: DatosPipeline }) {
  const router = useRouter();
  const { hoyInicio } = ventanaDia(datos.dayKey, APP_TZ);
  const [colapsadas, setColapsadas] = React.useState<ReadonlySet<Etapa>>(() => new Set(ETAPAS_COLAPSADAS_INICIO));

  const alternar = (etapa: Etapa) =>
    setColapsadas((previas) => {
      const siguiente = new Set(previas);
      if (!siguiente.delete(etapa)) siguiente.add(etapa);
      return siguiente;
    });

  return (
    // Un solo árbol para los dos layouts: apilado en móvil, kanban con scroll
    // horizontal en desktop (6 columnas fijas darían ~160px, insuficiente para
    // la tarjeta). Duplicar el árbol con md:hidden doblaría las tarjetas del DOM.
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-4 md:overflow-x-auto md:pb-3">
      {OPCIONES_ETAPA.map(({ value, label }) => (
        <Columna
          key={value}
          titulo={label}
          grupo={datos.grupos[value]}
          colapsada={colapsadas.has(value)}
          onAlternar={() => alternar(value)}
          hoyInicio={hoyInicio}
          onAbrir={(p) => router.push(`/prospectos/${p.id}`)}
        />
      ))}
    </div>
  );
}

function Columna({
  titulo,
  grupo,
  colapsada,
  onAlternar,
  hoyInicio,
  onAbrir,
}: {
  titulo: string;
  grupo: Grupo;
  colapsada: boolean;
  onAlternar: () => void;
  hoyInicio: number;
  onAbrir: (p: Prospecto) => void;
}) {
  const [verTodos, setVerTodos] = React.useState(false);
  const visibles = verTodos ? grupo.prospectos : grupo.prospectos.slice(0, PIPELINE_VISIBLES);

  return (
    <section aria-label={titulo} className="flex flex-col gap-3 md:w-72 md:flex-none">
      <h2 style={{ margin: 0 }}>
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={!colapsada}
          style={{
            all: "unset",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-h3-size)",
            fontWeight: "var(--text-h3-weight)" as React.CSSProperties["fontWeight"],
            color: "var(--color-neutral-900)",
          }}
        >
          {/* El set de iconos no tiene chevron-down (design.md §3): se rota el right. */}
          <Icon
            name="chevron-right"
            size={16}
            color="var(--color-neutral-400)"
            style={{
              flex: "none",
              transform: colapsada ? "none" : "rotate(90deg)",
              transition: "transform var(--duration-base) var(--ease-standard)",
            }}
          />
          {titulo} <span style={{ color: "var(--color-neutral-500)", fontWeight: 500 }}>({textoTotal(grupo.total, grupo.truncado)})</span>
        </button>
      </h2>

      {!colapsada && (
        <>
          {grupo.truncado && <BannerVistaParcial />}
          {grupo.prospectos.length === 0 ? (
            <p style={{ color: "var(--color-neutral-500)", fontSize: 14, padding: "4px 2px" }}>{SIN_PROSPECTOS_ETAPA}</p>
          ) : (
            visibles.map((p) => (
              <ProspectCard
                key={p.id}
                name={p.nombre}
                showStage={false}
                priority="medium"
                channel={p.canalContactoPreferido}
                lastInteraction={textoSeguimiento(p.fechaProximoSeguimiento, p.diasVencido, hoyInicio)}
                accessory={p.diasVencido !== undefined ? <Badge tone="error">{ETIQUETA_VENCIDO}</Badge> : undefined}
                onOpen={() => onAbrir(p)}
              />
            ))
          )}
          {!verTodos && grupo.prospectos.length > PIPELINE_VISIBLES && (
            // Cuenta lo que el botón realmente despliega, no el total de la
            // cabecera: con truncamiento no hay más de MAX_PIPELINE cargados y
            // "Ver todos (500+)" prometería algo que la expansión no da. Que hay
            // más allá de lo cargado ya lo dice el banner de vista parcial.
            <Button variant="secondary" fullWidth onClick={() => setVerTodos(true)}>
              Ver todos ({grupo.prospectos.length})
            </Button>
          )}
        </>
      )}
    </section>
  );
}

function BannerVistaParcial() {
  return (
    <p
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 12px",
        borderRadius: "var(--radius-md)",
        background: "var(--color-warning-bg)",
        color: "var(--color-warning-text)",
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <Icon name="info" size={15} style={{ flex: "none" }} />
      {BANNER_VISTA_PARCIAL}
    </p>
  );
}
