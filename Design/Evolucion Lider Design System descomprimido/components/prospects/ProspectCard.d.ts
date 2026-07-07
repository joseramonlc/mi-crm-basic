import * as React from 'react';
import type { PipelineStage } from '../feedback/StageBadge';
import type { PriorityLevel } from '../feedback/PriorityBadge';

/**
 * Comfortable-density prospect card — the app's main list unit.
 */
export interface ProspectCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  stage?: PipelineStage;
  priority?: PriorityLevel;
  /** Last-contact channel — selects the meta icon. */
  channel?: 'phone' | 'whatsapp' | 'instagram' | 'mail';
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
export function ProspectCard(props: ProspectCardProps): JSX.Element;
