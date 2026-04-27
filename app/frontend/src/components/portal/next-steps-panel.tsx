import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VisaGuidance } from "@/lib/api";
import { ArrowRight, Info } from "lucide-react";

export function NextStepsPanel({ guidance }: { guidance?: VisaGuidance }) {
  if (!guidance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Próximos passos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sem orientações disponíveis para este status no momento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          {guidance.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed">{guidance.general_info}</p>

        {guidance.next_steps.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Próximos passos
            </h4>
            <ul className="space-y-2">
              {guidance.next_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
