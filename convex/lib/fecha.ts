/**
 * Aritmética de calendario consciente de zona horaria, sin dependencias.
 *
 * Invariante del sistema: SOLO se convierten medianoches a timestamp. En
 * Europe/Madrid la transición DST ocurre a las 02:00/03:00, así que la
 * medianoche local existe y es única todos los días — `zonedMidnightToMs`
 * lo asevera en runtime. Todo lo demás (sumas de días, diferencias) opera
 * en el dominio civil {y,m,d}, nunca sumando múltiplos fijos de 24 h.
 */

/** Zona horaria fija del MVP (decisión de producto; una sola zona para todos). */
export const APP_TZ = "Europe/Madrid";

export interface CivilDate {
  y: number;
  m: number; // 1-12
  d: number; // 1-31
}

const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function getDtf(tz: string): Intl.DateTimeFormat {
  let dtf = dtfCache.get(tz);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    dtfCache.set(tz, dtf);
  }
  return dtf;
}

interface ZonedParts extends CivilDate {
  hh: number;
  mm: number;
  ss: number;
}

function zonedParts(utcMs: number, tz: string): ZonedParts {
  const parts = getDtf(tz).formatToParts(utcMs);
  const get = (type: string) => {
    const p = parts.find((x) => x.type === type);
    if (!p) throw new Error(`fecha: falta la parte '${type}' al formatear en ${tz}`);
    return Number(p.value);
  };
  return { y: get("year"), m: get("month"), d: get("day"), hh: get("hour"), mm: get("minute"), ss: get("second") };
}

/**
 * Offset de `tz` respecto a UTC en el instante `utcMs`, en ms.
 * Trunca la entrada al segundo: Intl no expone milisegundos, y sin truncar
 * el resto de ms contaminaría el offset calculado.
 */
export function tzOffsetMs(utcMs: number, tz: string): number {
  const ms = Math.floor(utcMs / 1000) * 1000;
  const p = zonedParts(ms, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss);
  return asUtc - ms;
}

/**
 * Timestamp (ms UTC) de la medianoche local de la fecha civil dada en `tz`.
 * Estrategia: estimar con el offset del "guess" UTC y corregir una vez si el
 * offset del resultado difiere. Para medianoches en Madrid (nunca en la
 * transición DST) una corrección basta; el assert final valida el invariante.
 */
export function zonedMidnightToMs(civil: CivilDate, tz: string): number {
  const guess = Date.UTC(civil.y, civil.m - 1, civil.d);
  const off1 = tzOffsetMs(guess, tz);
  let ts = guess - off1;
  const off2 = tzOffsetMs(ts, tz);
  if (off2 !== off1) ts = guess - off2;

  const check = zonedParts(ts, tz);
  if (check.y !== civil.y || check.m !== civil.m || check.d !== civil.d || check.hh !== 0 || check.mm !== 0 || check.ss !== 0) {
    throw new Error(
      `fecha: invariante roto — ${civil.y}-${civil.m}-${civil.d} 00:00 no es única/válida en ${tz}`,
    );
  }
  return ts;
}

/** Fecha civil de un timestamp en `tz`. */
export function civilDate(utcMs: number, tz: string): CivilDate {
  const p = zonedParts(utcMs, tz);
  return { y: p.y, m: p.m, d: p.d };
}

/** Suma días de calendario en el dominio civil (rollover de mes/año vía Date.UTC). */
export function addCivilDays(civil: CivilDate, days: number): CivilDate {
  const rolled = new Date(Date.UTC(civil.y, civil.m - 1, civil.d + days));
  return { y: rolled.getUTCFullYear(), m: rolled.getUTCMonth() + 1, d: rolled.getUTCDate() };
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

export function formatDayKey(civil: CivilDate): string {
  return `${pad(civil.y, 4)}-${pad(civil.m, 2)}-${pad(civil.d, 2)}`;
}

/**
 * Valida y parsea un dayKey "YYYY-MM-DD". Además del formato exige round-trip
 * civil: "2026-02-31" se rechaza (Date.UTC lo normalizaría a marzo).
 */
export function parseDayKey(dayKey: string): CivilDate {
  const m = DAY_KEY_RE.exec(dayKey);
  if (!m) throw new Error(`dayKey inválido: "${dayKey}" (formato esperado YYYY-MM-DD)`);
  const civil = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  const roundTrip = addCivilDays(civil, 0);
  if (roundTrip.y !== civil.y || roundTrip.m !== civil.m || roundTrip.d !== civil.d) {
    throw new Error(`dayKey inválido: "${dayKey}" no es una fecha real`);
  }
  return civil;
}

/** dayKey del día en curso en `tz` para el instante `nowMs`. */
export function dayKeyToday(nowMs: number, tz: string): string {
  return formatDayKey(civilDate(nowMs, tz));
}

/**
 * Ventana semiabierta [hoyInicio, mananaInicio) del día `dayKey` en `tz`.
 * Pura: mismo dayKey → misma ventana.
 */
export function ventanaDia(dayKey: string, tz: string): { hoyInicio: number; mananaInicio: number } {
  const civil = parseDayKey(dayKey);
  return {
    hoyInicio: zonedMidnightToMs(civil, tz),
    mananaInicio: zonedMidnightToMs(addCivilDays(civil, 1), tz),
  };
}

/** Diferencia en días de calendario (fechas civiles en `tz`), exacta ante DST. */
export function diffCalendarDays(fromMs: number, toMs: number, tz: string): number {
  const a = civilDate(fromMs, tz);
  const b = civilDate(toMs, tz);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

/** Timestamp de la próxima medianoche en `tz` posterior a `nowMs` (para el timer del cliente). */
export function siguienteMedianocheMs(nowMs: number, tz: string): number {
  return ventanaDia(dayKeyToday(nowMs, tz), tz).mananaInicio;
}
