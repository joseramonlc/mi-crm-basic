import * as React from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Full name — initials are derived from the first two words. */
  name: string;
  /** Preset size or explicit px. @default 'md' */
  size?: 'sm' | 'md' | 'lg' | number;
  /** Overlay a priority dot top-right. */
  priority?: 'high' | 'medium' | 'low' | null;
}

/** Initials avatar in a soft green chip. */
export function Avatar(props: AvatarProps): JSX.Element;
