import * as React from "react";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { StageBadge, type PipelineStage } from "./StageBadge";
import { PriorityBadge, type PriorityLevel } from "./PriorityBadge";

const CHANNEL_ICON = { phone: "phone", whatsapp: "message-circle", instagram: "instagram", mail: "mail", otro: "message-square" } as const;

export interface ProspectCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  stage?: PipelineStage;
  priority?: PriorityLevel;
  /** Last-contact channel — selects the meta icon. */
  channel?: keyof typeof CHANNEL_ICON;
  /** Last interaction summary, e.g. "Última llamada". */
  lastInteraction?: string;
  /** Relative time, e.g. "hace 2 días". */
  timeAgo?: string;
  onCall?: () => void;
  onWhatsApp?: () => void;
  onNote?: () => void;
  onOpen?: () => void;
}

/** Comfortable-density prospect card — the app's main list unit. */
export function ProspectCard({
  name = "",
  stage = "new",
  priority = "medium",
  channel = "phone",
  lastInteraction = "",
  timeAgo = "",
  onCall,
  onWhatsApp,
  onNote,
  onOpen,
  style,
  ...rest
}: ProspectCardProps) {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-1)",
        overflow: "hidden",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
      {...rest}
    >
      <button type="button" onClick={onOpen} style={{ all: "unset", display: "block", cursor: onOpen ? "pointer" : "default", padding: 16, width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Avatar name={name} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PriorityBadge level={priority} dotOnly />
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--color-neutral-900)",
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {name}
              </span>
            </div>
            <div style={{ marginTop: 8 }}>
              <StageBadge stage={stage} />
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, color: "var(--color-neutral-500)", fontSize: 13 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Icon name={CHANNEL_ICON[channel] || "phone"} size={15} />
                {lastInteraction}
              </span>
              {timeAgo && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Icon name="clock" size={15} />
                  {timeAgo}
                </span>
              )}
            </div>
          </div>
          <Icon name="chevron-right" size={20} color="var(--color-neutral-300)" style={{ marginTop: 2 }} />
        </div>
      </button>
      {(onCall || onWhatsApp || onNote) && (
        <div style={{ display: "flex", borderTop: "1px solid var(--border-default)" }}>
          {[
            onCall && { icon: "phone", label: "Llamar", onClick: onCall },
            onWhatsApp && { icon: "message-circle", label: "WhatsApp", onClick: onWhatsApp },
            onNote && { icon: "sticky-note", label: "Nota", onClick: onNote },
          ]
            .filter((a): a is { icon: string; label: string; onClick: () => void } => Boolean(a))
            .map((a, i) => (
              <React.Fragment key={a.label}>
                {i > 0 && <span style={{ width: 1, background: "var(--border-default)" }} />}
                <CardAction icon={a.icon} label={a.label} onClick={a.onClick} />
              </React.Fragment>
            ))}
        </div>
      )}
    </div>
  );
}

function CardAction({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "11px 8px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--color-primary-700)",
      }}
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  );
}
