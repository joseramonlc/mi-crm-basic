import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Semantic tone. @default 'neutral' */
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  /** Show a leading colored dot. @default false */
  dot?: boolean;
  children?: React.ReactNode;
}

export interface CountBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: number | string;
}

/** Generic status pill. */
export function Badge(props: BadgeProps): JSX.Element;
/** Compact green numeric badge. */
export function CountBadge(props: CountBadgeProps): JSX.Element;
