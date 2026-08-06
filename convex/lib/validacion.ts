import type { PaginationOptions } from "convex/server";
import { validationError } from "./errores";
import { APP_TZ, civilDate, zonedMidnightToMs } from "./fecha";

/** Margen sobre el reloj del servidor para aceptar `fecha` (desfase de clientes). */
export const FUTURO_MARGEN_MS = 5 * 60 * 1000;

/** Tope de elementos por página exigido al cliente. */
export const PAGINA_MAX_ITEMS = 100;
/** Topes de lectura por página impuestos en servidor (filas y bytes). */
export const PAGINA_MAX_FILAS = 100;
export const PAGINA_MAX_BYTES = 4 * 1024 * 1024;

/** Compartido con el cliente (validación inline de JOS-15) — una sola fuente. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trim de un campo obligatorio; vacío tras el trim → VALIDATION_ERROR. */
export function textoObligatorio(valor: string, field: string): string {
  const limpio = valor.trim();
  if (limpio === "") throw validationError(`${field} es obligatorio`, field);
  return limpio;
}

/**
 * Normaliza un campo de texto opcional: trim; vacío o solo espacios →
 * `undefined` (el campo se omite al crear / se elimina al hacer patch —
 * nulos por ausencia, convención del schema).
 */
export function textoOpcional(valor: string | undefined): string | undefined {
  if (valor === undefined) return undefined;
  const limpio = valor.trim();
  return limpio === "" ? undefined : limpio;
}

/**
 * Tope de `notas` (JOS-74). No es cosmético ni de producto: las pantallas
 * agregadas (`actividadDiaria`, `pipeline`) leen documentos COMPLETOS —Convex no
 * proyecta a nivel de base de datos— contra un límite de 16 MiB por query. Un
 * campo de texto libre sin acotar deja que el propio tenant degrade su pantalla
 * hasta romperla, sin forma de arreglarlo desde la app.
 *
 * 2.000 caracteres ≈ 300 palabras. Con MAX_PIPELINE = 200 el peor caso de
 * lectura queda en ~19 % del límite (medición en la auditoría de JOS-21).
 */
export const LONGITUD_MAX_NOTAS = 2000;

/** `notas` normalizado y acotado. La longitud se mide DESPUÉS del trim. */
export function notasOpcional(valor: string | undefined): string | undefined {
  const limpio = textoOpcional(valor);
  if (limpio !== undefined && limpio.length > LONGITUD_MAX_NOTAS) {
    throw validationError(`notas no puede superar ${LONGITUD_MAX_NOTAS} caracteres`, "notas");
  }
  return limpio;
}

/**
 * Tope de los campos libres de una interacción (JOS-24). Mismo razonamiento que
 * LONGITUD_MAX_NOTAS y misma cifra, por coherencia de producto.
 *
 * Hasta JOS-24 estos campos no estaban acotados y era inocuo: la única query que
 * leía `interacciones` era `listarPorProspecto`, PAGINADA con `conLimites`
 * (PAGINA_MAX_FILAS / PAGINA_MAX_BYTES), así que los topes de paginación acotaban
 * los bytes. El Resumen introduce la primera lectura AGREGADA y SIN PAGINAR sobre
 * esa tabla —`.take(MAX_RESUMEN_INTERACCIONES + 1)` de documentos completos—, con
 * lo que reaparece en `interacciones` la misma vía de degradación por datos válidos
 * del propio tenant que JOS-74 cerró en `prospectos`.
 *
 * Se acotan LOS DOS campos libres: topar solo `queOcurrio` dejaría el documento sin
 * límite por `siguientePasoAcordado` y el peor caso seguiría sin existir.
 */
export const LONGITUD_MAX_TEXTO_INTERACCION = 2000;

/** `queOcurrio` normalizado y acotado. La longitud se mide DESPUÉS del trim. */
export function queOcurrioObligatorio(valor: string): string {
  const limpio = textoObligatorio(valor, "queOcurrio");
  if (limpio.length > LONGITUD_MAX_TEXTO_INTERACCION) {
    throw validationError(
      `queOcurrio no puede superar ${LONGITUD_MAX_TEXTO_INTERACCION} caracteres`,
      "queOcurrio",
    );
  }
  return limpio;
}

/** `siguientePasoAcordado` normalizado y acotado, con la misma medida tras el trim. */
export function siguientePasoOpcional(valor: string | undefined): string | undefined {
  const limpio = textoOpcional(valor);
  if (limpio !== undefined && limpio.length > LONGITUD_MAX_TEXTO_INTERACCION) {
    throw validationError(
      `siguientePasoAcordado no puede superar ${LONGITUD_MAX_TEXTO_INTERACCION} caracteres`,
      "siguientePasoAcordado",
    );
  }
  return limpio;
}

/**
 * Topes del resto de campos libres de `prospectos` (JOS-24, bloqueante de la 2ª
 * auditoría del bocado A).
 *
 * JOS-74 acotó solo `notas` por ser el campo con diferencia más voluminoso, pero
 * `nombre`, `comoSeConocio` y `telefono` seguían aceptando longitud arbitraria: el
 * documento de prospecto NO era finito y, por tanto, el "peor caso admisible" medido
 * para el Resumen era en realidad un peor caso *realista*. Con estos topes el
 * documento queda acotado de verdad y la medición pasa a ser exhaustiva.
 *
 * `email` se validaba de FORMA pero no de longitud: la expresión regular acepta una
 * cadena de cualquier tamaño mientras tenga arroba y punto. 254 es el máximo real de
 * una dirección de correo.
 */
export const LONGITUD_MAX_NOMBRE = 80;
export const LONGITUD_MAX_COMO_SE_CONOCIO = 120;
export const LONGITUD_MAX_TELEFONO = 25;
export const LONGITUD_MAX_EMAIL = 254;

/** Comprobación de longitud sobre texto YA normalizado (la medida es tras el trim). */
function acotar(limpio: string, max: number, field: string): string {
  if (limpio.length > max) {
    throw validationError(`${field} no puede superar ${max} caracteres`, field);
  }
  return limpio;
}

/** Campo obligatorio: trim, no vacío y dentro del tope. */
export function textoObligatorioAcotado(valor: string, field: string, max: number): string {
  return acotar(textoObligatorio(valor, field), max, field);
}

/** Campo opcional: trim, ausencia por vacío y, si queda contenido, dentro del tope. */
export function textoOpcionalAcotado(valor: string | undefined, field: string, max: number): string | undefined {
  const limpio = textoOpcional(valor);
  return limpio === undefined ? undefined : acotar(limpio, max, field);
}

/**
 * Email opcional normalizado; si queda contenido, exige longitud acotada y formato
 * algo@algo.algo. La longitud se comprueba ANTES que el formato: no tiene sentido
 * pasar por la expresión regular una cadena arbitrariamente grande.
 */
export function emailOpcional(valor: string | undefined): string | undefined {
  const limpio = textoOpcional(valor);
  if (limpio === undefined) return undefined;
  acotar(limpio, LONGITUD_MAX_EMAIL, "email");
  if (!EMAIL_RE.test(limpio)) {
    throw validationError("Email no válido", "email");
  }
  return limpio;
}

/**
 * `fecha` de una interacción: número finito (v.number() de Convex admite NaN
 * e infinitos, la comprobación manual es imprescindible), no negativa, admite
 * pasado y rechaza el futuro más allá del margen.
 */
export function validarFechaInteraccion(fecha: number, ahoraMs: number): void {
  if (!Number.isFinite(fecha)) throw validationError("fecha debe ser un número finito (ms epoch)", "fecha");
  if (fecha < 0) throw validationError("fecha no puede ser negativa", "fecha");
  if (fecha > ahoraMs + FUTURO_MARGEN_MS) throw validationError("fecha no puede estar en el futuro", "fecha");
}

/**
 * Límite del rango representable por `Date` (±100.000.000 días desde epoch).
 * Más allá, `civilDate`/`zonedMidnightToMs` reventarían con un Error crudo en
 * vez de con el VALIDATION_ERROR que promete el contrato de la API.
 */
const FECHA_MAX_ABS_MS = 8.64e15;

/**
 * `fecha` de un contacto ACORDADO con el prospecto (JOS-67). Es la simétrica de
 * `validarFechaInteraccion`: allí se rechaza el futuro porque el contacto ya
 * ocurrió; aquí se rechaza el PASADO, porque una cita acordada siempre mira
 * hacia adelante.
 *
 * Devuelve la fecha NORMALIZADA a medianoche de APP_TZ. El esquema declara que
 * `fechaProximoSeguimiento` es siempre una medianoche, y ese invariante no puede
 * quedar a merced de la hora que mande el cliente: si no se normalizase, el
 * cálculo de "días vencido" (`diffCalendarDays`) pasaría a depender de ella.
 *
 * El suelo es la medianoche de HOY según el reloj del SERVIDOR (`ahoraMs`), de
 * modo que el día de hoy se acepta entero. No se aplica FUTURO_MARGEN_MS: ese
 * margen existe para tolerar relojes de cliente adelantados al registrar algo
 * que YA ocurrió; aquí el riesgo es el contrario y el suelo ya es generoso.
 */
export function fechaAcordadaValidada(fecha: number, ahoraMs: number): number {
  if (!Number.isFinite(fecha)) throw validationError("fecha debe ser un número finito (ms epoch)", "fecha");
  if (Math.abs(fecha) > FECHA_MAX_ABS_MS) throw validationError("fecha fuera de rango", "fecha");
  const acordada = zonedMidnightToMs(civilDate(fecha, APP_TZ), APP_TZ);
  if (acordada < zonedMidnightToMs(civilDate(ahoraMs, APP_TZ), APP_TZ)) {
    throw validationError("La fecha acordada no puede estar en el pasado", "fecha");
  }
  return acordada;
}

/** `numItems` entero finito en [1, PAGINA_MAX_ITEMS] — un chequeo solo de rango dejaría pasar NaN. */
export function validarNumItems(numItems: number): void {
  if (!Number.isInteger(numItems) || numItems < 1 || numItems > PAGINA_MAX_ITEMS) {
    throw validationError(`numItems debe ser un entero entre 1 y ${PAGINA_MAX_ITEMS}`, "numItems");
  }
}

/**
 * Opciones de paginación con los topes de lectura del servidor. Los valores
 * del servidor van DESPUÉS del spread: el cliente no puede sobrescribirlos.
 */
export function conLimites(paginationOpts: PaginationOptions): PaginationOptions {
  return {
    ...paginationOpts,
    maximumRowsRead: PAGINA_MAX_FILAS,
    maximumBytesRead: PAGINA_MAX_BYTES,
  };
}
