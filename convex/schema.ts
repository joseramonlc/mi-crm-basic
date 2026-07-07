import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * Entidad Usuario (JOS-7): cubierta por la tabla `users` de Convex Auth
 * (`authTables`), no se redefine aquí. `nombre` -> users.name, `email` ->
 * users.email, `fecha_alta` -> users._creationTime, `password_hash` vive
 * cifrado dentro de `authAccounts` (nunca expuesto). Ver convex/auth.ts.
 *
 * Aislamiento entre cuentas: toda query/mutation de prospectos e
 * interacciones debe filtrar por `usuarioId` == usuario autenticado — ver
 * convex/prospectos.ts y convex/interacciones.ts.
 */
export default defineSchema({
  ...authTables,

  prospectos: defineTable({
    usuarioId: v.id("users"),
    nombre: v.string(),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    /** Contexto de origen. Sugeridos: Referido / Red social / Evento / Conocido / Otro (no es un enum cerrado, per JOS-7). */
    comoSeConocio: v.string(),
    canalContactoPreferido: v.union(
      v.literal("whatsapp"),
      v.literal("llamada"),
      v.literal("email"),
      v.literal("instagram"),
      v.literal("otro"),
    ),
    /** Claves en inglés — coinciden con los tokens --color-stage-* del design system (ver StageBadge). */
    etapaActual: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("presented"),
      v.literal("evaluating"),
      v.literal("joined"),
      v.literal("discarded"),
    ),
    /** JOS-50: prioridad del prospecto. Claves en inglés — coinciden con --color-priority-* (ver PriorityBadge). */
    prioridad: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    notas: v.optional(v.string()),
    /** Gestionado por el sistema al crear una Interacción — nunca editable directamente por el usuario. */
    fechaUltimoContacto: v.optional(v.number()),
    /** Gestionado exclusivamente por el motor de seguimiento (convex/seguimiento.ts) — nunca editable por el usuario. */
    fechaProximoSeguimiento: v.optional(v.number()),
    // fecha_alta (JOS-7) -> se usa el campo de sistema `_creationTime`.
  })
    .index("by_usuario", ["usuarioId"])
    .index("by_usuario_etapa", ["usuarioId", "etapaActual"])
    .index("by_usuario_seguimiento", ["usuarioId", "fechaProximoSeguimiento"]),

  interacciones: defineTable({
    prospectoId: v.id("prospectos"),
    /** Denormalizado desde el prospecto para poder indexar/filtrar por cuenta directamente. */
    usuarioId: v.id("users"),
    fecha: v.number(),
    tipo: v.union(v.literal("llamada"), v.literal("mensaje"), v.literal("reunion")),
    queOcurrio: v.string(),
    resultado: v.union(
      v.literal("interesado"),
      v.literal("necesita_pensar"),
      v.literal("no_interesado"),
      v.literal("otro"),
    ),
    siguientePasoAcordado: v.optional(v.string()),
  })
    .index("by_prospecto", ["prospectoId"])
    .index("by_usuario", ["usuarioId"]),
});
