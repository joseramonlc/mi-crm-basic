import React from 'react';
import { Avatar } from '../core/Avatar.jsx';
import { Icon } from '../core/Icon.jsx';
import { StageBadge } from '../feedback/StageBadge.jsx';
import { PriorityBadge } from '../feedback/PriorityBadge.jsx';

const CHANNEL_ICON = { phone: 'phone', whatsapp: 'message-circle', instagram: 'instagram', mail: 'mail' };

/**
 * ProspectCard — the primary list density. Avatar + name + priority dot,
 * stage badge, channel/last-interaction meta, and always-visible quick actions.
 */
export function ProspectCard({
  name = '', stage = 'new', priority = 'medium',
  channel = 'phone', lastInteraction = '', timeAgo = '',
  onCall, onWhatsApp, onNote, onOpen, style = {}, ...rest
}) {
  return (
    <div
      style={{
        background: 'var(--surface-card)', border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-1)', overflow: 'hidden',
        fontFamily: 'var(--font-sans)', ...style,
      }}
      {...rest}
    >
      <button type="button" onClick={onOpen} style={{ all: 'unset', display: 'block', cursor: onOpen ? 'pointer' : 'default', padding: 16, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Avatar name={name} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PriorityBadge level={priority} dotOnly />
              <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-neutral-900)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
            </div>
            <div style={{ marginTop: 8 }}><StageBadge stage={stage} /></div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-neutral-500)', fontSize: 13 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Icon name={CHANNEL_ICON[channel] || 'phone'} size={15} />
                {lastInteraction}
              </span>
              {timeAgo && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="clock" size={15} />{timeAgo}
                </span>
              )}
            </div>
          </div>
          <Icon name="chevron-right" size={20} color="var(--color-neutral-300)" style={{ marginTop: 2 }} />
        </div>
      </button>
      <div style={{ display: 'flex', borderTop: '1px solid var(--border-default)' }}>
        <CardAction icon="phone" label="Llamar" onClick={onCall} />
        <span style={{ width: 1, background: 'var(--border-default)' }} />
        <CardAction icon="message-circle" label="WhatsApp" onClick={onWhatsApp} />
        <span style={{ width: 1, background: 'var(--border-default)' }} />
        <CardAction icon="sticky-note" label="Nota" onClick={onNote} />
      </div>
    </div>
  );
}

function CardAction({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '11px 8px', background: 'transparent', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-primary-700)',
      }}
    >
      <Icon name={icon} size={16} />{label}
    </button>
  );
}
