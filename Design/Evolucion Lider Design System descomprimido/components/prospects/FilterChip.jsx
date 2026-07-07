import React from 'react';

/**
 * FilterChip — horizontally-scrolling filter pill. Active = green fill + white text.
 */
export function FilterChip({ children, active = false, onClick, style = {}, ...rest }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, flex: 'none',
        height: 34, padding: '0 14px', borderRadius: 'var(--radius-full)', border: 'none',
        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        background: active ? 'var(--color-primary-500)' : 'var(--color-neutral-100)',
        color: active ? '#fff' : 'var(--color-neutral-600)',
        transition: 'background-color var(--duration-base) var(--ease-standard)', whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
