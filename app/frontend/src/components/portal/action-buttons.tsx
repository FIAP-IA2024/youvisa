"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, MessageCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { requestHandoff } from "@/app/portal/[token]/actions";

interface ActionButtonsProps {
  conversationId: string;
  telegramBotUsername?: string;
  onHandoffRequested?: () => void;
}

export function ActionButtons({
  conversationId,
  telegramBotUsername = "youvisa_test_assistant_bot",
  onHandoffRequested,
}: ActionButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [handoffSent, setHandoffSent] = useState(false);

  const handleHandoff = () => {
    startTransition(async () => {
      const ok = await requestHandoff(conversationId);
      if (ok) {
        setHandoffSent(true);
        onHandoffRequested?.();
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
            className="w-full"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            {handoffSent
              ? "Solicitação enviada"
              : isPending
                ? "Encaminhando..."
                : "Falar com atendente"}
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a href={`https://t.me/${telegramBotUsername}`} target="_blank" rel="noopener noreferrer">
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
      </CardContent>
    </Card>
  );
}
