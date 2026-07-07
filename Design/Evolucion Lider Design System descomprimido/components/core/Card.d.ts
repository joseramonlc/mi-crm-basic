import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shadow level 0–3. @default 1 */
  elevation?: 0 | 1 | 2 | 3;
  /** Corner radius token or explicit value. @default 'lg' */
  radius?: 'sm' | 'md' | 'lg' | 'xl' | 'card' | string;
  /** Pointer cursor + hover affordance. @default false */
  interactive?: boolean;
  /** Inner padding in px. @default 16 */
  padding?: number;
  children?: React.ReactNode;
}

/** Base white card surface. */
export function Card(props: CardProps): JSX.Element;
