"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { APP_TZ, dayKeyToday, ventanaDia } from "../../../../../../../convex/lib/fecha";
import { esTerminal } from "../../../../../../../convex/lib/seguimiento";
import { Avatar, Button, Input, PillSelect, StageBadge } from "@/components/ui";
import { FormHeader } from "@/components/layout/FormHeader";
import { escribirFlash } from "@/lib/flash";
import { destinoAlSalir, PARAM_VOLVER } from "@/lib/volver";
import {
  AYUDA_FECHA_ACORDADA,
  AYUDA_FECHA_CONTACTO,
  BANNER_ERROR_RED,
  BANNER_ETAPA_TERMINAL,
  ERROR_FECHA_ACORDADA_PASADA,
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

type Campo = "tipo" | "fecha" | "queOcurrio" | "resultado" | "fechaAcordada";

/** `data` del contrato de errores de M2, si el rechazo viene de un ConvexError. */
function datosConvex(e: unknown): { code?: string; field?: string; message?: string } | undefined {
  return e instanceof ConvexError ? (e.data as { code?: string; field?: string; message?: string }) : undefined;
}

/**
 * field del servidor → campo y texto inline del cliente (última defensa).
 *
 * `fechaAcordada` tiene entrada propia y NO comparte la de `fecha`: son las dos
 * fechas de la pantalla y sus reglas son opuestas (JOS-68). Por eso el servidor
 * las distingue en el `field` — sin ello, el rechazo de una pintaría la otra.
 */
const ERROR_SERVIDOR: Record<string, { campo: Campo; texto: string }> = {
  fecha: { campo: "fecha", texto: ERROR_FECHA_FUTURA },
  queOcurrio: { campo: "queOcurrio", texto: ERROR_QUE_OCURRIO_OBLIGATORIO },
  fechaAcordada: { campo: "fechaAcordada", texto: ERROR_FECHA_ACORDADA_PASADA },
};

/**
 * field del servidor → banner, para los rechazos que no pertenecen a ningún
 * campo del formulario. `etapaActual` llega cuando el prospecto pasó a una etapa
 * terminal con la pantalla ya abierta; el banner de red sería engañoso.
 */
const BANNER_SERVIDOR: Record<string, string> = {
  etapaActual: BANNER_ETAPA_TERMINAL,
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
 * Conversión de la fecha ACORDADA (JOS-68). Siempre mediodía de Madrid del día
 * elegido: cae dentro del día civil correcto incluso en cambios de DST, y el
 * servidor lo normaliza a medianoche. Aquí no hay caso "hoy → ahora" —esa regla
 * existía para que el ritmo del día contase el registro recién hecho, y esta
 * fecha no registra nada: apunta al futuro.
 */
function fechaAcordadaAMs(dayKey: string): number {
  return ventanaDia(dayKey, APP_TZ).hoyInicio + 12 * 3_600_000;
}

/**
 * Envoltura de la pantalla: el formulario lee el parámetro `volver` de la URL y
 * `useSearchParams` suspende durante el prerenderizado, así que el hook necesita
 * una barrera por encima (docs de Next 16, use-search-params § "Behavior").
 *
 * Matiz medido, no supuesto: hoy esta ruta es dinámica (`[id]` sin
 * `generateStaticParams`) y `next build` la clasifica como ƒ, luego no se
 * prerenderiza y la compilación pasaría igual sin la barrera. Se mantiene por lo
 * que recomienda la documentación y porque un cambio futuro —añadir
 * `generateStaticParams`, activar PPR— convertiría su ausencia en un fallo de
 * build.
 */
export default function RegistrarInteraccionPage() {
  return (
    <React.Suspense fallback={<CargandoFormulario />}>
      <FormularioInteraccion />
    </React.Suspense>
  );
}

function CargandoFormulario() {
  return (
    <p role="status" style={{ padding: "48px 16px", textAlign: "center", color: "var(--color-neutral-500)", fontSize: 15, fontFamily: "var(--font-sans)" }}>
      Cargando formulario…
    </p>
  );
}

/**
 * Pantalla "Registrar Interacción" (JOS-16): log del contacto con el prospecto
 * SIEMPRE preseleccionado (viene en la ruta). El backend de M2 actualiza
 * fechaUltimoContacto y recalcula el seguimiento en la misma transacción.
 *
 * Salida DETERMINISTA con replace, tanto al guardar como al cancelar (contrato
 * rev. 2 de M3), pero el destino ya no es único: desde la acción rápida de la
 * Actividad Diaria (JOS-23) se vuelve a ella; desde la Ficha, a la Ficha. Lo
 * decide `destinoAlSalir`, que compara el parámetro y nunca lo concatena.
 *
 * Si el prospecto no existe o es ajeno, la query de contexto lanza NOT_FOUND al
 * error boundary del segmento.
 */
function FormularioInteraccion() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const prospectoId = params.id as Id<"prospectos">;
  const destinoSalida = destinoAlSalir(useSearchParams().get(PARAM_VOLVER), prospectoId);

  const prospecto = useQuery(api.prospectos.obtener, { id: prospectoId });
  const crear = useMutation(api.interacciones.crear);

  const [tipo, setTipo] = React.useState<TipoInteraccion | "">("");
  const [fecha, setFecha] = React.useState(() => dayKeyToday(Date.now(), APP_TZ));
  const [queOcurrio, setQueOcurrio] = React.useState("");
  const [resultado, setResultado] = React.useState<ResultadoInteraccion | "">("");
  const [siguientePaso, setSiguientePaso] = React.useState("");
  const [fechaAcordada, setFechaAcordada] = React.useState("");
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

  // ¿Cabe pactar un próximo contacto? (JOS-68) En etapas terminales JOS-8 promete
  // "sin seguimiento" y el servidor lo rechaza, así que el campo ni se ofrece.
  // Exige el prospecto CARGADO: con `undefined` la etapa aún no se conoce y
  // pintar el campo para esconderlo al llegar la respuesta daría un parpadeo.
  const permiteAcuerdo = prospecto !== undefined && !esTerminal(prospecto.etapaActual);
  const acordadaEnviable = permiteAcuerdo && fechaAcordada !== "";

  const obligatoriosListos =
    tipo !== "" &&
    resultado !== "" &&
    queOcurrio.trim() !== "" &&
    fecha !== "" &&
    fecha <= hoyDayKey &&
    // Espejo del bloqueo de la fecha de la interacción: opcional, pero si está
    // puesta y es inválida el botón no invita a enviar.
    (!acordadaEnviable || fechaAcordada >= hoyDayKey);

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
    // Opcional: solo se valida si el usuario la puso. "Hoy" se recalcula al
    // enviar, igual que la fecha de la interacción, por si cruzó la medianoche.
    if (acordadaEnviable && fechaAcordada < dayKeyToday(Date.now(), APP_TZ)) {
      nuevos.fechaAcordada = ERROR_FECHA_ACORDADA_PASADA;
    }
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
        ...(acordadaEnviable ? { fechaAcordada: fechaAcordadaAMs(fechaAcordada) } : {}),
      });
      // El destino —Ficha o Actividad Diaria— consume el flash al montar y
      // muestra el toast (P8). Quién puso la fecha lo dice el prospecto que
      // devuelve el servidor, no lo que el formulario creía enviar.
      escribirFlash(
        textoToast(respuesta.prospecto.fechaProximoSeguimiento, respuesta.prospecto.seguimientoManual === true),
      );
      router.replace(destinoSalida);
    } catch (err) {
      const datos = datosConvex(err);
      const field = datos?.code === "VALIDATION_ERROR" ? datos.field : undefined;
      const mapeo = field !== undefined ? ERROR_SERVIDOR[field] : undefined;
      if (mapeo !== undefined) {
        setErrores({ [mapeo.campo]: mapeo.texto });
      } else {
        setErrorGeneral((field !== undefined ? BANNER_SERVIDOR[field] : undefined) ?? BANNER_ERROR_RED);
      }
      enviando.current = false;
      setGuardando(false);
    }
  }

  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      <FormHeader titulo="Registrar interacción" hrefCancelar={destinoSalida} />
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
          {/*
            JOS-68. Va el ÚLTIMO y pegado al siguiente paso —que recoge el "qué"
            del acuerdo mientras este recoge el "cuándo"—, lo más lejos posible de
            la fecha de la interacción: son dos fechas de significado opuesto en
            la misma pantalla y ese es el riesgo de confusión de la tarea.
          */}
          {permiteAcuerdo && (
            <Input
              label="Próximo contacto acordado"
              type="date"
              value={fechaAcordada}
              min={hoyDayKey}
              helper={AYUDA_FECHA_ACORDADA}
              error={errores.fechaAcordada}
              onChange={(e) => {
                setFechaAcordada(e.target.value);
                limpiarError("fechaAcordada");
              }}
            />
          )}
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
