import * as React from 'react';

export interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children?: React.ReactNode;
}

/** Filter pill for the horizontally-scrolling filter bar. */
export function FilterChip(props: FilterChipProps): JSX.Element;
