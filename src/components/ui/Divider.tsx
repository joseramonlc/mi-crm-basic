import * as React from "react";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render a vertical 1px rule (stretches to parent height). @default false */
  vertical?: boolean;
  /** Side margin in px (horizontal) / vertical margin (vertical). @default 0 */
  inset?: number;
}

/** 1px slate separator. Horizontal by default; `vertical` for inline use. */
export function Divider({ vertical = false, inset = 0, style, ...rest }: DividerProps) {
  if (vertical) {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        style={{ width: 1, alignSelf: "stretch", background: "var(--border-default)", margin: `${inset}px 0`, flex: "none", ...style }}
        {...rest}
      />
    );
  }
  return (
    <div
      role="separator"
      style={{ height: 1, width: "auto", background: "var(--border-default)", margin: `0 ${inset}px`, ...style }}
      {...rest}
    />
  );
}
