"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Plane } from "lucide-react";
import { login } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full h-10" disabled={pending}>
      {pending ? "Entrando..." : "Entrar no console"}
    </Button>
  );
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await login(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Plane className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div className="text-center space-y-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight">YOUVISA</h1>
            <p className="text-sm text-muted-foreground">Console do operador</p>
          </div>
        </div>

        <Card className="border-border">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Acesso restrito</CardTitle>
            <CardDescription>
              Entre com suas credenciais para gerenciar processos, documentos e interações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="admin@admin.com"
                  autoComplete="username"
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="h-10"
                />
              </div>
              {error && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </div>
              )}
              <SubmitButton />
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Plataforma de atendimento inteligente — Sprint 4
        </p>
      </div>
    </main>
  );
}
