import * as React from 'react';

/**
 * Text input / textarea with label, focus halo and error states.
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> {
  label?: string;
  /** Error message — turns the field red with halo + icon. */
  error?: string;
  /** Helper text under the field (hidden when error present). */
  helper?: string;
  disabled?: boolean;
  /** Render a textarea. @default false */
  multiline?: boolean;
  rows?: number;
  style?: React.CSSProperties;
}

/** Text input / textarea with label, focus halo and error states. */
export function Input(props: InputProps): JSX.Element;
