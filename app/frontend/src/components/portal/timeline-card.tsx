import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProcessTimeline } from "@/components/process-timeline";
import { StatusPill } from "@/components/portal/status-pill";
import type { Process, VisaGuidance } from "@/lib/api";

const VISA_LABELS: Record<string, string> = {
  turismo: "Turismo",
  trabalho: "Trabalho",
  estudante: "Estudante",
  residencia: "Residência",
  transito: "Trânsito",
};

export function TimelineCard({
  process,
  guidance,
}: {
  process: Process;
  guidance?: VisaGuidance;
}) {
  const visa =
    process.visa_type && process.visa_type !== "a_definir"
      ? VISA_LABELS[process.visa_type] ?? process.visa_type
      : null;
  const country =
    process.destination_country &&
    process.destination_country.toLowerCase() !== "a definir"
      ? process.destination_country
      : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/30 pb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Sua solicitação
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {visa ? `Visto de ${visa}` : "Processo de visto"}
              {country && (
                <span className="text-muted-foreground font-normal text-base ml-1.5">
                  para {country}
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              Atualizado em {new Date(process.updated_at).toLocaleString("pt-BR")}
            </p>
          </div>
          <StatusPill
            status={process.status}
            label={guidance?.label ?? process.status}
            size="md"
          />
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-7">
        <ProcessTimeline
          currentStatus={process.status}
          statusHistory={process.status_history}
        />
      </CardContent>
    </Card>
  );
}
