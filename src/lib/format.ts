const DIA_MS = 24 * 60 * 60 * 1000;

/** "hace 2 días" / "hoy" / "ayer" — formato español per el design system (§ Fundamentos de contenido). */
export function formatRelativo(ms: number, ahora: number = Date.now()): string {
  const dias = Math.floor((ahora - ms) / DIA_MS);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

/** "Lunes, 29 de junio" — formato español per el design system. */
export function formatFecha(ms: number): string {
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" })
    .format(new Date(ms))
    .replace(/^\w/, (c) => c.toUpperCase());
}

export const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "Última interacción por WhatsApp",
  llamada: "Última llamada",
  email: "Último email",
  instagram: "Última interacción por Instagram",
  otro: "Última interacción",
};

/** Convex `canalContactoPreferido` ("llamada"/"email"/...) -> prop `channel` de <ProspectCard>. */
export const CHANNEL_TO_ICON = {
  llamada: "phone",
  whatsapp: "whatsapp",
  email: "mail",
  instagram: "instagram",
  otro: "phone",
} as const;
