"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  MessageSquare,
  ClipboardList,
  Activity,
  Plane,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Visão geral", href: "/dashboard", icon: LayoutDashboard },
  { title: "Processos", href: "/dashboard/processes", icon: ClipboardList },
  { title: "Documentos", href: "/dashboard/documents", icon: FileText },
  { title: "Conversas", href: "/dashboard/conversations", icon: MessageSquare },
  { title: "Interações", href: "/dashboard/interactions", icon: Activity },
  { title: "Usuários", href: "/dashboard/users", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 border-r border-sidebar-border bg-sidebar h-screen sticky top-0 flex-col">
      <div className="px-6 pt-6 pb-5 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <Plane className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <p className="font-display font-semibold text-base text-foreground">YOUVISA</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Console
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive ? "text-primary" : "text-muted-foreground/80",
                )}
              />
              <span>{item.title}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-sidebar-border">
        <p className="text-[11px] text-muted-foreground">
          Sprint 4 · Pipeline multi-agente
        </p>
      </div>
    </aside>
  );
}
