import * as Sentry from "@sentry/nextjs";

/**
 * Único punto donde el código de la aplicación habla con Sentry. Los ocho
 * boundaries de error del proyecto (los siete ya existentes + el nuevo
 * boundary raíz de `src/app/error.tsx`) llaman a esta función en vez de usar
 * `console.error` directo, para que un fallo visible en pantalla también
 * llegue a Sentry.
 */
export function registrarError(error: unknown): void {
  console.error(error);
  Sentry.captureException(error);
}

/**
 * Tapa con un marcador los patrones de email y teléfono que aparezcan en un
 * texto. Es una mitigación *best-effort*, no una garantía: no detecta un
 * nombre suelto ni ningún otro dato personal sin forma de email/teléfono.
 */
const PATRON_EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const PATRON_TELEFONO = /\+?\d[\d .-]{7,14}\d/g;

function sanearTexto(valor: string): string {
  return valor.replace(PATRON_EMAIL, "[email]").replace(PATRON_TELEFONO, "[teléfono]");
}

/**
 * `beforeSend` compartido por los tres `Sentry.init` (navegador, servidor y
 * edge): aplica `sanearTexto` al mensaje del evento y al de cada excepción
 * antes de enviarlo. No toca *breadcrumbs*, *tags* ni el contexto de la
 * petición — fuera de alcance de este bocado (ver plan).
 */
export function sanearEvento(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (typeof event.message === "string") {
    event.message = sanearTexto(event.message);
  }
  for (const valor of event.exception?.values ?? []) {
    if (typeof valor.value === "string") {
      valor.value = sanearTexto(valor.value);
    }
  }
  return event;
}
