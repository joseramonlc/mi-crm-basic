"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { APP_TZ, dayKeyToday, ventanaDia } from "../../../../../../../convex/lib/fecha";
import { Avatar, Button, Input, PillSelect, StageBadge } from "@/components/ui";
import { FormHeader } from "@/components/layout/FormHeader";
import { escribirFlash } from "@/lib/flash";
import {
  BANNER_ERROR_RED,
  ERROR_FECHA_FUTURA,
  ERROR_FECHA_OBLIGATORIA,
  ERROR_QUE_OCURRIO_OBLIGATORIO,
  ERROR_RESULTADO_OBLIGATORIO,
  ERROR_TIPO_OBLIGATORIO,
  MAX_QUE_OCURRIO,
  OPCIONES_RESULTADO,
  OPCIONES_TIPO,
  PLACEHOLDER_QUE_OCURRIO,
  PLACEHOLDER_SIGUIENTE_PASO,
  textoToast,
  type ResultadoInteraccion,
  type TipoInteraccion,
} from "./textos";

type Campo = "tipo" | "fecha" | "queOcurrio" | "resultado";

/** `data` del contrato de errores de M2, si el rechazo viene de un ConvexError. */
function datosConvex(e: unknown): { code?: string; field?: string; message?: string } | undefined {
  return e instanceof ConvexError ? (e.data as { code?: string; field?: string; message?: string }) : undefined;
}

/** field del servidor → campo y texto inline del cliente (última defensa). */
const ERROR_SERVIDOR: Record<string, { campo: Campo; texto: string }> = {
  fecha: { campo: "fecha", texto: ERROR_FECHA_FUTURA },
  queOcurrio: { campo: "queOcurrio", texto: ERROR_QUE_OCURRIO_OBLIGATORIO },
};

/**
 * Conversión de la fecha civil del input date (dayKey) a ms (rev. 2, P7):
 * hoy → ahora (así "completados hoy" del ritmo sube al volver); día anterior →
 * medianoche de Madrid + 12 h, que cae dentro del día civil elegido incluso en
 * cambios de DST y nunca en el futuro. El futuro se bloquea antes de llegar aquí.
 */
function fechaSeleccionadaAMs(dayKey: string, ahoraMs: number): number {
  if (dayKey === dayKeyToday(ahoraMs, APP_TZ)) return ahoraMs;
  return ventanaDia(dayKey, APP_TZ).hoyInicio + 12 * 3_600_000;
}

/**
 * Pantalla "Registrar Interacción" (JOS-16): log del contacto con el prospecto
 * SIEMPRE preseleccionado (viene en la ruta). El backend de M2 actualiza
 * fechaUltimoContacto y recalcula el seguimiento en la misma transacción.
 * Al éxito: flash + replace a la Ficha (P8/P10). Cancelar navega SIEMPRE a la
 * Ficha con replace (contrato rev. 2). Si el prospecto no existe o es ajeno,
 * la query de contexto lanza NOT_FOUND al error boundary del segmento.
 */
export default function RegistrarInteraccionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const prospectoId = params.id as Id<"prospectos">;

  const prospecto = useQuery(api.prospectos.obtener, { id: prospectoId });
  const crear = useMutation(api.interacciones.crear);

  const [tipo, setTipo] = React.useState<TipoInteraccion | "">("");
  const [fecha, setFecha] = React.useState(() => dayKeyToday(Date.now(), APP_TZ));
  const [queOcurrio, setQueOcurrio] = React.useState("");
  const [resultado, setResultado] = React.useState<ResultadoInteraccion | "">("");
  const [siguientePaso, setSiguientePaso] = React.useState("");
  const [errores, setErrores] = React.useState<Partial<Record<Campo, string>>>({});
  const [errorGeneral, setErrorGeneral] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);
  // Guarda SÍNCRONA contra el doble envío: `guardando` (estado) no cambia
  // hasta el re-render, así que dos submits en la misma tarea lo verían falso.
  const enviando = React.useRef(false);

  // Día de apertura del formulario (para max y disabled). Si la medianoche
  // cruza con el formulario abierto, validar() recalcula "hoy" al enviar:
  // la validación real nunca usa este valor potencialmente desfasado.
  const [hoyDayKey] = React.useState(() => dayKeyToday(Date.now(), APP_TZ));
  const obligatoriosListos =
    tipo !== "" && resultado !== "" && queOcurrio.trim() !== "" && fecha !== "" && fecha <= hoyDayKey;

  function limpiarError(campo: Campo) {
    setErrores((prev) => {
      if (!(campo in prev)) return prev;
      const resto = { ...prev };
      delete resto[campo];
      return resto;
    });
  }

  function validar(): boolean {
    const nuevos: Partial<Record<Campo, string>> = {};
    if (tipo === "") nuevos.tipo = ERROR_TIPO_OBLIGATORIO;
    if (fecha === "") nuevos.fecha = ERROR_FECHA_OBLIGATORIA;
    else if (fecha > dayKeyToday(Date.now(), APP_TZ)) nuevos.fecha = ERROR_FECHA_FUTURA;
    if (queOcurrio.trim() === "") nuevos.queOcurrio = ERROR_QUE_OCURRIO_OBLIGATORIO;
    if (resultado === "") nuevos.resultado = ERROR_RESULTADO_OBLIGATORIO;
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  async function manejarEnvio(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Guarda de reentrada: un submit implícito o programático esquiva el
    // disabled del botón (JOS-16 exige evitar el doble envío); el ref lo corta
    // también dentro de la misma tarea síncrona.
    if (enviando.current) return;
    setErrorGeneral(null);
    if (!validar()) return;
    enviando.current = true;
    setGuardando(true);
    try {
      const respuesta = await crear({
        prospectoId,
        fecha: fechaSeleccionadaAMs(fecha, Date.now()),
        tipo: tipo as TipoInteraccion,
        queOcurrio: queOcurrio.trim(),
        resultado: resultado as ResultadoInteraccion,
        ...(siguientePaso.trim() !== "" ? { siguientePasoAcordado: siguientePaso.trim() } : {}),
      });
      // El destino (Ficha) consume el flash al montar y muestra el toast (P8).
      escribirFlash(textoToast(respuesta.prospecto.fechaProximoSeguimiento));
      router.replace(`/prospectos/${prospectoId}`);
    } catch (err) {
      const datos = datosConvex(err);
      const mapeo = datos?.code === "VALIDATION_ERROR" && datos.field !== undefined ? ERROR_SERVIDOR[datos.field] : undefined;
      if (mapeo !== undefined) {
        setErrores({ [mapeo.campo]: mapeo.texto });
      } else {
        setErrorGeneral(BANNER_ERROR_RED);
      }
      enviando.current = false;
      setGuardando(false);
    }
  }

  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      <FormHeader titulo="Registrar interacción" hrefCancelar={`/prospectos/${prospectoId}`} />
      <form onSubmit={manejarEnvio} noValidate className="mx-auto w-full max-w-2xl px-4 pt-6 md:px-6 md:pt-8">
        {/* Contexto del prospecto SIEMPRE visible en cabecera (JOS-16/JOS-61). */}
        {prospecto === undefined ? (
          <p role="status" style={{ padding: "12px 0", color: "var(--color-neutral-500)", fontSize: 15 }}>
            Cargando prospecto…
          </p>
        ) : (
          <div
            className="flex items-center gap-3"
            style={{
              padding: "12px 16px",
              background: "var(--surface-card)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <Avatar name={prospecto.nombre} size="sm" />
            <span className="truncate" style={{ fontSize: 15, fontWeight: 600, color: "var(--color-neutral-900)" }}>
              {prospecto.nombre}
            </span>
            <StageBadge stage={prospecto.etapaActual} style={{ marginLeft: "auto" }} />
          </div>
        )}

        <div className="flex flex-col gap-5 mt-6">
          <PillSelect
            label="Tipo de contacto"
            options={OPCIONES_TIPO}
            value={tipo === "" ? undefined : tipo}
            error={errores.tipo}
            onChange={(v) => {
              setTipo(v);
              limpiarError("tipo");
            }}
          />
          <Input
            label="Fecha del contacto"
            type="date"
            value={fecha}
            max={hoyDayKey}
            error={errores.fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              limpiarError("fecha");
            }}
          />
          <Input
            label="Qué ocurrió"
            multiline
            rows={3}
            value={queOcurrio}
            placeholder={PLACEHOLDER_QUE_OCURRIO}
            maxLength={MAX_QUE_OCURRIO}
            error={errores.queOcurrio}
            onChange={(e) => {
              setQueOcurrio(e.target.value);
              limpiarError("queOcurrio");
            }}
          />
          <PillSelect
            label="Resultado"
            options={OPCIONES_RESULTADO}
            value={resultado === "" ? undefined : resultado}
            error={errores.resultado}
            onChange={(v) => {
              setResultado(v);
              limpiarError("resultado");
            }}
          />
          <Input
            label="Siguiente paso acordado"
            multiline
            rows={2}
            value={siguientePaso}
            placeholder={PLACEHOLDER_SIGUIENTE_PASO}
            onChange={(e) => setSiguientePaso(e.target.value)}
          />
        </div>

        {/* Sticky por encima de la tab bar móvil; ver nota de teclado en JOS-15. */}
        <div
          className="sticky bottom-[var(--layout-tabbar)] md:bottom-0 z-10 mt-6"
          style={{ background: "var(--surface-app)", padding: "12px 0 16px" }}
        >
          {errorGeneral && (
            <p
              role="alert"
              style={{
                marginBottom: 10,
                padding: "10px 12px",
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
          <Button type="submit" size="lg" fullWidth loading={guardando} disabled={!obligatoriosListos}>
            {guardando ? "Guardando…" : "Guardar interacción"}
          </Button>
        </div>
      </form>
    </div>
  );
}
