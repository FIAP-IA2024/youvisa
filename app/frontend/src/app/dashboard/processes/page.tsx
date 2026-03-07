"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Process } from "@/lib/api";
import { fetchProcesses } from "./actions";

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

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [visaFilter, setVisaFilter] = useState<string>("all");

  const loadProcesses = async () => {
    setLoading(true);
    try {
      const filters: { status?: string; visa_type?: string } = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      if (visaFilter !== "all") filters.visa_type = visaFilter;
      const data = await fetchProcesses(filters);
      setProcesses(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcesses();
  }, [statusFilter, visaFilter]);

  const statusCounts = processes.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Processos</h1>
          <p className="text-muted-foreground">
            Acompanhamento de solicitacoes de visto
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadProcesses}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
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
            {statusLabels[status] || status}: {count}
          </Badge>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={visaFilter} onValueChange={setVisaFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por tipo de visto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(visaTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Process List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Lista de Processos
          </CardTitle>
          <CardDescription>
            Total de {processes.length} processo(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : processes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum processo encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Visto</TableHead>
                  <TableHead>Pais</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processes.map((process) => (
                  <TableRow key={process._id}>
                    <TableCell className="font-medium">
                      {visaTypeLabels[process.visa_type] || process.visa_type}
                    </TableCell>
                    <TableCell>{process.destination_country}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[process.status] || ""}
                      >
                        {statusLabels[process.status] || process.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{process.documents?.length || 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(process.created_at)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/processes/${process._id}`}>
                        <Button variant="outline" size="sm">
                          Detalhes
                        </Button>
                      </Link>
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
