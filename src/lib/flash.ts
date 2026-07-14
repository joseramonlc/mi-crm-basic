/**
 * Mensaje flash de una sola lectura entre navegaciones (M3): la pantalla de
 * origen lo escribe justo antes de navegar y el destino lo consume al montar.
 * sessionStorage en vez de query param para que una URL compartida no
 * re-muestre un toast viejo (rev. 2, P8).
 */
const CLAVE_FLASH = "crm.flash";

export function escribirFlash(mensaje: string): void {
  try {
    window.sessionStorage.setItem(CLAVE_FLASH, mensaje);
  } catch {
    // Almacenamiento no disponible (p. ej. bloqueado por el navegador): se
    // pierde el toast, nunca el guardado.
  }
}

/** Lee y borra el flash pendiente; null si no hay. */
export function consumirFlash(): string | null {
  try {
    const mensaje = window.sessionStorage.getItem(CLAVE_FLASH);
    if (mensaje !== null) window.sessionStorage.removeItem(CLAVE_FLASH);
    return mensaje;
  } catch {
    return null;
  }
}
