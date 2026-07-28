import { APP_TZ } from "../../../../../convex/lib/fecha";
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
 */
export function textoToastEtapa(etapa: Etapa, fechaProximoSeguimiento?: number): string {
  if (etapa === "joined") return "¡Incorporado al equipo! Sale de la actividad diaria.";
  if (etapa === "discarded") return "Prospecto descartado. Sale de la actividad diaria.";
  const base = `Etapa actualizada: ${etiquetaEtapa(etapa)}.`;
  if (fechaProximoSeguimiento === undefined) return base;
  return `${base} Próximo contacto: ${formatearFechaEs(fechaProximoSeguimiento)}`;
}

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
