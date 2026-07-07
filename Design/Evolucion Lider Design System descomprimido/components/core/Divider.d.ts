import * as React from 'react';

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render a vertical 1px rule (stretches to parent height). @default false */
  vertical?: boolean;
  /** Side margin in px (horizontal) / vertical margin (vertical). @default 0 */
  inset?: number;
}

/** 1px slate separator. */
export function Divider(props: DividerProps): JSX.Element;
