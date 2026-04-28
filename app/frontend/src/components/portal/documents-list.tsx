import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { File as FileT } from "@/lib/api";

function formatBytes(n?: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsList({ files }: { files: FileT[] }) {
  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documentos enviados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum documento enviado ainda. Envie passaporte, RG, comprovantes pelo Telegram.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Documentos enviados</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {files.map((f) => (
            <li
              key={f._id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
            >
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {f.original_filename || f.s3_key.split("/").pop() || "documento"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(f.uploaded_at).toLocaleString("pt-BR")}
                  {f.file_size ? <> · {formatBytes(f.file_size)}</> : null}
                </p>
              </div>
              {f.document_type && (
                <Badge variant={f.document_type === "Documento inválido" ? "destructive" : "secondary"}>
                  {f.document_type}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
