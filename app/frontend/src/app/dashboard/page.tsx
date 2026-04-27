import {
  Activity,
  ClipboardList,
  FileCheck,
  FileText,
  MessageSquare,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardStats, getInteractionLogs, type File } from "@/lib/api";

const PROCESS_LABELS: Record<string, string> = {
  recebido: "Recebido",
  em_analise: "Em Análise",
  pendente_documentos: "Pendente Docs",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const DOC_TYPE_DOT: Record<string, string> = {
  Passaporte: "bg-chart-1",
  RG: "bg-chart-2",
  Comprovante: "bg-chart-3",
  Formulário: "bg-chart-4",
  Formulario: "bg-chart-4",
  "Documento inválido": "bg-destructive",
  "Sem classificacao": "bg-muted-foreground/40",
};

function formatDate(s: string) {
  return new Date(s).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface KpiCardProps {
  label: string;
  value: number | string;
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
}

function KpiCard({ label, value, caption, icon: Icon }: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pb-5">
        <div className="font-display text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const [stats, interactions] = await Promise.all([
    getDashboardStats(),
    getInteractionLogs(),
  ]);

  const classifiedCount = Object.entries(stats.classificationCounts)
    .filter(([k]) => k !== "Sem classificacao")
    .reduce((acc, [, c]) => acc + c, 0);
  const totalClassifications = Object.values(stats.classificationCounts).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
          Visão geral
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estado atual da plataforma — usuários, processos e interações do pipeline multi-agente.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Usuários"
          value={stats.totalUsers}
          caption="cadastrados"
          icon={Users}
        />
        <KpiCard
          label="Conversas"
          value={stats.totalConversations}
          caption="iniciadas"
          icon={MessageSquare}
        />
        <KpiCard
          label="Processos"
          value={stats.totalProcesses}
          caption="ativos + arquivados"
          icon={ClipboardList}
        />
        <KpiCard
          label="Documentos"
          value={`${classifiedCount}/${stats.totalFiles}`}
          caption="classificados pela IA"
          icon={FileCheck}
        />
        <KpiCard
          label="Interações"
          value={interactions.length}
          caption="processadas pelo pipeline"
          icon={Activity}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Process status distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Processos por status</CardTitle>
            <CardDescription>Distribuição da máquina de estados.</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.processStatusCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum processo registrado ainda.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {Object.entries(stats.processStatusCounts).map(([status, count]) => (
                  <li
                    key={status}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="status-pill" data-status={status}>
                      {PROCESS_LABELS[status] ?? status}
                    </span>
                    <span className="font-medium tabular-nums">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Document classification distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documentos por tipo</CardTitle>
            <CardDescription>
              Classificação feita por Claude Vision (IA generativa multimodal).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalClassifications === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum documento processado ainda.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {Object.entries(stats.classificationCounts).map(([type, count]) => {
                  const pct = totalClassifications
                    ? Math.round((count / totalClassifications) * 100)
                    : 0;
                  return (
                    <li key={type} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${DOC_TYPE_DOT[type] ?? "bg-muted-foreground/40"}`}
                            aria-hidden
                          />
                          {type}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {count}
                          <span className="ml-1 text-xs">({pct}%)</span>
                        </span>
                      </div>
                      <div
                        className="h-1 rounded-full bg-muted overflow-hidden"
                        role="progressbar"
                        aria-valuenow={pct}
                      >
                        <div
                          className={`h-full ${DOC_TYPE_DOT[type] ?? "bg-muted-foreground/40"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent docs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Documentos recentes</CardTitle>
            <CardDescription>Últimos uploads via Telegram.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recentFiles.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum documento enviado ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recentFiles.map((file: File) => (
                <li
                  key={file._id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted shrink-0">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.original_filename || file.s3_key}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(file.uploaded_at)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-2 shrink-0">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${DOC_TYPE_DOT[file.document_type ?? "Sem classificacao"] ?? "bg-muted-foreground/40"}`}
                    />
                    {file.document_type || "Sem classificação"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
