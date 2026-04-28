"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Bot, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Conversation } from "@/lib/api";
import { fetchConversations, setConversationStatus } from "./actions";

const channelColors: Record<string, string> = {
  telegram: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  whatsapp: "bg-green-500/10 text-green-500 border-green-500/20",
  webchat: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  transferred: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  resolved: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  closed: "bg-muted text-muted-foreground border-muted",
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await fetchConversations();
      setConversations(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleReturnToBot = async (id: string, chatId: string) => {
    if (
      !confirm(
        `Devolver a conversa #${chatId} ao bot? O bot voltará a responder mensagens do cliente.`,
      )
    ) {
      return;
    }
    setUpdating(id);
    try {
      await setConversationStatus(id, "active");
      await loadConversations();
    } finally {
      setUpdating(null);
    }
  };

  const transferredConversations = conversations.filter(c => c.status === "transferred");
  const otherConversations = conversations.filter(c => c.status !== "transferred");

  const statusCounts = conversations.reduce(
    (acc, conv) => {
      acc[conv.status] = (acc[conv.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Conversas</h1>
          <p className="text-muted-foreground">
            Historico de conversas com usuarios
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadConversations} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Status Summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Badge
            key={status}
            variant="outline"
            className={`${statusColors[status] || ""} px-3 py-1`}
          >
            {status}: {count}
          </Badge>
        ))}
      </div>

      {/* Transferred Conversations */}
      {transferredConversations.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <MessageSquare className="h-5 w-5" />
              Conversas Transferidas para Atendente
            </CardTitle>
            <CardDescription>
              {transferredConversations.length} conversa(s) aguardando atendimento humano
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chat ID</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Iniciada em</TableHead>
                  <TableHead>Ultima mensagem</TableHead>
                  <TableHead>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transferredConversations.map((conversation) => (
                  <TableRow key={conversation._id}>
                    <TableCell className="font-medium">
                      <span className="truncate max-w-[200px] block">
                        {conversation.chat_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={channelColors[conversation.channel] || ""}
                      >
                        {conversation.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(conversation.started_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {conversation.last_message_at
                        ? formatDate(conversation.last_message_at)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="default"
                        className="h-11"
                        onClick={() =>
                          handleReturnToBot(conversation._id, conversation.chat_id)
                        }
                        disabled={updating === conversation._id}
                      >
                        <Bot className="h-4 w-4 mr-2" />
                        {updating === conversation._id ? "Voltando..." : "Voltar para Bot"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Other Conversations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {transferredConversations.length > 0 ? "Outras Conversas" : "Lista de Conversas"}
          </CardTitle>
          <CardDescription>
            Total de {otherConversations.length} conversa(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : otherConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma conversa encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chat ID</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Iniciada em</TableHead>
                  <TableHead>Ultima mensagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherConversations.map((conversation) => (
                  <TableRow key={conversation._id}>
                    <TableCell className="font-medium">
                      <span className="truncate max-w-[200px] block">
                        {conversation.chat_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={channelColors[conversation.channel] || ""}
                      >
                        {conversation.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[conversation.status] || ""}
                      >
                        {conversation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(conversation.started_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {conversation.last_message_at
                        ? formatDate(conversation.last_message_at)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
