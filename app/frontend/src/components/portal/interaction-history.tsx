import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InteractionLog } from "@/lib/api";

const INTENT_LABELS: Record<string, string> = {
  status_query: "Status",
  document_question: "Documentos",
  want_human: "Atendente",
  provide_email: "Email",
  open_portal: "Portal",
  general: "Geral",
  injection_attempt: "Bloqueado",
  transferred: "Transferido",
};

function intentVariant(intent: string): "default" | "secondary" | "destructive" | "outline" {
  if (intent === "injection_attempt") return "destructive";
  if (intent === "want_human") return "outline";
  return "secondary";
}

export function InteractionHistory({ logs }: { logs: InteractionLog[] }) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de interações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Você ainda não enviou mensagens. Comece pelo Telegram!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Histórico de interações</CardTitle>
        <p className="text-sm text-muted-foreground">
          Cada mensagem é interpretada pelo nosso assistente. A intenção detectada aparece ao lado.
        </p>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-5 pl-5 before:absolute before:inset-y-1 before:left-1.5 before:w-px before:bg-border">
          {logs.map((log) => (
            <li key={log._id} className="relative">
              <span className="absolute -left-5 top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-sm">
                    <span className="font-medium text-muted-foreground">Você</span>{" "}
                    {log.user_message}
                  </p>
                  <Badge variant={intentVariant(log.intent)} className="shrink-0 text-[10px] uppercase tracking-wider">
                    {INTENT_LABELS[log.intent] ?? log.intent}
                  </Badge>
                </div>
                {log.response && (
                  <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground/90">
                    <span className="text-xs font-medium text-muted-foreground">Bot · </span>
                    {log.response}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {new Date(log.created_at).toLocaleString("pt-BR")}
                  <span className="mx-1.5">·</span>
                  {log.total_latency_ms}ms
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
