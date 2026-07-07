/* @ds-bundle: {"format":4,"namespace":"EvoluciNLDerDesignSystem_8c407a","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Divider","sourcePath":"components/core/Divider.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"Badge","sourcePath":"components/feedback/Badge.jsx"},{"name":"CountBadge","sourcePath":"components/feedback/Badge.jsx"},{"name":"PriorityBadge","sourcePath":"components/feedback/PriorityBadge.jsx"},{"name":"StageBadge","sourcePath":"components/feedback/StageBadge.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"EmptyState","sourcePath":"components/prospects/EmptyState.jsx"},{"name":"FilterChip","sourcePath":"components/prospects/FilterChip.jsx"},{"name":"ProspectCard","sourcePath":"components/prospects/ProspectCard.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"2cfb89da9aad","components/core/Button.jsx":"515241b5e496","components/core/Card.jsx":"a9733a014bd3","components/core/Divider.jsx":"cff3383e707c","components/core/Icon.jsx":"e58123693ecd","components/feedback/Badge.jsx":"9c5d4fa05b32","components/feedback/PriorityBadge.jsx":"d5d80ea0d198","components/feedback/StageBadge.jsx":"c20f8b8f5808","components/forms/Input.jsx":"4602cd7a02c5","components/forms/Select.jsx":"dee56d4b6288","components/forms/Switch.jsx":"9edb0c3af07a","components/prospects/EmptyState.jsx":"be198386056f","components/prospects/FilterChip.jsx":"df40c3fa46d7","components/prospects/ProspectCard.jsx":"0832a77e81c0","ui_kits/crm-networker-desktop/app.jsx":"e2515a29e661","ui_kits/crm-networker/auth.jsx":"1bd02ea5c5ea","ui_kits/crm-networker/screens.jsx":"4870bba211f9","ui_kits/crm-networker/shell.jsx":"942848f7b41e"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.EvoluciNLDerDesignSystem_8c407a = window.EvoluciNLDerDesignSystem_8c407a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Avatar — initials in a soft green chip. Sizes sm 28 / md 40 / lg 56 (card uses 44).
 * Optional priority dot overlays the top-right (compact prospect rows).
 */
function Avatar({
  name = '',
  size = 'md',
  priority = null,
  style = {},
  ...rest
}) {
  const px = typeof size === 'number' ? size : {
    sm: 28,
    md: 40,
    lg: 56
  }[size] || 40;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
  const font = Math.round(px * 0.38);
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: 'relative',
      display: 'inline-flex',
      flex: 'none',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: px,
      height: px,
      borderRadius: '50%',
      background: 'var(--color-primary-50)',
      color: 'var(--color-primary-700)',
      fontFamily: 'var(--font-sans)',
      fontSize: font,
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      letterSpacing: '0.01em'
    }
  }, initials || '–'), priority && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -1,
      right: -1,
      width: Math.max(10, px * 0.26),
      height: Math.max(10, px * 0.26),
      borderRadius: '50%',
      background: `var(--color-priority-${priority}-dot)`,
      border: '2px solid #fff'
    }
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — primary action element for Evolución Líder CRM.
 * Variants: primary (green), secondary (outline), destructive (red), ghost.
 * Sizes map to the spec: lg 48px CTA · md 40px standard · sm 36px list rows.
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  iconLeft = null,
  iconRight = null,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      height: 36,
      padding: '0 12px',
      font: 13,
      gap: 6
    },
    md: {
      height: 40,
      padding: '0 16px',
      font: 15,
      gap: 8
    },
    lg: {
      height: 48,
      padding: '0 20px',
      font: 16,
      gap: 8
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: 'var(--color-primary-500)',
      color: '#fff',
      border: '1px solid transparent'
    },
    secondary: {
      background: '#fff',
      color: 'var(--color-neutral-900)',
      border: '1px solid var(--border-strong)'
    },
    destructive: {
      background: 'var(--color-error-text)',
      color: '#fff',
      border: '1px solid transparent'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-primary-600)',
      border: '1px solid transparent'
    }
  };
  const v = variants[variant] || variants.primary;
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.gap,
    height: s.height,
    padding: s.padding,
    width: fullWidth ? '100%' : 'auto',
    fontFamily: 'var(--font-sans)',
    fontSize: s.font,
    fontWeight: 600,
    lineHeight: 1,
    borderRadius: 'var(--radius-md)',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background-color .15s ease, box-shadow .15s ease, transform .05s ease',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    ...v,
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled || loading,
    style: base
  }, rest), loading && /*#__PURE__*/React.createElement(Spinner, null), !loading && iconLeft, children, !loading && iconRight);
}
function Spinner() {
  return /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 14,
      height: 14,
      borderRadius: '50%',
      border: '2px solid currentColor',
      borderTopColor: 'transparent',
      display: 'inline-block',
      animation: 'el-spin .7s linear infinite'
    }
  });
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — base white surface. Elevation 1 at rest. `interactive` adds hover lift.
 */
function Card({
  children,
  elevation = 1,
  radius = 'lg',
  interactive = false,
  padding = 16,
  style = {},
  ...rest
}) {
  const shadow = {
    0: 'var(--shadow-0)',
    1: 'var(--shadow-1)',
    2: 'var(--shadow-2)',
    3: 'var(--shadow-3)'
  }[elevation] || 'var(--shadow-1)';
  const r = {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    card: 'var(--radius-card)'
  }[radius] || radius;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: r,
      boxShadow: shadow,
      padding,
      transition: 'box-shadow var(--duration-base) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)',
      cursor: interactive ? 'pointer' : 'default',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Divider.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Divider — 1px slate separator. Horizontal by default; `vertical` for inline.
 * `inset` adds side margins (menu/list separators).
 */
function Divider({
  vertical = false,
  inset = 0,
  style = {},
  ...rest
}) {
  if (vertical) {
    return /*#__PURE__*/React.createElement("span", _extends({
      role: "separator",
      "aria-orientation": "vertical",
      style: {
        width: 1,
        alignSelf: 'stretch',
        background: 'var(--border-default)',
        margin: `${inset}px 0`,
        flex: 'none',
        ...style
      }
    }, rest));
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "separator",
    style: {
      height: 1,
      width: 'auto',
      background: 'var(--border-default)',
      margin: `0 ${inset}px`,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Divider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Divider.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Icon — renders a Lucide glyph by name (kebab-case, e.g. "message-circle").
 * Reads icon data from the Lucide UMD global (window.lucide) loaded via CDN.
 * Stroke 2px, round caps/joins, currentColor — per the brand spec.
 */
function toPascal(name) {
  return name.split(/[-_]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}
function Icon({
  name,
  size = 24,
  strokeWidth = 2,
  color = 'currentColor',
  style = {},
  ...rest
}) {
  const [, force] = React.useState(0);
  React.useEffect(() => {
    if (window.lucide && window.lucide.icons) return;
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      if (window.lucide && window.lucide.icons || tries > 40) {
        clearInterval(t);
        force(n => n + 1);
      }
    }, 50);
    return () => clearInterval(t);
  }, []);
  const lib = window.lucide && window.lucide.icons || {};
  const children = lib[toPascal(name)];
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      display: 'inline-block',
      flex: 'none',
      verticalAlign: 'middle',
      ...style
    },
    "aria-hidden": "true"
  }, rest), Array.isArray(children) && children.map(([tag, attrs], i) => React.createElement(tag, {
    key: i,
    ...attrs
  })));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — generic small status pill. Use StageBadge/PriorityBadge for those domains.
 * Tones map to semantic colors; `count` renders a compact numeric badge.
 */
function Badge({
  children,
  tone = 'neutral',
  dot = false,
  style = {},
  ...rest
}) {
  const tones = {
    neutral: {
      bg: 'var(--color-neutral-100)',
      fg: 'var(--color-neutral-600)',
      dot: 'var(--color-neutral-400)'
    },
    primary: {
      bg: 'var(--color-primary-50)',
      fg: 'var(--color-primary-700)',
      dot: 'var(--color-primary-500)'
    },
    success: {
      bg: 'var(--color-success-bg)',
      fg: 'var(--color-success-text)',
      dot: 'var(--color-success)'
    },
    warning: {
      bg: 'var(--color-warning-bg)',
      fg: 'var(--color-warning-text)',
      dot: 'var(--color-warning)'
    },
    error: {
      bg: 'var(--color-error-bg)',
      fg: 'var(--color-error-text)',
      dot: 'var(--color-error)'
    },
    info: {
      bg: 'var(--color-info-bg)',
      fg: 'var(--color-info-text)',
      dot: 'var(--color-info)'
    }
  };
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '3px 10px',
      borderRadius: 'var(--radius-full)',
      background: t.bg,
      color: t.fg,
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.3,
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: t.dot,
      flex: 'none'
    }
  }), children);
}

/** CountBadge — small green numeric badge (e.g. filter count on the menu button). */
function CountBadge({
  count,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      minWidth: 18,
      height: 18,
      padding: '0 5px',
      borderRadius: 'var(--radius-full)',
      background: 'var(--color-primary-500)',
      color: '#fff',
      fontFamily: 'var(--font-numeric)',
      fontFeatureSettings: 'var(--num-features)',
      fontSize: 11,
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style
    }
  }, rest), count);
}
Object.assign(__ds_scope, { Badge, CountBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Badge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/PriorityBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * PriorityBadge — pill or bare dot showing prospect priority.
 * Levels: high · medium · low.
 */
const LEVELS = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja'
};
function PriorityBadge({
  level = 'medium',
  label,
  dotOnly = false,
  size = 9,
  style = {},
  ...rest
}) {
  if (dotOnly) {
    return /*#__PURE__*/React.createElement("span", _extends({
      "aria-label": `Prioridad ${LEVELS[level]}`,
      style: {
        width: size,
        height: size,
        borderRadius: '50%',
        background: `var(--color-priority-${level}-dot)`,
        display: 'inline-block',
        flex: 'none',
        ...style
      }
    }, rest));
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 'var(--radius-full)',
      background: `var(--color-priority-${level}-bg)`,
      color: `var(--color-priority-${level}-text)`,
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.2,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: `var(--color-priority-${level}-dot)`,
      flex: 'none'
    }
  }), label || LEVELS[level]);
}
Object.assign(__ds_scope, { PriorityBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/PriorityBadge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/StageBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * StageBadge — pill showing a prospect's pipeline stage with a colored dot.
 * 6 stages: new · contacted · presented · evaluating · joined · discarded.
 */
const STAGES = {
  new: {
    label: 'Nuevo'
  },
  contacted: {
    label: 'Contactado'
  },
  presented: {
    label: 'Presentación realizada'
  },
  evaluating: {
    label: 'En valoración'
  },
  joined: {
    label: 'Incorporado'
  },
  discarded: {
    label: 'Descartado'
  }
};
function StageBadge({
  stage = 'new',
  label,
  style = {},
  ...rest
}) {
  const meta = STAGES[stage] || STAGES.new;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 'var(--radius-full)',
      background: `var(--color-stage-${stage}-bg)`,
      color: `var(--color-stage-${stage}-text)`,
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.2,
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: `var(--color-stage-${stage}-dot)`,
      flex: 'none'
    }
  }), label || meta.label);
}
Object.assign(__ds_scope, { StageBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/StageBadge.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — text field with label / error / helper. States: default, focus (green
 * halo), filled, error (red halo + message), disabled. `multiline` → textarea.
 */
function Input({
  label,
  value,
  placeholder,
  error,
  helper,
  disabled = false,
  multiline = false,
  rows = 3,
  id,
  style = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const inputId = id || React.useId();
  const borderColor = error ? 'var(--border-error)' : focused ? 'var(--border-focus)' : 'var(--border-strong)';
  const ring = focused ? error ? 'var(--focus-ring-error)' : 'var(--focus-ring)' : 'none';
  const fieldStyle = {
    width: '100%',
    fontFamily: 'var(--font-sans)',
    fontSize: 15,
    color: 'var(--color-neutral-900)',
    padding: '10px 12px',
    background: disabled ? 'var(--color-neutral-50)' : '#fff',
    border: `1px solid ${borderColor}`,
    borderRadius: 'var(--radius-md)',
    boxShadow: ring,
    outline: 'none',
    transition: 'border-color var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard)',
    resize: multiline ? 'vertical' : undefined,
    cursor: disabled ? 'not-allowed' : 'text'
  };
  const Field = multiline ? 'textarea' : 'input';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--color-neutral-700)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Field, _extends({
    id: inputId,
    value: value,
    placeholder: placeholder,
    disabled: disabled,
    rows: multiline ? rows : undefined,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      ...fieldStyle,
      paddingRight: error && !multiline ? 38 : fieldStyle.padding && undefined
    }
  }, rest)), error && !multiline && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      right: 12,
      top: 11,
      color: 'var(--color-error-text)',
      fontWeight: 700
    }
  }, "!")), error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--color-error-text)'
    }
  }, error) : helper ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--color-neutral-400)'
    }
  }, helper) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Select — labelled dropdown. Closed shows current value; open lists options with
 * the active one marked by a check and green-tinted row.
 */
function Select({
  label,
  value,
  options = [],
  placeholder = 'Selecciona…',
  onChange,
  disabled = false,
  id,
  style = {},
  ...rest
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const selId = id || React.useId();
  const opts = options.map(o => typeof o === 'string' ? {
    value: o,
    label: o
  } : o);
  const current = opts.find(o => o.value === value);
  React.useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...style
    },
    ref: ref
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: selId,
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--color-neutral-700)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", _extends({
    id: selId,
    type: "button",
    disabled: disabled,
    onClick: () => setOpen(o => !o),
    style: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      textAlign: 'left',
      color: current ? 'var(--color-neutral-900)' : 'var(--color-neutral-400)',
      padding: '10px 12px',
      background: disabled ? 'var(--color-neutral-50)' : '#fff',
      border: `1px solid ${open ? 'var(--border-focus)' : 'var(--border-strong)'}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: open ? 'var(--focus-ring)' : 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'border-color var(--duration-base), box-shadow var(--duration-base)'
    }
  }, rest), current ? current.label : placeholder, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      color: 'var(--color-neutral-400)',
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform var(--duration-base)'
    }
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 12 15 18 9"
  }))), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 'calc(100% + 4px)',
      left: 0,
      right: 0,
      zIndex: 20,
      background: '#fff',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-2)',
      padding: 4,
      animation: 'el-fade-in var(--duration-fast) var(--ease-out)'
    }
  }, opts.map(o => {
    const active = o.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: o.value,
      type: "button",
      onClick: () => {
        onChange && onChange(o.value);
        setOpen(false);
      },
      style: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        fontFamily: 'var(--font-sans)',
        fontSize: 15,
        textAlign: 'left',
        color: active ? 'var(--color-primary-700)' : 'var(--color-neutral-900)',
        fontWeight: active ? 600 : 400,
        padding: '9px 10px',
        background: active ? 'var(--color-primary-50)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer'
      }
    }, o.label, active && /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("polyline", {
      points: "20 6 9 17 4 12"
    })));
  }))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Switch — on/off toggle. On = green track, off = slate; white 20px thumb.
 */
function Switch({
  checked = false,
  onChange,
  disabled = false,
  label,
  id,
  style = {},
  ...rest
}) {
  const swId = id || React.useId();
  const toggle = () => {
    if (!disabled && onChange) onChange(!checked);
  };
  const control = /*#__PURE__*/React.createElement("button", _extends({
    id: swId,
    type: "button",
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    onClick: toggle,
    style: {
      width: 44,
      height: 26,
      flex: 'none',
      borderRadius: 'var(--radius-full)',
      border: 'none',
      background: checked ? 'var(--color-primary-500)' : 'var(--color-neutral-300)',
      position: 'relative',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'background-color var(--duration-base) var(--ease-standard)',
      padding: 0
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: checked ? 21 : 3,
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 1px 2px rgba(15,23,42,.25)',
      transition: 'left var(--duration-base) var(--ease-standard)'
    }
  }));
  if (!label) return control;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: swId,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style
    }
  }, control, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      color: 'var(--color-neutral-900)'
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/prospects/EmptyState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * EmptyState — centered icon-in-circle, title, support text and a primary CTA.
 * Shown when the user has no prospects yet.
 */
function EmptyState({
  icon = 'users',
  title,
  description,
  ctaLabel,
  onCta,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 8,
      padding: '48px 24px',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 72,
      height: 72,
      borderRadius: '50%',
      background: 'var(--color-primary-50)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 32,
    color: "var(--color-primary-500)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      color: 'var(--color-neutral-900)'
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      color: 'var(--color-neutral-500)',
      maxWidth: 300,
      lineHeight: 1.5
    }
  }, description), ctaLabel && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    onClick: onCta,
    iconLeft: /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "plus",
      size: 18
    })
  }, ctaLabel)));
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/prospects/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/prospects/FilterChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * FilterChip — horizontally-scrolling filter pill. Active = green fill + white text.
 */
function FilterChip({
  children,
  active = false,
  onClick,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      flex: 'none',
      height: 34,
      padding: '0 14px',
      borderRadius: 'var(--radius-full)',
      border: 'none',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      background: active ? 'var(--color-primary-500)' : 'var(--color-neutral-100)',
      color: active ? '#fff' : 'var(--color-neutral-600)',
      transition: 'background-color var(--duration-base) var(--ease-standard)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { FilterChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/prospects/FilterChip.jsx", error: String((e && e.message) || e) }); }

// components/prospects/ProspectCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CHANNEL_ICON = {
  phone: 'phone',
  whatsapp: 'message-circle',
  instagram: 'instagram',
  mail: 'mail'
};

/**
 * ProspectCard — the primary list density. Avatar + name + priority dot,
 * stage badge, channel/last-interaction meta, and always-visible quick actions.
 */
function ProspectCard({
  name = '',
  stage = 'new',
  priority = 'medium',
  channel = 'phone',
  lastInteraction = '',
  timeAgo = '',
  onCall,
  onWhatsApp,
  onNote,
  onOpen,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--shadow-1)',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onOpen,
    style: {
      all: 'unset',
      display: 'block',
      cursor: onOpen ? 'pointer' : 'default',
      padding: 16,
      width: '100%',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: name,
    size: 44
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.PriorityBadge, {
    level: priority,
    dotOnly: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      color: 'var(--color-neutral-900)',
      letterSpacing: '-0.01em',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, name)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.StageBadge, {
    stage: stage
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      color: 'var(--color-neutral-500)',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: CHANNEL_ICON[channel] || 'phone',
    size: 15
  }), lastInteraction), timeAgo && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "clock",
    size: 15
  }), timeAgo))), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 20,
    color: "var(--color-neutral-300)",
    style: {
      marginTop: 2
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      borderTop: '1px solid var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement(CardAction, {
    icon: "phone",
    label: "Llamar",
    onClick: onCall
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      background: 'var(--border-default)'
    }
  }), /*#__PURE__*/React.createElement(CardAction, {
    icon: "message-circle",
    label: "WhatsApp",
    onClick: onWhatsApp
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      background: 'var(--border-default)'
    }
  }), /*#__PURE__*/React.createElement(CardAction, {
    icon: "sticky-note",
    label: "Nota",
    onClick: onNote
  })));
}
function CardAction({
  icon,
  label,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    style: {
      flex: 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: '11px 8px',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--color-primary-700)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16
  }), label);
}
Object.assign(__ds_scope, { ProspectCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/prospects/ProspectCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm-networker-desktop/app.jsx
try { (() => {
// CRM Networker — DESKTOP surface. Self-contained, gated on the compiled bundle.
// Layout: fixed 224px sidebar + fluid content. Reuses DS primitives; no FAB (spec).
function useNS() {
  const [ns, setNs] = React.useState(window.EvoluciNLDerDesignSystem_8c407a);
  React.useEffect(() => {
    if (ns) return;
    const t = setInterval(() => {
      const g = window.EvoluciNLDerDesignSystem_8c407a;
      if (g) {
        setNs(g);
        clearInterval(t);
      }
    }, 40);
    return () => clearInterval(t);
  }, [ns]);
  return ns;
}
const DESK_PROSPECTS = [{
  id: 1,
  name: 'María Fernández',
  stage: 'contacted',
  priority: 'high',
  channel: 'whatsapp',
  last: 'Último WhatsApp',
  time: 'hace 2 días',
  phone: '+34 612 345 678'
}, {
  id: 2,
  name: 'Carlos Ruiz',
  stage: 'presented',
  priority: 'medium',
  channel: 'phone',
  last: 'Última llamada',
  time: 'ayer',
  phone: '+34 698 112 233'
}, {
  id: 3,
  name: 'Lucía Gómez',
  stage: 'new',
  priority: 'low',
  channel: 'instagram',
  last: 'Mensaje IG',
  time: 'hace 5 días',
  phone: '+34 677 889 900'
}, {
  id: 4,
  name: 'Diego Soto',
  stage: 'evaluating',
  priority: 'high',
  channel: 'phone',
  last: 'Última llamada',
  time: 'hace 3 h',
  phone: '+34 654 321 098'
}, {
  id: 5,
  name: 'Ana López',
  stage: 'joined',
  priority: 'medium',
  channel: 'mail',
  last: 'Último email',
  time: 'hace 1 sem',
  phone: '+34 611 223 344'
}, {
  id: 6,
  name: 'Javier Moreno',
  stage: 'contacted',
  priority: 'medium',
  channel: 'whatsapp',
  last: 'Último WhatsApp',
  time: 'hoy',
  phone: '+34 622 334 455'
}];
const DESK_STAGE_LABELS = {
  new: 'Nuevo',
  contacted: 'Contactado',
  presented: 'Presentación realizada',
  evaluating: 'En valoración',
  joined: 'Incorporado',
  discarded: 'Descartado'
};
const DESK_SCREEN_TITLE = {
  home: 'Actividad Diaria',
  pipe: 'Prospectos',
  resumen: 'Resumen'
};
const DESK_NAV = [{
  key: 'home',
  icon: 'home',
  label: 'Inicio'
}, {
  key: 'pipe',
  icon: 'users',
  label: 'Prospectos'
}, {
  key: 'resumen',
  icon: 'bar-chart-3',
  label: 'Resumen'
}];
const DESK_ACCOUNT = {
  name: 'Laura Giménez',
  email: 'laura@evolucionlider.com'
};

// ── Sidebar ──────────────────────────────────────────────────────────
function Sidebar({
  NS,
  active,
  onNav,
  onAdd,
  onFire,
  onLogout
}) {
  const {
    Icon,
    Button,
    Avatar,
    Divider
  } = NS;
  const Div = Divider || (p => /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-default)',
      ...(p && p.style)
    }
  }));
  const [menu, setMenu] = React.useState(false);
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 224,
      flex: 'none',
      height: '100%',
      boxSizing: 'border-box',
      background: 'var(--surface-card)',
      borderRight: '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 14px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 6px 4px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 10,
      background: 'var(--color-primary-500)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 2.5,
      padding: '0 0 8px',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 3.5,
      height: 8,
      borderRadius: 1.5,
      background: '#fff',
      opacity: .55
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 3.5,
      height: 13,
      borderRadius: 1.5,
      background: '#fff',
      opacity: .8
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 3.5,
      height: 17,
      borderRadius: 1.5,
      background: '#fff'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: 'var(--color-neutral-900)',
      letterSpacing: '-0.02em',
      lineHeight: 1.1
    }
  }, "Evoluci\xF3n", /*#__PURE__*/React.createElement("br", null), "L\xEDder")), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '18px 0 8px'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "md",
    fullWidth: true,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 18
    }),
    onClick: onAdd
  }, "A\xF1adir prospecto")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      marginTop: 8
    }
  }, DESK_NAV.map(n => {
    const on = active === n.key;
    return /*#__PURE__*/React.createElement("button", {
      key: n.key,
      onClick: () => onNav(n.key),
      style: {
        all: 'unset',
        cursor: 'pointer',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '9px 10px',
        borderRadius: 'var(--radius-md)',
        background: on ? 'var(--color-primary-50)' : 'transparent',
        color: on ? 'var(--color-primary-700)' : 'var(--color-neutral-600)'
      },
      onMouseEnter: e => {
        if (!on) e.currentTarget.style.background = 'var(--color-neutral-50)';
      },
      onMouseLeave: e => {
        if (!on) e.currentTarget.style.background = 'transparent';
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: n.icon,
      size: 19,
      color: on ? 'var(--color-primary-600)' : 'var(--color-neutral-400)'
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: on ? 700 : 500
      }
    }, n.label));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, menu && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    onClick: () => setMenu(false),
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 5
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 'calc(100% + 8px)',
      zIndex: 6,
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-2)',
      padding: 4,
      animation: 'el-fade-in var(--duration-fast) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setMenu(false);
      onFire('Sesión cerrada');
      onLogout && onLogout();
    },
    style: {
      all: 'unset',
      cursor: 'pointer',
      boxSizing: 'border-box',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '9px 10px',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--color-error-text)'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--color-error-bg)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "log-out",
    size: 17,
    color: "var(--color-error-text)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600
    }
  }, "Cerrar sesi\xF3n")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Div, null)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMenu(m => !m),
    style: {
      all: 'unset',
      cursor: 'pointer',
      boxSizing: 'border-box',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 8px',
      borderRadius: 'var(--radius-md)',
      background: menu ? 'var(--color-neutral-50)' : 'transparent'
    },
    onMouseEnter: e => {
      if (!menu) e.currentTarget.style.background = 'var(--color-neutral-50)';
    },
    onMouseLeave: e => {
      if (!menu) e.currentTarget.style.background = 'transparent';
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: DESK_ACCOUNT.name,
    size: 34
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--color-neutral-900)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, DESK_ACCOUNT.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--color-neutral-500)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, DESK_ACCOUNT.email)), /*#__PURE__*/React.createElement(Icon, {
    name: menu ? 'chevron-right' : 'more-vertical',
    size: 16,
    color: "var(--color-neutral-400)"
  }))));
}

// ── Shared bits ──────────────────────────────────────────────────────
function ContentHeader({
  title,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '22px 32px 18px',
      borderBottom: '1px solid var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 24,
      fontWeight: 700,
      color: 'var(--color-neutral-900)',
      letterSpacing: '-0.02em'
    }
  }, title), right);
}
function DeskKpi({
  value,
  label,
  tone
}) {
  const bg = tone === 'warning' ? 'var(--color-warning-bg)' : 'var(--color-primary-50)';
  const fg = tone === 'warning' ? 'var(--color-warning-text)' : 'var(--color-primary-700)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 'var(--radius-lg)',
      padding: '16px 18px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-numeric)',
      fontFeatureSettings: 'var(--num-features)',
      fontSize: 30,
      fontWeight: 700,
      color: fg,
      lineHeight: 1.1
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: fg,
      opacity: .85,
      marginTop: 2
    }
  }, label));
}
function DeskSectionTitle({
  NS,
  icon,
  children
}) {
  const {
    Icon
  } = NS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      margin: '26px 0 14px'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 16,
    color: "var(--color-neutral-400)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '.02em',
      textTransform: 'uppercase',
      color: 'var(--color-neutral-500)'
    }
  }, children));
}

// ── Inicio (desktop) ─────────────────────────────────────────────────
function HomeView({
  NS,
  onOpen,
  onAction
}) {
  const {
    ProspectCard
  } = NS;
  const today = DESK_PROSPECTS.filter(p => ['hoy', 'hace 3 h', 'ayer'].includes(p.time));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 32px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--color-neutral-500)'
    }
  }, "Mi\xE9rcoles, 2 de julio"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: 'var(--color-neutral-600)',
      marginTop: 2
    }
  }, "Tienes ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--color-neutral-900)'
    }
  }, "3 tareas"), " y ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--color-neutral-900)'
    }
  }, "2 nuevos prospectos"), " hoy."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 14,
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement(DeskKpi, {
    value: "3",
    label: "Pendientes hoy",
    tone: "warning"
  }), /*#__PURE__*/React.createElement(DeskKpi, {
    value: "12",
    label: "Esta semana",
    tone: "primary"
  }), /*#__PURE__*/React.createElement(DeskKpi, {
    value: "6",
    label: "Prospectos activos",
    tone: "primary"
  }), /*#__PURE__*/React.createElement(DeskKpi, {
    value: "1",
    label: "Incorporados",
    tone: "primary"
  })), /*#__PURE__*/React.createElement(DeskSectionTitle, {
    NS: NS,
    icon: "clock"
  }, "Actividad reciente"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: 14
    }
  }, today.map(p => /*#__PURE__*/React.createElement(ProspectCard, {
    key: p.id,
    name: p.name,
    stage: p.stage,
    priority: p.priority,
    channel: p.channel,
    lastInteraction: p.last,
    timeAgo: p.time,
    onOpen: () => onOpen(p),
    onCall: () => onAction('Llamando a ' + p.name),
    onWhatsApp: () => onAction('WhatsApp a ' + p.name),
    onNote: () => onAction('Nota para ' + p.name)
  }))));
}

// ── Prospectos (desktop grid) ────────────────────────────────────────
function PipelineView({
  NS,
  onOpen,
  onAction
}) {
  const {
    ProspectCard,
    FilterChip
  } = NS;
  const [active, setActive] = React.useState('all');
  const chips = [['all', 'Todos'], ['high', 'Alta prioridad'], ['contacted', 'Contactado'], ['new', 'Nuevos'], ['evaluating', 'En valoración']];
  const list = DESK_PROSPECTS.filter(p => active === 'all' ? true : active === 'high' ? p.priority === 'high' : p.stage === active);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 32px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 18,
      flexWrap: 'wrap'
    }
  }, chips.map(([k, l]) => /*#__PURE__*/React.createElement(FilterChip, {
    key: k,
    active: active === k,
    onClick: () => setActive(k)
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: 14
    }
  }, list.map(p => /*#__PURE__*/React.createElement(ProspectCard, {
    key: p.id,
    name: p.name,
    stage: p.stage,
    priority: p.priority,
    channel: p.channel,
    lastInteraction: p.last,
    timeAgo: p.time,
    onOpen: () => onOpen(p),
    onCall: () => onAction('Llamando a ' + p.name),
    onWhatsApp: () => onAction('WhatsApp a ' + p.name),
    onNote: () => onAction('Nota para ' + p.name)
  }))));
}

// ── Resumen (desktop) ────────────────────────────────────────────────
function ResumenView({
  NS
}) {
  const counts = {};
  DESK_PROSPECTS.forEach(p => {
    counts[p.stage] = (counts[p.stage] || 0) + 1;
  });
  const order = ['new', 'contacted', 'presented', 'evaluating', 'joined', 'discarded'];
  const max = Math.max(...order.map(s => counts[s] || 0), 1);
  const Stat = ({
    n,
    l
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-numeric)',
      fontFeatureSettings: 'var(--num-features)',
      fontSize: 26,
      fontWeight: 700,
      color: 'var(--color-primary-600)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--color-neutral-500)',
      marginTop: 3
    }
  }, l));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 32px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: 18,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(DeskSectionTitle, {
    NS: NS,
    icon: "layers"
  }, "Embudo por etapa"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-1)',
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, order.map(s => /*#__PURE__*/React.createElement("div", {
    key: s,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 150,
      flex: 'none',
      fontSize: 13,
      color: 'var(--color-neutral-600)'
    }
  }, DESK_STAGE_LABELS[s]), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 12,
      borderRadius: 6,
      background: 'var(--color-neutral-100)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      borderRadius: 6,
      width: `${(counts[s] || 0) / max * 100}%`,
      background: `var(--color-stage-${s}-dot)`
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      textAlign: 'right',
      fontFamily: 'var(--font-numeric)',
      fontFeatureSettings: 'var(--num-features)',
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--color-neutral-900)'
    }
  }, counts[s] || 0))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(DeskSectionTitle, {
    NS: NS,
    icon: "bar-chart-3"
  }, "Conversi\xF3n"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-1)',
      padding: '22px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    n: "50%",
    l: "Contacto \u2192 Presentaci\xF3n"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-default)'
    }
  }), /*#__PURE__*/React.createElement(Stat, {
    n: "33%",
    l: "Presentaci\xF3n \u2192 Valoraci\xF3n"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-default)'
    }
  }), /*#__PURE__*/React.createElement(Stat, {
    n: "17%",
    l: "Tasa de cierre"
  })))));
}

// ── Ficha (desktop drawer) ───────────────────────────────────────────
function FichaDrawer({
  NS,
  prospect,
  onClose,
  onAction
}) {
  const {
    Icon,
    Avatar,
    StageBadge,
    PriorityBadge,
    Button
  } = NS;
  const p = prospect;
  const timeline = [{
    icon: 'phone',
    text: 'Llamada · 8 min',
    time: p.time,
    note: 'Interesado, pide más info.'
  }, {
    icon: 'message-circle',
    text: 'WhatsApp enviado',
    time: 'hace 4 días',
    note: 'Compartido vídeo de presentación.'
  }, {
    icon: 'user',
    text: 'Prospecto creado',
    time: 'hace 1 sem',
    note: 'Contacto desde Instagram.'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 20,
      display: 'flex',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(15,23,42,.45)',
      animation: 'el-fade-in var(--duration-base) ease'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 400,
      height: '100%',
      boxSizing: 'border-box',
      background: 'var(--surface-card)',
      boxShadow: 'var(--shadow-3)',
      overflowY: 'auto',
      padding: '22px 24px 32px',
      animation: 'el-fade-in var(--duration-base) ease'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: p.name,
    size: 52,
    priority: p.priority
  }), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      all: 'unset',
      cursor: 'pointer',
      padding: 4
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 20,
    color: "var(--color-neutral-400)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      color: 'var(--color-neutral-900)',
      letterSpacing: '-0.01em',
      marginTop: 12
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--color-neutral-500)',
      marginTop: 2,
      fontFeatureSettings: 'var(--num-features)'
    }
  }, p.phone), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(StageBadge, {
    stage: p.stage
  }), /*#__PURE__*/React.createElement(PriorityBadge, {
    level: p.priority
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "phone",
      size: 16
    }),
    onClick: () => onAction('Llamando a ' + p.name)
  }, "Llamar"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "message-circle",
      size: 16
    }),
    onClick: () => onAction('WhatsApp a ' + p.name)
  }, "WhatsApp")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      margin: '26px 0 14px'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 16,
    color: "var(--color-neutral-400)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '.02em',
      textTransform: 'uppercase',
      color: 'var(--color-neutral-500)'
    }
  }, "Historial")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, timeline.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: 'var(--color-primary-50)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: e.icon,
    size: 15,
    color: "var(--color-primary-600)"
  })), i < timeline.length - 1 && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 2,
      flex: 1,
      background: 'var(--border-default)',
      margin: '4px 0'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingBottom: 18,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--color-neutral-900)'
    }
  }, e.text), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--color-neutral-400)',
      flex: 'none'
    }
  }, e.time)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--color-neutral-500)',
      marginTop: 2
    }
  }, e.note)))))));
}

// ── Nuevo prospecto (centered modal on desktop) ──────────────────────
function NuevoModal({
  NS,
  onClose,
  onSave
}) {
  const {
    Button,
    Input,
    Select
  } = NS;
  const [name, setName] = React.useState('');
  const [stage, setStage] = React.useState('new');
  const [prio, setPrio] = React.useState('medium');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 25,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(15,23,42,.45)',
      animation: 'el-fade-in var(--duration-base) ease'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 420,
      boxSizing: 'border-box',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-3)',
      padding: '22px 24px 24px',
      animation: 'el-fade-in var(--duration-base) ease'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      color: 'var(--color-neutral-900)',
      marginBottom: 18
    }
  }, "Nuevo prospecto"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Nombre",
    placeholder: "Nombre y apellidos",
    value: name,
    onChange: e => setName(e.target.value)
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Etapa",
    value: stage,
    onChange: setStage,
    options: Object.keys(DESK_STAGE_LABELS).map(k => ({
      value: k,
      label: DESK_STAGE_LABELS[k]
    }))
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Prioridad",
    value: prio,
    onChange: setPrio,
    options: [{
      value: 'high',
      label: 'Alta'
    }, {
      value: 'medium',
      label: 'Media'
    }, {
      value: 'low',
      label: 'Baja'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 6,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: onClose
  }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: () => onSave(name || 'Nuevo prospecto')
  }, "Guardar")))));
}
function Toast({
  msg
}) {
  if (!msg) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: 24,
      zIndex: 40,
      background: 'var(--color-neutral-900)',
      color: '#fff',
      borderRadius: 'var(--radius-md)',
      padding: '12px 18px',
      fontSize: 14,
      fontWeight: 500,
      boxShadow: 'var(--shadow-3)',
      animation: 'el-fade-in var(--duration-base) ease'
    }
  }, msg);
}
function CrmDesktop({
  onLogout
}) {
  const NS = useNS();
  const [tab, setTab] = React.useState('home');
  const [ficha, setFicha] = React.useState(null);
  const [modal, setModal] = React.useState(false);
  const [toast, setToast] = React.useState('');
  if (!NS) return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      background: 'var(--surface-app)'
    }
  });
  const fire = m => {
    setToast(m);
    clearTimeout(window.__dT);
    window.__dT = setTimeout(() => setToast(''), 1800);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      height: '100%',
      background: 'var(--surface-app)',
      fontFamily: 'var(--font-sans)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    NS: NS,
    active: tab,
    onNav: setTab,
    onAdd: () => setModal(true),
    onFire: fire,
    onLogout: onLogout
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(ContentHeader, {
    title: DESK_SCREEN_TITLE[tab]
  }), tab === 'home' ? /*#__PURE__*/React.createElement(HomeView, {
    NS: NS,
    onOpen: setFicha,
    onAction: fire
  }) : tab === 'pipe' ? /*#__PURE__*/React.createElement(PipelineView, {
    NS: NS,
    onOpen: setFicha,
    onAction: fire
  }) : /*#__PURE__*/React.createElement(ResumenView, {
    NS: NS
  })), ficha && /*#__PURE__*/React.createElement(FichaDrawer, {
    NS: NS,
    prospect: ficha,
    onClose: () => setFicha(null),
    onAction: fire
  }), modal && /*#__PURE__*/React.createElement(NuevoModal, {
    NS: NS,
    onClose: () => setModal(false),
    onSave: n => {
      setModal(false);
      fire(n + ' añadido');
    }
  }), /*#__PURE__*/React.createElement(Toast, {
    msg: toast
  }));
}
if (typeof module !== 'undefined') module.exports = {
  CrmDesktop
};
window.CrmDesktop = CrmDesktop;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm-networker-desktop/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm-networker/auth.jsx
try { (() => {
// CRM Networker — auth screens (Login + Registro). Reuses design-system primitives.
const _ANS = window.EvoluciNLDerDesignSystem_8c407a;
const {
  Icon: _AIcon,
  Button: _ABtn
} = _ANS;

// ── Password field with show/hide toggle + error state ───────────────
function PasswordField({
  label = 'Contraseña',
  value,
  onChange,
  placeholder = 'Tu contraseña',
  error
}) {
  const [show, setShow] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const border = error ? 'var(--border-error)' : focused ? 'var(--border-focus)' : 'var(--border-strong)';
  const ring = focused ? error ? 'var(--focus-ring-error)' : 'var(--focus-ring)' : 'none';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--color-neutral-700)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: show ? 'text' : 'password',
    value: value,
    placeholder: placeholder,
    onChange: onChange,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      color: 'var(--color-neutral-900)',
      padding: '10px 42px 10px 12px',
      background: '#fff',
      border: `1px solid ${border}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: ring,
      outline: 'none',
      transition: 'border-color var(--duration-base), box-shadow var(--duration-base)'
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShow(s => !s),
    "aria-label": show ? 'Ocultar contraseña' : 'Mostrar contraseña',
    style: {
      all: 'unset',
      cursor: 'pointer',
      position: 'absolute',
      right: 10,
      top: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      color: 'var(--color-neutral-400)'
    }
  }, /*#__PURE__*/React.createElement(_AIcon, {
    name: show ? 'eye-off' : 'eye',
    size: 18
  }))), error && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--color-error-text)'
    }
  }, error));
}

// ── Plain labelled text field with focus/error (email, nombre) ───────
function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  autoComplete
}) {
  const [focused, setFocused] = React.useState(false);
  const border = error ? 'var(--border-error)' : focused ? 'var(--border-focus)' : 'var(--border-strong)';
  const ring = focused ? error ? 'var(--focus-ring-error)' : 'var(--focus-ring)' : 'none';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--color-neutral-700)'
    }
  }, label), /*#__PURE__*/React.createElement("input", {
    type: type,
    value: value,
    placeholder: placeholder,
    autoComplete: autoComplete,
    onChange: onChange,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      color: 'var(--color-neutral-900)',
      padding: '10px 12px',
      background: '#fff',
      border: `1px solid ${border}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: ring,
      outline: 'none',
      transition: 'border-color var(--duration-base), box-shadow var(--duration-base)'
    }
  }), error && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--color-error-text)'
    }
  }, error));
}

// ── Brand header (logo mark + wordmark) ──────────────────────────────
function AuthBrand({
  subtitle
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 14,
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 60,
      height: 60,
      borderRadius: 16,
      background: 'var(--color-primary-500)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 4,
      padding: '0 0 15px',
      boxShadow: '0 6px 16px rgba(22,163,74,.3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 14,
      borderRadius: 2,
      background: '#fff',
      opacity: .55
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 22,
      borderRadius: 2,
      background: '#fff',
      opacity: .8
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 30,
      borderRadius: 2,
      background: '#fff'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      color: 'var(--color-neutral-900)',
      letterSpacing: '-0.02em'
    }
  }, "Evoluci\xF3n L\xEDder"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--color-neutral-500)',
      marginTop: 3
    }
  }, subtitle)));
}
function LinkText({
  children,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    style: {
      all: 'unset',
      cursor: 'pointer',
      color: 'var(--color-primary-600)',
      fontWeight: 600
    }
  }, children);
}

// ── LOGIN ────────────────────────────────────────────────────────────
function Login({
  onSubmit,
  onGoRegister,
  onForgot
}) {
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const submit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Demo: any credentials → error, unless email contains "hola" (happy path)
      if (email.includes('hola')) {
        onSubmit && onSubmit();
      } else setError(true);
    }, 700);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '0 28px',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 0'
    }
  }, /*#__PURE__*/React.createElement(AuthBrand, {
    subtitle: "Inicia sesi\xF3n en tu CRM"
  }), error && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      background: 'var(--color-error-bg)',
      border: '1px solid #FECACA',
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(_AIcon, {
    name: "alert-circle",
    size: 16,
    color: "var(--color-error-text)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      color: 'var(--color-error-text)',
      fontWeight: 500
    }
  }, "Email o contrase\xF1a incorrectos")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Email",
    type: "email",
    value: email,
    onChange: e => {
      setEmail(e.target.value);
      setError(false);
    },
    placeholder: "tucorreo@ejemplo.com",
    autoComplete: "email",
    error: error ? ' ' : ''
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(PasswordField, {
    value: pass,
    onChange: e => {
      setPass(e.target.value);
      setError(false);
    },
    error: error ? ' ' : ''
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      marginTop: 8,
      fontFamily: 'var(--font-sans)',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(LinkText, {
    onClick: onForgot
  }, "\xBFOlvidaste tu contrase\xF1a?"))), /*#__PURE__*/React.createElement(_ABtn, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    loading: loading,
    onClick: submit
  }, "Iniciar sesi\xF3n")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 24,
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--color-neutral-500)'
    }
  }, "\xBFNo tienes cuenta? ", /*#__PURE__*/React.createElement(LinkText, {
    onClick: onGoRegister
  }, "Reg\xEDstrate"))));
}

// ── REGISTRO ─────────────────────────────────────────────────────────
function Registro({
  onSubmit,
  onGoLogin
}) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const submit = () => {
    const e = {};
    if (!name.trim()) e.name = 'El nombre es obligatorio';
    if (!email.trim()) e.email = 'El email es obligatorio';else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = 'Introduce un email válido';
    if (!pass) e.pass = 'La contraseña es obligatoria';else if (pass.length < 6) e.pass = 'Mínimo 6 caracteres';
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        onSubmit && onSubmit();
      }, 700);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '0 28px',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 0'
    }
  }, /*#__PURE__*/React.createElement(AuthBrand, {
    subtitle: "Crea tu cuenta gratis"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Nombre",
    value: name,
    onChange: e => {
      setName(e.target.value);
      setErrors(p => ({
        ...p,
        name: ''
      }));
    },
    placeholder: "Nombre y apellidos",
    autoComplete: "name",
    error: errors.name
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Email",
    type: "email",
    value: email,
    onChange: e => {
      setEmail(e.target.value);
      setErrors(p => ({
        ...p,
        email: ''
      }));
    },
    placeholder: "tucorreo@ejemplo.com",
    autoComplete: "email",
    error: errors.email
  }), /*#__PURE__*/React.createElement(PasswordField, {
    label: "Contrase\xF1a",
    placeholder: "Crea una contrase\xF1a",
    value: pass,
    onChange: e => {
      setPass(e.target.value);
      setErrors(p => ({
        ...p,
        pass: ''
      }));
    },
    error: errors.pass
  }), /*#__PURE__*/React.createElement(_ABtn, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    loading: loading,
    onClick: submit
  }, "Crear cuenta")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 24,
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--color-neutral-500)'
    }
  }, "\xBFYa tienes cuenta? ", /*#__PURE__*/React.createElement(LinkText, {
    onClick: onGoLogin
  }, "Inicia sesi\xF3n"))));
}
Object.assign(window, {
  Login,
  Registro,
  AuthBrand,
  AuthField: Field,
  PasswordField
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm-networker/auth.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm-networker/screens.jsx
try { (() => {
// CRM Networker — screens. Composes design-system primitives + shell.
const _NS = window.EvoluciNLDerDesignSystem_8c407a;
const {
  Icon: _Icon,
  Button: _Btn,
  ProspectCard: _PCard,
  FilterChip: _Chip,
  CountBadge: _Count,
  StageBadge: _Stage,
  PriorityBadge: _Prio,
  Avatar: _Av,
  Input: _Input,
  Select: _Select,
  EmptyState: _Empty
} = _NS;
const _Div = _NS.Divider || (p => /*#__PURE__*/React.createElement("div", {
  style: {
    height: 1,
    background: 'var(--border-default)',
    ...(p && p.style)
  }
}));
const ACCOUNT = {
  name: 'Laura Giménez',
  email: 'laura@evolucionlider.com'
};

// ── Account avatar button + bottom sheet with logout ────────────────
function AccountButton({
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    "aria-label": "Cuenta",
    style: {
      all: 'unset',
      cursor: 'pointer',
      display: 'flex',
      borderRadius: '50%'
    }
  }, /*#__PURE__*/React.createElement(_Av, {
    name: ACCOUNT.name,
    size: 28
  }));
}
function AccountSheet({
  onClose,
  onLogout
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 35,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(15,23,42,.45)',
      animation: 'el-fade-in var(--duration-base) ease'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
      boxShadow: 'var(--shadow-3)',
      padding: '10px 20px 24px',
      animation: 'el-sheet-up var(--duration-slow) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 4,
      borderRadius: 2,
      background: 'var(--color-neutral-200)',
      margin: '0 auto 18px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(_Av, {
    name: ACCOUNT.name,
    size: 48
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      color: 'var(--color-neutral-900)'
    }
  }, ACCOUNT.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--color-neutral-500)',
      fontFeatureSettings: 'var(--num-features)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, ACCOUNT.email))), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '16px 0'
    }
  }, /*#__PURE__*/React.createElement(_Div, null)), /*#__PURE__*/React.createElement("button", {
    onClick: onLogout,
    style: {
      all: 'unset',
      cursor: 'pointer',
      boxSizing: 'border-box',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px',
      borderRadius: 'var(--radius-md)',
      color: 'var(--color-error-text)'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--color-error-bg)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement(_Icon, {
    name: "log-out",
    size: 19,
    color: "var(--color-error-text)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 600
    }
  }, "Cerrar sesi\xF3n"))));
}
const STAGE_LABELS = {
  new: 'Nuevo',
  contacted: 'Contactado',
  presented: 'Presentación realizada',
  evaluating: 'En valoración',
  joined: 'Incorporado',
  discarded: 'Descartado'
};

// ── Inicio · Actividad Diaria ────────────────────────────────────────
function ActividadDiaria({
  onOpen,
  onAction
}) {
  const today = window.PROSPECTS.filter(p => ['hoy', 'hace 3 h', 'ayer'].includes(p.time));
  const tasks = [{
    id: 1,
    name: 'María Fernández',
    task: 'Llamar para confirmar presentación',
    icon: 'phone',
    prio: 'high'
  }, {
    id: 2,
    name: 'Diego Soto',
    task: 'Enviar propuesta por WhatsApp',
    icon: 'message-circle',
    prio: 'high'
  }, {
    id: 3,
    name: 'Javier Moreno',
    task: 'Hacer seguimiento',
    icon: 'clock',
    prio: 'medium'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '16px 16px 96px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--color-neutral-500)'
    }
  }, "Lunes, 29 de junio"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      color: 'var(--color-neutral-600)',
      marginTop: 2
    }
  }, "Tienes ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--color-neutral-900)'
    }
  }, "3 tareas"), " y ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--color-neutral-900)'
    }
  }, "2 nuevos prospectos"), " hoy."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Kpi, {
    value: "3",
    label: "Pendientes hoy",
    tone: "warning"
  }), /*#__PURE__*/React.createElement(Kpi, {
    value: "12",
    label: "Esta semana",
    tone: "primary"
  })), /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "star"
  }, "Para hoy"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, tasks.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    onClick: () => onOpen(window.PROSPECTS.find(p => p.name === t.name) || window.PROSPECTS[0]),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-1)',
      padding: '12px 14px',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: 'var(--color-primary-50)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(_Icon, {
    name: t.icon,
    size: 18,
    color: "var(--color-primary-600)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--color-neutral-900)'
    }
  }, t.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--color-neutral-500)'
    }
  }, t.task)), /*#__PURE__*/React.createElement(_Prio, {
    level: t.prio,
    dotOnly: true,
    size: 10
  })))), /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "clock"
  }, "Actividad reciente"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, today.map(p => /*#__PURE__*/React.createElement(_PCard, {
    key: p.id,
    name: p.name,
    stage: p.stage,
    priority: p.priority,
    channel: p.channel,
    lastInteraction: p.last,
    timeAgo: p.time,
    onOpen: () => onOpen(p),
    onCall: () => onAction('Llamando a ' + p.name),
    onWhatsApp: () => onAction('WhatsApp a ' + p.name),
    onNote: () => onAction('Nota para ' + p.name)
  }))));
}
function Kpi({
  value,
  label,
  tone
}) {
  const bg = tone === 'warning' ? 'var(--color-warning-bg)' : 'var(--color-primary-50)';
  const fg = tone === 'warning' ? 'var(--color-warning-text)' : 'var(--color-primary-700)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: bg,
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-numeric)',
      fontFeatureSettings: 'var(--num-features)',
      fontSize: 32,
      fontWeight: 700,
      color: fg,
      lineHeight: 1.1
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: fg,
      opacity: .85,
      marginTop: 2
    }
  }, label));
}
function SectionTitle({
  icon,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      margin: '22px 0 12px'
    }
  }, /*#__PURE__*/React.createElement(_Icon, {
    name: icon,
    size: 16,
    color: "var(--color-neutral-400)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '.02em',
      textTransform: 'uppercase',
      color: 'var(--color-neutral-500)'
    }
  }, children));
}

// ── Prospectos · Pipeline ────────────────────────────────────────────
function Pipeline({
  onOpen,
  onAction
}) {
  const [active, setActive] = React.useState('all');
  const chips = [['all', 'Todos'], ['high', 'Alta prioridad'], ['contacted', 'Contactado'], ['new', 'Nuevos'], ['evaluating', 'En valoración']];
  const list = window.PROSPECTS.filter(p => active === 'all' ? true : active === 'high' ? p.priority === 'high' : p.stage === active);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '12px 16px',
      background: 'var(--surface-card)',
      borderBottom: '1px solid var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      flex: 1,
      scrollbarWidth: 'none'
    }
  }, chips.map(([k, l]) => /*#__PURE__*/React.createElement(_Chip, {
    key: k,
    active: active === k,
    onClick: () => setActive(k)
  }, l))), /*#__PURE__*/React.createElement("button", {
    style: {
      position: 'relative',
      width: 34,
      height: 34,
      borderRadius: '50%',
      border: '1px solid var(--border-strong)',
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(_Icon, {
    name: "menu",
    size: 18,
    color: "var(--color-neutral-600)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -5,
      right: -5
    }
  }, /*#__PURE__*/React.createElement(_Count, {
    count: 2
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '14px 16px 96px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, list.length === 0 ? /*#__PURE__*/React.createElement(_Empty, {
    icon: "users",
    title: "Sin resultados",
    description: "No hay prospectos en este filtro todav\xEDa."
  }) : list.map(p => /*#__PURE__*/React.createElement(_PCard, {
    key: p.id,
    name: p.name,
    stage: p.stage,
    priority: p.priority,
    channel: p.channel,
    lastInteraction: p.last,
    timeAgo: p.time,
    onOpen: () => onOpen(p),
    onCall: () => onAction('Llamando a ' + p.name),
    onWhatsApp: () => onAction('WhatsApp a ' + p.name),
    onNote: () => onAction('Nota para ' + p.name)
  }))));
}

// ── Resumen · Dashboard ──────────────────────────────────────────────
function Resumen() {
  const counts = {};
  window.PROSPECTS.forEach(p => {
    counts[p.stage] = (counts[p.stage] || 0) + 1;
  });
  const total = window.PROSPECTS.length;
  const order = ['new', 'contacted', 'presented', 'evaluating', 'joined', 'discarded'];
  const max = Math.max(...order.map(s => counts[s] || 0), 1);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '16px 16px 96px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Kpi, {
    value: String(total),
    label: "Prospectos activos",
    tone: "primary"
  }), /*#__PURE__*/React.createElement(Kpi, {
    value: "1",
    label: "Incorporados",
    tone: "primary"
  })), /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "layers"
  }, "Embudo por etapa"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-1)',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, order.map(s => /*#__PURE__*/React.createElement("div", {
    key: s,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 118,
      flex: 'none',
      fontSize: 12,
      color: 'var(--color-neutral-600)'
    }
  }, STAGE_LABELS[s]), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 10,
      borderRadius: 5,
      background: 'var(--color-neutral-100)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      borderRadius: 5,
      width: `${(counts[s] || 0) / max * 100}%`,
      background: `var(--color-stage-${s}-dot)`
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      textAlign: 'right',
      fontFamily: 'var(--font-numeric)',
      fontFeatureSettings: 'var(--num-features)',
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--color-neutral-900)'
    }
  }, counts[s] || 0)))), /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "bar-chart-3"
  }, "Conversi\xF3n"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-1)',
      padding: '18px 16px',
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    n: "50%",
    l: "Contacto \u2192 Pres."
  }), /*#__PURE__*/React.createElement(Stat, {
    n: "33%",
    l: "Pres. \u2192 Valoraci\xF3n"
  }), /*#__PURE__*/React.createElement(Stat, {
    n: "17%",
    l: "Tasa de cierre"
  })));
}
function Stat({
  n,
  l
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-numeric)',
      fontFeatureSettings: 'var(--num-features)',
      fontSize: 22,
      fontWeight: 700,
      color: 'var(--color-primary-600)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--color-neutral-500)',
      marginTop: 3
    }
  }, l));
}

// ── Ficha del Prospecto ──────────────────────────────────────────────
function Ficha({
  prospect,
  onAction
}) {
  const p = prospect;
  const timeline = [{
    icon: 'phone',
    text: 'Llamada · 8 min',
    time: p.time,
    note: 'Interesado, pide más info.'
  }, {
    icon: 'message-circle',
    text: 'WhatsApp enviado',
    time: 'hace 4 días',
    note: 'Compartido vídeo de presentación.'
  }, {
    icon: 'user',
    text: 'Prospecto creado',
    time: 'hace 1 sem',
    note: 'Contacto desde Instagram.'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '20px 16px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(_Av, {
    name: p.name,
    size: 56,
    priority: p.priority
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      color: 'var(--color-neutral-900)',
      letterSpacing: '-0.01em'
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--color-neutral-500)',
      marginTop: 2,
      fontFeatureSettings: 'var(--num-features)'
    }
  }, p.phone)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(_Stage, {
    stage: p.stage
  }), /*#__PURE__*/React.createElement(_Prio, {
    level: p.priority
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8,
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(QuickAction, {
    icon: "phone",
    label: "Llamar",
    onClick: () => onAction('Llamando a ' + p.name)
  }), /*#__PURE__*/React.createElement(QuickAction, {
    icon: "message-circle",
    label: "WhatsApp",
    onClick: () => onAction('WhatsApp a ' + p.name)
  }), /*#__PURE__*/React.createElement(QuickAction, {
    icon: "square-pen",
    label: "Interacci\xF3n",
    onClick: () => onAction('Registrar interacción')
  })), /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "layers"
  }, "Historial"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, timeline.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: 'var(--color-primary-50)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(_Icon, {
    name: e.icon,
    size: 15,
    color: "var(--color-primary-600)"
  })), i < timeline.length - 1 && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 2,
      flex: 1,
      background: 'var(--border-default)',
      margin: '4px 0'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingBottom: 18,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--color-neutral-900)'
    }
  }, e.text), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--color-neutral-400)',
      flex: 'none'
    }
  }, e.time)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--color-neutral-500)',
      marginTop: 2
    }
  }, e.note))))));
}
function QuickAction({
  icon,
  label,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      all: 'unset',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: '12px 0',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement(_Icon, {
    name: icon,
    size: 20,
    color: "var(--color-primary-600)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--color-neutral-700)'
    }
  }, label));
}

// ── Nuevo Prospecto (bottom sheet) ───────────────────────────────────
function NuevoProspecto({
  onClose,
  onSave
}) {
  const [name, setName] = React.useState('');
  const [stage, setStage] = React.useState('new');
  const [prio, setPrio] = React.useState('medium');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 30,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(15,23,42,.45)',
      animation: 'el-fade-in var(--duration-base) ease'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      background: 'var(--surface-card)',
      borderRadius: '20px 20px 0 0',
      boxShadow: 'var(--shadow-3)',
      padding: '10px 20px 24px',
      animation: 'el-sheet-up var(--duration-slow) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 4,
      borderRadius: 2,
      background: 'var(--color-neutral-200)',
      margin: '0 auto 14px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      color: 'var(--color-neutral-900)',
      marginBottom: 18
    }
  }, "Nuevo prospecto"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(_Input, {
    label: "Nombre",
    placeholder: "Nombre y apellidos",
    value: name,
    onChange: e => setName(e.target.value)
  }), /*#__PURE__*/React.createElement(_Select, {
    label: "Etapa",
    value: stage,
    onChange: setStage,
    options: Object.keys(STAGE_LABELS).map(k => ({
      value: k,
      label: STAGE_LABELS[k]
    }))
  }), /*#__PURE__*/React.createElement(_Select, {
    label: "Prioridad",
    value: prio,
    onChange: setPrio,
    options: [{
      value: 'high',
      label: 'Alta'
    }, {
      value: 'medium',
      label: 'Media'
    }, {
      value: 'low',
      label: 'Baja'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(_Btn, {
    variant: "secondary",
    fullWidth: true,
    onClick: onClose
  }, "Cancelar"), /*#__PURE__*/React.createElement(_Btn, {
    variant: "primary",
    fullWidth: true,
    onClick: () => onSave(name || 'Nuevo prospecto')
  }, "Guardar")))));
}
Object.assign(window, {
  ActividadDiaria,
  Pipeline,
  Resumen,
  Ficha,
  NuevoProspecto,
  AccountButton,
  AccountSheet
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm-networker/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/crm-networker/shell.jsx
try { (() => {
// CRM Networker — shell pieces: phone frame, screen header, tab bar, FAB.
// Reads primitives from the design-system bundle (window namespace).
const NS = window.EvoluciNLDerDesignSystem_8c407a;
const {
  Icon
} = NS;

// ── Sample data (fake) ──────────────────────────────────────────────
window.PROSPECTS = [{
  id: 1,
  name: 'María Fernández',
  stage: 'contacted',
  priority: 'high',
  channel: 'whatsapp',
  last: 'Último WhatsApp',
  time: 'hace 2 días',
  phone: '+34 612 345 678'
}, {
  id: 2,
  name: 'Carlos Ruiz',
  stage: 'presented',
  priority: 'medium',
  channel: 'phone',
  last: 'Última llamada',
  time: 'ayer',
  phone: '+34 698 112 233'
}, {
  id: 3,
  name: 'Lucía Gómez',
  stage: 'new',
  priority: 'low',
  channel: 'instagram',
  last: 'Mensaje IG',
  time: 'hace 5 días',
  phone: '+34 677 889 900'
}, {
  id: 4,
  name: 'Diego Soto',
  stage: 'evaluating',
  priority: 'high',
  channel: 'phone',
  last: 'Última llamada',
  time: 'hace 3 h',
  phone: '+34 654 321 098'
}, {
  id: 5,
  name: 'Ana López',
  stage: 'joined',
  priority: 'medium',
  channel: 'mail',
  last: 'Último email',
  time: 'hace 1 sem',
  phone: '+34 611 223 344'
}, {
  id: 6,
  name: 'Javier Moreno',
  stage: 'contacted',
  priority: 'medium',
  channel: 'whatsapp',
  last: 'Último WhatsApp',
  time: 'hoy',
  phone: '+34 622 334 455'
}];

// ── Phone frame (mobile-first 375px) ─────────────────────────────────
function PhoneFrame({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      padding: '32px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 390,
      height: 800,
      background: '#000',
      borderRadius: 44,
      padding: 11,
      boxShadow: '0 30px 70px rgba(15,23,42,.30)',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      height: '100%',
      background: 'var(--surface-app)',
      borderRadius: 34,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-sans)'
    }
  }, children)));
}
function StatusBar({
  dark = false
}) {
  const c = dark ? '#fff' : 'var(--color-neutral-900)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      color: c,
      fontSize: 13,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFeatureSettings: 'var(--num-features)'
    }
  }, "9:41"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bar-chart-3",
    size: 15,
    color: c
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 14,
    color: c
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 11,
      border: `1.5px solid ${c}`,
      borderRadius: 3,
      position: 'relative',
      opacity: .9
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 1.5,
      background: c,
      borderRadius: 1,
      width: '72%'
    }
  }))));
}

// ── Screen header (56px). Root = no back; detail = back arrow. ───────
function ScreenHeader({
  title,
  onBack,
  action
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 16px',
      background: 'var(--surface-card)',
      borderBottom: '1px solid var(--border-default)'
    }
  }, onBack && /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      all: 'unset',
      cursor: 'pointer',
      display: 'flex',
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 22,
    color: "var(--color-neutral-700)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      color: 'var(--color-neutral-900)',
      letterSpacing: '-0.01em',
      flex: 1
    }
  }, title), action);
}

// ── Bottom tab bar (3 destinations) + floating FAB ───────────────────
const TABS = [{
  key: 'home',
  icon: 'home',
  label: 'Inicio'
}, {
  key: 'pipe',
  icon: 'users',
  label: 'Prospectos'
}, {
  key: 'resumen',
  icon: 'bar-chart-3',
  label: 'Resumen'
}];
function TabBar({
  active,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 64,
      flex: 'none',
      display: 'flex',
      background: 'var(--surface-card)',
      borderTop: '1px solid var(--border-default)',
      boxShadow: '0 -1px 3px rgba(15,23,42,.04)'
    }
  }, TABS.map(t => {
    const on = active === t.key;
    return /*#__PURE__*/React.createElement("button", {
      key: t.key,
      onClick: () => onChange(t.key),
      style: {
        all: 'unset',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        cursor: 'pointer',
        position: 'relative',
        paddingBottom: 8
      }
    }, on && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: 0,
        width: 28,
        height: 3,
        borderRadius: '0 0 3px 3px',
        background: 'var(--color-primary-500)'
      }
    }), /*#__PURE__*/React.createElement(Icon, {
      name: t.icon,
      size: 22,
      color: on ? 'var(--color-primary-600)' : 'var(--color-neutral-400)'
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: on ? 700 : 500,
        color: on ? 'var(--color-primary-700)' : 'var(--color-neutral-400)'
      }
    }, t.label));
  }));
}
function Fab({
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    "aria-label": "Nuevo prospecto",
    style: {
      position: 'absolute',
      right: 16,
      bottom: 80,
      width: 56,
      height: 56,
      borderRadius: '50%',
      border: 'none',
      background: 'var(--color-primary-500)',
      color: '#fff',
      boxShadow: '0 4px 12px rgba(22,163,74,.4)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 26,
    color: "#fff"
  }));
}
Object.assign(window, {
  PhoneFrame,
  StatusBar,
  ScreenHeader,
  TabBar,
  Fab
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/crm-networker/shell.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.CountBadge = __ds_scope.CountBadge;

__ds_ns.PriorityBadge = __ds_scope.PriorityBadge;

__ds_ns.StageBadge = __ds_scope.StageBadge;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.FilterChip = __ds_scope.FilterChip;

__ds_ns.ProspectCard = __ds_scope.ProspectCard;

})();
