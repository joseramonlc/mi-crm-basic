import * as React from "react";

export interface NativeSelectOption {
  value: string;
  label: string;
}

export interface NativeSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "style" | "onChange" | "value"> {
  label?: string;
  /** Strings o pares {value,label}. */
  options: Array<string | NativeSelectOption>;
  value?: string;
  /** Option deshabilitada con value "" mientras no hay selección. */
  placeholder?: string;
  onChange?: (value: string) => void;
  /** Error inline — mismo tratamiento visual que Input. */
  error?: string;
  style?: React.CSSProperties;
}

/**
 * <select> NATIVO estilizado como los inputs del kit (JOS-15 exige selects
 * nativos en móvil: el picker del sistema es más rápido que un dropdown
 * custom). El Select custom del kit queda para contextos no-formulario.
 */
export function NativeSelect({
  label,
  options = [],
  value,
  placeholder = "Selecciona…",
  onChange,
  error,
  disabled = false,
  id,
  style,
  onFocus,
  onBlur,
  ...rest
}: NativeSelectProps) {
  const [focused, setFocused] = React.useState(false);
  const generatedId = React.useId();
  const selId = id || generatedId;
  const opts: NativeSelectOption[] = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const borderColor = error ? "var(--border-error)" : focused ? "var(--border-focus)" : "var(--border-strong)";
  const ring = focused ? (error ? "var(--focus-ring-error)" : "var(--focus-ring)") : "none";
  const sinSeleccion = value === undefined || value === "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label htmlFor={selId} style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--color-neutral-700)" }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative", display: "flex" }}>
        <select
          id={selId}
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={{
            width: "100%",
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            color: sinSeleccion ? "var(--color-neutral-400)" : "var(--color-neutral-900)",
            padding: "10px 36px 10px 12px",
            background: disabled ? "var(--color-neutral-50)" : "#fff",
            border: `1px solid ${borderColor}`,
            borderRadius: "var(--radius-md)",
            boxShadow: ring,
            outline: "none",
            appearance: "none",
            WebkitAppearance: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "border-color var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard)",
          }}
          {...rest}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: "var(--color-neutral-400)",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {error && <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--color-error-text)" }}>{error}</span>}
    </div>
  );
}
