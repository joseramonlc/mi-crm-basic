import React from 'react';

/**
 * Input — text field with label / error / helper. States: default, focus (green
 * halo), filled, error (red halo + message), disabled. `multiline` → textarea.
 */
export function Input({
  label, value, placeholder, error, helper, disabled = false,
  multiline = false, rows = 3, id, style = {}, ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const inputId = id || React.useId();
  const borderColor = error ? 'var(--border-error)' : focused ? 'var(--border-focus)' : 'var(--border-strong)';
  const ring = focused ? (error ? 'var(--focus-ring-error)' : 'var(--focus-ring)') : 'none';

  const fieldStyle = {
    width: '100%',
    fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--color-neutral-900)',
    padding: '10px 12px',
    background: disabled ? 'var(--color-neutral-50)' : '#fff',
    border: `1px solid ${borderColor}`,
    borderRadius: 'var(--radius-md)',
    boxShadow: ring,
    outline: 'none',
    transition: 'border-color var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard)',
    resize: multiline ? 'vertical' : undefined,
    cursor: disabled ? 'not-allowed' : 'text',
  };
  const Field = multiline ? 'textarea' : 'input';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <label htmlFor={inputId} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-neutral-700)' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex' }}>
        <Field
          id={inputId}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          rows={multiline ? rows : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...fieldStyle, paddingRight: error && !multiline ? 38 : fieldStyle.padding && undefined }}
          {...rest}
        />
        {error && !multiline && (
          <span aria-hidden="true" style={{ position: 'absolute', right: 12, top: 11, color: 'var(--color-error-text)', fontWeight: 700 }}>!</span>
        )}
      </div>
      {error ? (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-error-text)' }}>{error}</span>
      ) : helper ? (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-neutral-400)' }}>{helper}</span>
      ) : null}
    </div>
  );
}
