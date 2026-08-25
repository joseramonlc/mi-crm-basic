import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { calcularFechaProximoSeguimiento, esTerminal, seguimientoTrasCambioEtapa, type Etapa } from "./lib/seguimiento";
import { requireUsuario } from "./lib/usuario";
import { interaccionDelUsuario, prospectoDelUsuario } from "./lib/acceso";
import { notFound, validationError } from "./lib/errores";
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
import { MAX_INTERACCIONES_POR_PROSPECTO } from "./lib/constants";

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

    // JOS-80: tope de interacciones por prospecto. Acota la cascada de
    // `prospectos.eliminar` para que quepa siempre en UNA transacción (garantía del
    // gate de producción). Se lee tras validar los argumentos —así una llamada
    // inválida no paga el recuento— y con `.take(MAX)`: cuesta solo lo que hay, salvo
    // cerca del tope, donde el rechazo es inminente igualmente. El orden por fecha del
    // índice es indiferente para contar; solo importa el prefijo usuarioId+prospectoId.
    const existentes = await ctx.db
      .query("interacciones")
      .withIndex("by_usuario_prospecto_fecha", (q) =>
        q.eq("usuarioId", usuarioId).eq("prospectoId", prospecto._id),
      )
      .take(MAX_INTERACCIONES_POR_PROSPECTO);
    if (existentes.length >= MAX_INTERACCIONES_POR_PROSPECTO) {
      throw validationError(
        `No se pueden registrar más de ${MAX_INTERACCIONES_POR_PROSPECTO} interacciones por prospecto`,
        "prospectoId",
      );
    }

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

/**
 * Deja las fechas derivadas del prospecto correctas DESPUÉS de que su historial de interacciones
 * haya cambiado (borrado, o edición de la fecha) — JOS-80 Trozo B.
 *
 * `fechaUltimoContacto` deja de mantenerse con el `Math.max` de `crear` (que solo AVANZA) y pasa a
 * ser el máximo REAL de las interacciones que quedan: el índice `by_usuario_prospecto_fecha` ya está
 * ordenado por fecha, así que la más reciente es `.order("desc").first()` — una sola lectura. Si no
 * queda ninguna, el campo queda ausente (`undefined` en el patch lo elimina).
 *
 * `fechaProximoSeguimiento`/`seguimientoManual` NO se pueden reconstruir desde las interacciones (la
 * fecha acordada de JOS-68 no se guarda en ellas), así que se recalculan con la MISMA precedencia que
 * un cambio de etapa —terminal → acuerdo vigente → motor— reutilizando la función pura ya probada
 * `seguimientoTrasCambioEtapa`. Una cita acordada vigente se CONSERVA: es un compromiso futuro,
 * independiente de cualquier contacto pasado (si sobra, se retira con JOS-69).
 *
 * `referencia` = nuevo último contacto ?? fechaAlta (caso 4 de JOS-8), igual que el resto del motor.
 */
async function recalcularProspectoTrasHistorial(
  ctx: Pick<MutationCtx, "db">,
  prospecto: Doc<"prospectos">,
): Promise<void> {
  const ultima = await ctx.db
    .query("interacciones")
    .withIndex("by_usuario_prospecto_fecha", (q) =>
      q.eq("usuarioId", prospecto.usuarioId).eq("prospectoId", prospecto._id),
    )
    .order("desc")
    .first();
  const nuevaFechaUltimoContacto = ultima?.fecha;
  const referencia = nuevaFechaUltimoContacto ?? prospecto.fechaAlta;
  await ctx.db.patch(prospecto._id, {
    // undefined ELIMINA el campo: sin interacciones no hay "último contacto".
    fechaUltimoContacto: nuevaFechaUltimoContacto,
    ...seguimientoTrasCambioEtapa(prospecto.etapaActual, referencia, prospecto),
  });
}

/**
 * DELETE /prospectos/:id/interacciones/:interaccionId (JOS-80 Trozo B). Borra una interacción
 * registrada por error y RECALCULA las fechas derivadas del prospecto en la misma transacción.
 *
 * Autorización opaca por la propia fila (`interaccionDelUsuario`): un id ajeno o inexistente da el
 * mismo NOT_FOUND. Se borra ANTES de recalcular, para que el nuevo "último contacto" se lea sobre lo
 * que queda. No borra cascadas ni toca otros documentos: es O(1), muy por debajo de los límites de
 * Convex, así que —a diferencia del borrado del prospecto entero— no necesita gate.
 *
 * `prospecto` puede ser `null` si la interacción quedó huérfana (Convex no impone integridad
 * referencial): se borra igual —es basura— y se omite el recálculo, no hay documento sobre el que
 * actuar.
 */
export const eliminar = mutation({
  args: { id: v.id("interacciones") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const usuarioId = await requireUsuario(ctx);
    const interaccion = await interaccionDelUsuario(ctx, id, usuarioId);
    const prospecto = await ctx.db.get(interaccion.prospectoId);
    await ctx.db.delete(interaccion._id);
    if (prospecto !== null) await recalcularProspectoTrasHistorial(ctx, prospecto);
    return null;
  },
});

/**
 * PATCH /prospectos/:id/interacciones/:interaccionId (JOS-80 Trozo B). Corrige una interacción ya
 * guardada. Solo se editan los campos que la interacción ALMACENA; la "fecha acordada" (JOS-68) no
 * está entre ellos —no se guarda en la interacción— y se sigue gestionando en la Ficha (JOS-69).
 *
 * Solo un cambio de `fecha` puede mover las fechas del prospecto (subir o bajar el último contacto):
 * en ese caso se recalcula igual que en el borrado. Editar tipo/queOcurrio/resultado/siguiente paso
 * no toca ninguna fecha.
 *
 * Sin ningún campo → patch vacío, no-op idempotente que devuelve la interacción sin cambios (misma
 * convención que `prospectos.actualizar`). Autorización opaca por la fila; huérfana tratada como en
 * `eliminar`.
 */
export const actualizar = mutation({
  args: {
    id: v.id("interacciones"),
    fecha: v.optional(v.number()),
    tipo: v.optional(tipoInteraccion),
    queOcurrio: v.optional(v.string()),
    resultado: v.optional(resultadoInteraccion),
    siguientePasoAcordado: v.optional(v.string()),
  },
  returns: interaccionPublicaValidator,
  handler: async (ctx, args) => {
    const usuarioId = await requireUsuario(ctx);
    const interaccion = await interaccionDelUsuario(ctx, args.id, usuarioId);

    const patch: Partial<Doc<"interacciones">> = {};
    if (args.fecha !== undefined) {
      validarFechaInteraccion(args.fecha, Date.now());
      patch.fecha = args.fecha;
    }
    if (args.tipo !== undefined) patch.tipo = args.tipo;
    if (args.resultado !== undefined) patch.resultado = args.resultado;
    if (args.queOcurrio !== undefined) patch.queOcurrio = queOcurrioObligatorio(args.queOcurrio);
    // Cadena vacía elimina el campo (nulos por ausencia), igual que en `crear`.
    if (args.siguientePasoAcordado !== undefined) {
      patch.siguientePasoAcordado = siguientePasoOpcional(args.siguientePasoAcordado);
    }

    const fechaCambia = args.fecha !== undefined && args.fecha !== interaccion.fecha;
    await ctx.db.patch(interaccion._id, patch);
    if (fechaCambia) {
      const prospecto = await ctx.db.get(interaccion.prospectoId);
      if (prospecto !== null) await recalcularProspectoTrasHistorial(ctx, prospecto);
    }
    // self-get: la interacción existe, se acaba de patchear.
    return toInteraccionPublica((await ctx.db.get(interaccion._id))!);
  },
});

/**
 * GET /prospectos/:prospectoId/interacciones/:id (JOS-80 Trozo B). Una interacción por id, para
 * precargar la pantalla de edición. NOT_FOUND opaco para id ajeno o inexistente.
 *
 * La ruta es ANIDADA, así que la interacción debe pertenecer a ESE prospecto: `prospectoId` viaja
 * también y se comprueba la relación. Sin ello, `/prospectos/A/interacciones/B/editar` (B propio pero
 * de otro prospecto) montaría el formulario con el contexto de A editando B —fallo de identidad de
 * recurso—; con la comprobación, el par que no casa da el MISMO NOT_FOUND opaco (ni siquiera revela
 * que B exista).
 */
export const obtener = query({
  args: { prospectoId: v.id("prospectos"), id: v.id("interacciones") },
  returns: interaccionPublicaValidator,
  handler: async (ctx, { prospectoId, id }) => {
    const usuarioId = await requireUsuario(ctx);
    const interaccion = await interaccionDelUsuario(ctx, id, usuarioId);
    if (interaccion.prospectoId !== prospectoId) throw notFound("Interacción no encontrada");
    return toInteraccionPublica(interaccion);
  },
});
