/**
 * Traduce al castellano del producto el error que devuelven los métodos Future
 * de Clerk (`signIn.password()`, `verifications.verifyEmailCode()`, …), que
 * responden `{ error }` en lugar de lanzar. Clerk trae el texto en inglés, así
 * que mapeamos por `code` —estable, a diferencia de `message`— y nunca
 * mostramos el mensaje crudo de la API.
 *
 * El tipo va declarado aquí en vez de importado: `ClerkError` no se exporta
 * desde `@clerk/nextjs`, y solo necesitamos el código.
 */
type ErrorConCodigo = { code: string };

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
  form_code_incorrect: "El código no es correcto. Revísalo e inténtalo de nuevo.",
  verification_expired: "El código ha caducado. Pide uno nuevo.",
  verification_failed: "No hemos podido verificar el código. Pide uno nuevo.",
  verification_already_verified: "Este email ya estaba verificado. Entra con tu contraseña.",
};

const GENERICO = "No hemos podido completar la operación. Inténtalo de nuevo.";
const SIN_RED = "No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.";

function tieneCodigo(error: unknown): error is ErrorConCodigo {
  return typeof error === "object" && error !== null && typeof (error as ErrorConCodigo).code === "string";
}

export function mensajeDeError(error: unknown): string {
  if (tieneCodigo(error)) return MENSAJES[error.code] ?? GENERICO;
  // Rama defensiva: si la petición no llega a salir, lo que aparece es el
  // TypeError de fetch, sin `code` que traducir.
  if (error instanceof TypeError) return SIN_RED;
  return GENERICO;
}
