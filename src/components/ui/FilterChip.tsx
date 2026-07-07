import * as React from "react";

export interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/** Filter pill for the horizontally-scrolling filter bar. Active = green fill + white text. */
export function FilterChip({ children, active = false, style, ...rest }: FilterChipProps) {
  return (
    <button
      type="button"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        flex: "none",
        height: 34,
        padding: "0 14px",
        borderRadius: "var(--radius-full)",
        border: "none",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        background: active ? "var(--color-primary-500)" : "var(--color-neutral-100)",
        color: active ? "#fff" : "var(--color-neutral-600)",
        transition: "background-color var(--duration-base) var(--ease-standard)",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
