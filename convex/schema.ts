import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Rebanada vertical de JOS-22 — adelanta el mínimo de JOS-7 (solo `prospectos`;
 * `usuarios` e `interacciones` llegan con JOS-5/JOS-11).
 *
 * Convenciones fijadas por los componentes UI existentes:
 * - `etapaActual` usa las claves de StageBadge/PipelineStage.
 * - `canalContactoPreferido` usa las claves de ProspectCard.channel + "otro".
 * - Nulos por AUSENCIA (v.optional), nunca `null`, para rangos de índice limpios.
 * - Fechas en ms epoch; `fechaProximoSeguimiento` siempre es una medianoche
 *   APP_TZ calculada por el motor (convex/lib/seguimiento.ts), nunca editable
 *   por el usuario. `fechaUltimoContacto` lo actualizará el sistema al registrar
 *   interacciones (JOS-11/JOS-14).
 * - `usuarioId` es un identificador provisional (DEV_USUARIO_ID) hasta JOS-5;
 *   migración a identidad real asumida como deuda conocida.
 */
export default defineSchema({
  prospectos: defineTable({
    usuarioId: v.string(),
    nombre: v.string(),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    comoSeConocio: v.string(),
    canalContactoPreferido: v.union(
      v.literal("phone"),
      v.literal("whatsapp"),
      v.literal("mail"),
      v.literal("instagram"),
      v.literal("otro"),
    ),
    etapaActual: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("presented"),
      v.literal("evaluating"),
      v.literal("joined"),
      v.literal("discarded"),
    ),
    notas: v.optional(v.string()),
    fechaAlta: v.number(),
    fechaUltimoContacto: v.optional(v.number()),
    fechaProximoSeguimiento: v.optional(v.number()),
  })
    .index("by_usuario", ["usuarioId"])
    .index("by_usuario_seguimiento", ["usuarioId", "fechaProximoSeguimiento"])
    .index("by_usuario_ultimo_contacto", ["usuarioId", "fechaUltimoContacto"]),
});
