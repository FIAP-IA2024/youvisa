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

function intentBadgeVariant(intent: string): "default" | "secondary" | "destructive" | "outline" {
  if (intent === "injection_attempt") return "destructive";
  if (intent === "want_human") return "outline";
  return "secondary";
}

export function InteractionHistory({ logs }: { logs: InteractionLog[] }) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de interações</CardTitle>
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
        <CardTitle className="text-lg">Histórico de interações</CardTitle>
        <p className="text-sm text-muted-foreground">
          Cada mensagem é interpretada pelo nosso assistente. A intenção detectada aparece ao lado.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {logs.map((log) => (
            <li key={log._id} className="border-l-2 border-border pl-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium flex-1">
                  <span className="text-muted-foreground">Você:</span> {log.user_message}
                </p>
                <Badge variant={intentBadgeVariant(log.intent)} className="shrink-0">
                  {INTENT_LABELS[log.intent] ?? log.intent}
                </Badge>
              </div>
              {log.response && (
                <p className="text-sm text-muted-foreground italic">
                  <span className="not-italic font-medium">Bot:</span> {log.response}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {new Date(log.created_at).toLocaleString("pt-BR")}
                <span className="mx-1">·</span>
                {log.total_latency_ms}ms
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
