/**
 * Traduce el ESTADO en el que Clerk deja un intento de acceso, y decide con qué
 * segundo factor se puede continuar.
 *
 * Hermano de `authErrores.ts`, pero para el otro eje del problema: allí se
 * traduce un `error` devuelto por un método; aquí se interpreta el `status` que
 * queda cuando NO hay error y aun así el acceso no está terminado.
 *
 * `SignInStatus` (`@clerk/shared`, con `@clerk/nextjs` 7.5.20) tiene SIETE
 * valores. Sólo `complete` significa «ya está»; los otros seis piden una acción
 * DISTINTA a reintentar, y tratarlos como un único caso genérico es lo que
 * dejaba al usuario encerrado en el login (JOS-184).
 *
 * Todo lo de aquí es puro: no importa nada de Clerk y trabaja con formas
 * estructurales, para poder probarlo sin montar el SDK.
 */

/** Los cuatro segundos factores que se resuelven pidiendo un código. */
export type EstrategiaPorCodigo = "email_code" | "phone_code" | "totp" | "backup_code";

/**
 * Preferencia al elegir segundo factor. El correo primero porque es el único que
 * toda cuenta tiene seguro; los códigos de recuperación al final porque son de
 * un solo uso y conviene no gastarlos si hay alternativa.
 */
const PREFERENCIA: readonly EstrategiaPorCodigo[] = ["email_code", "phone_code", "totp", "backup_code"];

/** Estados que se resuelven con la pantalla del segundo factor. */
export function pideSegundoFactor(estado: string): boolean {
  // `needs_client_trust` (dispositivo nuevo) se resuelve con los MISMOS métodos
  // `signIn.mfa.*` que `needs_second_factor`: el SDK no tiene espacio propio para
  // el client trust.
  return estado === "needs_second_factor" || estado === "needs_client_trust";
}

/**
 * Estados imposibles DESPUÉS de que Clerk haya aceptado la contraseña. Si
 * aparecen, el intento local ha quedado descolgado del servidor y lo honesto es
 * reiniciarlo y pedir las credenciales otra vez, no decir «reintenta» sobre un
 * intento que ya no existe.
 */
export function exigeReinicio(estado: string): boolean {
  return estado === "needs_identifier" || estado === "needs_first_factor";
}

export const MSG_NUEVA_CONTRASENA =
  "Tienes que crear una contraseña nueva antes de entrar. Pulsa «¿Olvidaste tu contraseña?» aquí abajo y sigue los pasos.";
export const MSG_COMPROBACION_SEGURIDAD =
  "Una comprobación de seguridad ha frenado el acceso desde este dispositivo. Inténtalo dentro de unos minutos; si sigue igual, dinos el código de abajo.";
export const MSG_INTENTO_CADUCADO =
  "El intento de acceso ha caducado. Vuelve a introducir tu email y tu contraseña.";
export const MSG_ESTADO_GENERICO = "No hemos podido completar el acceso.";

/**
 * Segundo factor por ENLACE en el correo. El API Future de Clerk 7.5.20 no
 * ofrece método de envío de enlace como segundo factor (`signIn.mfa` sólo tiene
 * código por email/SMS, TOTP y códigos de recuperación), así que este caso queda
 * declarado NO resuelto: mejor decirlo que ofrecer un botón que no lleva a nada.
 */
export const MSG_SEGUNDO_FACTOR_ENLACE =
  "Tu cuenta pide confirmarse con un enlace por correo, y esta pantalla todavía no sabe hacer ese paso. Escríbenos y lo resolvemos.";
export const MSG_SEGUNDO_FACTOR_DESCONOCIDO =
  "Tu cuenta pide un método de confirmación que esta pantalla todavía no sabe hacer. Escríbenos y lo resolvemos.";

const MENSAJES_ESTADO: Record<string, string> = {
  needs_new_password: MSG_NUEVA_CONTRASENA,
  needs_protect_check: MSG_COMPROBACION_SEGURIDAD,
  needs_identifier: MSG_INTENTO_CADUCADO,
  needs_first_factor: MSG_INTENTO_CADUCADO,
};

/**
 * Mensaje para un estado. Un estado que no conozcamos —Clerk puede añadir
 * alguno— cae en el genérico, pero SIEMPRE acompañado del código de diagnóstico
 * en pantalla: nunca un callejón mudo.
 */
export function mensajeDeEstado(estado: string): string {
  // Propiedad PROPIA, no `in` ni acceso directo: un estado llamado "toString"
  // heredaría un método de Object.prototype y devolvería algo que no es un mensaje.
  if (Object.prototype.hasOwnProperty.call(MENSAJES_ESTADO, estado)) return MENSAJES_ESTADO[estado];
  return MSG_ESTADO_GENERICO;
}

/** Un factor tal y como lo describe Clerk, en lo que nos importa de él. */
export type FactorDisponible = { strategy: string; safeIdentifier?: string };

export type EleccionSegundoFactor =
  /** Hay un factor por código utilizable. */
  | { tipo: "codigo"; estrategia: EstrategiaPorCodigo; safeIdentifier?: string }
  /** Clerk no ha dicho qué admite: se intenta el código por email, que es lo universal. */
  | { tipo: "red-de-seguridad" }
  /** Lo que pide no lo sabemos hacer. Se dice, con su mensaje y sus estrategias. */
  | { tipo: "no-soportado"; estrategias: string[]; mensaje: string };

/**
 * Elige con qué segundo factor continuar.
 *
 * La regla tiene TRES casos y el orden importa:
 *  1. Si hay algún factor por código, se usa (por la preferencia de arriba).
 *  2. Si la lista viene vacía, red de seguridad: se intentará el código por email.
 *  3. Si la lista trae SÓLO cosas que no sabemos hacer (`email_link`), NO se
 *     intenta nada. Disparar la red de seguridad aquí llamaría a un método que la
 *     cuenta no ofrece, y el usuario vería un error incomprensible en vez de la
 *     verdad.
 */
export function eligeSegundoFactor(factores: readonly FactorDisponible[] | undefined): EleccionSegundoFactor {
  const lista = factores ?? [];
  if (lista.length === 0) return { tipo: "red-de-seguridad" };

  for (const estrategia of PREFERENCIA) {
    const factor = lista.find((f) => f.strategy === estrategia);
    if (factor) return { tipo: "codigo", estrategia, safeIdentifier: factor.safeIdentifier };
  }

  const estrategias = lista.map((f) => f.strategy);
  const soloEnlace = estrategias.every((e) => e === "email_link");
  return {
    tipo: "no-soportado",
    estrategias,
    mensaje: soloEnlace ? MSG_SEGUNDO_FACTOR_ENLACE : MSG_SEGUNDO_FACTOR_DESCONOCIDO,
  };
}

export type TextoSegundoFactor = {
  descripcion: string;
  etiquetaCampo: string;
  permiteReenviar: boolean;
  /**
   * Teclado que se le pide al móvil. Los códigos de RECUPERACIÓN no están
   * definidos como numéricos en ningún sitio (`verifyBackupCode` recibe un
   * `code: string` a secas), así que forzar el teclado numérico podría dejar al
   * usuario sin poder teclear su código justo en el flujo de rescate.
   */
  modoTeclado: "numeric" | "text";
  /** `one-time-code` deja que el móvil autorrellene desde el SMS o el correo. */
  autocompletado: "one-time-code" | "off";
};

/**
 * El copy depende de la ESTRATEGIA, no del estado: `safeIdentifier` existe tanto
 * para correo como para teléfono, así que hablar siempre de «email» sería mentir
 * en la mitad de los casos.
 */
export function textoSegundoFactor(estrategia: EstrategiaPorCodigo, safeIdentifier?: string): TextoSegundoFactor {
  switch (estrategia) {
    case "email_code":
      return {
        descripcion: safeIdentifier
          ? `Hemos enviado un código a ${safeIdentifier}. Introdúcelo para entrar desde este dispositivo.`
          : "Hemos enviado un código a tu correo. Introdúcelo para entrar desde este dispositivo.",
        etiquetaCampo: "Código de verificación",
        permiteReenviar: true,
        modoTeclado: "numeric",
        autocompletado: "one-time-code",
      };
    case "phone_code":
      return {
        descripcion: safeIdentifier
          ? `Hemos enviado un código por SMS al ${safeIdentifier}. Introdúcelo para entrar desde este dispositivo.`
          : "Hemos enviado un código por SMS a tu teléfono. Introdúcelo para entrar desde este dispositivo.",
        etiquetaCampo: "Código de verificación",
        permiteReenviar: true,
        modoTeclado: "numeric",
        autocompletado: "one-time-code",
      };
    case "totp":
      // No hay nada que enviar: el código lo genera la app del usuario.
      return {
        descripcion: "Abre tu aplicación de autenticación e introduce el código de 6 dígitos.",
        etiquetaCampo: "Código de la aplicación",
        permiteReenviar: false,
        modoTeclado: "numeric",
        autocompletado: "one-time-code",
      };
    case "backup_code":
      return {
        descripcion: "Introduce uno de tus códigos de recuperación.",
        etiquetaCampo: "Código de recuperación",
        permiteReenviar: false,
        // Puede llevar letras: teclado de texto, y sin autorrelleno que ofrezca
        // un código de un solo uso que no es el que toca.
        modoTeclado: "text",
        autocompletado: "off",
      };
  }
}
