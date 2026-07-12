import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default 'primary' */
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  /** Height preset — lg 48 / md 40 / sm 36. @default 'md' */
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  /** Stretch to container width. @default false */
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const SIZES: Record<NonNullable<ButtonProps["size"]>, { height: number; padding: string; font: number; gap: number }> = {
  sm: { height: 36, padding: "0 12px", font: 13, gap: 6 },
  md: { height: 40, padding: "0 16px", font: 15, gap: 8 },
  lg: { height: 48, padding: "0 20px", font: 16, gap: 8 },
};

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, React.CSSProperties> = {
  primary: { background: "var(--color-primary-500)", color: "#fff", border: "1px solid transparent" },
  secondary: { background: "#fff", color: "var(--color-neutral-900)", border: "1px solid var(--border-strong)" },
  destructive: { background: "var(--color-error-text)", color: "#fff", border: "1px solid transparent" },
  ghost: { background: "transparent", color: "var(--color-primary-600)", border: "1px solid transparent" },
};

/**
 * Visual de botón como CSSProperties (base → variante), para elementos que deben
 * verse como Button sin serlo — p. ej. un <Link> de navegación. Sin estados
 * disabled/loading: eso es del Button interactivo.
 */
export function buttonStyle({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: Pick<ButtonProps, "variant" | "size" | "fullWidth"> = {}): React.CSSProperties {
  const s = SIZES[size];
  const v = VARIANTS[variant];
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: s.gap,
    height: s.height,
    padding: s.padding,
    width: fullWidth ? "100%" : "auto",
    fontFamily: "var(--font-sans)",
    fontSize: s.font,
    fontWeight: 600,
    lineHeight: 1,
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    transition: "background-color .15s ease, box-shadow .15s ease, transform .05s ease",
    whiteSpace: "nowrap",
    userSelect: "none",
    textDecoration: "none",
    ...v,
  };
}

/** Primary action button — variants: primary (green), secondary (outline), destructive, ghost. */
export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  iconLeft = null,
  iconRight = null,
  style,
  ...rest
}: ButtonProps) {
  // Precedencia intacta: base → variante (buttonStyle) → estado → style del consumidor.
  const base: React.CSSProperties = {
    ...buttonStyle({ variant, size, fullWidth }),
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
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
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        display: "inline-block",
        animation: "el-spin .7s linear infinite",
      }}
    />
  );
}
