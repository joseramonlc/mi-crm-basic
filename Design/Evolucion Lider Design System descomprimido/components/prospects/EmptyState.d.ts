import * as React from 'react';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lucide icon name. @default 'users' */
  icon?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

/** Centered empty state with icon-in-circle and primary CTA. */
export function EmptyState(props: EmptyStateProps): JSX.Element;
