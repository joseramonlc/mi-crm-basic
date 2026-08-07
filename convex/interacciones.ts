import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { calcularFechaProximoSeguimiento, esTerminal, type Etapa } from "./lib/seguimiento";
import { requireUsuario } from "./lib/usuario";
import { prospectoDelUsuario } from "./lib/acceso";
import { validationError } from "./lib/errores";
import {
  interaccionPublicaValidator,
  prospectoPublicoValidator,
  toInteraccionPublica,
  toProspectoPublico,
} from "./lib/proyecciones";
import {
  conLimites,
  fechaAcordadaValidada,
  queOcurrioObligatorio,
  siguientePasoOpcional,
  validarFechaInteraccion,
  validarNumItems,
} from "./lib/validacion";
import { resultadoInteraccion, tipoInteraccion } from "./schema";

/**
 * Fecha acordada del registro, ya validada y normalizada, o `undefined` si no se
 * pactó ninguna (JOS-68).
 *
 * El rechazo en etapas terminales es el mismo contrato de
 * `prospectos.fijarSeguimientoAcordado`: allí JOS-8 promete "sin seguimiento", y
 * aceptar una fecha devolvería a la Actividad Diaria un prospecto ya incorporado
 * o descartado. Se pregunta por `esTerminal`, no por la lista de etapas, para no
 * duplicar la tabla de SEGUIMIENTO_DIAS.
 *
 * Se llama ANTES del insert: la mutation es transaccional y el rollback lo
 * cubriría igual, pero es más claro y menos frágil no escribir nada hasta que
 * todos los argumentos son válidos.
 */
function fechaAcordadaDelRegistro(fechaAcordada: number | undefined, etapa: Etapa, ahoraMs: number): number | undefined {
  if (fechaAcordada === undefined) return undefined;
  if (esTerminal(etapa)) {
    throw validationError("No se puede fijar un contacto acordado en una etapa terminal", "etapaActual");
  }
  return fechaAcordadaValidada(fechaAcordada, ahoraMs, "fechaAcordada");
}

/**
 * POST /prospectos/:id/interacciones (JOS-14/JOS-11). Registra el contacto y
 * actualiza el prospecto EN LA MISMA MUTATION — las mutations de Convex son
 * transaccionales: o persiste todo o nada (requisito CRÍTICO de JOS-11).
 *
 * `fechaReferencia` nunca retrocede: registrar tarde una interacción antigua
 * (fecha < fechaUltimoContacto actual) no mueve el "último contacto" hacia
 * atrás. Ambos campos derivados se calculan desde la misma referencia
 * (invocación 2 de JOS-12).
 *
 * `fechaAcordada` (JOS-68) es OPCIONAL y no se guarda en la interacción: no
 * describe el contacto que acaba de ocurrir, sino el que se pactó para después.
 * Viaja aquí, y no en una segunda llamada a `prospectos.fijarSeguimientoAcordado`,
 * porque JOS-11 exige que el registro y sus efectos persistan o fallen juntos:
 * con dos transacciones, un fallo de la segunda dejaría la interacción guardada
 * y el acuerdo perdido, y el usuario ya habría visto el aviso de confirmación.
 */
export const crear = mutation({
  args: {
    prospectoId: v.id("prospectos"),
    fecha: v.number(),
    tipo: tipoInteraccion,
    queOcurrio: v.string(),
    resultado: resultadoInteraccion,
    siguientePasoAcordado: v.optional(v.string()),
    fechaAcordada: v.optional(v.number()),
  },
  returns: v.object({
    interaccion: interaccionPublicaValidator,
    prospecto: prospectoPublicoValidator,
  }),
  handler: async (ctx, args) => {
    const usuarioId = await requireUsuario(ctx);
    const prospecto = await prospectoDelUsuario(ctx, args.prospectoId, usuarioId);
    // Un único reloj para las dos fechas: dos Date.now() podrían caer a distinto
    // lado de la medianoche y validarse contra días civiles diferentes.
    const ahora = Date.now();
    validarFechaInteraccion(args.fecha, ahora);
    const queOcurrio = queOcurrioObligatorio(args.queOcurrio);
    const siguientePasoAcordado = siguientePasoOpcional(args.siguientePasoAcordado);
    const acordada = fechaAcordadaDelRegistro(args.fechaAcordada, prospecto.etapaActual, ahora);

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
      ...(acordada !== undefined
        ? // JOS-68: se pactó la próxima cita durante este contacto. Sustituye al
          // motor en el MISMO campo que él escribe, así ninguna pantalla de
          // lectura se entera de quién puso la fecha (diseño de JOS-67).
          { fechaProximoSeguimiento: acordada, seguimientoManual: true }
        : {
            // undefined elimina el campo en etapas terminales.
            fechaProximoSeguimiento: calcularFechaProximoSeguimiento(prospecto.etapaActual, fechaReferencia),
            // JOS-67: el contacto YA ocurrió, así que el acuerdo previo se
            // CONSUME y el motor vuelve a gobernar. Es el único de los tres
            // puntos de invocación donde el acuerdo se pierde solo, sin que el
            // usuario tenga que quitarlo.
            seguimientoManual: undefined,
          }),
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
