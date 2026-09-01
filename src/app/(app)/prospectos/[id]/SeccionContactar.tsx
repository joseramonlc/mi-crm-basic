"use client";

import * as React from "react";
import Link from "next/link";
import type { ProspectoPublico } from "../../../../../convex/lib/proyecciones";
import { buttonStyle, Icon } from "@/components/ui";
import { enlaceEmail, enlaceWhatsApp, normalizarTelefonoES } from "@/lib/contacto";
import {
  AVISO_EMAIL_NO_VALIDO,
  AVISO_TELEFONO_NO_VALIDO,
  CTA_REGISTRAR,
  ETIQUETA_CONTACTAR_EMAIL,
  ETIQUETA_CONTACTAR_WHATSAPP,
  PREGUNTA_YA_ENVIADO,
  SIN_DATOS_CONTACTO,
  TITULO_CONTACTAR,
} from "./textos";

/** Mismo escalón visual que el resto de encabezados de sección de la Ficha. */
const estiloH2Seccion: React.CSSProperties = {
  fontSize: "var(--text-h3-size)",
  fontWeight: 600,
  color: "var(--color-neutral-900)",
};

const estiloAviso: React.CSSProperties = { fontSize: 13, color: "var(--color-neutral-500)" };

/**
 * Sección «Contactar» (JOS-83). Dos botones que abren **la app del propio usuario**
 * —WhatsApp o su gestor de correo— con el destinatario ya puesto. El CRM no envía
 * nada por su cuenta: es un enlace, no una integración (Mejora #9).
 *
 * Hoy los enlaces van **sin texto**: JOS-36 (el panel de propuesta con IA) todavía
 * no existe. Cuando llegue, enchufará el texto generado en el parámetro opcional
 * que `enlaceWhatsApp`/`enlaceEmail` ya aceptan, y esta sección no cambia de forma.
 *
 * Los `href` se calculan **en el render**, no en un efecto: son funciones puras y
 * ninguna puede lanzar, así que no hace falta estado ni sincronización. Cuando
 * devuelven `null` el botón se pinta desactivado, nunca con un enlace a medias.
 */
export function SeccionContactar({
  prospecto,
  rutaRegistrar,
}: {
  prospecto: ProspectoPublico;
  rutaRegistrar: string;
}) {
  // El CRM no puede saber si se pulsó Enviar en la otra app. Lo único que sabe
  // es que el usuario abrió el enlace; con eso se le ofrece el registro al volver.
  const [abierto, setAbierto] = React.useState(false);

  const hayTelefono = prospecto.telefono !== undefined;
  const hayEmail = prospecto.email !== undefined;

  const telefono = normalizarTelefonoES(prospecto.telefono);
  const hrefWhatsApp = telefono === null ? null : enlaceWhatsApp(telefono);
  const hrefEmail = prospecto.email === undefined ? null : enlaceEmail(prospecto.email);

  if (!hayTelefono && !hayEmail) {
    return (
      <section aria-label={TITULO_CONTACTAR} className="flex flex-col gap-2">
        <h2 style={estiloH2Seccion}>{TITULO_CONTACTAR}</h2>
        <p style={estiloAviso}>{SIN_DATOS_CONTACTO}</p>
      </section>
    );
  }

  return (
    <section aria-label={TITULO_CONTACTAR} className="flex flex-col gap-3">
      <h2 style={estiloH2Seccion}>{TITULO_CONTACTAR}</h2>

      <div className="flex flex-wrap gap-2">
        {hayTelefono && (
          <BotonContacto
            href={hrefWhatsApp}
            icono="message-circle"
            etiqueta={ETIQUETA_CONTACTAR_WHATSAPP}
            // En escritorio abre WhatsApp Web: en pestaña nueva para no perder la Ficha.
            nuevaPestana
            onAbrir={() => setAbierto(true)}
          />
        )}
        {hayEmail && (
          <BotonContacto
            href={hrefEmail}
            icono="mail"
            etiqueta={ETIQUETA_CONTACTAR_EMAIL}
            // `mailto:` no navega la pestaña, así que no lleva target.
            onAbrir={() => setAbierto(true)}
          />
        )}
      </div>

      {hayTelefono && hrefWhatsApp === null && <p style={estiloAviso}>{AVISO_TELEFONO_NO_VALIDO}</p>}
      {hayEmail && hrefEmail === null && <p style={estiloAviso}>{AVISO_EMAIL_NO_VALIDO}</p>}

      {abierto && (
        <div className="flex flex-col items-start gap-2">
          <p style={estiloAviso}>{PREGUNTA_YA_ENVIADO}</p>
          {/* La MISMA pantalla del CTA de la Ficha (JOS-23): no se inventa un
              registro nuevo, y al guardar el motor recalcula fechas como siempre. */}
          <Link href={rutaRegistrar} style={buttonStyle({ variant: "secondary", size: "sm" })}>
            {CTA_REGISTRAR}
          </Link>
        </div>
      )}
    </section>
  );
}

/**
 * Un botón de contacto. Con `href` es un enlace de verdad (`<a>`, no `next/link`:
 * el destino es externo o un `mailto:`, donde el enrutador del cliente no pinta
 * nada). Sin `href` es un `<button disabled>`, que además de verse apagado queda
 * inerte de verdad y se anuncia como deshabilitado: un `<a>` sin `href` no lo haría.
 */
function BotonContacto({
  href,
  icono,
  etiqueta,
  nuevaPestana = false,
  onAbrir,
}: {
  href: string | null;
  icono: string;
  etiqueta: string;
  nuevaPestana?: boolean;
  onAbrir: () => void;
}) {
  const estilo = buttonStyle({ variant: "secondary", size: "md" });

  if (href === null) {
    return (
      <button type="button" disabled style={{ ...estilo, opacity: 0.5, cursor: "not-allowed" }}>
        <Icon name={icono} size={16} />
        {etiqueta}
      </button>
    );
  }

  return (
    <a
      href={href}
      style={estilo}
      onClick={onAbrir}
      {...(nuevaPestana ? { target: "_blank", rel: "noopener" } : {})}
    >
      <Icon name={icono} size={16} />
      {etiqueta}
    </a>
  );
}
