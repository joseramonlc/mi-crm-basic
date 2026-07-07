import * as React from 'react';

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  /** Lucide icon name in kebab-case, e.g. "message-circle", "bar-chart-3". */
  name: string;
  /** Pixel size (square). @default 24 (use 16 in compact contexts) */
  size?: number;
  /** Stroke width. @default 2 */
  strokeWidth?: number;
  /** Stroke color. @default 'currentColor' */
  color?: string;
}

/** Lucide icon by name. Requires the Lucide UMD script on the page. */
export function Icon(props: IconProps): JSX.Element;
