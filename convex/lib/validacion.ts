import type { PaginationOptions } from "convex/server";
import { validationError } from "./errores";

/** Margen sobre el reloj del servidor para aceptar `fecha` (desfase de clientes). */
export const FUTURO_MARGEN_MS = 5 * 60 * 1000;

/** Tope de elementos por página exigido al cliente. */
export const PAGINA_MAX_ITEMS = 100;
/** Topes de lectura por página impuestos en servidor (filas y bytes). */
export const PAGINA_MAX_FILAS = 100;
export const PAGINA_MAX_BYTES = 4 * 1024 * 1024;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

/** Email opcional normalizado; si queda contenido, exige formato algo@algo.algo. */
export function emailOpcional(valor: string | undefined): string | undefined {
  const limpio = textoOpcional(valor);
  if (limpio !== undefined && !EMAIL_RE.test(limpio)) {
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
