import * as React from 'react';

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Optional trailing label. */
  label?: string;
  id?: string;
  style?: React.CSSProperties;
}

/** On/off toggle — green track when on. */
export function Switch(props: SwitchProps): JSX.Element;
