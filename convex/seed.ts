import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { DEV_USUARIO_ID } from "./lib/constants";
import { APP_TZ, addCivilDays, dayKeyToday, parseDayKey, zonedMidnightToMs } from "./lib/fecha";
import { calcularFechaProximoSeguimiento, type Etapa } from "./lib/seguimiento";

type Canal = "phone" | "whatsapp" | "mail" | "instagram" | "otro";
type Tipo = "call" | "message" | "meeting";
type Resultado = "interested" | "thinking" | "not_interested" | "other";

interface InteraccionFixture {
  /** Días (calendario) desde la interacción hasta el dayKey del seed. */
  haceDias: number;
  tipo: Tipo;
  resultado: Resultado;
  queOcurrio: string;
  siguientePaso?: string;
}

interface Fixture {
  nombre: string;
  etapa: Etapa;
  canal: Canal;
  comoSeConocio: string;
  /** Días (calendario) desde el alta hasta el dayKey del seed. */
  altaHaceDias: number;
  /**
   * Historial de contactos, del más antiguo al más reciente. INVARIANTES con
   * los campos derivados del prospecto (auditoría M2 rev. 4 §10):
   *  (a) fechaUltimoContacto = la fecha MÁXIMA de estas interacciones;
   *  (b) fechaProximoSeguimiento = motor(etapa, esa fecha máxima);
   *  (c) las interacciones históricas son estrictamente anteriores a la más
   *      reciente (evidencian el max() sin poder convertirse en el último
   *      contacto).
   * Ausente/vacío = nunca contactado (fechaUltimoContacto ausente, motor
   * desde fechaAlta).
   */
  interacciones?: InteraccionFixture[];
}

/**
 * Datos de prueba (JOS-22, ampliados en M2 con interacciones). SOLO DESARROLLO,
 * con doble guarda (APP_ENV + ALLOW_SEED — ninguna debe existir en producción)
 * y además `internalMutation`: no invocable desde clientes públicos.
 *
 * Atómica: borra prospectos E interacciones de DEV_USUARIO_ID (cascada de
 * JOS-7 aplicada donde hay borrado) e inserta el escenario en la misma
 * mutation. `dayKey` se deriva UNA vez y los fixtures se calculan relativos a
 * él — reproducible incluso cerca de medianoche.
 *
 * Escenarios:
 * - populated: hoy + vencidos + un contacto hecho hoy (pantalla completa)
 * - empty:     sin prospectos (estado "Aún no tienes prospectos")
 * - alDia:     prospectos sin actividad pendiente (estado "Todo al día")
 */
export const seed = internalMutation({
  args: {
    scenario: v.union(v.literal("populated"), v.literal("empty"), v.literal("alDia")),
    dayKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (process.env.APP_ENV !== "development") {
      throw new Error("seed: bloqueado — APP_ENV no es 'development'");
    }
    if (process.env.ALLOW_SEED !== "true") {
      throw new Error("seed: bloqueado — falta ALLOW_SEED=true en este deployment");
    }

    const dayKey = args.dayKey !== undefined ? (parseDayKey(args.dayKey), args.dayKey) : dayKeyToday(Date.now(), APP_TZ);
    const civilHoy = parseDayKey(dayKey);
    const medianoche = (haceDias: number) => zonedMidnightToMs(addCivilDays(civilHoy, -haceDias), APP_TZ);
    // Hora civil dentro del día: medianoche + horas en ms. Válido incluso en días
    // DST (23/25 h) porque nunca sale del día civil para horas de mañana.
    const hora = (haceDias: number, h: number) => medianoche(haceDias) + h * 3_600_000;

    // Limpieza con cascada: primero las interacciones del tenant (prefijo del
    // índice), después sus prospectos.
    const interaccionesAntiguas = await ctx.db
      .query("interacciones")
      .withIndex("by_usuario_prospecto_fecha", (q) => q.eq("usuarioId", DEV_USUARIO_ID))
      .collect();
    for (const doc of interaccionesAntiguas) {
      await ctx.db.delete(doc._id);
    }
    const antiguos = await ctx.db
      .query("prospectos")
      .withIndex("by_usuario", (q) => q.eq("usuarioId", DEV_USUARIO_ID))
      .collect();
    for (const doc of antiguos) {
      await ctx.db.delete(doc._id);
    }

    const FIXTURES: Record<typeof args.scenario, Fixture[]> = {
      empty: [],
      populated: [
        // Hoy: new dado de alta ayer (motor: +1 día → hoy), sin contactar aún
        { nombre: "Marta Ruiz", etapa: "new", canal: "whatsapp", comoSeConocio: "Referido", altaHaceDias: 1 },
        // Hoy: contacted hace 3 días (motor: +3 → hoy); más antiguo que Marta
        {
          nombre: "Carlos Vega", etapa: "contacted", canal: "phone", comoSeConocio: "Evento", altaHaceDias: 10,
          interacciones: [
            { haceDias: 8, tipo: "call", resultado: "thinking", queOcurrio: "Primera llamada tras el evento; pidió tiempo para mirarlo." },
            { haceDias: 3, tipo: "message", resultado: "interested", queOcurrio: "Le envié el dossier; respondió con interés.", siguientePaso: "Proponer una presentación esta semana" },
          ],
        },
        // Hoy: evaluating hace 7 días (motor: +7 → hoy); el más antiguo de "hoy";
        // 3 interacciones (etapa avanzada) — las dos primeras evidencian el max().
        {
          nombre: "Lucía Ferrer", etapa: "evaluating", canal: "mail", comoSeConocio: "Red social", altaHaceDias: 30,
          interacciones: [
            { haceDias: 20, tipo: "call", resultado: "interested", queOcurrio: "Presenté la oportunidad por teléfono; quiso ver números." },
            { haceDias: 12, tipo: "meeting", resultado: "thinking", queOcurrio: "Reunión con demo del plan de compensación." },
            { haceDias: 7, tipo: "message", resultado: "thinking", queOcurrio: "Resolvimos dudas del contrato; sigue valorando.", siguientePaso: "Llamar cuando hable con su socia" },
          ],
        },
        // Vencido hace 2 días: contacted hace 5 (motor: +3 → hace 2)
        {
          nombre: "Andrés Molina", etapa: "contacted", canal: "instagram", comoSeConocio: "Red social", altaHaceDias: 15,
          interacciones: [
            { haceDias: 5, tipo: "message", resultado: "thinking", queOcurrio: "DM inicial; contestó amable pero sin compromiso." },
          ],
        },
        // Vencido hace 7 días: presented hace 12 (motor: +5 → hace 7); canal "otro"
        // (fallback de icono); 3 interacciones (etapa avanzada).
        {
          nombre: "Elena Prat", etapa: "presented", canal: "otro", comoSeConocio: "Conocido", altaHaceDias: 40,
          interacciones: [
            { haceDias: 25, tipo: "call", resultado: "interested", queOcurrio: "Contacto inicial; encajó bien la propuesta." },
            { haceDias: 18, tipo: "message", resultado: "thinking", queOcurrio: "Compartí testimonios y el vídeo resumen." },
            { haceDias: 12, tipo: "meeting", resultado: "thinking", queOcurrio: "Presentación completa en persona.", siguientePaso: "Enviarle el kit de inicio" },
          ],
        },
        // Completado hoy: contacted esta mañana (motor: +3 → futuro); alimenta el ritmo
        {
          nombre: "Jorge Salas", etapa: "contacted", canal: "whatsapp", comoSeConocio: "Referido", altaHaceDias: 5,
          interacciones: [
            { haceDias: 0, tipo: "message", resultado: "interested", queOcurrio: "Contacto de hoy: quiere ver la presentación.", siguientePaso: "Agendar presentación" },
          ],
        },
        // Terminal: sin seguimiento, no aparece en la actividad; 3 interacciones.
        {
          nombre: "Nuria Campos", etapa: "joined", canal: "phone", comoSeConocio: "Evento", altaHaceDias: 60,
          interacciones: [
            { haceDias: 40, tipo: "call", resultado: "interested", queOcurrio: "Primer contacto tras el evento." },
            { haceDias: 30, tipo: "meeting", resultado: "interested", queOcurrio: "Presentación; salió convencida." },
            { haceDias: 20, tipo: "call", resultado: "other", queOcurrio: "Cerramos su incorporación al equipo." },
          ],
        },
      ],
      alDia: [
        // Contactado hoy → seguimiento futuro; da ritmo.completados > 0 sin pendientes
        {
          nombre: "Jorge Salas", etapa: "contacted", canal: "whatsapp", comoSeConocio: "Referido", altaHaceDias: 5,
          interacciones: [
            { haceDias: 0, tipo: "message", resultado: "interested", queOcurrio: "Contacto de hoy: quedamos en hablar el jueves." },
          ],
        },
        // Alta hoy sin contactar → seguimiento mañana (futuro)
        { nombre: "Marta Ruiz", etapa: "new", canal: "phone", comoSeConocio: "Referido", altaHaceDias: 0 },
        {
          nombre: "Nuria Campos", etapa: "joined", canal: "mail", comoSeConocio: "Evento", altaHaceDias: 60,
          interacciones: [
            { haceDias: 40, tipo: "call", resultado: "interested", queOcurrio: "Primer contacto tras el evento." },
            { haceDias: 30, tipo: "meeting", resultado: "interested", queOcurrio: "Presentación; salió convencida." },
            { haceDias: 20, tipo: "call", resultado: "other", queOcurrio: "Cerramos su incorporación al equipo." },
          ],
        },
        {
          nombre: "Raúl Ortega", etapa: "discarded", canal: "otro", comoSeConocio: "Otro", altaHaceDias: 90,
          interacciones: [
            { haceDias: 45, tipo: "call", resultado: "not_interested", queOcurrio: "No le encaja el modelo; descartado con buena relación." },
          ],
        },
      ],
    };

    let insertados = 0;
    for (const f of FIXTURES[args.scenario]) {
      const fechaAlta = hora(f.altaHaceDias, 9);
      const historial = f.interacciones ?? [];
      // Invariante (a): el último contacto es la fecha máxima del historial.
      const fechas = historial.map((i) => hora(i.haceDias, 10));
      const fechaUltimoContacto = fechas.length > 0 ? Math.max(...fechas) : undefined;
      // Invariante (b): el seguimiento se deriva de esa misma referencia.
      const prox = calcularFechaProximoSeguimiento(f.etapa, fechaUltimoContacto ?? fechaAlta);

      const prospectoId = await ctx.db.insert("prospectos", {
        usuarioId: DEV_USUARIO_ID,
        nombre: f.nombre,
        comoSeConocio: f.comoSeConocio,
        canalContactoPreferido: f.canal,
        etapaActual: f.etapa,
        fechaAlta,
        ...(fechaUltimoContacto !== undefined ? { fechaUltimoContacto } : {}),
        ...(prox !== undefined ? { fechaProximoSeguimiento: prox } : {}),
      });
      insertados++;

      for (let i = 0; i < historial.length; i++) {
        await ctx.db.insert("interacciones", {
          usuarioId: DEV_USUARIO_ID,
          prospectoId,
          fecha: fechas[i],
          tipo: historial[i].tipo,
          resultado: historial[i].resultado,
          queOcurrio: historial[i].queOcurrio,
          ...(historial[i].siguientePaso !== undefined ? { siguientePasoAcordado: historial[i].siguientePaso } : {}),
        });
      }
    }

    // Contrato de retorno intacto respecto a JOS-22 (los tests existentes hacen
    // igualdad exacta sobre él); las interacciones se verifican leyendo la tabla.
    return { dayKey, scenario: args.scenario, insertados };
  },
});
