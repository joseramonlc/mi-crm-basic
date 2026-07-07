import * as React from 'react';

export interface SelectOption { value: string; label: string; }

export interface SelectProps {
  label?: string;
  value?: string;
  /** Strings or {value,label} objects. */
  options: Array<string | SelectOption>;
  placeholder?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

/** Dropdown select; active option marked with a check on a green row. */
export function Select(props: SelectProps): JSX.Element;
