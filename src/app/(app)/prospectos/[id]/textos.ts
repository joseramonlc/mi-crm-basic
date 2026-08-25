import { APP_TZ } from "../../../../../convex/lib/fecha";
import { acuerdoActivo } from "../../../../../convex/lib/seguimiento";
import type { InteraccionPublica, ProspectoPublico } from "../../../../../convex/lib/proyecciones";
import { OPCIONES_CANAL, OPCIONES_RESULTADO, OPCIONES_TIPO, etiquetaEtapa, formatearFechaEs, type Etapa } from "@/lib/etiquetas";
import type { BadgeProps } from "@/components/ui";

type Canal = ProspectoPublico["canalContactoPreferido"];
type Tipo = InteraccionPublica["tipo"];
type Resultado = InteraccionPublica["resultado"];
// Etapa, OPCIONES_ETAPA y etiquetaEtapa viven ahora en @/lib/etiquetas (los
// necesita también el Pipeline, JOS-21). Se re-exportan para que los
// consumidores de esta pantalla —SelectorEtapa— sigan importándolos de aquí.
export { OPCIONES_ETAPA, etiquetaEtapa, type Etapa } from "@/lib/etiquetas";

export const TITULO_FALLBACK = "Ficha del prospecto";
export const ETIQUETA_ATRAS = "Volver a Inicio";
export const CTA_REGISTRAR = "Registrar interacción";
export const CARGANDO_PROSPECTO = "Cargando prospecto…";
export const CARGANDO_HISTORIAL = "Cargando historial…";
export const SIN_SEGUIMIENTO = "Sin seguimiento programado";
export const SIN_CONTACTO = "Sin contacto aún";
export const SIN_NOTAS = "Sin notas todavía.";
export const PREFIJO_SIGUIENTE_PASO = "Siguiente paso: ";

export const VACIO_TITULO = "Sin historial todavía";
/** Copy literal del estado vacío de JOS-20. */
export const VACIO_DESCRIPCION =
  "Aún no hay contactos registrados con este prospecto. Cuando realices la primera llamada o mensaje, regístralo aquí.";

/** Icono del canal preferido (design.md §3; mismo criterio que ProspectCard). */
export const ICONO_CANAL: Record<Canal, string> = {
  whatsapp: "message-circle",
  phone: "phone",
  mail: "mail",
  instagram: "instagram",
  otro: "message-square",
};

/** value → etiqueta de producto (única fuente: las opciones compartidas de P4). */
export function etiquetaCanal(canal: Canal): string {
  return OPCIONES_CANAL.find((o) => o.value === canal)?.label ?? canal;
}

export function metaTipo(tipo: Tipo): { label: string; icon: string } {
  const opcion = OPCIONES_TIPO.find((o) => o.value === tipo);
  return { label: opcion?.label ?? tipo, icon: opcion?.icon ?? "message-circle" };
}

export function etiquetaResultado(resultado: Resultado): string {
  return OPCIONES_RESULTADO.find((o) => o.value === resultado)?.label ?? resultado;
}

/**
 * Tono del Badge del historial por resultado (P9), coherente con las pills de
 * JOS-16. `suave` marca el par neutro apagado de "other" (sin token propio en
 * Badge, se resuelve con los colores neutros del sistema).
 */
export const RESULTADO_BADGE: Record<Resultado, { tone: BadgeProps["tone"]; suave?: boolean }> = {
  interested: { tone: "success" },
  thinking: { tone: "warning" },
  not_interested: { tone: "neutral" },
  other: { tone: "neutral", suave: true },
};

/** "Añadido el 15 jun 2026" — caption de JOS-59, fecha civil en Madrid. */
export function textoFechaAlta(ms: number): string {
  const fecha = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: APP_TZ }).format(ms);
  return `Añadido el ${fecha}`;
}

/** Contador exacto SOLO con el historial completo (P11): sin número durante el drenaje. */
export function tituloHistorial(cantidad: number, completo: boolean): string {
  return completo ? `Historial (${cantidad})` : "Historial";
}

/* ── Cambio de etapa (M4 bocado 2, JOS-19) ────────────────────────────────── */

export const TITULO_ETAPA = "Etapa del pipeline";
export const ERROR_CAMBIO_ETAPA = "No se pudo cambiar la etapa. Comprueba tu conexión e inténtalo de nuevo.";

/**
 * Toast del cambio de etapa (P6): en no terminales el motor SIEMPRE deja
 * fecha (el fallback sin fecha es solo defensivo); en terminales el prospecto
 * sale de la Actividad Diaria y el texto lo dice.
 *
 * Con un acuerdo vigente (JOS-69) la fecha NO se ha movido —la cita acordada
 * gana sobre la regla de la etapa, precedencia de JOS-67— y anunciarla como
 * "próximo contacto" haría creer que el cambio de etapa la recalculó. El texto
 * dice entonces que se mantiene, y por qué.
 *
 * Qué cuenta como acuerdo vigente lo decide `acuerdoActivo`, el MISMO predicado
 * del backend: exige la marca y la fecha. Un documento con la marca pero sin
 * fecha es anómalo y cae al texto normal, igual que allí cae a la rama del motor.
 */
export function textoToastEtapa(etapa: Etapa, fechaProximoSeguimiento?: number, seguimientoManual?: boolean): string {
  if (etapa === "joined") return "¡Incorporado al equipo! Sale de la actividad diaria.";
  if (etapa === "discarded") return "Prospecto descartado. Sale de la actividad diaria.";
  const base = `Etapa actualizada: ${etiquetaEtapa(etapa)}.`;
  if (fechaProximoSeguimiento === undefined) return base;
  if (acuerdoActivo({ fechaProximoSeguimiento, seguimientoManual })) {
    return `${base} Se mantiene el contacto acordado: ${formatearFechaEs(fechaProximoSeguimiento)}`;
  }
  return `${base} Próximo contacto: ${formatearFechaEs(fechaProximoSeguimiento)}`;
}

/* ── Contacto acordado en la ficha (M11, JOS-69) ──────────────────────────── */

/**
 * Las dos caras de la MISMA fecha. El usuario tiene que saber cuál está viendo:
 * si no, el sistema parece errático (la fecha unas veces se mueve al cambiar de
 * etapa y otras no). La etiqueta cambia, y debajo va siempre una frase que dice
 * quién la puso — una etiqueta que muta sola es fácil de no notar.
 */
export const ETIQUETA_SEGUIMIENTO_MOTOR = "Próximo seguimiento";
export const ETIQUETA_SEGUIMIENTO_ACORDADO = "Contacto acordado";
export const EXPLICACION_MOTOR = "La calcula el sistema según la etapa";
export const EXPLICACION_ACORDADO = "La acordaste tú con el prospecto";

export const ACCION_FIJAR = "Fijar contacto acordado";
export const ACCION_CAMBIAR_FECHA = "Cambiar fecha";
/** Volver al automático es una acción VISIBLE, nunca un menú escondido (letra de JOS-69). */
export const ACCION_QUITAR = "Volver al automático";
export const ACCION_GUARDAR_FECHA = "Guardar";
export const ACCION_CANCELAR_FECHA = "Cancelar";
/** JOS-70. El evento se crea en el calendario del usuario, no en el CRM: de ahí el «mi». */
export const ACCION_CALENDARIO = "Añadir a mi calendario";
export const GUARDANDO_FECHA = "Guardando…";

export const ETIQUETA_CAMPO_ACORDADA = "Fecha del próximo contacto";
export const AYUDA_CAMPO_ACORDADA = "Solo hoy o más adelante";

export const ERROR_FECHA_ACORDADA_PASADA = "La fecha acordada no puede estar en el pasado";
/** No es lo mismo elegir mal que no elegir: cada fallo dice lo que pasa de verdad. */
export const ERROR_FECHA_ACORDADA_VACIA = "Elige una fecha";
export const ERROR_SEGUIMIENTO_RED = "No se pudo guardar la fecha. Comprueba tu conexión e inténtalo de nuevo.";
/**
 * El servidor rechaza fijar en etapas terminales. La tarjeta no ofrece la acción
 * ahí, así que esto solo aparece en una carrera (la etapa cambió con la ficha
 * abierta); el banner de red mandaría a comprobar la conexión sin motivo.
 */
export const ERROR_SEGUIMIENTO_TERMINAL = "Este prospecto ya no está activo, así que no admite un próximo contacto.";

export const TOAST_ACUERDO_FIJADO = "Contacto acordado guardado";
export const TOAST_ACUERDO_QUITADO = "Vuelve a calcularlo el sistema";

/** Indicador ligero de estado terminal en la tarjeta de seguimiento (D1 aprobada). */
export const INDICADOR_TERMINAL: Partial<Record<Etapa, { texto: string; color: string }>> = {
  joined: { texto: "Incorporado — fuera del pipeline activo", color: "var(--color-success-text)" },
  discarded: { texto: "Descartado — fuera del pipeline activo", color: "var(--color-neutral-500)" },
};

/* ── Edición de datos (M4 bocado 3, JOS-18) ───────────────────────────────── */

export const ETIQUETA_EDITAR = "Editar";
export const TITULO_EDICION = "Editar datos del prospecto";
export const GUARDAR_CAMBIOS = "Guardar cambios";
export const GUARDANDO_CAMBIOS = "Guardando…";
export const CANCELAR_EDICION = "Cancelar";
/** Copy literal del toast de JOS-18. */
export const TOAST_DATOS_GUARDADOS = "Datos guardados";

/* ── Eliminar prospecto (JOS-80) ──────────────────────────────────────────── */

export const ETIQUETA_ELIMINAR = "Eliminar prospecto";
export const TITULO_CONFIRMAR_ELIMINAR = "¿Eliminar este prospecto?";
/** Acción destructiva y sin papelera: el mensaje lo dice sin rodeos (JOS-80). */
export const MENSAJE_CONFIRMAR_ELIMINAR =
  "Se eliminarán el prospecto y todo su historial de interacciones. Esta acción no se puede deshacer.";
export const ACCION_CONFIRMAR_ELIMINAR = "Eliminar";
export const ACCION_CANCELAR_ELIMINAR = "Cancelar";
export const TOAST_PROSPECTO_ELIMINADO = "Prospecto eliminado";
/** Fallo CONFIRMADO por el backend (la transacción se revirtió): permite reintentar. */
export const ERROR_ELIMINAR = "No se pudo eliminar. Comprueba tu conexión e inténtalo de nuevo.";

/** Pantalla neutra mientras se completa el borrado (fallback de LimiteBorrado, §6.1). */
export const ELIMINANDO = "Eliminando…";

/* Resultado INCIERTO por caída de red (JOS-80 §6.2): el borrado PUDO completarse. NO se
   promete verificación en el destino (Actividad no es una lista exhaustiva de prospectos). */
export const TITULO_ELIMINAR_INCIERTO = "No hemos podido confirmar";
export const MENSAJE_ELIMINAR_INCIERTO =
  "Se perdió la conexión y no podemos confirmar si el prospecto llegó a eliminarse; es posible que sí. Cuando recuperes la conexión, búscalo para comprobarlo.";
export const ACCION_ELIMINAR_INCIERTO = "Salir";

/* ── Corregir / eliminar una interacción (JOS-80 Trozo B) ─────────────────── */

export const ETIQUETA_CORREGIR_INTERACCION = "Corregir";
export const ETIQUETA_ELIMINAR_INTERACCION = "Eliminar";
export const TITULO_CONFIRMAR_ELIMINAR_INTERACCION = "¿Eliminar esta interacción?";
/** Sin papelera y recalcula las fechas del prospecto: el mensaje lo advierte. */
export const MENSAJE_CONFIRMAR_ELIMINAR_INTERACCION =
  "Se borrará este contacto del historial y las fechas del prospecto se recalcularán. Esta acción no se puede deshacer.";
export const ACCION_CONFIRMAR_ELIMINAR_INTERACCION = "Eliminar";
export const TOAST_INTERACCION_ELIMINADA = "Interacción eliminada";
/** Fallo CONFIRMADO por el backend (la transacción se revirtió): la entrada sigue → reintento. */
export const ERROR_ELIMINAR_INTERACCION = "No se pudo eliminar. Comprueba tu conexión e inténtalo de nuevo.";
/* Resultado INCIERTO por caída de red: el borrado PUDO completarse. NO se afirma que la entrada
   permanece ni se ofrece reintento ciego; la lista viva reconcilia y este aviso lo dice. */
export const TOAST_INTERACCION_INCIERTO =
  "Se perdió la conexión y no podemos confirmar si se eliminó. Revisa el historial en un momento.";
