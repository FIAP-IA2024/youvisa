import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getInteractionLogs } from "@/lib/api";

export const dynamic = "force-dynamic";

const INTENT_LABELS: Record<string, string> = {
  status_query: "Status",
  document_question: "Documentos",
  want_human: "Atendente",
  provide_email: "Email",
  open_portal: "Portal",
  general: "Geral",
  injection_attempt: "Injeção bloqueada",
  transferred: "Transferido (silenciado)",
};

export default async function InteractionsPage() {
  const logs = await getInteractionLogs();

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Interações</h1>
        <p className="text-muted-foreground">
          Histórico de mensagens processadas pelo pipeline multi-agente. Mostra a intent detectada,
          o trace de cada agente e a latência.
        </p>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhuma interação registrada ainda. Mande uma mensagem no Telegram para o bot.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log._id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-medium">
                      "{log.user_message}"
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-BR")} · {log.total_latency_ms}ms
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={log.intent === "injection_attempt" ? "destructive" : "secondary"}
                    >
                      {INTENT_LABELS[log.intent] ?? log.intent}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {(log.intent_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {log.response && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Resposta
                    </p>
                    <p className="text-sm">{log.response}</p>
                  </div>
                )}

                {log.entities && Object.keys(log.entities).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Entidades
                    </p>
                    <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto">
                      {JSON.stringify(log.entities, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Trace dos agentes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {log.agent_trace.map((t, i) => (
                      <Badge key={i} variant="outline" className="font-mono text-xs">
                        {t.step} · {t.duration_ms}ms
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
