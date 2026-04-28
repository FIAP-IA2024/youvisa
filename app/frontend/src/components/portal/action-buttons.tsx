"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, MessageCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { requestHandoff } from "@/app/portal/[token]/actions";

interface ActionButtonsProps {
  /** JWT from the URL path — needed by the Server Action to re-verify ownership */
  token: string;
  conversationId: string;
  telegramBotUsername?: string;
  onHandoffRequested?: () => void;
}

export function ActionButtons({
  token,
  conversationId,
  telegramBotUsername = "youvisa_test_assistant_s3_bot",
  onHandoffRequested,
}: ActionButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [handoffSent, setHandoffSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleHandoff = () => {
    if (
      !confirm(
        "Confirmar transferência para atendente humano? O bot ficará silencioso até o atendente devolver a conversa.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await requestHandoff(token, conversationId);
      if (result.ok) {
        setHandoffSent(true);
        onHandoffRequested?.();
      } else {
        setError(
          result.error === "forbidden"
            ? "Você não tem permissão para esta conversa."
            : result.error === "session_expired"
              ? "Sua sessão expirou. Volte ao Telegram e gere um novo link."
              : "Não foi possível transferir agora. Tente novamente em instantes.",
        );
      }
    });
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Button
            onClick={handleHandoff}
            disabled={isPending || handoffSent}
            variant={handoffSent ? "secondary" : "default"}
            size="lg"
            className="w-full h-11"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            {handoffSent
              ? "Solicitação enviada"
              : isPending
                ? "Encaminhando..."
                : "Falar com atendente"}
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full h-11">
            <a
              href={`https://t.me/${telegramBotUsername}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir no Telegram
            </a>
          </Button>
        </div>
        {handoffSent && (
          <p className="text-xs text-muted-foreground text-center">
            Um atendente humano responderá em breve via Telegram.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="text-xs text-destructive text-center"
          >
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
