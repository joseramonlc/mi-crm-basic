import * as React from 'react';

export type PriorityLevel = 'high' | 'medium' | 'low';

export interface PriorityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Priority level. @default 'medium' */
  level?: PriorityLevel;
  /** Override the default Spanish label. */
  label?: string;
  /** Render just the colored dot (for cards). @default false */
  dotOnly?: boolean;
  /** Dot diameter in px when dotOnly. @default 9 */
  size?: number;
}

/** Priority pill (Alta/Media/Baja) or bare colored dot. */
export function PriorityBadge(props: PriorityBadgeProps): JSX.Element;
