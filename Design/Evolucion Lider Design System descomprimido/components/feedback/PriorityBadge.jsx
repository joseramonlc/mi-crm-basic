import React from 'react';

/**
 * PriorityBadge — pill or bare dot showing prospect priority.
 * Levels: high · medium · low.
 */
const LEVELS = { high: 'Alta', medium: 'Media', low: 'Baja' };

export function PriorityBadge({ level = 'medium', label, dotOnly = false, size = 9, style = {}, ...rest }) {
  if (dotOnly) {
    return (
      <span
        aria-label={`Prioridad ${LEVELS[level]}`}
        style={{ width: size, height: size, borderRadius: '50%', background: `var(--color-priority-${level}-dot)`, display: 'inline-block', flex: 'none', ...style }}
        {...rest}
      />
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 'var(--radius-full)',
        background: `var(--color-priority-${level}-bg)`,
        color: `var(--color-priority-${level}-text)`,
        fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, lineHeight: 1.2, ...style,
      }}
      {...rest}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: `var(--color-priority-${level}-dot)`, flex: 'none' }} />
      {label || LEVELS[level]}
    </span>
  );
}
