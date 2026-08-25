"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";
import type { InteraccionPublica, ProspectoPublico } from "../../../../../../../../convex/lib/proyecciones";
import { APP_TZ, civilDate, dayKeyToday, formatDayKey, ventanaDia } from "../../../../../../../../convex/lib/fecha";
import { Avatar, Button, Input, PillSelect, StageBadge } from "@/components/ui";
import { FormHeader } from "@/components/layout/FormHeader";
import { escribirFlash } from "@/lib/flash";
import {
  AYUDA_FECHA_CONTACTO,
  BANNER_ERROR_RED,
  CARGANDO_INTERACCION,
  ERROR_FECHA_FUTURA,
  ERROR_FECHA_OBLIGATORIA,
  ERROR_QUE_OCURRIO_OBLIGATORIO,
  GUARDANDO,
  GUARDAR_CAMBIOS,
  MAX_QUE_OCURRIO,
  OPCIONES_RESULTADO,
  OPCIONES_TIPO,
  PLACEHOLDER_QUE_OCURRIO,
  PLACEHOLDER_SIGUIENTE_PASO,
  TITULO_CORREGIR,
  TOAST_CAMBIOS_GUARDADOS,
  type ResultadoInteraccion,
  type TipoInteraccion,
} from "./textos";

type Campo = "fecha" | "queOcurrio";

/** `data` del contrato de errores de M2, si el rechazo viene de un ConvexError. */
function datosConvex(e: unknown): { code?: string; field?: string } | undefined {
  return e instanceof ConvexError ? (e.data as { code?: string; field?: string }) : undefined;
}

/**
 * field del servidor → campo y texto inline. La pantalla de corrección solo tiene una fecha (la del
 * contacto), a diferencia de "nueva" (JOS-68), así que el mapeo es más simple.
 */
const ERROR_SERVIDOR: Record<string, { campo: Campo; texto: string }> = {
  fecha: { campo: "fecha", texto: ERROR_FECHA_FUTURA },
  queOcurrio: { campo: "queOcurrio", texto: ERROR_QUE_OCURRIO_OBLIGATORIO },
};

/**
 * dayKey → ms: hoy → ahora (así "completados hoy" del ritmo se mantiene); día anterior → medianoche
 * de Madrid + 12 h, que cae dentro del día civil elegido incluso en cambios de DST y nunca en el
 * futuro. Mismo criterio que "Registrar interacción".
 */
function fechaSeleccionadaAMs(dayKey: string, ahoraMs: number): number {
  if (dayKey === dayKeyToday(ahoraMs, APP_TZ)) return ahoraMs;
  return ventanaDia(dayKey, APP_TZ).hoyInicio + 12 * 3_600_000;
}

/**
 * Pantalla "Corregir interacción" (JOS-80 Trozo B). Edita los campos que la interacción ALMACENA;
 * la "fecha acordada" no está aquí (se gestiona en la Ficha, JOS-69). El backend recalcula las
 * fechas del prospecto SOLO si cambia la fecha del contacto.
 *
 * La ficha es siempre el destino (de ella se llega): salida DETERMINISTA con `replace`, al guardar
 * y al cancelar. Un id ajeno/inexistente hace que `obtener` lance NOT_FOUND al error boundary del
 * segmento (error.tsx).
 *
 * El formulario se monta con los datos YA cargados: así `useState` los usa de valor inicial y no
 * hace falta sincronizar con un efecto (que pisaría lo que el usuario esté tecleando si la
 * suscripción se refresca).
 */
export default function CorregirInteraccionPage() {
  const params = useParams<{ id: string; interaccionId: string }>();
  const prospectoId = params.id as Id<"prospectos">;
  const interaccionId = params.interaccionId as Id<"interacciones">;

  const prospecto = useQuery(api.prospectos.obtener, { id: prospectoId });
  // La interacción se pide CON el prospecto de la ruta: el backend valida que se correspondan (ruta
  // anidada) y, si no, lanza NOT_FOUND al error boundary del segmento.
  const interaccion = useQuery(api.interacciones.obtener, { prospectoId, id: interaccionId });

  if (prospecto === undefined || interaccion === undefined) {
    return (
      <div style={{ fontFamily: "var(--font-sans)" }}>
        <FormHeader titulo={TITULO_CORREGIR} hrefCancelar={`/prospectos/${prospectoId}`} />
        <p role="status" style={{ padding: "48px 16px", textAlign: "center", color: "var(--color-neutral-500)", fontSize: 15 }}>
          {CARGANDO_INTERACCION}
        </p>
      </div>
    );
  }

  return <FormularioCorreccion prospecto={prospecto} interaccion={interaccion} />;
}

function FormularioCorreccion({ prospecto, interaccion }: { prospecto: ProspectoPublico; interaccion: InteraccionPublica }) {
  const router = useRouter();
  const actualizar = useMutation(api.interacciones.actualizar);
  // Identidad de la URL. `obtener` ya garantizó que la interacción pertenece a este prospecto.
  const destino = `/prospectos/${prospecto.id}`;

  // Valores iniciales tomados una sola vez de la interacción cargada. La fecha almacenada (ms) se
  // presenta como dayKey; su dayKey original se congela para saber luego si el usuario cambió el DÍA.
  const [fechaOriginalDayKey] = React.useState(() => formatDayKey(civilDate(interaccion.fecha, APP_TZ)));
  const [tipo, setTipo] = React.useState<TipoInteraccion>(interaccion.tipo);
  const [fecha, setFecha] = React.useState(fechaOriginalDayKey);
  const [queOcurrio, setQueOcurrio] = React.useState(interaccion.queOcurrio);
  const [resultado, setResultado] = React.useState<ResultadoInteraccion>(interaccion.resultado);
  const [siguientePaso, setSiguientePaso] = React.useState(interaccion.siguientePasoAcordado ?? "");
  const [errores, setErrores] = React.useState<Partial<Record<Campo, string>>>({});
  const [errorGeneral, setErrorGeneral] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);
  // Guarda SÍNCRONA contra el doble envío (el estado no cambia hasta el re-render).
  const enviando = React.useRef(false);

  // Día de apertura (para max y disabled). La validación real recalcula "hoy" al enviar.
  const [hoyDayKey] = React.useState(() => dayKeyToday(Date.now(), APP_TZ));

  const obligatoriosListos = queOcurrio.trim() !== "" && fecha !== "" && fecha <= hoyDayKey;

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
    if (fecha === "") nuevos.fecha = ERROR_FECHA_OBLIGATORIA;
    else if (fecha > dayKeyToday(Date.now(), APP_TZ)) nuevos.fecha = ERROR_FECHA_FUTURA;
    if (queOcurrio.trim() === "") nuevos.queOcurrio = ERROR_QUE_OCURRIO_OBLIGATORIO;
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  async function manejarEnvio(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando.current) return;
    setErrorGeneral(null);
    if (!validar()) return;
    enviando.current = true;
    setGuardando(true);
    try {
      // Se envía SOLO lo que cambió respecto a la interacción cargada. Mandar siempre todos los
      // campos permitiría que una segunda pestaña —que corrigió otra cosa— pisara con su copia
      // antigua lo que la primera acababa de cambiar: el patch parcial del backend cumple aquí su
      // propósito. La fecha, además, solo viaja si cambió el DÍA (no reescribe la hora ni recalcula
      // por una corrección de texto).
      const patch: {
        id: Id<"interacciones">;
        tipo?: TipoInteraccion;
        resultado?: ResultadoInteraccion;
        queOcurrio?: string;
        siguientePasoAcordado?: string;
        fecha?: number;
      } = { id: interaccion.id };
      if (tipo !== interaccion.tipo) patch.tipo = tipo;
      if (resultado !== interaccion.resultado) patch.resultado = resultado;
      const queOcurrioTrim = queOcurrio.trim();
      if (queOcurrioTrim !== interaccion.queOcurrio) patch.queOcurrio = queOcurrioTrim;
      // El "siguiente paso" ausente original equivale a vacío en el formulario; enviar "" lo ELIMINA
      // en el backend (nulos por ausencia), y solo se manda si de verdad cambió.
      const siguienteTrim = siguientePaso.trim();
      if (siguienteTrim !== (interaccion.siguientePasoAcordado ?? "")) patch.siguientePasoAcordado = siguienteTrim;
      if (fecha !== fechaOriginalDayKey) patch.fecha = fechaSeleccionadaAMs(fecha, Date.now());
      await actualizar(patch);
      // La Ficha consume el flash al montar y muestra el toast.
      escribirFlash(TOAST_CAMBIOS_GUARDADOS);
      router.replace(destino);
    } catch (err) {
      const datos = datosConvex(err);
      const field = datos?.code === "VALIDATION_ERROR" ? datos.field : undefined;
      const mapeo = field !== undefined ? ERROR_SERVIDOR[field] : undefined;
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
      <FormHeader titulo={TITULO_CORREGIR} hrefCancelar={destino} />
      <form onSubmit={manejarEnvio} noValidate className="mx-auto w-full max-w-2xl px-4 pt-6 md:px-6 md:pt-8">
        {/* Contexto del prospecto en cabecera, como en "Registrar interacción". */}
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

        <div className="flex flex-col gap-5 mt-6">
          <PillSelect
            label="Tipo de contacto"
            options={OPCIONES_TIPO}
            value={tipo}
            onChange={(v) => setTipo(v)}
          />
          <Input
            label="Fecha del contacto"
            type="date"
            value={fecha}
            max={hoyDayKey}
            helper={AYUDA_FECHA_CONTACTO}
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
            value={resultado}
            onChange={(v) => setResultado(v)}
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
            {guardando ? GUARDANDO : GUARDAR_CAMBIOS}
          </Button>
        </div>
      </form>
    </div>
  );
}
