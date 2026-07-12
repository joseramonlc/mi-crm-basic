import * as React from "react";
import {
  Home,
  Users,
  BarChart3,
  Phone,
  MessageCircle,
  MessageSquare,
  Mail,
  Plus,
  SquarePen,
  Save,
  ArrowLeft,
  Filter,
  Menu,
  Calendar,
  Clock,
  ChevronRight,
  Check,
  X,
  User,
  StickyNote,
  Layers,
  AlertCircle,
  Info,
  Star,
  Trash2,
  MoreVertical,
  Eye,
  EyeOff,
  LogOut,
} from "lucide-react";

type IconGlyphProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
  strokeWidth?: number;
  color?: string;
};

/**
 * lucide-react 1.x dropped brand/logo glyphs (Instagram included) — this
 * reproduces the classic Lucide/Feather "instagram" mark by hand so the
 * design system's 29-icon set (design.md §3) stays complete without pulling
 * in a whole separate brand-icon package for one glyph.
 */
function InstagramGlyph({ size = 24, strokeWidth = 2, color = "currentColor", ...rest }: IconGlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

/**
 * Icon — renders a Lucide glyph by name (kebab-case, e.g. "message-circle").
 * Stroke 2px, round caps/joins, currentColor — per the brand spec.
 *
 * Ported from the design system's Icon.jsx: that version read icon data from
 * a `window.lucide` UMD global loaded via CDN. Here it maps directly to
 * `lucide-react` components, which is the correct approach for a Next.js app
 * (tree-shakeable, no runtime CDN dependency).
 */
const ICONS: Record<string, React.ComponentType<IconGlyphProps>> = {
  home: Home,
  users: Users,
  "bar-chart-3": BarChart3,
  phone: Phone,
  "message-circle": MessageCircle,
  // Meta-icono del canal "otro" en ProspectCard — sin él, Icon devolvería null
  // y la tarjeta perdería el icono de canal en vez de mostrar el fallback.
  "message-square": MessageSquare,
  mail: Mail,
  instagram: InstagramGlyph,
  plus: Plus,
  "square-pen": SquarePen,
  save: Save,
  "arrow-left": ArrowLeft,
  filter: Filter,
  menu: Menu,
  calendar: Calendar,
  clock: Clock,
  "chevron-right": ChevronRight,
  check: Check,
  x: X,
  user: User,
  "sticky-note": StickyNote,
  layers: Layers,
  "alert-circle": AlertCircle,
  info: Info,
  star: Star,
  "trash-2": Trash2,
  "more-vertical": MoreVertical,
  eye: Eye,
  "eye-off": EyeOff,
  "log-out": LogOut,
};

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  /** Lucide icon name in kebab-case, e.g. "message-circle", "bar-chart-3". */
  name: keyof typeof ICONS | (string & {});
  /** Pixel size (square). @default 24 (use 16 in compact contexts) */
  size?: number;
  /** Stroke width. @default 2 */
  strokeWidth?: number;
  /** Stroke color. @default 'currentColor' */
  color?: string;
}

/** Lucide icon by name, from the system's 29-icon set. */
export function Icon({ name, size = 24, strokeWidth = 2, color = "currentColor", style, ...rest }: IconProps) {
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      style={{ display: "inline-block", flex: "none", verticalAlign: "middle", ...style }}
      aria-hidden="true"
      {...rest}
    />
  );
}
