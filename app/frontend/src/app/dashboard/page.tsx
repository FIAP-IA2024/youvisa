import { Users, MessageSquare, FileText, FileCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDashboardStats, type File } from "@/lib/api";

const documentTypeColors: Record<string, string> = {
  Passaporte: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  RG: "bg-green-500/10 text-green-500 border-green-500/20",
  Comprovante: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Formulario: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "Documento invalido": "bg-red-500/10 text-red-500 border-red-500/20",
  "Sem classificacao": "bg-muted text-muted-foreground border-muted",
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

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visao geral do sistema YOUVISA</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">usuarios cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">conversas iniciadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFiles}</div>
            <p className="text-xs text-muted-foreground">arquivos enviados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Classificados</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.entries(stats.classificationCounts)
                .filter(([key]) => key !== "Sem classificacao")
                .reduce((acc, [, count]) => acc + count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">documentos classificados</p>
          </CardContent>
        </Card>
      </div>

      {/* Classification Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuicao de Classificacoes</CardTitle>
          <CardDescription>Tipos de documentos processados pelo sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(stats.classificationCounts).map(([type, count]) => (
              <div
                key={type}
                className="flex items-center gap-2 p-3 rounded-lg border bg-card"
              >
                <Badge variant="outline" className={documentTypeColors[type] || ""}>
                  {type}
                </Badge>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
            {Object.keys(stats.classificationCounts).length === 0 && (
              <p className="text-muted-foreground">Nenhum documento processado ainda</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Files */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos Recentes</CardTitle>
          <CardDescription>Ultimos arquivos enviados ao sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentFiles.map((file: File) => (
              <div
                key={file._id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">
                      {file.original_filename || file.s3_key}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(file.uploaded_at)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={documentTypeColors[file.document_type || "Sem classificacao"] || ""}
                >
                  {file.document_type || "Sem classificacao"}
                </Badge>
              </div>
            ))}
            {stats.recentFiles.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                Nenhum documento enviado ainda
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
