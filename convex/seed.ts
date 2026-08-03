import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { APP_TZ, addCivilDays, dayKeyToday, parseDayKey, zonedMidnightToMs } from "./lib/fecha";
import { calcularFechaProximoSeguimiento, type Etapa } from "./lib/seguimiento";
import {
  LONGITUD_MAX_COMO_SE_CONOCIO,
  LONGITUD_MAX_EMAIL,
  LONGITUD_MAX_NOMBRE,
  LONGITUD_MAX_NOTAS,
  LONGITUD_MAX_TELEFONO,
  LONGITUD_MAX_TEXTO_INTERACCION,
  textoObligatorio,
} from "./lib/validacion";
import { MAX_RESUMEN_INTERACCIONES, MAX_RESUMEN_PROSPECTOS } from "./lib/constants";

type Canal = "phone" | "whatsapp" | "mail" | "instagram" | "otro";

/** Las 6 etapas, para repartir el escenario `resumen` y ejercitar todos los contadores. */
const ETAPAS_RESUMEN: Etapa[] = ["new", "contacted", "presented", "evaluating", "joined", "discarded"];
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
  /** Opcionales; solo el escenario `resumen` los usa, para sembrar el peor caso. */
  telefono?: string;
  email?: string;
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
  /** Texto libre; lo usa el escenario `volumen` para engordar el documento. */
  notas?: string;
}

/**
 * Datos de prueba (JOS-22, ampliados en M2 con interacciones). SOLO DESARROLLO,
 * con doble guarda (APP_ENV + ALLOW_SEED — ninguna debe existir en producción)
 * y además `internalMutation`: no invocable desde clientes públicos.
 *
 * Siembra sobre el tenant que se le indique (`usuarioId` = `tokenIdentifier` de
 * la cuenta de desarrollo, visible en `npx convex data prospectos` tras crear un
 * prospecto desde la app). Es la única función que recibe el tenant por
 * argumento en lugar de derivarlo de la sesión: no es invocable desde la app y
 * las dos guardas la mantienen fuera de producción.
 *
 * Atómica: borra prospectos E interacciones de ese tenant (cascada de JOS-7
 * aplicada donde hay borrado) e inserta el escenario en la misma mutation.
 * `dayKey` se deriva UNA vez y los fixtures se calculan relativos a él —
 * reproducible incluso cerca de medianoche.
 *
 * Escenarios:
 * - populated: hoy + vencidos + un contacto hecho hoy (pantalla completa)
 * - empty:     sin prospectos (estado "Aún no tienes prospectos")
 * - alDia:     prospectos sin actividad pendiente (estado "Todo al día")
 * - pipeline:  reparto por las 6 etapas con vencidos, hoy y futuros (JOS-21)
 * - volumen:   600 en una etapa, por encima de MAX_PIPELINE, con notas largas —
 *              para medir truncamiento y latencia real (condición 2 del GO)
 * - resumen:   1.201 prospectos + 501 interacciones, TODOS los campos libres al
 *              tope: satura a la vez las dos lecturas del Resumen (JOS-24 §4.3)
 */
export const seed = internalMutation({
  args: {
    scenario: v.union(
      v.literal("populated"),
      v.literal("empty"),
      v.literal("alDia"),
      v.literal("pipeline"),
      v.literal("volumen"),
      v.literal("resumen"),
    ),
    usuarioId: v.string(),
    dayKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (process.env.APP_ENV !== "development") {
      throw new Error("seed: bloqueado — APP_ENV no es 'development'");
    }
    if (process.env.ALLOW_SEED !== "true") {
      throw new Error("seed: bloqueado — falta ALLOW_SEED=true en este deployment");
    }
    const usuarioId = textoObligatorio(args.usuarioId, "usuarioId");

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
      .withIndex("by_usuario_prospecto_fecha", (q) => q.eq("usuarioId", usuarioId))
      .collect();
    for (const doc of interaccionesAntiguas) {
      await ctx.db.delete(doc._id);
    }
    const antiguos = await ctx.db
      .query("prospectos")
      .withIndex("by_usuario", (q) => q.eq("usuarioId", usuarioId))
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
      // JOS-21: las 6 etapas pobladas y, dentro de las no terminales, mezcla de
      // vencido / hoy / futuro para ver el orden por urgencia y el badge.
      // El motor deriva la fecha de (etapa, último contacto ?? alta), así que la
      // urgencia se controla con haceDias del último contacto.
      pipeline: [
        { nombre: "Marta Ruiz", etapa: "new", canal: "whatsapp", comoSeConocio: "Referido", altaHaceDias: 1 },
        { nombre: "Iván Soler", etapa: "new", canal: "phone", comoSeConocio: "Evento", altaHaceDias: 6 },
        {
          nombre: "Carlos Vega", etapa: "contacted", canal: "phone", comoSeConocio: "Evento", altaHaceDias: 10,
          interacciones: [{ haceDias: 3, tipo: "call", resultado: "interested", queOcurrio: "Le encajó la propuesta." }],
        },
        {
          nombre: "Andrés Molina", etapa: "contacted", canal: "instagram", comoSeConocio: "Red social", altaHaceDias: 15,
          interacciones: [{ haceDias: 9, tipo: "message", resultado: "thinking", queOcurrio: "DM inicial, sin compromiso." }],
        },
        {
          nombre: "Sara Gil", etapa: "contacted", canal: "mail", comoSeConocio: "Referido", altaHaceDias: 4,
          interacciones: [{ haceDias: 0, tipo: "message", resultado: "interested", queOcurrio: "Contacto de hoy." }],
        },
        {
          nombre: "Elena Prat", etapa: "presented", canal: "otro", comoSeConocio: "Conocido", altaHaceDias: 40,
          interacciones: [{ haceDias: 12, tipo: "meeting", resultado: "thinking", queOcurrio: "Presentación completa." }],
        },
        {
          nombre: "Bruno Casas", etapa: "presented", canal: "whatsapp", comoSeConocio: "Referido", altaHaceDias: 20,
          interacciones: [{ haceDias: 5, tipo: "meeting", resultado: "interested", queOcurrio: "Presentación online." }],
        },
        {
          nombre: "Lucía Ferrer", etapa: "evaluating", canal: "mail", comoSeConocio: "Red social", altaHaceDias: 30,
          interacciones: [{ haceDias: 7, tipo: "message", resultado: "thinking", queOcurrio: "Resolvimos dudas del contrato." }],
        },
        {
          nombre: "Nuria Campos", etapa: "joined", canal: "phone", comoSeConocio: "Evento", altaHaceDias: 60,
          interacciones: [{ haceDias: 20, tipo: "call", resultado: "other", queOcurrio: "Cerramos su incorporación." }],
        },
        {
          nombre: "Raúl Ortega", etapa: "discarded", canal: "otro", comoSeConocio: "Otro", altaHaceDias: 90,
          interacciones: [{ haceDias: 45, tipo: "call", resultado: "not_interested", queOcurrio: "No le encaja el modelo." }],
        },
      ],
      // Por encima de MAX_PIPELINE en una etapa, con notas largas: ejercita el
      // truncamiento real, el contador "500+" y la latencia contra el deployment.
      // Los vencidos se crean LOS ÚLTIMOS a propósito — con un orden que no
      // viniera del índice, desaparecerían de la pantalla.
      volumen: Array.from({ length: 600 }, (_, i) => {
        const vencido = i >= 550;
        return {
          nombre: `Prospecto ${String(i + 1).padStart(3, "0")}${vencido ? " (vencido)" : ""}`,
          etapa: "contacted" as Etapa,
          canal: "whatsapp" as Canal,
          comoSeConocio: "Carga de volumen",
          altaHaceDias: 120,
          // Al tope admisible: el recorrido manual debe ejercitar el documento
          // más grande que las mutaciones permiten, no uno cómodo (JOS-74).
          notas: "x".repeat(LONGITUD_MAX_NOTAS),
          interacciones: [
            {
              // contacted = +3 días: 30 → vencido hace 27; 0 → seguimiento futuro.
              haceDias: vencido ? 30 : 0,
              tipo: "message" as Tipo,
              resultado: "thinking" as Resultado,
              queOcurrio: "Contacto generado por el escenario de volumen.",
            },
          ],
        };
      }),
      // JOS-24: peor caso ADMISIBLE del Resumen, con las DOS lecturas saturadas a la
      // vez — es la condición que exige §4.3 del plan (no vale medirlas por separado).
      //   · 1.201 prospectos  = MAX_RESUMEN_PROSPECTOS + 1  → truncamiento de la lectura 1
      //   ·   501 interacciones = MAX_RESUMEN_INTERACCIONES + 1 → truncamiento de la lectura 2
      // Todos los campos libres van al tope que imponen las mutaciones (notas,
      // queOcurrio y siguientePasoAcordado): el documento más grande que el servidor
      // permite crear, no uno cómodo.
      resumen: Array.from({ length: MAX_RESUMEN_PROSPECTOS + 1 }, (_, i) => {
        const etapa = ETAPAS_RESUMEN[i % ETAPAS_RESUMEN.length];
        // Las primeras 501 llevan interacción dentro de la ventana de 30 días,
        // repartidas por día para que la serie del gráfico tenga relieve real.
        const conInteraccion = i < MAX_RESUMEN_INTERACCIONES + 1;
        // Nombre único al principio (para poder identificar filas en el dashboard)
        // y relleno hasta el tope: el peor caso ADMISIBLE exige TODOS los campos
        // libres al máximo, no solo `notas` (2ª auditoría del bocado A).
        const etiqueta = `Prospecto ${String(i + 1).padStart(4, "0")} `;
        return {
          nombre: etiqueta + "x".repeat(LONGITUD_MAX_NOMBRE - etiqueta.length),
          etapa,
          canal: "whatsapp" as Canal,
          comoSeConocio: "c".repeat(LONGITUD_MAX_COMO_SE_CONOCIO),
          telefono: "9".repeat(LONGITUD_MAX_TELEFONO),
          email: `${"x".repeat(LONGITUD_MAX_EMAIL - "@ejemplo.com".length)}@ejemplo.com`,
          altaHaceDias: i % 30,
          notas: "x".repeat(LONGITUD_MAX_NOTAS),
          ...(conInteraccion
            ? {
                interacciones: [
                  {
                    haceDias: i % 30,
                    tipo: "message" as Tipo,
                    resultado: "thinking" as Resultado,
                    queOcurrio: "x".repeat(LONGITUD_MAX_TEXTO_INTERACCION),
                    siguientePaso: "x".repeat(LONGITUD_MAX_TEXTO_INTERACCION),
                  },
                ],
              }
            : {}),
        };
      }),
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
        usuarioId,
        nombre: f.nombre,
        comoSeConocio: f.comoSeConocio,
        canalContactoPreferido: f.canal,
        etapaActual: f.etapa,
        fechaAlta,
        ...(f.telefono !== undefined ? { telefono: f.telefono } : {}),
        ...(f.email !== undefined ? { email: f.email } : {}),
        ...(f.notas !== undefined ? { notas: f.notas } : {}),
        ...(fechaUltimoContacto !== undefined ? { fechaUltimoContacto } : {}),
        ...(prox !== undefined ? { fechaProximoSeguimiento: prox } : {}),
      });
      insertados++;

      for (let i = 0; i < historial.length; i++) {
        await ctx.db.insert("interacciones", {
          usuarioId,
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
