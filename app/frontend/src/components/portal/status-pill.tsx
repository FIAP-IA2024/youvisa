import {
  CircleCheck,
  CircleAlert,
  CircleX,
  Clock,
  FileCheck,
  CheckCheck,
  CircleSlash,
  type LucideIcon,
} from "lucide-react";

const STATUS_ICON: Record<string, LucideIcon> = {
  recebido: FileCheck,
  em_analise: Clock,
  pendente_documentos: CircleAlert,
  aprovado: CircleCheck,
  rejeitado: CircleX,
  finalizado: CheckCheck,
  cancelado: CircleSlash,
};

interface StatusPillProps {
  /** FSM status code (e.g. "em_analise"). */
  status: string;
  /** Friendly label to render. */
  label?: string;
  /** Visual size variant. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Status pill with an icon + text — meaning is *not* color-only, so
 * colorblind users still parse the state. Drop-in replacement for the
 * inline `.status-pill` className we used earlier.
 */
export function StatusPill({
  status,
  label,
  size = "md",
  className = "",
}: StatusPillProps) {
  const Icon = STATUS_ICON[status] ?? Clock;
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs gap-1" : "px-3 py-1 text-sm gap-1.5";
  return (
    <span
      className={`status-pill inline-flex items-center font-medium ${sizeClasses} ${className}`}
      data-status={status}
      role="status"
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} aria-hidden />
      <span>{label ?? status}</span>
    </span>
  );
}
