import * as React from "react";

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Optional trailing label. */
  label?: string;
  id?: string;
  style?: React.CSSProperties;
}

/** On/off toggle — green track when on. */
export function Switch({ checked = false, onChange, disabled = false, label, id, style }: SwitchProps) {
  const generatedId = React.useId();
  const swId = id || generatedId;
  const toggle = () => {
    if (!disabled) onChange?.(!checked);
  };
  const control = (
    <button
      id={swId}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={toggle}
      style={{
        width: 44,
        height: 26,
        flex: "none",
        borderRadius: "var(--radius-full)",
        border: "none",
        background: checked ? "var(--color-primary-500)" : "var(--color-neutral-300)",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background-color var(--duration-base) var(--ease-standard)",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 2px rgba(15,23,42,.25)",
          transition: "left var(--duration-base) var(--ease-standard)",
        }}
      />
    </button>
  );
  if (!label) return control;
  return (
    <label htmlFor={swId} style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "not-allowed" : "pointer", ...style }}>
      {control}
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--color-neutral-900)" }}>{label}</span>
    </label>
  );
}
