import React from 'react';

/**
 * Badge — generic small status pill. Use StageBadge/PriorityBadge for those domains.
 * Tones map to semantic colors; `count` renders a compact numeric badge.
 */
export function Badge({ children, tone = 'neutral', dot = false, style = {}, ...rest }) {
  const tones = {
    neutral: { bg: 'var(--color-neutral-100)', fg: 'var(--color-neutral-600)', dot: 'var(--color-neutral-400)' },
    primary: { bg: 'var(--color-primary-50)', fg: 'var(--color-primary-700)', dot: 'var(--color-primary-500)' },
    success: { bg: 'var(--color-success-bg)', fg: 'var(--color-success-text)', dot: 'var(--color-success)' },
    warning: { bg: 'var(--color-warning-bg)', fg: 'var(--color-warning-text)', dot: 'var(--color-warning)' },
    error:   { bg: 'var(--color-error-bg)', fg: 'var(--color-error-text)', dot: 'var(--color-error)' },
    info:    { bg: 'var(--color-info-bg)', fg: 'var(--color-info-text)', dot: 'var(--color-info)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 10px', borderRadius: 'var(--radius-full)',
        background: t.bg, color: t.fg,
        fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, lineHeight: 1.3, ...style,
      }}
      {...rest}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot, flex: 'none' }} />}
      {children}
    </span>
  );
}

/** CountBadge — small green numeric badge (e.g. filter count on the menu button). */
export function CountBadge({ count, style = {}, ...rest }) {
  return (
    <span
      style={{
        minWidth: 18, height: 18, padding: '0 5px', borderRadius: 'var(--radius-full)',
        background: 'var(--color-primary-500)', color: '#fff',
        fontFamily: 'var(--font-numeric)', fontFeatureSettings: 'var(--num-features)',
        fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style,
      }}
      {...rest}
    >
      {count}
    </span>
  );
}
