import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getConversations } from "@/lib/api";

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

export default async function ConversationsPage() {
  const conversations = await getConversations();

  const statusCounts = conversations.reduce(
    (acc, conv) => {
      acc[conv.status] = (acc[conv.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Conversas</h1>
        <p className="text-muted-foreground">
          Historico de conversas com usuarios
        </p>
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

      {/* Conversations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Lista de Conversas
          </CardTitle>
          <CardDescription>
            Total de {conversations.length} conversa(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
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
                {conversations.map((conversation) => (
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
