import * as React from "react";
import { Icon } from "./Icon";
import { Button } from "./Button";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lucide icon name. @default 'users' */
  icon?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

/** Centered empty state with icon-in-circle, title, support text and a primary CTA. */
export function EmptyState({ icon = "users", title, description, ctaLabel, onCta, style, ...rest }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 8,
        padding: "48px 24px",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "var(--color-primary-50)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Icon name={icon} size={32} color="var(--color-primary-500)" />
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-neutral-900)" }}>{title}</div>
      {description && <div style={{ fontSize: 15, color: "var(--color-neutral-500)", maxWidth: 300, lineHeight: 1.5 }}>{description}</div>}
      {ctaLabel && (
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" onClick={onCta} iconLeft={<Icon name="plus" size={18} />}>
            {ctaLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
