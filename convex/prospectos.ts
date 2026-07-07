import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { calcularProximoSeguimiento } from "./seguimiento";

const canalContacto = v.union(
  v.literal("whatsapp"),
  v.literal("llamada"),
  v.literal("email"),
  v.literal("instagram"),
  v.literal("otro"),
);

const etapa = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("presented"),
  v.literal("evaluating"),
  v.literal("joined"),
  v.literal("discarded"),
);

const prioridad = v.union(v.literal("high"), v.literal("medium"), v.literal("low"));

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("No autenticado");
  return userId;
}

async function getOwned(ctx: QueryCtx | MutationCtx, userId: Id<"users">, id: Id<"prospectos">): Promise<Doc<"prospectos">> {
  const prospecto = await ctx.db.get(id);
  if (!prospecto || prospecto.usuarioId !== userId) throw new Error("Prospecto no encontrado");
  return prospecto;
}

/** Todos los prospectos del usuario autenticado. Agrupar/filtrar por etapa se hace en el cliente (JOS-21). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("prospectos")
      .withIndex("by_usuario", (q) => q.eq("usuarioId", userId))
      .collect();
  },
});

/** Prospectos con seguimiento vencido o para hoy — Actividad Diaria (JOS-22). */
export const listSeguimientosHoy = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const finDeHoy = new Date();
    finDeHoy.setHours(23, 59, 59, 999);
    const candidatos = await ctx.db
      .query("prospectos")
      .withIndex("by_usuario_seguimiento", (q) => q.eq("usuarioId", userId).lte("fechaProximoSeguimiento", finDeHoy.getTime()))
      .collect();
    return candidatos.filter((p) => p.fechaProximoSeguimiento !== undefined);
  },
});

export const get = query({
  args: { id: v.id("prospectos") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    return await getOwned(ctx, userId, id);
  },
});

/** Alta de prospecto (JOS-15 / JOS-10). La etapa inicial siempre es "new"; el motor de seguimiento calcula la primera fecha. */
export const create = mutation({
  args: {
    nombre: v.string(),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    comoSeConocio: v.string(),
    canalContactoPreferido: canalContacto,
    prioridad: v.optional(prioridad),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const ahora = Date.now();
    return await ctx.db.insert("prospectos", {
      usuarioId: userId,
      nombre: args.nombre,
      telefono: args.telefono,
      email: args.email,
      comoSeConocio: args.comoSeConocio,
      canalContactoPreferido: args.canalContactoPreferido,
      etapaActual: "new",
      prioridad: args.prioridad ?? "medium",
      notas: undefined,
      fechaUltimoContacto: undefined,
      fechaProximoSeguimiento: calcularProximoSeguimiento("new", ahora),
    });
  },
});

/** Edición de campos propios de la ficha (JOS-18). No incluye etapa/fechas gestionadas por el sistema. */
export const update = mutation({
  args: {
    id: v.id("prospectos"),
    nombre: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    comoSeConocio: v.optional(v.string()),
    canalContactoPreferido: v.optional(canalContacto),
    prioridad: v.optional(prioridad),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUserId(ctx);
    await getOwned(ctx, userId, id);
    await ctx.db.patch(id, patch);
  },
});

/** Cambio de etapa desde la Ficha (JOS-19); recalcula el próximo seguimiento para la nueva etapa. */
export const changeStage = mutation({
  args: { id: v.id("prospectos"), etapaActual: etapa },
  handler: async (ctx, { id, etapaActual }) => {
    const userId = await requireUserId(ctx);
    const prospecto = await getOwned(ctx, userId, id);
    const referencia = prospecto.fechaUltimoContacto ?? Date.now();
    await ctx.db.patch(id, {
      etapaActual,
      fechaProximoSeguimiento: calcularProximoSeguimiento(etapaActual, referencia),
    });
  },
});

/** Elimina el prospecto y, en cascada, sus interacciones (JOS-7). */
export const remove = mutation({
  args: { id: v.id("prospectos") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    await getOwned(ctx, userId, id);
    const interacciones = await ctx.db
      .query("interacciones")
      .withIndex("by_prospecto", (q) => q.eq("prospectoId", id))
      .collect();
    for (const interaccion of interacciones) {
      await ctx.db.delete(interaccion._id);
    }
    await ctx.db.delete(id);
  },
});
