import * as React from "react";
import { ConvexError } from "convex/values";
import { APP_TZ, dayKeyToday } from "../../../../../convex/lib/fecha";
import { acuerdoActivo, esTerminal } from "../../../../../convex/lib/seguimiento";
import type { ProspectoPublico } from "../../../../../convex/lib/proyecciones";
import { Button, buttonStyle, Icon, Input } from "@/components/ui";
import { formatearFechaEs } from "@/lib/etiquetas";
import { fechaAcordadaAMs } from "@/lib/fechaAcordada";
import { urlGoogleCalendar } from "@/lib/calendario";
import {
  ACCION_CALENDARIO,
  ACCION_CAMBIAR_FECHA,
  ACCION_CANCELAR_FECHA,
  ACCION_FIJAR,
  ACCION_GUARDAR_FECHA,
  ACCION_QUITAR,
  AYUDA_CAMPO_ACORDADA,
  ERROR_FECHA_ACORDADA_PASADA,
  ERROR_FECHA_ACORDADA_VACIA,
  ERROR_SEGUIMIENTO_RED,
  ERROR_SEGUIMIENTO_TERMINAL,
  ETIQUETA_CAMPO_ACORDADA,
  ETIQUETA_SEGUIMIENTO_ACORDADO,
  ETIQUETA_SEGUIMIENTO_MOTOR,
  EXPLICACION_ACORDADO,
  EXPLICACION_MOTOR,
  GUARDANDO_FECHA,
  SIN_SEGUIMIENTO,
  etiquetaCanal,
} from "./textos";

export interface SeguimientoAcordadoProps {
  prospecto: ProspectoPublico;
  /** Fija la cita acordada. Recibe ms; si rechaza, la fecha tecleada se conserva. */
  onFijar: (fechaMs: number) => Promise<unknown>;
  /** Devuelve el control al motor. Sin argumentos: el servidor recalcula. */
  onQuitar: () => Promise<unknown>;
}

/** `data` del contrato de errores de M2, si el rechazo viene de un ConvexError (patrón JOS-15/JOS-18). */
function datosConvex(e: unknown): { code?: string; field?: string; message?: string } | undefined {
  return e instanceof ConvexError ? (e.data as { code?: string; field?: string; message?: string }) : undefined;
}

/**
 * Fila de fecha de la tarjeta de Seguimiento. Vive aquí porque este componente
 * es el dueño de esa presentación; la ficha la reutiliza para "Último contacto".
 */
export function DatoFecha({ etiqueta, valor, conValor }: { etiqueta: string; valor: string; conValor: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-neutral-500)" }}>{etiqueta}</span>
      <span style={{ fontSize: 16, fontWeight: conValor ? 600 : 400, color: conValor ? "var(--color-neutral-900)" : "var(--color-neutral-500)" }}>
        {valor}
      </span>
    </div>
  );
}

/**
 * Fecha de próximo contacto de la ficha, EDITABLE (JOS-69), co-localizada como
 * SelectorEtapa y EdicionDatos: no conoce Convex, solo recibe dos callbacks.
 *
 * Revierte a propósito la letra de JOS-18, que listaba `fechaProximoSeguimiento`
 * entre los campos no editables: la Mejora #4 introduce la excepción de la cita
 * acordada. El motor sigue gobernando por defecto.
 *
 * Los dos estados se distinguen por etiqueta Y por la frase de debajo, y quién
 * manda lo decide `acuerdoActivo`, el mismo predicado del backend (exige la
 * marca y la fecha; un documento con marca pero sin fecha es anómalo y se
 * muestra como automático, que es donde el motor lo devuelve).
 *
 * Sin estado optimista, como el cambio de etapa: la fecha mostrada es siempre la
 * del servidor y la suscripción refresca la tarjeta al confirmarse.
 */
export function SeguimientoAcordado({ prospecto, onFijar, onQuitar }: SeguimientoAcordadoProps) {
  const acordado = acuerdoActivo(prospecto);
  const terminal = esTerminal(prospecto.etapaActual);

  const [editando, setEditando] = React.useState(false);
  const [fecha, setFecha] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);
  // Guarda SÍNCRONA contra la doble activación (lección de M3 y M4B2): el estado
  // no cambia hasta el re-render, así que dos toques en la misma tarea lo verían
  // a false y dispararían dos mutations.
  const enviando = React.useRef(false);

  // Día de apertura, para el `min` del input. La validación real recalcula "hoy"
  // al guardar: si la medianoche cruza con la ficha abierta, este valor caduca.
  const [hoyDayKey] = React.useState(() => dayKeyToday(Date.now(), APP_TZ));

  function abrir() {
    // Precarga la fecha vigente solo si la puso el usuario: proponer la del
    // motor como si fuese un acuerdo sería ponerle palabras en la boca.
    setFecha(acordado ? dayKeyToday(prospecto.fechaProximoSeguimiento!, APP_TZ) : "");
    setError(null);
    setErrorGeneral(null);
    setEditando(true);
  }

  function cerrar() {
    setEditando(false);
    setError(null);
    setErrorGeneral(null);
  }

  /** Traduce el rechazo del servidor. `etapaActual` no es un campo de este formulario: va al banner. */
  function mostrarFallo(err: unknown) {
    const datos = datosConvex(err);
    if (datos?.code === "VALIDATION_ERROR" && datos.field === "fecha") {
      setError(ERROR_FECHA_ACORDADA_PASADA);
    } else if (datos?.code === "VALIDATION_ERROR" && datos.field === "etapaActual") {
      setErrorGeneral(ERROR_SEGUIMIENTO_TERMINAL);
    } else {
      setErrorGeneral(ERROR_SEGUIMIENTO_RED);
    }
  }

  async function guardar() {
    if (enviando.current) return;
    setErrorGeneral(null);
    if (fecha === "") {
      setError(ERROR_FECHA_ACORDADA_VACIA);
      return;
    }
    if (fecha < dayKeyToday(Date.now(), APP_TZ)) {
      setError(ERROR_FECHA_ACORDADA_PASADA);
      return;
    }
    enviando.current = true;
    setGuardando(true);
    try {
      await onFijar(fechaAcordadaAMs(fecha));
      setEditando(false);
    } catch (err) {
      // Se conserva lo tecleado y el modo edición (P7).
      mostrarFallo(err);
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  }

  async function quitar() {
    if (enviando.current) return;
    enviando.current = true;
    setGuardando(true);
    setErrorGeneral(null);
    try {
      await onQuitar();
    } catch (err) {
      mostrarFallo(err);
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <DatoFecha
        etiqueta={acordado ? ETIQUETA_SEGUIMIENTO_ACORDADO : ETIQUETA_SEGUIMIENTO_MOTOR}
        valor={prospecto.fechaProximoSeguimiento !== undefined ? formatearFechaEs(prospecto.fechaProximoSeguimiento) : SIN_SEGUIMIENTO}
        conValor={prospecto.fechaProximoSeguimiento !== undefined}
      />
      {/*
        La frase acompaña SIEMPRE a la etiqueta, también cuando no hay fecha:
        es la mitad de la distinción entre los dos estados. La excepción son las
        etapas terminales, donde no hay nada que explicar —el motor no programa
        seguimiento— y la tarjeta ya muestra su propio indicador de que el
        prospecto está fuera del pipeline activo.
      */}
      {!terminal && (
        <p style={{ fontSize: 12, color: "var(--color-neutral-400)" }}>{acordado ? EXPLICACION_ACORDADO : EXPLICACION_MOTOR}</p>
      )}

      {/*
        JOS-70. La condición es solo "hay fecha", sin mirar `terminal`: en las
        etapas terminales el motor no programa seguimiento, así que el enlace
        desaparece por sí mismo. Un terminal con un acuerdo colgando SÍ lo
        conserva, y es lo correcto —la cita sigue estando ahí.

        <a> de verdad y no un botón con window.open: abrir en pestaña nueva,
        copiar el enlace y el teclado salen gratis. Es el primer enlace externo
        de la aplicación, así que fija el patrón: target + rel completo.
        `buttonStyle` existe para verse como Button sin serlo; Button no vale
        aquí porque su interfaz extiende los atributos de <button>.
      */}
      {prospecto.fechaProximoSeguimiento !== undefined && (
        <a
          href={urlGoogleCalendar({
            nombre: prospecto.nombre,
            fechaMs: prospecto.fechaProximoSeguimiento,
            canalEtiqueta: etiquetaCanal(prospecto.canalContactoPreferido),
            telefono: prospecto.telefono,
            email: prospecto.email,
          })}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...buttonStyle({ variant: "ghost", size: "sm" }), alignSelf: "flex-start", paddingLeft: 0 }}
        >
          <Icon name="calendar" size={15} />
          {ACCION_CALENDARIO}
        </a>
      )}

      {editando ? (
        <div className="flex flex-col gap-2">
          <Input
            label={ETIQUETA_CAMPO_ACORDADA}
            type="date"
            value={fecha}
            min={hoyDayKey}
            helper={AYUDA_CAMPO_ACORDADA}
            error={error ?? undefined}
            onChange={(e) => {
              setFecha(e.target.value);
              setError(null);
            }}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" loading={guardando} onClick={guardar}>
              {guardando ? GUARDANDO_FECHA : ACCION_GUARDAR_FECHA}
            </Button>
            <Button variant="secondary" size="sm" disabled={guardando} onClick={cerrar}>
              {ACCION_CANCELAR_FECHA}
            </Button>
          </div>
        </div>
      ) : (
        // En etapas terminales no se ofrece fijar: JOS-8 promete "sin
        // seguimiento" y el servidor lo rechaza. Quitar SÍ sigue disponible —esa
        // mutation no rechaza— por si quedase un acuerdo colgando.
        (!terminal || acordado) && (
          <div className="flex flex-wrap items-center gap-2">
            {!terminal && (
              <Button variant="secondary" size="sm" disabled={guardando} onClick={abrir}>
                {acordado ? ACCION_CAMBIAR_FECHA : ACCION_FIJAR}
              </Button>
            )}
            {acordado && (
              <Button variant="ghost" size="sm" loading={guardando} onClick={quitar}>
                {guardando ? GUARDANDO_FECHA : ACCION_QUITAR}
              </Button>
            )}
          </div>
        )
      )}

      {errorGeneral !== null && (
        <p
          role="alert"
          style={{
            padding: "8px 10px",
            borderRadius: "var(--radius-md)",
            background: "var(--color-error-bg)",
            color: "var(--color-error-text)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {errorGeneral}
        </p>
      )}
    </div>
  );
}
