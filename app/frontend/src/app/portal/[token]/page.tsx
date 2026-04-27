import { notFound } from "next/navigation";
import { verifyPortalToken } from "@/lib/jwt";
import {
  getInteractionLogsByUser,
  getProcesses,
  getUser,
  getVisaGuidance,
  getFiles,
  getConversations,
} from "@/lib/api";
import { TimelineCard } from "@/components/portal/timeline-card";
import { NextStepsPanel } from "@/components/portal/next-steps-panel";
import { InteractionHistory } from "@/components/portal/interaction-history";
import { DocumentsList } from "@/components/portal/documents-list";
import { ActionButtons } from "@/components/portal/action-buttons";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PortalPage({ params }: PageProps) {
  const { token } = await params;

  const payload = await verifyPortalToken(token);
  if (!payload) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Link expirado ou inválido</h1>
          <p className="text-muted-foreground">
            Esse link de acesso ao portal não é mais válido. Volte ao Telegram e digite{" "}
            <strong>"abrir portal"</strong> para gerar um novo.
          </p>
        </div>
      </main>
    );
  }

  // Fetch all data for the user in parallel
  const [user, processes, files, interactionLogs, guidance, conversations] = await Promise.all([
    getUser(payload.user_id),
    getProcesses({ user_id: payload.user_id }),
    getFiles().then((all) => {
      // The API doesn't filter files by user; filter client-side using the
      // conversations from the next call. We refetch below.
      return all;
    }),
    getInteractionLogsByUser(payload.user_id),
    getVisaGuidance(),
    getConversations(),
  ]);

  if (!user) notFound();

  // Filter files to those belonging to this user's conversations
  const userConversationIds = new Set(
    conversations.filter((c) => c.user_id === payload.user_id).map((c) => c._id),
  );
  const userFiles = files.filter((f) => userConversationIds.has(f.conversation_id));

  const activeProcess =
    processes.find((p) => !["finalizado", "cancelado", "rejeitado"].includes(p.status)) ??
    processes[0];

  const userTelegramConversation = conversations.find(
    (c) => c.user_id === payload.user_id && c.channel === "telegram",
  );

  const currentGuidance = activeProcess ? guidance[activeProcess.status] : undefined;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto py-6 px-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">YOUVISA</h1>
              <p className="text-sm text-muted-foreground">Olá, {user.first_name ?? "cliente"}!</p>
            </div>
            <span className="text-xs text-muted-foreground">
              Sessão expira em {payload.exp ? new Date(payload.exp * 1000).toLocaleString("pt-BR") : "—"}
            </span>
          </div>
        </div>
      </header>

      <section className="container mx-auto py-8 px-4 space-y-6 max-w-5xl">
        {activeProcess ? (
          <>
            <TimelineCard process={activeProcess} guidance={currentGuidance} />
            <div className="grid md:grid-cols-2 gap-6">
              <NextStepsPanel guidance={currentGuidance} />
              <DocumentsList files={userFiles} />
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">
              Você ainda não tem nenhum processo de visto ativo. Envie seus documentos pelo Telegram para começar.
            </p>
          </div>
        )}

        <InteractionHistory logs={interactionLogs} />

        {userTelegramConversation && (
          <ActionButtons conversationId={userTelegramConversation._id} />
        )}
      </section>

      <footer className="border-t border-border mt-12">
        <div className="container mx-auto py-4 px-4 text-center text-xs text-muted-foreground">
          YOUVISA · Plataforma inteligente de atendimento
        </div>
      </footer>
    </main>
  );
}
