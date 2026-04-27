import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProcessTimeline } from "@/components/process-timeline";
import type { Process, VisaGuidance } from "@/lib/api";

const VISA_LABELS: Record<string, string> = {
  turismo: "Turismo",
  trabalho: "Trabalho",
  estudante: "Estudante",
  residencia: "Residência",
  transito: "Trânsito",
};

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "aprovado":
    case "finalizado":
      return "default";
    case "rejeitado":
    case "cancelado":
      return "destructive";
    case "pendente_documentos":
      return "outline";
    default:
      return "secondary";
  }
}

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
    process.destination_country && process.destination_country.toLowerCase() !== "a definir"
      ? process.destination_country
      : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-2xl">
              {visa ? `Visto de ${visa}` : "Seu processo de visto"}
              {country && (
                <span className="text-muted-foreground font-normal text-lg">
                  {" "}
                  para {country}
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Atualizado em {new Date(process.updated_at).toLocaleString("pt-BR")}
            </p>
          </div>
          <Badge variant={statusBadgeVariant(process.status)} className="text-base px-3 py-1">
            {guidance?.label ?? process.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="pt-2">
          <ProcessTimeline
            currentStatus={process.status}
            statusHistory={process.status_history}
          />
        </div>
      </CardContent>
    </Card>
  );
}
