import { FileText } from "lucide-react";
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
import { getFiles } from "@/lib/api";

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

function formatFileSize(bytes?: number) {
  if (!bytes) return "-";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function formatConfidence(confidence?: number) {
  if (confidence === undefined || confidence === null) return "-";
  return `${(confidence * 100).toFixed(0)}%`;
}

export default async function DocumentsPage() {
  const files = await getFiles();

  // Calculate stats
  const classificationCounts = files.reduce(
    (acc, file) => {
      const type = file.document_type || "Sem classificacao";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Documentos</h1>
        <p className="text-muted-foreground">
          Arquivos enviados e suas classificacoes
        </p>
      </div>

      {/* Classification Summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(classificationCounts).map(([type, count]) => (
          <Badge
            key={type}
            variant="outline"
            className={`${documentTypeColors[type] || ""} px-3 py-1`}
          >
            {type}: {count}
          </Badge>
        ))}
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lista de Documentos
          </CardTitle>
          <CardDescription>
            Total de {files.length} documento(s) enviado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum documento enviado ainda
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Classificacao</TableHead>
                  <TableHead>Confianca</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => {
                  const documentType = file.document_type || "Sem classificacao";

                  return (
                    <TableRow key={file._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[200px]">
                            {file.original_filename || file.s3_key}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {file.mime_type || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={documentTypeColors[documentType] || ""}
                        >
                          {documentType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatConfidence(file.classification_confidence)}
                      </TableCell>
                      <TableCell>{formatFileSize(file.file_size)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(file.uploaded_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
