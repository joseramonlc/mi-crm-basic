import { APP_TZ, addCivilDays, dayKeyToday, formatDayKey, parseDayKey } from "../../convex/lib/fecha";

/**
 * Datos del evento de calendario (JOS-70). El canal llega YA traducido a
 * etiqueta de producto: `etiquetaCanal` vive en el textos.ts de la ficha y una
 * función de `src/lib/` no debe importar de una pantalla.
 *
 * `telefono` y `email` son opcionales porque lo son en el esquema, y la
 * descripción los omite si faltan: la issue proponía poner solo el teléfono,
 * pero si el canal preferido es el correo el teléfono no sirve de nada.
 */
export interface DatosEventoCalendario {
  nombre: string;
  fechaMs: number;
  canalEtiqueta: string;
  telefono?: string;
  email?: string;
}

const ORIGEN = "https://calendar.google.com/calendar/render";

/** Contenido del evento: no es texto de pantalla, así que no vive en textos.ts. */
const TITULO = "Contactar a ";
const LINEA_CANAL = "Canal preferido: ";
const LINEA_TELEFONO = "Teléfono: ";
const LINEA_EMAIL = "Email: ";

/** `YYYY-MM-DD` → `YYYYMMDD`, que es como Google espera el rango. */
function compacto(dayKey: string): string {
  return dayKey.replace(/-/g, "");
}

/**
 * Enlace a Google Calendar con un evento de día completo prerrellenado.
 *
 * Dos trampas, las dos silenciosas si se hacen mal:
 *
 * 1. En Google el día de FIN de un evento de día completo es EXCLUSIVO: para
 *    ocupar el 15 hay que mandar 20260815/20260816. Con el mismo día dos veces
 *    el rango es vacío y el evento sale sin fecha.
 * 2. El día es el CIVIL DE MADRID, no el de UTC. `fechaProximoSeguimiento` es
 *    la medianoche de Madrid, que en agosto son las 22:00 del día ANTERIOR en
 *    UTC: cualquier ruta que pase por `toISOString`/`getUTCDate` devuelve el día
 *    de antes. Por eso todo va por los ayudantes de convex/lib/fecha.
 *
 * No guarda nada y no sincroniza: el CRM no llega a saber si el usuario creó el
 * evento (decisión de producto de la propia issue, Opción A frente a Opción B).
 */
export function urlGoogleCalendar({ nombre, fechaMs, canalEtiqueta, telefono, email }: DatosEventoCalendario): string {
  const inicio = dayKeyToday(fechaMs, APP_TZ);
  const fin = formatDayKey(addCivilDays(parseDayKey(inicio), 1));

  const detalles = [
    LINEA_CANAL + canalEtiqueta,
    ...(telefono !== undefined ? [LINEA_TELEFONO + telefono] : []),
    ...(email !== undefined ? [LINEA_EMAIL + email] : []),
  ].join("\n");

  // URLSearchParams y no concatenación a mano: el nombre de un prospecto puede
  // llevar & o #, y el origen es una constante literal, así que ningún dato
  // puede cambiar el destino del enlace.
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: TITULO + nombre,
    dates: `${compacto(inicio)}/${compacto(fin)}`,
    details: detalles,
  });

  return `${ORIGEN}?${params.toString()}`;
}
