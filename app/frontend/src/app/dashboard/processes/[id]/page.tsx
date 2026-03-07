"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VALID_TRANSITIONS, type Process } from "@/lib/api";
import { ProcessTimeline } from "@/components/process-timeline";
import { fetchProcess, changeProcessStatus } from "../actions";

const statusColors: Record<string, string> = {
  recebido: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  em_analise: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  pendente_documentos: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  aprovado: "bg-green-500/10 text-green-500 border-green-500/20",
  rejeitado: "bg-red-500/10 text-red-500 border-red-500/20",
  finalizado: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  cancelado: "bg-muted text-muted-foreground border-muted",
};

const statusLabels: Record<string, string> = {
  recebido: "Recebido",
  em_analise: "Em Analise",
  pendente_documentos: "Pendente Docs",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const visaTypeLabels: Record<string, string> = {
  turismo: "Turismo",
  trabalho: "Trabalho",
  estudante: "Estudante",
  residencia: "Residencia",
  transito: "Transito",
  a_definir: "A definir",
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

export default function ProcessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [process, setProcess] = useState<Process | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [reason, setReason] = useState("");

  const loadProcess = async () => {
    setLoading(true);
    try {
      const data = await fetchProcess(id);
      setProcess(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcess();
  }, [id]);

  const handleStatusChange = async () => {
    if (!newStatus || !reason.trim()) return;
    setUpdating(true);
    try {
      await changeProcessStatus(id, newStatus, reason);
      setNewStatus("");
      setReason("");
      await loadProcess();
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!process) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Processo nao encontrado
      </div>
    );
  }

  const validTransitions = VALID_TRANSITIONS[process.status] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Detalhe do Processo
          </h1>
          <p className="text-muted-foreground text-sm">ID: {process._id}</p>
        </div>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadProcess}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Process Info */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tipo de Visto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {visaTypeLabels[process.visa_type] || process.visa_type}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pais Destino</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {process.destination_country}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant="outline"
              className={`${statusColors[process.status] || ""} text-base px-3 py-1`}
            >
              {statusLabels[process.status] || process.status}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Criado em</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatDate(process.created_at)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso</CardTitle>
          <CardDescription>
            Linha do tempo do processo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProcessTimeline
            currentStatus={process.status}
            statusHistory={process.status_history}
          />
        </CardContent>
      </Card>

      {/* Status Change */}
      {validTransitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alterar Status</CardTitle>
            <CardDescription>
              Selecione o novo status e informe o motivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Novo Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {validTransitions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabels[s] || s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-[2]">
                <label className="text-sm font-medium">Motivo</label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Informe o motivo da alteracao..."
                />
              </div>
              <Button
                onClick={handleStatusChange}
                disabled={!newStatus || !reason.trim() || updating}
              >
                {updating ? "Atualizando..." : "Alterar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle>Historico de Transicoes</CardTitle>
          <CardDescription>
            Registro de todas as alteracoes de status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {process.status_history.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhuma transicao registrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Para</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Alterado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...process.status_history].reverse().map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(entry.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[entry.from_status] || ""}
                      >
                        {statusLabels[entry.from_status] || entry.from_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[entry.to_status] || ""}
                      >
                        {statusLabels[entry.to_status] || entry.to_status}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.reason || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.changed_by}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos Associados
          </CardTitle>
          <CardDescription>
            {process.documents?.length || 0} documento(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!process.documents || process.documents.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum documento associado
            </div>
          ) : (
            <div className="space-y-2">
              {process.documents.map((doc: any) => (
                <div
                  key={doc._id || doc}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">
                      {doc.original_filename || doc.s3_key || String(doc)}
                    </p>
                    {doc.document_type && (
                      <p className="text-xs text-muted-foreground">
                        {doc.document_type}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {process.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Observacoes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{process.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
