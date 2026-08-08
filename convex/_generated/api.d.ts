/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as config_seguimiento from "../config/seguimiento.js";
import type * as interacciones from "../interacciones.js";
import type * as lib_acceso from "../lib/acceso.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_errores from "../lib/errores.js";
import type * as lib_fecha from "../lib/fecha.js";
import type * as lib_prioridad from "../lib/prioridad.js";
import type * as lib_proyecciones from "../lib/proyecciones.js";
import type * as lib_seguimiento from "../lib/seguimiento.js";
import type * as lib_usuario from "../lib/usuario.js";
import type * as lib_validacion from "../lib/validacion.js";
import type * as prospectos from "../prospectos.js";
import type * as resumen from "../resumen.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "config/seguimiento": typeof config_seguimiento;
  interacciones: typeof interacciones;
  "lib/acceso": typeof lib_acceso;
  "lib/constants": typeof lib_constants;
  "lib/errores": typeof lib_errores;
  "lib/fecha": typeof lib_fecha;
  "lib/prioridad": typeof lib_prioridad;
  "lib/proyecciones": typeof lib_proyecciones;
  "lib/seguimiento": typeof lib_seguimiento;
  "lib/usuario": typeof lib_usuario;
  "lib/validacion": typeof lib_validacion;
  prospectos: typeof prospectos;
  resumen: typeof resumen;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
