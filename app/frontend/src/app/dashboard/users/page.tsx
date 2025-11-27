import { Users } from "lucide-react";
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
import { getUsers } from "@/lib/api";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Usuarios</h1>
        <p className="text-muted-foreground">
          Usuarios cadastrados na plataforma
        </p>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Usuarios
          </CardTitle>
          <CardDescription>
            Total de {users.length} usuario(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuario cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telegram ID</TableHead>
                  <TableHead>Idioma</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">
                      {user.username ? `@${user.username}` : "-"}
                    </TableCell>
                    <TableCell>
                      {[user.first_name, user.last_name].filter(Boolean).join(" ") || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {user.telegram_id}
                    </TableCell>
                    <TableCell>
                      {user.language_code ? (
                        <Badge variant="outline">{user.language_code}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          user.is_bot
                            ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                            : "bg-green-500/10 text-green-500 border-green-500/20"
                        }
                      >
                        {user.is_bot ? "Bot" : "Usuario"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(user.created_at)}
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
