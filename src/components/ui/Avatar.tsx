import * as React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Full name — initials are derived from the first two words. */
  name: string;
  /** Preset size or explicit px. @default 'md' */
  size?: "sm" | "md" | "lg" | number;
  /** Overlay a priority dot top-right. */
  priority?: "high" | "medium" | "low" | null;
}

/** Initials avatar in a soft green chip. Sizes sm 28 / md 40 / lg 56 (card uses 44). */
export function Avatar({ name = "", size = "md", priority = null, style, ...rest }: AvatarProps) {
  const px = typeof size === "number" ? size : { sm: 28, md: 40, lg: 56 }[size] ?? 40;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const font = Math.round(px * 0.38);
  return (
    <span style={{ position: "relative", display: "inline-flex", flex: "none", ...style }} {...rest}>
      <span
        style={{
          width: px,
          height: px,
          borderRadius: "50%",
          background: "var(--color-primary-50)",
          color: "var(--color-primary-700)",
          fontFamily: "var(--font-sans)",
          fontSize: font,
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          letterSpacing: "0.01em",
        }}
      >
        {initials || "–"}
      </span>
      {priority && (
        <span
          style={{
            position: "absolute",
            top: -1,
            right: -1,
            width: Math.max(10, px * 0.26),
            height: Math.max(10, px * 0.26),
            borderRadius: "50%",
            background: `var(--color-priority-${priority}-dot)`,
            border: "2px solid #fff",
          }}
        />
      )}
    </span>
  );
}
