import React from 'react';

/**
 * StageBadge — pill showing a prospect's pipeline stage with a colored dot.
 * 6 stages: new · contacted · presented · evaluating · joined · discarded.
 */
const STAGES = {
  new:        { label: 'Nuevo' },
  contacted:  { label: 'Contactado' },
  presented:  { label: 'Presentación realizada' },
  evaluating: { label: 'En valoración' },
  joined:     { label: 'Incorporado' },
  discarded:  { label: 'Descartado' },
};

export function StageBadge({ stage = 'new', label, style = {}, ...rest }) {
  const meta = STAGES[stage] || STAGES.new;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 'var(--radius-full)',
        background: `var(--color-stage-${stage}-bg)`,
        color: `var(--color-stage-${stage}-text)`,
        fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
        lineHeight: 1.2, whiteSpace: 'nowrap', ...style,
      }}
      {...rest}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: `var(--color-stage-${stage}-dot)`, flex: 'none' }} />
      {label || meta.label}
    </span>
  );
}
