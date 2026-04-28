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

const STEP_COLORS: Record<string, string> = {
  "input-filter": "bg-blue-500/10 text-blue-600 border-blue-200/50 dark:text-blue-300 dark:border-blue-900/40",
  "intent-classifier": "bg-violet-500/10 text-violet-600 border-violet-200/50 dark:text-violet-300 dark:border-violet-900/40",
  "entity-extractor": "bg-violet-500/10 text-violet-600 border-violet-200/50 dark:text-violet-300 dark:border-violet-900/40",
  lookup: "bg-emerald-500/10 text-emerald-600 border-emerald-200/50 dark:text-emerald-300 dark:border-emerald-900/40",
  "response-generator": "bg-orange-500/10 text-orange-600 border-orange-200/50 dark:text-orange-300 dark:border-orange-900/40",
  "output-filter": "bg-amber-500/10 text-amber-600 border-amber-200/50 dark:text-amber-300 dark:border-amber-900/40",
  "handoff-check": "bg-red-500/10 text-red-600 border-red-200/50 dark:text-red-300 dark:border-red-900/40",
  "handoff-trigger": "bg-red-500/10 text-red-600 border-red-200/50 dark:text-red-300 dark:border-red-900/40",
  "portal-token-generator": "bg-cyan-500/10 text-cyan-600 border-cyan-200/50 dark:text-cyan-300 dark:border-cyan-900/40",
  "email-persist": "bg-emerald-500/10 text-emerald-600 border-emerald-200/50 dark:text-emerald-300 dark:border-emerald-900/40",
};

export default async function InteractionsPage() {
  const logs = await getInteractionLogs();

  const totalInteractions = logs.length;
  const blockedAttempts = logs.filter((l) => l.intent === "injection_attempt").length;
  const handoffs = logs.filter((l) => l.intent === "want_human" || l.intent === "transferred").length;
  const avgLatency = totalInteractions
    ? Math.round(logs.reduce((a, l) => a + (l.total_latency_ms ?? 0), 0) / totalInteractions)
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
          Interações
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
          Histórico estruturado das mensagens processadas pelo pipeline multi-agente. Cada
          entrada mostra a intent detectada, as entidades extraídas e o trace de tempo por
          step do pipeline.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Total
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {totalInteractions}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Latência média
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {avgLatency}
              <span className="text-base font-normal text-muted-foreground ml-1">ms</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Injeções bloqueadas
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {blockedAttempts}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Handoffs
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {handoffs}
            </p>
          </CardContent>
        </Card>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma interação registrada ainda. Mande uma mensagem no Telegram para o bot.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log._id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1.5 min-w-0">
                    <CardTitle className="text-sm font-medium leading-snug">
                      <span className="text-muted-foreground">Usuário · </span>
                      &ldquo;{log.user_message}&rdquo;
                    </CardTitle>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                      <span className="mx-1.5">·</span>
                      {log.total_latency_ms}ms
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={log.intent === "injection_attempt" ? "destructive" : "secondary"}
                    >
                      {INTENT_LABELS[log.intent] ?? log.intent}
                    </Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {(log.intent_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {log.response && (
                  <div className="rounded-md bg-muted/40 px-3 py-2.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Resposta
                    </p>
                    <p className="text-sm">{log.response}</p>
                  </div>
                )}

                {log.entities && Object.keys(log.entities).length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Entidades
                    </p>
                    <pre className="font-mono text-xs bg-muted/30 border border-border rounded-md p-2.5 overflow-x-auto">
                      {JSON.stringify(log.entities, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Trace dos agentes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {log.agent_trace.map((t, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] tabular-nums ${
                          STEP_COLORS[t.step] ??
                          "bg-muted/30 text-muted-foreground border-border"
                        }`}
                      >
                        {t.step}
                        <span className="opacity-60">·</span>
                        {t.duration_ms}ms
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
