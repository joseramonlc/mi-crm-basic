import { v, type Infer } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { canalContacto, etapaProspecto, prioridadProspecto, tipoInteraccion, resultadoInteraccion } from "../schema";
import { prioridadDe } from "./prioridad";

/**
 * Proyecciones públicas de la API (M2): lo único que las funciones devuelven
 * al cliente. Excluyen `usuarioId`, `_id` y `_creationTime` por contrato — los
 * validadores se usan como `returns` de cada función, de modo que la exclusión
 * está validada en runtime, no es solo una convención del mapeador.
 */

export const prospectoPublicoValidator = v.object({
  id: v.id("prospectos"),
  nombre: v.string(),
  telefono: v.optional(v.string()),
  email: v.optional(v.string()),
  comoSeConocio: v.string(),
  canalContactoPreferido: canalContacto,
  etapaActual: etapaProspecto,
  notas: v.optional(v.string()),
  fechaAlta: v.number(),
  fechaUltimoContacto: v.optional(v.number()),
  fechaProximoSeguimiento: v.optional(v.number()),
  /**
   * JOS-67. Va SOLO en esta proyección core (`obtener`, `listar`, mutations); las
   * proyecciones agregadas de `actividadDiaria` y `pipeline` NO lo llevan a
   * propósito: esas pantallas leen la fecha sin necesitar saber quién la puso, y
   * la Ficha —única que distingue los dos estados (JOS-69)— usa `obtener`.
   */
  seguimientoManual: v.optional(v.boolean()),
  /**
   * JOS-50. OBLIGATORIA a propósito, aunque en el documento sea opcional: la
   * ausencia es un detalle de almacenamiento (evita la migración) y no debe
   * cruzar la API. Si aquí fuera opcional, cada consumidor —las cuatro pantallas
   * que vienen en M10— tendría que reimplementar "ausente = media", y esa regla
   * acabaría duplicada por todo el cliente. El validador lo garantiza en runtime.
   */
  prioridad: prioridadProspecto,
});
export type ProspectoPublico = Infer<typeof prospectoPublicoValidator>;

export const interaccionPublicaValidator = v.object({
  id: v.id("interacciones"),
  prospectoId: v.id("prospectos"),
  fecha: v.number(),
  tipo: tipoInteraccion,
  resultado: resultadoInteraccion,
  queOcurrio: v.string(),
  siguientePasoAcordado: v.optional(v.string()),
});
export type InteraccionPublica = Infer<typeof interaccionPublicaValidator>;

export function toProspectoPublico(doc: Doc<"prospectos">): ProspectoPublico {
  return {
    id: doc._id,
    nombre: doc.nombre,
    ...(doc.telefono !== undefined ? { telefono: doc.telefono } : {}),
    ...(doc.email !== undefined ? { email: doc.email } : {}),
    comoSeConocio: doc.comoSeConocio,
    canalContactoPreferido: doc.canalContactoPreferido,
    etapaActual: doc.etapaActual,
    ...(doc.notas !== undefined ? { notas: doc.notas } : {}),
    fechaAlta: doc.fechaAlta,
    ...(doc.fechaUltimoContacto !== undefined ? { fechaUltimoContacto: doc.fechaUltimoContacto } : {}),
    ...(doc.fechaProximoSeguimiento !== undefined ? { fechaProximoSeguimiento: doc.fechaProximoSeguimiento } : {}),
    ...(doc.seguimientoManual !== undefined ? { seguimientoManual: doc.seguimientoManual } : {}),
    // Resuelta, no copiada: aquí muere la ausencia (JOS-50).
    prioridad: prioridadDe(doc),
  };
}

export function toInteraccionPublica(doc: Doc<"interacciones">): InteraccionPublica {
  return {
    id: doc._id,
    prospectoId: doc.prospectoId,
    fecha: doc.fecha,
    tipo: doc.tipo,
    resultado: doc.resultado,
    queOcurrio: doc.queOcurrio,
    ...(doc.siguientePasoAcordado !== undefined ? { siguientePasoAcordado: doc.siguientePasoAcordado } : {}),
  };
}
