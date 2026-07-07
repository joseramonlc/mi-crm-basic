import * as React from 'react';

/**
 * Button props.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default 'primary' */
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  /** Height preset — lg 48 / md 40 / sm 36. @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** Show spinner; use gerund copy ("Guardando…"). @default false */
  loading?: boolean;
  /** Stretch to container width. @default false */
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Primary action button.
 */
export function Button(props: ButtonProps): JSX.Element;
