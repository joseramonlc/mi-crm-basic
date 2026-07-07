import React from 'react';

/**
 * Divider — 1px slate separator. Horizontal by default; `vertical` for inline.
 * `inset` adds side margins (menu/list separators).
 */
export function Divider({ vertical = false, inset = 0, style = {}, ...rest }) {
  if (vertical) {
    return <span role="separator" aria-orientation="vertical" style={{ width:1, alignSelf:'stretch', background:'var(--border-default)', margin:`${inset}px 0`, flex:'none', ...style }} {...rest} />;
  }
  return <div role="separator" style={{ height:1, width:'auto', background:'var(--border-default)', margin:`0 ${inset}px`, ...style }} {...rest} />;
}
