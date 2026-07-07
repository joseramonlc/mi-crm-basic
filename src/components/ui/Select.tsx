import * as React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  value?: string;
  /** Strings or {value,label} objects. */
  options: Array<string | SelectOption>;
  placeholder?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

/** Dropdown select; active option marked with a check on a green row. */
export function Select({ label, value, options = [], placeholder = "Selecciona…", onChange, disabled = false, id, style }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const generatedId = React.useId();
  const selId = id || generatedId;
  const opts: SelectOption[] = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const current = opts.find((o) => o.value === value);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }} ref={ref}>
      {label && (
        <label htmlFor={selId} style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--color-neutral-700)" }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <button
          id={selId}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            textAlign: "left",
            color: current ? "var(--color-neutral-900)" : "var(--color-neutral-400)",
            padding: "10px 12px",
            background: disabled ? "var(--color-neutral-50)" : "#fff",
            border: `1px solid ${open ? "var(--border-focus)" : "var(--border-strong)"}`,
            borderRadius: "var(--radius-md)",
            boxShadow: open ? "var(--focus-ring)" : "none",
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "border-color var(--duration-base), box-shadow var(--duration-base)",
          }}
        >
          {current ? current.label : placeholder}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--color-neutral-400)", transform: open ? "rotate(180deg)" : "none", transition: "transform var(--duration-base)" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 20,
              background: "#fff",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-2)",
              padding: 4,
              animation: "el-fade-in var(--duration-fast) var(--ease-out)",
            }}
          >
            {opts.map((o) => {
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange?.(o.value);
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    fontFamily: "var(--font-sans)",
                    fontSize: 15,
                    textAlign: "left",
                    color: active ? "var(--color-primary-700)" : "var(--color-neutral-900)",
                    fontWeight: active ? 600 : 400,
                    padding: "9px 10px",
                    background: active ? "var(--color-primary-50)" : "transparent",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  {o.label}
                  {active && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
