import { MAX_RESUMEN_PROSPECTOS } from "../../../../convex/lib/constants";
import { APP_TZ, parseDayKey, zonedMidnightToMs } from "../../../../convex/lib/fecha";
import { formatearFechaEs } from "@/lib/etiquetas";

/* Copy y formateadores puros del Resumen (JOS-24 bocado B). */

export const TITULO = "Resumen";
export const CARGANDO = "Cargando resumen…";

export const VACIO_TITULO = "Aún no tienes prospectos";
export const VACIO_DESCRIPCION = "Añade tu primer prospecto para empezar a trabajar tu red.";
/** Copy propio, no el de JOS-62: coherencia con las otras dos pantallas raíz (plan §D7). */
export const VACIO_CTA = "Añadir prospecto";

export const PERIODO_LABEL = "Período";
export const OPCIONES_PERIODO = [
  { value: "semana" as const, label: "Últimos 7 días" },
  { value: "mes" as const, label: "Últimos 30 días" },
];
export type Periodo = (typeof OPCIONES_PERIODO)[number]["value"];

export const SECCION_ETAPAS = "Distribución del pipeline";
export const SECCION_PENDIENTES = "Seguimientos pendientes";
export const SECCION_ACTIVIDAD = "Actividad";
export const SECCION_TOTALES = "Totales";
/** Con lectura truncada la sección 5 DEJA de decir "totales" (plan matriz §5.2). */
export const SECCION_TOTALES_PARCIAL = "Recuento parcial";

export const PENDIENTES_VENCIDOS = "vencidos";
export const PENDIENTES_HOY = "para hoy";
export const PENDIENTES_ENLACE = "Ver en Actividad Diaria →";
export const SIN_PENDIENTES = "No tienes seguimientos pendientes.";

export const TOTAL_ACTIVOS = "Activos";
export const TOTAL_INCORPORADOS = "Incorporados";
export const TOTAL_DESCARTADOS = "Descartados";

export const GRAFICO_ARIA = "Interacciones por día";

/**
 * Aviso de truncamiento de prospectos. Explica de dónde sale el corte para que
 * el "+" de cada cifra tenga significado; mismo lenguaje que el Pipeline.
 */
export const BANNER_VISTA_PARCIAL = `Estás viendo ${numero(MAX_RESUMEN_PROSPECTOS)} prospectos; hay más. Las cifras con «+» son mínimos.`;

/** Cifras en formato español con separador de millar. */
export function numero(n: number): string {
  return new Intl.NumberFormat("es-ES").format(n);
}

/**
 * ÚNICA vía de pintar un número en esta pantalla, y exige el flag de su métrica
 * como argumento: olvidarlo es un error de tipos, no un descuido de revisión
 * (plan §D2). El "+" es semánticamente exacto porque toda métrica de prospectos
 * se calcula sobre el subconjunto leído y por tanto es una cota inferior.
 */
export function cifra(n: number, exacto: boolean): string {
  return exacto ? numero(n) : `${numero(n)}+`;
}

function msDe(dayKey: string): number {
  return zonedMidnightToMs(parseDayKey(dayKey), APP_TZ);
}

const FECHA_CORTA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", timeZone: APP_TZ });

/** "29 de julio" — sin día de la semana, para rótulos de rango. */
export function fechaCorta(dayKey: string): string {
  return FECHA_CORTA.format(msDe(dayKey));
}

/** "entre el 29 de julio y el 4 de agosto" — rótulo del período mostrado. */
export function rotuloPeriodo(desde: string, hastaIncluido: string): string {
  return `entre el ${fechaCorta(desde)} y el ${fechaCorta(hastaIncluido)}`;
}

/** Inicial del día de la semana, para el eje de la vista de 7 días. */
export function inicialDiaSemana(dayKey: string): string {
  return new Intl.DateTimeFormat("es-ES", { weekday: "narrow", timeZone: APP_TZ }).format(msDe(dayKey)).toUpperCase();
}

/**
 * Texto de cada barra para lectores de pantalla. Un día sin medir NUNCA dice
 * "sin interacciones": eso afirmaría un 0 que nadie ha contado.
 */
export function etiquetaBarra(dayKey: string, valor: number, sinDatos: boolean): string {
  const fecha = formatearFechaEs(msDe(dayKey));
  if (sinDatos) return `${fecha}: sin datos`;
  if (valor === 0) return `${fecha}: sin interacciones`;
  return `${fecha}: ${numero(valor)} ${valor === 1 ? "interacción" : "interacciones"}`;
}

/**
 * Frase resumen de la sección 4. Las dos cifras vienen de LECTURAS DISTINTAS y
 * cada una lleva su propio flag: el caso mixto —una marcada y la otra no— es
 * legítimo y es justo lo que la regla "por métrica" persigue (plan matriz §5.2).
 *
 * Con la métrica truncada el plural es siempre el correcto: "1+" significa
 * "al menos una, probablemente más".
 */
export function fraseActividad(datos: {
  interacciones: number;
  interaccionesExactas: boolean;
  nuevos: number;
  nuevosExactos: boolean;
  desde: string;
  hastaIncluido: string;
}): string {
  const i = `${cifra(datos.interacciones, datos.interaccionesExactas)} ${
    datos.interacciones === 1 && datos.interaccionesExactas ? "interacción" : "interacciones"
  }`;
  const n = `${cifra(datos.nuevos, datos.nuevosExactos)} ${
    datos.nuevos === 1 && datos.nuevosExactos ? "prospecto nuevo" : "prospectos nuevos"
  }`;
  return `${i} y ${n} ${rotuloPeriodo(datos.desde, datos.hastaIncluido)}.`;
}

/**
 * Estado "sin actividad reciente": no hubo NADA en el período, ni interacciones
 * ni altas. Sustituye a la frase resumen, que ahí solo diría dos ceros. Tono
 * sobrio a propósito (design.md §1: *"sin signos de exclamación de más"*).
 */
export function fraseSinActividad(desde: string, hastaIncluido: string): string {
  return `Sin actividad registrada ${rotuloPeriodo(desde, hastaIncluido)}.`;
}

/**
 * Aviso de parcialidad de la serie. Tres ramas, exhaustivas:
 *   exacta                        → no hay nada que advertir
 *   truncada con día completo     → los días previos a esa fecha no se midieron
 *   truncada sin ningún día completo → la serie entera no es fiable
 */
export function avisoSerie(exacto: boolean, diaCompletoDesde: string | null): string | null {
  if (exacto) return null;
  if (diaCompletoDesde === null) {
    return "No se pudo medir ningún día completo de este período: el gráfico no muestra datos fiables.";
  }
  return `Datos completos desde el ${fechaCorta(diaCompletoDesde)}; los días anteriores no se pudieron medir.`;
}
