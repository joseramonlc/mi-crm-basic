import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Esquema del CRM (JOS-7 vía JOS-10/JOS-11). La entidad Usuario queda cubierta
 * por Clerk según el ADR 0001 — sin tabla propia; el tenant es `usuarioId`.
 *
 * Convenciones fijadas por los componentes UI existentes:
 * - `etapaActual` usa las claves de StageBadge/PipelineStage.
 * - `canalContactoPreferido` usa las claves de ProspectCard.channel + "otro".
 * - Los enums de interacción usan claves inglesas homólogas. Mapeo de producto:
 *   Llamada=call, Mensaje=message, Reunión=meeting; Interesado=interested,
 *   Necesita pensar=thinking, No interesado=not_interested, Otro=other.
 * - Nulos por AUSENCIA (v.optional), nunca `null`, para rangos de índice limpios.
 * - Fechas en ms epoch; `fechaProximoSeguimiento` siempre es una medianoche
 *   APP_TZ calculada por el motor (convex/lib/seguimiento.ts), nunca editable
 *   por el usuario. `fechaUltimoContacto` lo actualiza el sistema al registrar
 *   interacciones (JOS-11/JOS-14).
 * - `usuarioId` es el `identity.tokenIdentifier` de la sesión (ADR 0001, JOS-66);
 *   lo deriva en servidor `convex/lib/usuario.ts` y ninguna función lo acepta
 *   del cliente. Es la clave de aislamiento: prefijo de todos los índices.
 */

/** Validadores compartidos entre el schema y las proyecciones/APIs (una sola fuente). */
export const canalContacto = v.union(
  v.literal("phone"),
  v.literal("whatsapp"),
  v.literal("mail"),
  v.literal("instagram"),
  v.literal("otro"),
);

export const etapaProspecto = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("presented"),
  v.literal("evaluating"),
  v.literal("joined"),
  v.literal("discarded"),
);

export const tipoInteraccion = v.union(v.literal("call"), v.literal("message"), v.literal("meeting"));

export const resultadoInteraccion = v.union(
  v.literal("interested"),
  v.literal("thinking"),
  v.literal("not_interested"),
  v.literal("other"),
);

export default defineSchema({
  prospectos: defineTable({
    usuarioId: v.string(),
    nombre: v.string(),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    comoSeConocio: v.string(),
    canalContactoPreferido: canalContacto,
    etapaActual: etapaProspecto,
    notas: v.optional(v.string()),
    fechaAlta: v.number(),
    fechaUltimoContacto: v.optional(v.number()),
    fechaProximoSeguimiento: v.optional(v.number()),
  })
    .index("by_usuario", ["usuarioId"])
    .index("by_usuario_seguimiento", ["usuarioId", "fechaProximoSeguimiento"])
    .index("by_usuario_ultimo_contacto", ["usuarioId", "fechaUltimoContacto"])
    .index("by_usuario_etapa", ["usuarioId", "etapaActual"])
    // Pipeline (JOS-21): con usuarioId y etapaActual fijados por igualdad, el
    // índice queda ordenado por fechaProximoSeguimiento, de modo que el `.take()`
    // de la query ya devuelve los MÁS URGENTES. Es lo que impide que el corte de
    // lectura oculte un vencido — ordenar después del corte solo reordena lo que
    // el corte ya decidió (bloqueante de la 1ª auditoría del plan). No sustituye a
    // by_usuario_etapa, que sigue sirviendo a `listar`.
    .index("by_usuario_etapa_seguimiento", ["usuarioId", "etapaActual", "fechaProximoSeguimiento"]),

  interacciones: defineTable({
    // Denormalizado del prospecto (siempre en servidor): defensa en profundidad
    // y limpieza por tenant vía prefijo del índice.
    usuarioId: v.string(),
    prospectoId: v.id("prospectos"),
    fecha: v.number(),
    tipo: tipoInteraccion,
    queOcurrio: v.string(),
    resultado: resultadoInteraccion,
    siguientePasoAcordado: v.optional(v.string()),
  })
    .index("by_usuario_prospecto_fecha", ["usuarioId", "prospectoId", "fecha"])
    // Resumen (JOS-24): con `prospectoId` en medio, by_usuario_prospecto_fecha NO
    // permite consultar por rango de fechas todas las interacciones del tenant —
    // habría que iterar prospecto a prospecto. Este índice es lo que hace posible
    // la actividad del período y la serie del gráfico con UNA lectura acotada.
    .index("by_usuario_fecha", ["usuarioId", "fecha"]),
});
