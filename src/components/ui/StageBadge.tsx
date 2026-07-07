import * as React from "react";

export type PipelineStage = "new" | "contacted" | "presented" | "evaluating" | "joined" | "discarded";

export interface StageBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Pipeline stage key. @default 'new' */
  stage?: PipelineStage;
  /** Override the default Spanish label. */
  label?: string;
}

/**
 * Stage keys map 1:1 to the Convex `prospectos.etapaActual` enum and to this
 * system's `--color-stage-*` tokens. Spanish label per JOS-7:
 * new=Nuevo, contacted=Contactado, presented=Presentación realizada,
 * evaluating=En valoración, joined=Incorporado, discarded=Descartado.
 */
const STAGES: Record<PipelineStage, { label: string }> = {
  new: { label: "Nuevo" },
  contacted: { label: "Contactado" },
  presented: { label: "Presentación realizada" },
  evaluating: { label: "En valoración" },
  joined: { label: "Incorporado" },
  discarded: { label: "Descartado" },
};

/** Pipeline-stage pill with colored dot. */
export function StageBadge({ stage = "new", label, style, ...rest }: StageBadgeProps) {
  const meta = STAGES[stage] ?? STAGES.new;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: "var(--radius-full)",
        background: `var(--color-stage-${stage}-bg)`,
        color: `var(--color-stage-${stage}-text)`,
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: `var(--color-stage-${stage}-dot)`, flex: "none" }} />
      {label || meta.label}
    </span>
  );
}
