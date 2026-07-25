/**
 * Traduce al castellano del producto el error que devuelven los métodos Future
 * de Clerk (`signIn.password()`, `verifications.verifyEmailCode()`, …), que
 * responden `{ error }` en lugar de lanzar. Clerk trae el texto en inglés, así
 * que mapeamos por `code` —estable, a diferencia de `message`— y nunca
 * mostramos el mensaje crudo de la API.
 *
 * El `code` estable puede llegar en el nivel superior (tipo declarado `ClerkError`)
 * o dentro del array `errors[]` (forma real en runtime, `ClerkAPIResponseError`);
 * `codigosDeError` cubre ambas. Ver docs/auditoria/JOS-71-fix-enumeracion.md.
 */

/** Mensaje de código de verificación incorrecto. Fuente única: lo referencian el
 *  mapa `MENSAJES` y la página de recuperación, para que el flujo neutro (email
 *  inexistente) y el de código incorrecto real muestren un texto idéntico y sean
 *  indistinguibles (no-enumeración de cuentas). */
export const MSG_CODIGO_INCORRECTO = "El código no es correcto. Revísalo e inténtalo de nuevo.";

const MENSAJES: Record<string, string> = {
  // Login: no distinguimos email inexistente de contraseña incorrecta (no
  // damos pistas sobre qué cuentas existen).
  form_identifier_not_found: "Email o contraseña incorrectos.",
  form_password_incorrect: "Email o contraseña incorrectos.",
  user_locked: "Tu cuenta está bloqueada temporalmente por demasiados intentos. Inténtalo más tarde.",
  too_many_requests: "Demasiados intentos. Espera unos minutos y vuelve a probar.",
  // Registro
  form_identifier_exists: "Ya existe una cuenta con ese email.",
  form_password_pwned: "Esa contraseña ha aparecido en filtraciones conocidas. Elige otra.",
  form_password_not_strong_enough: "La contraseña es demasiado débil. Combina mayúsculas, números o símbolos.",
  form_password_length_too_short: "La contraseña es demasiado corta.",
  form_param_format_invalid: "Revisa el formato de los datos introducidos.",
  form_param_nil: "Rellena todos los campos obligatorios.",
  // Verificación por código
  form_code_incorrect: MSG_CODIGO_INCORRECTO,
  verification_expired: "El código ha caducado. Pide uno nuevo.",
  verification_failed: "No hemos podido verificar el código. Pide uno nuevo.",
  verification_already_verified: "Este email ya estaba verificado. Entra con tu contraseña.",
};

const GENERICO = "No hemos podido completar la operación. Inténtalo de nuevo.";
const SIN_RED = "No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.";

/**
 * Códigos ESTABLES de un error de Clerk, en orden de prioridad. El tipo declarado
 * por los métodos Future es `ClerkError` (con `code` en el nivel superior); en
 * runtime el objeto suele ser un `ClerkAPIResponseError` que además trae el array
 * `errors: ClerkAPIError[]`, cada uno con su `code` específico (el superior es
 * genérico). Se devuelven primero los códigos anidados —en su orden, sin asumir
 * uno solo ni una posición fija— y por último el `code` superior como fallback,
 * de modo que la traducción es correcta bajo ambas formas.
 */
function codigosDeError(error: unknown): string[] {
  if (typeof error !== "object" || error === null) return [];
  const e = error as { code?: unknown; errors?: unknown };
  const codes: string[] = [];
  if (Array.isArray(e.errors)) {
    for (const item of e.errors) {
      const c = (item as { code?: unknown } | null)?.code;
      if (typeof c === "string") codes.push(c);
    }
  }
  if (typeof e.code === "string") codes.push(e.code);
  return codes;
}

export function mensajeDeError(error: unknown): string {
  const codes = codigosDeError(error);
  // Prioridad: el primer código con traducción conocida gana. Nunca se muestra el
  // mensaje crudo (inglés) de la API. Se comprueba propiedad PROPIA (no acceso
  // directo ni `in`): un código como "toString"/"constructor" heredaría un método
  // de Object.prototype y devolvería algo que no es un mensaje.
  for (const code of codes) {
    if (Object.prototype.hasOwnProperty.call(MENSAJES, code)) return MENSAJES[code];
  }
  if (codes.length > 0) return GENERICO;
  // Rama defensiva: si la petición no llega a salir, lo que aparece es el
  // TypeError de fetch, sin `code` que traducir.
  if (error instanceof TypeError) return SIN_RED;
  return GENERICO;
}

/**
 * ¿El error de Clerk indica que el identificador (email) no existe? Se usa SOLO
 * en el flujo de recuperación de contraseña para no revelar qué cuentas existen:
 * cuando aparece, el flujo avanza igual al paso de código con copy neutro, de
 * modo que el comportamiento es idéntico para un email existente y uno que no.
 */
export function esEmailNoEncontrado(error: unknown): boolean {
  // Seguridad: se detecta en CUALQUIER posición del array, no solo en errors[0].
  return codigosDeError(error).includes("form_identifier_not_found");
}
