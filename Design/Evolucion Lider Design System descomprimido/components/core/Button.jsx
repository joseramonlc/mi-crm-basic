import React from 'react';

/**
 * Button — primary action element for Evolución Líder CRM.
 * Variants: primary (green), secondary (outline), destructive (red), ghost.
 * Sizes map to the spec: lg 48px CTA · md 40px standard · sm 36px list rows.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  iconLeft = null,
  iconRight = null,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { height: 36, padding: '0 12px', font: 13, gap: 6 },
    md: { height: 40, padding: '0 16px', font: 15, gap: 8 },
    lg: { height: 48, padding: '0 20px', font: 16, gap: 8 },
  };
  const s = sizes[size] || sizes.md;

  const variants = {
    primary: { background: 'var(--color-primary-500)', color: '#fff', border: '1px solid transparent' },
    secondary: { background: '#fff', color: 'var(--color-neutral-900)', border: '1px solid var(--border-strong)' },
    destructive: { background: 'var(--color-error-text)', color: '#fff', border: '1px solid transparent' },
    ghost: { background: 'transparent', color: 'var(--color-primary-600)', border: '1px solid transparent' },
  };
  const v = variants[variant] || variants.primary;

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.gap,
    height: s.height,
    padding: s.padding,
    width: fullWidth ? '100%' : 'auto',
    fontFamily: 'var(--font-sans)',
    fontSize: s.font,
    fontWeight: 600,
    lineHeight: 1,
    borderRadius: 'var(--radius-md)',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background-color .15s ease, box-shadow .15s ease, transform .05s ease',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    ...v,
    ...style,
  };

  return (
    <button type="button" disabled={disabled || loading} style={base} {...rest}>
      {loading && <Spinner />}
      {!loading && iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 14, height: 14, borderRadius: '50%',
        border: '2px solid currentColor', borderTopColor: 'transparent',
        display: 'inline-block', animation: 'el-spin .7s linear infinite',
      }}
    />
  );
}
