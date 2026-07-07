import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { calcularProximoSeguimiento } from "./seguimiento";

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("No autenticado");
  return userId;
}

async function getOwnedProspecto(ctx: QueryCtx | MutationCtx, userId: Id<"users">, prospectoId: Id<"prospectos">) {
  const prospecto = await ctx.db.get(prospectoId);
  if (!prospecto || prospecto.usuarioId !== userId) throw new Error("Prospecto no encontrado");
  return prospecto;
}

/** Historial de interacciones de un prospecto, más reciente primero (JOS-20). */
export const listByProspecto = query({
  args: { prospectoId: v.id("prospectos") },
  handler: async (ctx, { prospectoId }) => {
    const userId = await requireUserId(ctx);
    await getOwnedProspecto(ctx, userId, prospectoId);
    const interacciones = await ctx.db
      .query("interacciones")
      .withIndex("by_prospecto", (q) => q.eq("prospectoId", prospectoId))
      .collect();
    return interacciones.sort((a, b) => b.fecha - a.fecha);
  },
});

/**
 * Registrar interacción (JOS-16 / JOS-11 / JOS-14). En una sola mutación —y
 * por tanto una sola transacción de Convex— se inserta la interacción y se
 * actualizan fecha_ultimo_contacto + fecha_proximo_seguimiento del prospecto;
 * si algo falla, Convex revierte todo automáticamente.
 *
 * Nota: JOS-11 permite registrar una interacción con fecha pasada ("el
 * usuario puede registrar tarde") y especifica sin matices "actualizar
 * fecha_ultimo_contacto con la fecha de esta interacción". Esta
 * implementación sigue esa redacción literal; si se registra una
 * interacción retroactiva más antigua que la última ya guardada,
 * fecha_ultimo_contacto retrocedería. Si eso no es el comportamiento
 * deseado, es un ajuste a decidir junto con JOS-8, no algo que asumir aquí.
 */
export const create = mutation({
  args: {
    prospectoId: v.id("prospectos"),
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
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const prospecto = await getOwnedProspecto(ctx, userId, args.prospectoId);

    const interaccionId = await ctx.db.insert("interacciones", {
      prospectoId: args.prospectoId,
      usuarioId: userId,
      fecha: args.fecha,
      tipo: args.tipo,
      queOcurrio: args.queOcurrio,
      resultado: args.resultado,
      siguientePasoAcordado: args.siguientePasoAcordado,
    });

    await ctx.db.patch(args.prospectoId, {
      fechaUltimoContacto: args.fecha,
      fechaProximoSeguimiento: calcularProximoSeguimiento(prospecto.etapaActual, args.fecha),
    });

    return interaccionId;
  },
});
