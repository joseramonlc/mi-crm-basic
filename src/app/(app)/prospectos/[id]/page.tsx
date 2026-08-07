"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { InteraccionPublica, ProspectoPublico } from "../../../../../convex/lib/proyecciones";
import { Avatar, Badge, buttonStyle, Card, EmptyState, Icon, StageBadge, Toast } from "@/components/ui";
import { FormHeader } from "@/components/layout/FormHeader";
import { consumirFlash } from "@/lib/flash";
import { formatearFechaEs } from "@/lib/etiquetas";
import { SelectorEtapa } from "./SelectorEtapa";
import { EdicionDatos, type PatchDatos } from "./EdicionDatos";
import { DatoFecha, SeguimientoAcordado } from "./SeguimientoAcordado";
import {
  CARGANDO_HISTORIAL,
  CARGANDO_PROSPECTO,
  CTA_REGISTRAR,
  ERROR_CAMBIO_ETAPA,
  TOAST_ACUERDO_FIJADO,
  TOAST_ACUERDO_QUITADO,
  ETIQUETA_ATRAS,
  ETIQUETA_EDITAR,
  ICONO_CANAL,
  INDICADOR_TERMINAL,
  PREFIJO_SIGUIENTE_PASO,
  RESULTADO_BADGE,
  SIN_CONTACTO,
  SIN_NOTAS,
  TITULO_ETAPA,
  TITULO_FALLBACK,
  TOAST_DATOS_GUARDADOS,
  VACIO_DESCRIPCION,
  VACIO_TITULO,
  etiquetaCanal,
  etiquetaResultado,
  metaTipo,
  textoFechaAlta,
  textoToastEtapa,
  tituloHistorial,
  type Etapa,
} from "./textos";

const estiloCargando: React.CSSProperties = { padding: "12px 0", color: "var(--color-neutral-500)", fontSize: 15 };
const estiloH2Seccion: React.CSSProperties = {
  fontSize: "var(--text-h3-size)",
  fontWeight: 600,
  color: "var(--color-neutral-900)",
};

/**
 * Ficha del Prospecto en modo lectura (M4 bocado 1: JOS-17 sin selector de
 * etapa + JOS-20). Dos suscripciones paralelas de M2 (obtener +
 * listarPorProspecto); la reactividad de Convex cumple el "sin recargar" de
 * JOS-20. El selector de etapa llega con JOS-19 y la edición con JOS-18.
 */
export default function FichaProspectoPage() {
  const params = useParams<{ id: string }>();
  // Conversión ÚNICA del id de la ruta (bloqueo 4 de la rev. 2): ambas
  // consultas consumen exactamente este valor.
  const prospectoId = params.id as Id<"prospectos">;

  const prospecto = useQuery(api.prospectos.obtener, { id: prospectoId });
  const historial = usePaginatedQuery(api.interacciones.listarPorProspecto, { prospectoId }, { initialNumItems: 50 });
  const cambiarEtapa = useMutation(api.prospectos.cambiarEtapa);
  const actualizar = useMutation(api.prospectos.actualizar);
  const fijarAcordado = useMutation(api.prospectos.fijarSeguimientoAcordado);
  const quitarAcordado = useMutation(api.prospectos.quitarSeguimientoAcordado);

  // Drenaje automático (P11): la API de M2 pagina por contrato, pero JOS-20 no
  // admite paginación visible — se piden bloques de 50 hasta agotar el cursor.
  const { status, loadMore } = historial;
  React.useEffect(() => {
    if (status === "CanLoadMore") loadMore(50);
  }, [status, loadMore]);

  const [aviso, setAviso] = React.useState<string | null>(null);
  const flashConsumido = React.useRef(false);

  // Cambio de etapa (JOS-19): guarda SÍNCRONA contra la doble activación
  // (lección del NO-GO de M3 — el estado no cambia hasta el re-render) +
  // etapa pedida al servidor. Las pills quedan deshabilitadas desde la
  // activación hasta que la SUSCRIPCIÓN refleja la etapa pedida (hallazgo 1
  // del NO-GO M4B2): liberar en el finally abría una ventana en la que el
  // selector aún mostraba la etapa antigua y un segundo toque sobre la etapa
  // recién pedida relanzaba la mutation. Derivado, sin efecto: cuando llega
  // el nuevo valor, la condición se deshace sola.
  const [errorEtapa, setErrorEtapa] = React.useState<string | null>(null);
  const [etapaPendiente, setEtapaPendiente] = React.useState<Etapa | null>(null);
  const cambiandoEtapa = React.useRef(false);
  const guardandoEtapa = etapaPendiente !== null && prospecto !== undefined && prospecto.etapaActual !== etapaPendiente;

  async function manejarCambioEtapa(etapa: Etapa) {
    if (cambiandoEtapa.current) return;
    cambiandoEtapa.current = true;
    setEtapaPendiente(etapa);
    setErrorEtapa(null);
    try {
      // El toast usa el prospecto DEVUELTO (fecha recalculada por el motor);
      // pills, StageBadge y tarjeta se refrescan solos por la suscripción.
      const actualizado = await cambiarEtapa({ id: prospectoId, etapa });
      // Los TRES datos salen del prospecto DEVUELTO, nunca del estado local: con
      // una carrera o una suscripción desfasada, el aviso mentiría sobre si la
      // fecha se ha movido (JOS-69).
      setAviso(
        textoToastEtapa(actualizado.etapaActual, actualizado.fechaProximoSeguimiento, actualizado.seguimientoManual),
      );
    } catch {
      // Sin estado optimista: la etapa mostrada sigue siendo la del servidor
      // y la pendiente se anula (si no, las pills quedarían bloqueadas).
      setErrorEtapa(ERROR_CAMBIO_ETAPA);
      setEtapaPendiente(null);
    } finally {
      cambiandoEtapa.current = false;
    }
  }

  // Edición de datos (JOS-18): el formulario co-localizado calcula el diff y
  // gestiona sus errores; aquí solo la llamada, el toast literal y la salida
  // del modo edición. Si la mutation rechaza, el rechazo se propaga al
  // formulario y la edición se conserva (P7).
  const [editando, setEditando] = React.useState(false);

  async function guardarDatos(patch: PatchDatos) {
    await actualizar({ id: prospectoId, ...patch });
    setAviso(TOAST_DATOS_GUARDADOS);
    setEditando(false);
  }

  // Contacto acordado (JOS-69): la ficha solo llama y avisa. La validación, los
  // errores y el bloqueo durante el guardado viven en SeguimientoAcordado, que
  // necesita el rechazo para conservar lo tecleado — por eso se re-lanza.
  async function fijarAcuerdo(fechaMs: number) {
    await fijarAcordado({ id: prospectoId, fecha: fechaMs });
    setAviso(TOAST_ACUERDO_FIJADO);
  }

  async function quitarAcuerdo() {
    await quitarAcordado({ id: prospectoId });
    setAviso(TOAST_ACUERDO_QUITADO);
  }

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

  const rutaRegistrar = `/prospectos/${prospectoId}/interacciones/nueva`;

  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        // Alto de la barra CTA fija (P6): lo consumen la propia barra, el
        // padding reservado del contenido y el toast (P16.c). La medida ya no
        // se escribe aquí: vive en el token --layout-ficha-cta, porque el FAB
        // del AppShell también se apoya en ella y está fuera de este árbol.
        ["--ficha-cta" as string]: "var(--layout-ficha-cta)",
        ["--toast-bottom" as string]: "calc(var(--ficha-cta) + 16px)",
      }}
    >
      <FormHeader titulo={prospecto?.nombre ?? TITULO_FALLBACK} hrefCancelar="/actividad" etiquetaAtras={ETIQUETA_ATRAS} />

      <div className="mx-auto w-full max-w-2xl lg:max-w-5xl px-4 pt-6 md:px-6 md:pt-8 pb-[var(--ficha-cta)] lg:pb-8 lg:grid lg:grid-cols-[2fr_3fr] lg:gap-8 lg:items-start">
        <div className="flex flex-col gap-6">
          {prospecto === undefined ? (
            <p role="status" style={estiloCargando}>
              {CARGANDO_PROSPECTO}
            </p>
          ) : (
            <>
              {editando ? (
                // P2: el formulario sustituye a la vista de datos; seguimiento
                // y etapa siguen operativos; las notas de lectura se ocultan
                // (su campo está en el formulario).
                <EdicionDatos prospecto={prospecto} onGuardar={guardarDatos} onCerrar={() => setEditando(false)} />
              ) : (
                <SeccionDatos prospecto={prospecto} onEditar={() => setEditando(true)} />
              )}
              <TarjetaSeguimiento prospecto={prospecto} onFijar={fijarAcuerdo} onQuitar={quitarAcuerdo} />
              <SeccionEtapa
                etapaActual={prospecto.etapaActual}
                guardando={guardandoEtapa}
                error={errorEtapa}
                onCambiar={manejarCambioEtapa}
              />
              {!editando && <SeccionNotas notas={prospecto.notas} />}
            </>
          )}
        </div>

        <SeccionHistorial
          entradas={historial.results}
          completo={status === "Exhausted"}
          cargandoPrimera={status === "LoadingFirstPage"}
          rutaRegistrar={rutaRegistrar}
        />
      </div>

      {/* Barra CTA FIJA (bloqueo de la rev. 2): fixed = en viewport desde el
          primer render; el contenido reserva var(--ficha-cta). En md deja
          libre el sidebar; desde lg rige la cabecera sticky del historial. */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t md:left-[var(--layout-sidebar)] lg:hidden flex items-center px-4"
        style={{ height: "var(--ficha-cta)", background: "var(--surface-card)", borderColor: "var(--border-default)" }}
      >
        <Link href={rutaRegistrar} style={buttonStyle({ size: "lg", fullWidth: true })}>
          {CTA_REGISTRAR}
        </Link>
      </div>

      {aviso !== null && <Toast mensaje={aviso} onClose={() => setAviso(null)} />}
    </div>
  );
}

function SeccionDatos({ prospecto, onEditar }: { prospecto: ProspectoPublico; onEditar: () => void }) {
  return (
    <section aria-label="Datos del prospecto" className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar name={prospecto.nombre} size={64} />
        <div className="min-w-0 flex flex-col gap-2">
          <h2 className="truncate" style={{ fontSize: "var(--text-h2-size)", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--color-neutral-900)" }}>
            {prospecto.nombre}
          </h2>
          <StageBadge stage={prospecto.etapaActual} style={{ alignSelf: "flex-start" }} />
        </div>
        {/* Entrada al modo edición (JOS-18, D1: junto a lo que edita). */}
        <button type="button" onClick={onEditar} style={{ ...buttonStyle({ variant: "secondary", size: "sm" }), marginLeft: "auto", flex: "none" }}>
          {ETIQUETA_EDITAR}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <FilaDato icono={ICONO_CANAL[prospecto.canalContactoPreferido]} texto={etiquetaCanal(prospecto.canalContactoPreferido)} />
        {prospecto.telefono !== undefined && <FilaDato icono="phone" texto={prospecto.telefono} />}
        {prospecto.email !== undefined && <FilaDato icono="mail" texto={prospecto.email} />}
        <FilaDato icono="users" texto={prospecto.comoSeConocio} />
      </div>

      <p style={{ fontSize: 12, color: "var(--color-neutral-400)" }}>{textoFechaAlta(prospecto.fechaAlta)}</p>
    </section>
  );
}

function FilaDato({ icono, texto }: { icono: string; texto: string }) {
  return (
    <span className="flex items-center gap-2" style={{ fontSize: 15, color: "var(--color-neutral-700)" }}>
      <Icon name={icono} size={16} color="var(--color-neutral-500)" />
      <span className="truncate">{texto}</span>
    </span>
  );
}

/**
 * Tarjeta de Seguimiento. La fecha de próximo contacto dejó de ser solo lectura
 * en JOS-69: la Mejora #4 introduce la excepción a la letra de JOS-17/JOS-18
 * para la cita acordada, y la edición vive en SeguimientoAcordado. "Último
 * contacto" sigue siendo del motor y no se toca: lo mueve registrar interacciones.
 */
function TarjetaSeguimiento({
  prospecto,
  onFijar,
  onQuitar,
}: {
  prospecto: ProspectoPublico;
  onFijar: (fechaMs: number) => Promise<unknown>;
  onQuitar: () => Promise<unknown>;
}) {
  const terminal = INDICADOR_TERMINAL[prospecto.etapaActual];
  return (
    <Card>
      <section aria-label="Seguimiento" className="flex flex-col gap-3">
        <SeguimientoAcordado prospecto={prospecto} onFijar={onFijar} onQuitar={onQuitar} />
        <DatoFecha
          etiqueta="Último contacto"
          valor={prospecto.fechaUltimoContacto !== undefined ? formatearFechaEs(prospecto.fechaUltimoContacto) : SIN_CONTACTO}
          conValor={prospecto.fechaUltimoContacto !== undefined}
        />
        {/* Indicador ligero de estado terminal (estados 4/5 de JOS-59, D1). */}
        {terminal !== undefined && (
          <p style={{ fontSize: 13, fontWeight: 600, color: terminal.color }}>{terminal.texto}</p>
        )}
      </section>
    </Card>
  );
}

/** Selector de etapa (JOS-19): sección propia entre seguimiento y notas. */
function SeccionEtapa({
  etapaActual,
  guardando,
  error,
  onCambiar,
}: {
  etapaActual: Etapa;
  guardando: boolean;
  error: string | null;
  onCambiar: (etapa: Etapa) => void;
}) {
  return (
    <section aria-label={TITULO_ETAPA} className="flex flex-col gap-2">
      <h2 style={estiloH2Seccion}>{TITULO_ETAPA}</h2>
      <SelectorEtapa etapaActual={etapaActual} deshabilitado={guardando} onCambiar={onCambiar} />
      {error !== null && (
        <p
          role="alert"
          style={{
            padding: "10px 12px",
            borderRadius: "var(--radius-md)",
            background: "var(--color-error-bg)",
            color: "var(--color-error-text)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {error}
        </p>
      )}
    </section>
  );
}

function SeccionNotas({ notas }: { notas?: string }) {
  return (
    <section aria-label="Notas" className="flex flex-col gap-2">
      <h2 style={estiloH2Seccion}>Notas</h2>
      {notas !== undefined ? (
        <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--color-neutral-700)", whiteSpace: "pre-wrap" }}>{notas}</p>
      ) : (
        <p style={{ fontSize: 15, color: "var(--color-neutral-400)" }}>{SIN_NOTAS}</p>
      )}
    </section>
  );
}

function SeccionHistorial({
  entradas,
  completo,
  cargandoPrimera,
  rutaRegistrar,
}: {
  entradas: InteraccionPublica[];
  completo: boolean;
  cargandoPrimera: boolean;
  rutaRegistrar: string;
}) {
  return (
    <section aria-label="Historial" className="mt-8 lg:mt-0 flex flex-col gap-3">
      {/* Cabecera sticky en escritorio (P15): al estar al PRINCIPIO de la
          columna, el CTA entra en viewport desde el primer render y permanece
          visible durante todo el scroll del historial. */}
      <div
        className="flex items-center justify-between gap-3 lg:sticky lg:top-[var(--layout-header)] lg:z-10 lg:py-2"
        style={{ background: "var(--surface-app)" }}
      >
        <h2 style={estiloH2Seccion}>{tituloHistorial(entradas.length, completo)}</h2>
        {/* El span oculta el enlace en móvil: el display inline de buttonStyle
            ganaría a una clase hidden puesta en el propio Link. */}
        <span className="hidden lg:inline-flex">
          <Link href={rutaRegistrar} style={buttonStyle({ size: "md" })}>
            {CTA_REGISTRAR}
          </Link>
        </span>
      </div>

      {cargandoPrimera ? (
        <p role="status" style={estiloCargando}>
          {CARGANDO_HISTORIAL}
        </p>
      ) : completo && entradas.length === 0 ? (
        <EmptyState
          icon="message-circle"
          title={VACIO_TITULO}
          description={VACIO_DESCRIPCION}
          ctaLabel={CTA_REGISTRAR}
          ctaHref={rutaRegistrar}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {entradas.map((interaccion) => (
              <EntradaHistorial key={interaccion.id} interaccion={interaccion} />
            ))}
          </ul>
          {/* Carga progresiva del drenaje (P11): lo recibido ya se muestra. */}
          {!completo && (
            <p role="status" style={estiloCargando}>
              {CARGANDO_HISTORIAL}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function EntradaHistorial({ interaccion }: { interaccion: InteraccionPublica }) {
  const tipo = metaTipo(interaccion.tipo);
  const badge = RESULTADO_BADGE[interaccion.resultado];
  return (
    <li>
      <Card>
        <article className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: 13, color: "var(--color-neutral-500)" }}>{formatearFechaEs(interaccion.fecha)}</span>
            <span className="flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-neutral-700)" }}>
              <Icon name={tipo.icon} size={15} color="var(--color-neutral-500)" />
              {tipo.label}
            </span>
            <Badge
              tone={badge.tone}
              style={{
                marginLeft: "auto",
                ...(badge.suave ? { background: "var(--color-neutral-50)", color: "var(--color-neutral-500)" } : {}),
              }}
            >
              {etiquetaResultado(interaccion.resultado)}
            </Badge>
          </div>

          {/* Texto COMPLETO, sin truncar (letra de JOS-20 sobre el prompt de diseño). */}
          <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--color-neutral-900)", whiteSpace: "pre-wrap" }}>
            {interaccion.queOcurrio}
          </p>

          {interaccion.siguientePasoAcordado !== undefined && (
            <p style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>
              {PREFIJO_SIGUIENTE_PASO + interaccion.siguientePasoAcordado}
            </p>
          )}
        </article>
      </Card>
    </li>
  );
}
