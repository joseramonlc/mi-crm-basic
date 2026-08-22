"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../convex/_generated/api";
import { VENCIDOS_VISIBLES } from "../../../../convex/lib/constants";
import { APP_TZ, ventanaDia } from "../../../../convex/lib/fecha";
import { Button, EmptyState, Icon, ProspectCard, Toast } from "@/components/ui";
import { consumirFlash } from "@/lib/flash";
import { useDayKey } from "@/lib/useDayKey";
import { rutaRegistrarDesdeActividad } from "@/lib/volver";
import { BANNER_VISTA_PARCIAL, formatTimeAgo, textoRitmo, textoVencido } from "./textos";

type DatosActividad = FunctionReturnType<typeof api.prospectos.actividadDiaria>;
type Prospecto = DatosActividad["hoy"][number];

export default function ActividadPage() {
  const dayKey = useDayKey();
  const datos = useQuery(api.prospectos.actividadDiaria, { dayKey });
  const [aviso, setAviso] = React.useState<string | null>(null);
  const flashConsumido = React.useRef(false);

  React.useEffect(() => {
    // Mismo patrón que la Ficha: lectura única de sessionStorage tras el commit,
    // con guarda de ref para que la segunda pasada del Strict Mode no consuma un
    // flash ya vacío y pise el aviso con null.
    //
    // Vive AQUÍ y no dentro de <Actividad> (JOS-23): el toast no puede depender
    // de que existan tarjetas. Al registrar el contacto del último prospecto
    // pendiente la pantalla pasa a "¡Todo al día!" y <Actividad> ni se monta —
    // justo el caso en que la confirmación más se necesita.
    if (flashConsumido.current) return;
    flashConsumido.current = true;
    const mensaje = consumirFlash();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mensaje !== null) setAviso(mensaje);
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6 md:py-8" style={{ fontFamily: "var(--font-sans)" }}>
      <h1
        style={{
          fontSize: "var(--text-h2-size)",
          fontWeight: "var(--text-h2-weight)" as React.CSSProperties["fontWeight"],
          letterSpacing: "var(--text-h2-ls)",
          color: "var(--color-neutral-900)",
          marginBottom: 16,
        }}
      >
        Actividad diaria
      </h1>
      <Contenido datos={datos} />
      {aviso !== null && <Toast mensaje={aviso} onClose={() => setAviso(null)} />}
    </div>
  );
}

function Contenido({ datos }: { datos: DatosActividad | undefined }) {
  // Cuatro estados excluyentes: carga / sin prospectos / todo al día / actividad.
  if (datos === undefined) {
    return (
      <p role="status" style={{ padding: "48px 0", textAlign: "center", color: "var(--color-neutral-500)", fontSize: 15 }}>
        Cargando actividad…
      </p>
    );
  }

  if (!datos.tieneProspectos) {
    // Único estado que afirma que no existen prospectos (tieneProspectos viene
    // del servidor; listas vacías por sí solas no bastan — puede haber
    // seguimientos futuros, terminales o completados hoy).
    return (
      <EmptyState
        icon="users"
        title="Aún no tienes prospectos"
        description="Añade tu primer prospecto para empezar a trabajar tu red."
        ctaLabel="Añadir prospecto"
        ctaHref="/prospectos/nuevo"
      />
    );
  }

  if (datos.hoy.length === 0 && datos.vencidos.length === 0) {
    // JOS-22 exige el botón de alta también en este estado (auditoría de
    // implementación): al día no significa sin trabajo de captación.
    return (
      <>
        <EmptyState
          icon="check"
          title="¡Todo al día!"
          description="No tienes seguimientos pendientes."
          ctaLabel="Añadir prospecto"
          ctaHref="/prospectos/nuevo"
        />
        {datos.ritmo.completados > 0 && <LineaRitmo ritmo={datos.ritmo} centrada />}
      </>
    );
  }

  return <Actividad datos={datos} />;
}

function Actividad({ datos }: { datos: DatosActividad }) {
  const router = useRouter();
  const [verTodosVencidos, setVerTodosVencidos] = React.useState(false);
  const { hoyInicio } = ventanaDia(datos.dayKey, APP_TZ);

  const vencidosVisibles = verTodosVencidos ? datos.vencidos : datos.vencidos.slice(0, VENCIDOS_VISIBLES);
  const abrir = (p: Prospecto) => router.push(`/prospectos/${p.id}`);
  // Atajo de 2 pasos (JOS-23): al formulario del prospecto, marcado para que la
  // salida —guardar o cancelar— devuelva aquí en vez de a la Ficha.
  const registrarContacto = (p: Prospecto) => router.push(rutaRegistrarDesdeActividad(p.id));

  return (
    <div className="flex flex-col gap-6">
      <LineaRitmo ritmo={datos.ritmo} />

      {datos.hoy.length > 0 && (
        <Seccion titulo="Para hoy" cantidad={datos.hoy.length} truncado={datos.truncado.hoy}>
          {datos.hoy.map((p) => (
            <ProspectCard
              key={p.id}
              name={p.nombre}
              stage={p.etapaActual}
              priority={p.prioridad}
              channel={p.canalContactoPreferido}
              lastInteraction="Para hoy"
              timeAgo={formatTimeAgo(p.fechaUltimoContacto, hoyInicio)}
              onOpen={() => abrir(p)}
              onContacted={() => registrarContacto(p)}
            />
          ))}
        </Seccion>
      )}

      {datos.vencidos.length > 0 && (
        <Seccion titulo="Seguimientos vencidos" cantidad={datos.vencidos.length} truncado={datos.truncado.vencidos}>
          {vencidosVisibles.map((p) => (
            <ProspectCard
              key={p.id}
              name={p.nombre}
              stage={p.etapaActual}
              priority={p.prioridad}
              channel={p.canalContactoPreferido}
              lastInteraction={p.diasVencido !== undefined ? textoVencido(p.diasVencido) : ""}
              timeAgo={formatTimeAgo(p.fechaUltimoContacto, hoyInicio)}
              onOpen={() => abrir(p)}
              onContacted={() => registrarContacto(p)}
            />
          ))}
          {!verTodosVencidos && datos.vencidos.length > VENCIDOS_VISIBLES && (
            <Button variant="secondary" fullWidth onClick={() => setVerTodosVencidos(true)}>
              Ver todos ({datos.vencidos.length})
            </Button>
          )}
        </Seccion>
      )}
    </div>
  );
}

/**
 * El ritmo es aproximado por diseño: cuenta contactos de hoy, no seguimientos
 * cumplidos. JOS-23 no cambia este cálculo — solo añade la acción rápida; la
 * exactitud es JOS-77.
 */
function LineaRitmo({ ritmo, centrada = false }: { ritmo: DatosActividad["ritmo"]; centrada?: boolean }) {
  return (
    <p
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: centrada ? "center" : "flex-start",
        gap: 6,
        fontSize: 14,
        color: "var(--color-neutral-500)",
      }}
    >
      <Icon name="clock" size={15} />
      {textoRitmo(ritmo)}
    </p>
  );
}

function Seccion({ titulo, cantidad, truncado, children }: { titulo: string; cantidad: number; truncado: boolean; children: React.ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-3">
      <h2
        style={{
          fontSize: "var(--text-h3-size)",
          fontWeight: "var(--text-h3-weight)" as React.CSSProperties["fontWeight"],
          color: "var(--color-neutral-900)",
        }}
      >
        {titulo} <span style={{ color: "var(--color-neutral-500)", fontWeight: 500 }}>({cantidad})</span>
      </h2>
      {truncado && <BannerVistaParcial />}
      {children}
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
      <Icon name="info" size={15} />
      {BANNER_VISTA_PARCIAL}
    </p>
  );
}
