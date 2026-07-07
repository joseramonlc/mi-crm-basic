import * as React from 'react';

export type PipelineStage = 'new' | 'contacted' | 'presented' | 'evaluating' | 'joined' | 'discarded';

export interface StageBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Pipeline stage key. @default 'new' */
  stage?: PipelineStage;
  /** Override the default Spanish label. */
  label?: string;
}

/** Pipeline-stage pill with colored dot. */
export function StageBadge(props: StageBadgeProps): JSX.Element;
