import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shadow level 0–3. @default 1 */
  elevation?: 0 | 1 | 2 | 3;
  /** Corner radius token or explicit value. @default 'lg' */
  radius?: "sm" | "md" | "lg" | "xl" | "card" | string;
  /** Pointer cursor + hover affordance. @default false */
  interactive?: boolean;
  /** Inner padding in px. @default 16 */
  padding?: number;
}

const SHADOWS: Record<number, string> = {
  0: "var(--shadow-0)",
  1: "var(--shadow-1)",
  2: "var(--shadow-2)",
  3: "var(--shadow-3)",
};

const RADII: Record<string, string> = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
  card: "var(--radius-card)",
};

/** Base white card surface. Elevation 1 at rest; `interactive` adds hover affordance. */
export function Card({
  children,
  elevation = 1,
  radius = "lg",
  interactive = false,
  padding = 16,
  style,
  ...rest
}: CardProps) {
  const shadow = SHADOWS[elevation] ?? SHADOWS[1];
  const r = RADII[radius] ?? radius;
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-default)",
        borderRadius: r,
        boxShadow: shadow,
        padding,
        transition: "box-shadow var(--duration-base) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
        cursor: interactive ? "pointer" : "default",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
