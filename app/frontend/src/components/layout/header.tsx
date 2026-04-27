"use client";

import { LogOut, Plane } from "lucide-react";
import Link from "next/link";
import { logout } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header() {
  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <Link
        href="/dashboard"
        className="lg:hidden flex items-center gap-2"
        aria-label="YOUVISA — ir para visão geral"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Plane className="h-3.5 w-3.5" strokeWidth={2.5} />
        </div>
        <span className="font-display font-semibold text-sm">YOUVISA</span>
      </Link>

      <div className="hidden lg:flex flex-1" />

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              aria-label="Abrir menu da conta"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  AD
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">Operador</p>
                <p className="text-xs text-muted-foreground">admin@youvisa.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
