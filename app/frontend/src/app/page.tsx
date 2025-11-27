import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 bg-background">
      <h1 className="text-4xl font-bold text-foreground">Hello World</h1>
      <p className="text-muted-foreground text-center">
        YOUVISA Frontend - Next.js 16 + shadcn/ui + Tailwind v4
      </p>
      <ThemeToggle />
    </main>
  );
}
