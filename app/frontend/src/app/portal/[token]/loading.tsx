export default function Loading() {
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="space-y-4 text-center">
        <div
          className="h-10 w-10 mx-auto rounded-full border-4 border-primary/30 border-t-primary animate-spin"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">Carregando seu portal...</p>
        <span className="sr-only">Carregando dados do portal</span>
      </div>
    </div>
  );
}
