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
 * Ficha del prospecto (M4, P16): exactamente un segmento tras /prospectos que
 * no es el formulario de alta — la expresión excluye "nuevo" explícitamente
 * (lección del E2E de M3). Las subrutas (p. ej. interacciones/nueva) no casan
 * y conservan su TabBar. JOS-59 exige la ficha sin navegación inferior.
 */
export function esFichaProspecto(pathname: string) {
  return /^\/prospectos\/(?!nuevo$)[^/]+$/.test(pathname);
}
