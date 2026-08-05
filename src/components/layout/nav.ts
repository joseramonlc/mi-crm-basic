/** The 3 root destinations (mobile tab bar / desktop sidebar) — per the design system layout spec. */
export const NAV_ITEMS = [
  { href: "/actividad", label: "Inicio", icon: "home" },
  { href: "/prospectos", label: "Prospectos", icon: "users" },
  { href: "/resumen", label: "Resumen", icon: "bar-chart-3" },
] as const;

export function isRootRoute(pathname: string) {
  return NAV_ITEMS.some((item) => pathname === item.href);
}

/**
 * Dónde aparece el FAB de "añadir prospecto" en móvil (JOS-26): rutas raíz y
 * ficha, sí; pantallas de captura, no.
 *
 * Las dos excluidas —alta de prospecto y registro de interacción— son las
 * únicas con un formulario a medio rellenar: un botón que navega fuera de
 * ellas es una vía directa a perder lo escrito, y son justo donde JOS-26
 * advierte del solape con el teclado virtual. Decisión de producto del
 * 2026-08-05 que acota el criterio original de la issue, registrada en ella.
 *
 * No hace falta enumerarlas: ninguna de las dos es raíz ni casa `esFichaProspecto`.
 */
export function muestraFab(pathname: string) {
  return isRootRoute(pathname) || esFichaProspecto(pathname);
}

/**
 * Ficha del prospecto (M4, P16): exactamente un segmento tras /prospectos que
 * no es el formulario de alta — la expresión excluye "nuevo" explícitamente
 * (lección del E2E de M3). Las subrutas (p. ej. interacciones/nueva) no casan
 * y conservan su TabBar. JOS-59 exige la ficha sin navegación inferior.
 */
export function esFichaProspecto(pathname: string) {
  return /^\/prospectos\/(?!nuevo$)[^/]+$/.test(pathname);
}
