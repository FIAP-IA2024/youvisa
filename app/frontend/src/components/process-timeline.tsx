"use client";

import { Check, X, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const HAPPY_PATH = [
  "recebido",
  "em_analise",
  "aprovado",
  "finalizado",
] as const;

const statusLabels: Record<string, string> = {
  recebido: "Recebido",
  em_analise: "Em Analise",
  pendente_documentos: "Pendente Docs",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

interface ProcessTimelineProps {
  currentStatus: string;
  statusHistory: { from_status: string; to_status: string }[];
}

export function ProcessTimeline({
  currentStatus,
  statusHistory,
}: ProcessTimelineProps) {
  const completedStatuses = new Set(
    statusHistory.map((h) => h.from_status)
  );

  const isTerminalNegative =
    currentStatus === "rejeitado" || currentStatus === "cancelado";
  const isPendingDocuments = currentStatus === "pendente_documentos";

  const getStepState = (step: string) => {
    if (step === currentStatus) return "current";
    if (completedStatuses.has(step)) return "completed";
    return "future";
  };

  const steps = [...HAPPY_PATH];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const state = getStepState(step);
          const isLast = index === steps.length - 1;

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                    state === "completed" &&
                      "bg-green-500/10 border-green-500 text-green-500",
                    state === "current" &&
                      !isTerminalNegative &&
                      "bg-primary/10 border-primary text-primary animate-pulse",
                    state === "current" &&
                      isTerminalNegative &&
                      "bg-red-500/10 border-red-500 text-red-500",
                    state === "future" &&
                      "bg-muted border-muted-foreground/30 text-muted-foreground/30"
                  )}
                >
                  {state === "completed" ? (
                    <Check className="h-4 w-4" />
                  ) : state === "current" && isTerminalNegative ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs text-center whitespace-nowrap",
                    state === "completed" && "text-green-500",
                    state === "current" &&
                      !isTerminalNegative &&
                      "text-primary font-semibold",
                    state === "current" &&
                      isTerminalNegative &&
                      "text-red-500 font-semibold",
                    state === "future" && "text-muted-foreground/50"
                  )}
                >
                  {statusLabels[step]}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 mt-[-1rem]",
                    state === "completed"
                      ? "bg-green-500"
                      : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Show extra info for non-happy-path statuses */}
      {isPendingDocuments && (
        <div className="mt-4 p-3 rounded-lg border border-orange-500/20 bg-orange-500/5">
          <span className="text-sm text-orange-500 font-medium">
            Pendente de Documentos - Aguardando envio de documentos adicionais
          </span>
        </div>
      )}
      {isTerminalNegative && (
        <div className="mt-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
          <span className="text-sm text-red-500 font-medium">
            Processo {statusLabels[currentStatus]}
          </span>
        </div>
      )}
    </div>
  );
}
