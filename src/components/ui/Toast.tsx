import * as React from "react";
import { Icon } from "./Icon";

export interface ToastProps {
  mensaje: string;
  /** Milisegundos hasta el auto-cierre. @default 4000 */
  duracionMs?: number;
  onClose?: () => void;
}

/**
 * Aviso flotante de confirmación (JOS-16/JOS-61): fijo sobre la tab bar en
 * móvil (bajo en desktop), auto-cierre. role="status" anuncia el mensaje de
 * forma no intrusiva. El design system no traía este componente; lo especificó
 * el prompt de diseño de JOS-61.
 */
export function Toast({ mensaje, duracionMs = 4000, onClose }: ToastProps) {
  const [visible, setVisible] = React.useState(true);
  // El ref se actualiza en un efecto (no en render) para que un onClose inline
  // recreado por el padre no re-arme el timer del auto-cierre.
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  });

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onCloseRef.current?.();
    }, duracionMs);
    return () => clearTimeout(timer);
  }, [duracionMs]);

  if (!visible) return null;
  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 z-40 bottom-[calc(var(--layout-tabbar)+16px)] md:bottom-6"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        maxWidth: "calc(100vw - 32px)",
        padding: "12px 16px",
        background: "var(--surface-card)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-2)",
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        fontWeight: 500,
        color: "var(--color-neutral-900)",
        animation: "el-fade-in var(--duration-fast) var(--ease-out)",
      }}
    >
      <Icon name="check" size={16} color="var(--color-primary-600)" />
      {mensaje}
    </div>
  );
}
