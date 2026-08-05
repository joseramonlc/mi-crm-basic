import type { MouseEvent } from "react";

/**
 * Vuelve al principio de la pantalla.
 *
 * Quien hace scroll es la ventana, no un contenedor interno: AppShell no
 * declara `overflow` en ninguno de sus envoltorios, y tanto la Sidebar como la
 * MobileHeader son `sticky` (no se desplazan con el contenido).
 */
export function scrollArriba() {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, behavior: prefiereMenosMovimiento() ? "auto" : "smooth" });
}

/** Sin `matchMedia` (jsdom, navegadores antiguos) se anima: es el comportamiento por defecto. */
function prefiereMenosMovimiento() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * Pulsación sobre el destino de navegación que YA está activo (JOS-25): no se
 * navega —no hay adónde— y se vuelve al principio del scroll.
 *
 * El `<Link>` de Next 16 NO sirve para esto por sí solo: su comportamiento por
 * defecto es **conservar** la posición de scroll, no subir
 * (`docs/01-app/03-api-reference/02-components/link.md`, `scroll`).
 *
 * Los clics con modificador se dejan pasar intactos: abrir el destino en otra
 * pestaña es cosa del navegador. Solo se intercepta la pulsación simple, que
 * es también la que produce el teclado al activar el enlace con Enter.
 */
export function alPulsarDestinoActivo(e: MouseEvent<HTMLAnchorElement>) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  scrollArriba();
}
