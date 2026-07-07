import type { Doc } from "./_generated/dataModel";

type Etapa = Doc<"prospectos">["etapaActual"];

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Motor de seguimiento — calcula `fechaProximoSeguimiento` a partir de la
 * etapa y una fecha de referencia (fecha_alta al crear, o fecha_ultimo_contacto
 * al registrar una interacción).
 *
 * TODO(JOS-8): "Definir y documentar las reglas del motor de seguimiento por
 * etapa" sigue en Backlog en Linear — los intervalos de abajo son un valor
 * por defecto razonable para poder construir y probar el resto del flujo,
 * NO una decisión de producto cerrada. Ajustar aquí en cuanto JOS-8 se
 * resuelva; todo el resto del código llama a esta única función, así que el
 * cambio queda centralizado.
 */
const INTERVALO_DIAS: Partial<Record<Etapa, number>> = {
  new: 2,
  contacted: 3,
  presented: 5,
  evaluating: 7,
  // joined / discarded: etapas terminales, sin siguiente seguimiento.
};

export function calcularProximoSeguimiento(etapa: Etapa, fechaReferenciaMs: number): number | undefined {
  const dias = INTERVALO_DIAS[etapa];
  if (dias === undefined) return undefined;
  return fechaReferenciaMs + dias * DIA_MS;
}
