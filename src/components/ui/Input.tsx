import * as React from "react";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "style"> {
  label?: string;
  /** Error message — turns the field red with halo + icon. */
  error?: string;
  /** Helper text under the field (hidden when error present). */
  helper?: string;
  /** Render a textarea. @default false */
  multiline?: boolean;
  rows?: number;
  style?: React.CSSProperties;
}

/** Text input / textarea with label, focus halo and error states. */
export function Input({
  label,
  value,
  placeholder,
  error,
  helper,
  disabled = false,
  multiline = false,
  rows = 3,
  id,
  style,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focused, setFocused] = React.useState(false);
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const borderColor = error ? "var(--border-error)" : focused ? "var(--border-focus)" : "var(--border-strong)";
  const ring = focused ? (error ? "var(--focus-ring-error)" : "var(--focus-ring)") : "none";

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    fontFamily: "var(--font-sans)",
    fontSize: 15,
    color: "var(--color-neutral-900)",
    padding: "10px 12px",
    background: disabled ? "var(--color-neutral-50)" : "#fff",
    border: `1px solid ${borderColor}`,
    borderRadius: "var(--radius-md)",
    boxShadow: ring,
    outline: "none",
    transition: "border-color var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard)",
    resize: multiline ? "vertical" : undefined,
    cursor: disabled ? "not-allowed" : "text",
    paddingRight: error && !multiline ? 38 : undefined,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label htmlFor={inputId} style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--color-neutral-700)" }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative", display: "flex" }}>
        {multiline ? (
          <textarea
            id={inputId}
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            onFocus={(e) => {
              setFocused(true);
              (onFocus as React.FocusEventHandler<HTMLTextAreaElement> | undefined)?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              (onBlur as React.FocusEventHandler<HTMLTextAreaElement> | undefined)?.(e);
            }}
            style={fieldStyle}
            {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            id={inputId}
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={fieldStyle}
            {...rest}
          />
        )}
        {error && !multiline && (
          <span aria-hidden="true" style={{ position: "absolute", right: 12, top: 11, color: "var(--color-error-text)", fontWeight: 700 }}>
            !
          </span>
        )}
      </div>
      {error ? (
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--color-error-text)" }}>{error}</span>
      ) : helper ? (
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--color-neutral-400)" }}>{helper}</span>
      ) : null}
    </div>
  );
}
