import React from 'react';

/**
 * Icon — renders a Lucide glyph by name (kebab-case, e.g. "message-circle").
 * Reads icon data from the Lucide UMD global (window.lucide) loaded via CDN.
 * Stroke 2px, round caps/joins, currentColor — per the brand spec.
 */
function toPascal(name) {
  return name.split(/[-_]/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

export function Icon({ name, size = 24, strokeWidth = 2, color = 'currentColor', style = {}, ...rest }) {
  const [, force] = React.useState(0);
  React.useEffect(() => {
    if (window.lucide && window.lucide.icons) return;
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      if ((window.lucide && window.lucide.icons) || tries > 40) { clearInterval(t); force((n) => n + 1); }
    }, 50);
    return () => clearInterval(t);
  }, []);

  const lib = (window.lucide && window.lucide.icons) || {};
  const children = lib[toPascal(name)];

  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline-block', flex: 'none', verticalAlign: 'middle', ...style }}
      aria-hidden="true" {...rest}
    >
      {Array.isArray(children) && children.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
