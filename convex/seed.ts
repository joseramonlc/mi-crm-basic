import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { DEV_USUARIO_ID } from "./lib/constants";
import { APP_TZ, addCivilDays, dayKeyToday, parseDayKey, zonedMidnightToMs } from "./lib/fecha";
import { calcularFechaProximoSeguimiento, type Etapa } from "./lib/seguimiento";

type Canal = "phone" | "whatsapp" | "mail" | "instagram" | "otro";

interface Fixture {
  nombre: string;
  etapa: Etapa;
  canal: Canal;
  comoSeConocio: string;
  /** Días (calendario) desde el alta hasta el dayKey del seed. */
  altaHaceDias: number;
  /** Días desde el último contacto; ausente = nunca contactado. */
  contactoHaceDias?: number;
}

/**
 * Datos de prueba de la rebanada JOS-22. SOLO DESARROLLO, con doble guarda
 * (APP_ENV + ALLOW_SEED — ninguna debe existir en producción) y además
 * `internalMutation`: no invocable desde clientes públicos, solo CLI/dashboard.
 *
 * Atómica: borra los prospectos de DEV_USUARIO_ID e inserta el escenario pedido
 * en la misma mutation. `dayKey` se deriva UNA vez (o se recibe validado) y los
 * fixtures se calculan relativos a él — reproducible incluso cerca de medianoche.
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
        // Hoy: new dado de alta ayer (motor: +1 día → hoy)
        { nombre: "Marta Ruiz", etapa: "new", canal: "whatsapp", comoSeConocio: "Referido", altaHaceDias: 1 },
        // Hoy: contacted hace 3 días (motor: +3 → hoy); más antiguo que Marta
        { nombre: "Carlos Vega", etapa: "contacted", canal: "phone", comoSeConocio: "Evento", altaHaceDias: 10, contactoHaceDias: 3 },
        // Hoy: evaluating hace 7 días (motor: +7 → hoy); el más antiguo de "hoy"
        { nombre: "Lucía Ferrer", etapa: "evaluating", canal: "mail", comoSeConocio: "Red social", altaHaceDias: 30, contactoHaceDias: 7 },
        // Vencido hace 2 días: contacted hace 5 (motor: +3 → hace 2)
        { nombre: "Andrés Molina", etapa: "contacted", canal: "instagram", comoSeConocio: "Red social", altaHaceDias: 15, contactoHaceDias: 5 },
        // Vencido hace 7 días: presented hace 12 (motor: +5 → hace 7); canal "otro" (fallback de icono)
        { nombre: "Elena Prat", etapa: "presented", canal: "otro", comoSeConocio: "Conocido", altaHaceDias: 40, contactoHaceDias: 12 },
        // Completado hoy: contacted esta mañana (motor: +3 → futuro); alimenta el ritmo
        { nombre: "Jorge Salas", etapa: "contacted", canal: "whatsapp", comoSeConocio: "Referido", altaHaceDias: 5, contactoHaceDias: 0 },
        // Terminal: sin seguimiento, no aparece en la actividad
        { nombre: "Nuria Campos", etapa: "joined", canal: "phone", comoSeConocio: "Evento", altaHaceDias: 60, contactoHaceDias: 20 },
      ],
      alDia: [
        // Contactado hoy → seguimiento futuro; da ritmo.completados > 0 sin pendientes
        { nombre: "Jorge Salas", etapa: "contacted", canal: "whatsapp", comoSeConocio: "Referido", altaHaceDias: 5, contactoHaceDias: 0 },
        // Alta hoy sin contactar → seguimiento mañana (futuro)
        { nombre: "Marta Ruiz", etapa: "new", canal: "phone", comoSeConocio: "Referido", altaHaceDias: 0 },
        { nombre: "Nuria Campos", etapa: "joined", canal: "mail", comoSeConocio: "Evento", altaHaceDias: 60, contactoHaceDias: 20 },
        { nombre: "Raúl Ortega", etapa: "discarded", canal: "otro", comoSeConocio: "Otro", altaHaceDias: 90, contactoHaceDias: 45 },
      ],
    };

    let insertados = 0;
    for (const f of FIXTURES[args.scenario]) {
      const fechaAlta = hora(f.altaHaceDias, 9);
      const fechaUltimoContacto = f.contactoHaceDias !== undefined ? hora(f.contactoHaceDias, 10) : undefined;
      await ctx.db.insert("prospectos", {
        usuarioId: DEV_USUARIO_ID,
        nombre: f.nombre,
        comoSeConocio: f.comoSeConocio,
        canalContactoPreferido: f.canal,
        etapaActual: f.etapa,
        fechaAlta,
        ...(fechaUltimoContacto !== undefined ? { fechaUltimoContacto } : {}),
        ...(() => {
          const prox = calcularFechaProximoSeguimiento(f.etapa, fechaUltimoContacto ?? fechaAlta);
          return prox !== undefined ? { fechaProximoSeguimiento: prox } : {};
        })(),
      });
      insertados++;
    }

    return { dayKey, scenario: args.scenario, insertados };
  },
});
