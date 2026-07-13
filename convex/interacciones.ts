import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { calcularFechaProximoSeguimiento } from "./lib/seguimiento";
import { requireUsuario } from "./lib/usuario";
import { prospectoDelUsuario } from "./lib/acceso";
import {
  interaccionPublicaValidator,
  prospectoPublicoValidator,
  toInteraccionPublica,
  toProspectoPublico,
} from "./lib/proyecciones";
import { conLimites, textoObligatorio, textoOpcional, validarFechaInteraccion, validarNumItems } from "./lib/validacion";
import { resultadoInteraccion, tipoInteraccion } from "./schema";

/**
 * POST /prospectos/:id/interacciones (JOS-14/JOS-11). Registra el contacto y
 * actualiza el prospecto EN LA MISMA MUTATION — las mutations de Convex son
 * transaccionales: o persiste todo o nada (requisito CRÍTICO de JOS-11).
 *
 * `fechaReferencia` nunca retrocede: registrar tarde una interacción antigua
 * (fecha < fechaUltimoContacto actual) no mueve el "último contacto" hacia
 * atrás. Ambos campos derivados se calculan desde la misma referencia
 * (invocación 2 de JOS-12).
 */
export const crear = mutation({
  args: {
    prospectoId: v.id("prospectos"),
    fecha: v.number(),
    tipo: tipoInteraccion,
    queOcurrio: v.string(),
    resultado: resultadoInteraccion,
    siguientePasoAcordado: v.optional(v.string()),
  },
  returns: v.object({
    interaccion: interaccionPublicaValidator,
    prospecto: prospectoPublicoValidator,
  }),
  handler: async (ctx, args) => {
    const usuarioId = await requireUsuario(ctx);
    const prospecto = await prospectoDelUsuario(ctx, args.prospectoId, usuarioId);
    validarFechaInteraccion(args.fecha, Date.now());
    const queOcurrio = textoObligatorio(args.queOcurrio, "queOcurrio");
    const siguientePasoAcordado = textoOpcional(args.siguientePasoAcordado);

    const interaccionId = await ctx.db.insert("interacciones", {
      usuarioId,
      prospectoId: prospecto._id,
      fecha: args.fecha,
      tipo: args.tipo,
      queOcurrio,
      resultado: args.resultado,
      ...(siguientePasoAcordado !== undefined ? { siguientePasoAcordado } : {}),
    });

    const fechaReferencia =
      prospecto.fechaUltimoContacto === undefined
        ? args.fecha
        : Math.max(prospecto.fechaUltimoContacto, args.fecha);
    await ctx.db.patch(prospecto._id, {
      fechaUltimoContacto: fechaReferencia,
      // undefined elimina el campo en etapas terminales.
      fechaProximoSeguimiento: calcularFechaProximoSeguimiento(prospecto.etapaActual, fechaReferencia),
    });

    return {
      interaccion: toInteraccionPublica((await ctx.db.get(interaccionId))!),
      prospecto: toProspectoPublico((await ctx.db.get(prospecto._id))!),
    };
  },
});

/**
 * GET /prospectos/:id/interacciones (JOS-14). Historial paginado por cursor,
 * orden `fecha` descendente (la más reciente primero), con topes de lectura
 * del servidor. Tenant verificado vía el prospecto y por el prefijo del índice.
 */
export const listarPorProspecto = query({
  args: { prospectoId: v.id("prospectos"), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(interaccionPublicaValidator),
  handler: async (ctx, { prospectoId, paginationOpts }) => {
    const usuarioId = await requireUsuario(ctx);
    await prospectoDelUsuario(ctx, prospectoId, usuarioId);
    validarNumItems(paginationOpts.numItems);
    const resultado = await ctx.db
      .query("interacciones")
      .withIndex("by_usuario_prospecto_fecha", (q) => q.eq("usuarioId", usuarioId).eq("prospectoId", prospectoId))
      .order("desc")
      .paginate(conLimites(paginationOpts));
    return { ...resultado, page: resultado.page.map(toInteraccionPublica) };
  },
});
