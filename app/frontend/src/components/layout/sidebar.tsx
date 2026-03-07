"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Users, MessageSquare, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Documentos",
    href: "/dashboard/documents",
    icon: FileText,
  },
  {
    title: "Processos",
    href: "/dashboard/processes",
    icon: ClipboardList,
  },
  {
    title: "Conversas",
    href: "/dashboard/conversations",
    icon: MessageSquare,
  },
  {
    title: "Usuarios",
    href: "/dashboard/users",
    icon: Users,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground">YOUVISA</h1>
        <p className="text-sm text-muted-foreground">Painel de Controle</p>
      </div>

      <nav className="px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
