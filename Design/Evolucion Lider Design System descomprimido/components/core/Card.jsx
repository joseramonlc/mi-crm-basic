import React from 'react';

/**
 * Card — base white surface. Elevation 1 at rest. `interactive` adds hover lift.
 */
export function Card({ children, elevation = 1, radius = 'lg', interactive = false, padding = 16, style = {}, ...rest }) {
  const shadow = { 0: 'var(--shadow-0)', 1: 'var(--shadow-1)', 2: 'var(--shadow-2)', 3: 'var(--shadow-3)' }[elevation] || 'var(--shadow-1)';
  const r = { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', xl: 'var(--radius-xl)', card: 'var(--radius-card)' }[radius] || radius;
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: r,
        boxShadow: shadow,
        padding,
        transition: 'box-shadow var(--duration-base) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)',
        cursor: interactive ? 'pointer' : 'default',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
