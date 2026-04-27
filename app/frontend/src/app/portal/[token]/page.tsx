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

  // Fetch all data for THIS user in parallel — every endpoint accepts a user_id
  // filter so we don't ship anyone else's records to the browser.
  const [user, processes, interactionLogs, guidance, conversations] =
    await Promise.all([
      getUser(payload.user_id),
      getProcesses({ user_id: payload.user_id }),
      getInteractionLogsByUser(payload.user_id),
      getVisaGuidance(),
      getConversations({ user_id: payload.user_id }),
    ]);

  if (!user) notFound();

  // Files are scoped per-conversation. Fetch only this user's conversations'
  // files.
  const userConversationIds = conversations.map((c) => c._id);
  const filesPerConversation = await Promise.all(
    userConversationIds.map((id) => getFiles({ conversation_id: id })),
  );
  const userFiles = filesPerConversation.flat();

  const activeProcess =
    processes.find((p) => !["finalizado", "cancelado", "rejeitado"].includes(p.status)) ??
    processes[0];

  const userTelegramConversation = conversations.find(
    (c) => c.user_id === payload.user_id && c.channel === "telegram",
  );

  const currentGuidance = activeProcess ? guidance[activeProcess.status] : undefined;

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Pular para o conteúdo
      </a>
      <header className="border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-10">
        <div className="container mx-auto py-4 px-4 sm:px-6 max-w-5xl">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden
                >
                  <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                </svg>
              </div>
              <div className="leading-tight">
                <p className="font-display text-lg font-semibold">YOUVISA</p>
                <p className="text-xs text-muted-foreground">
                  Olá, {user.first_name ?? "cliente"}
                </p>
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              Sessão expira em{" "}
              {payload.exp ? new Date(payload.exp * 1000).toLocaleString("pt-BR") : "—"}
            </span>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        role="main"
        aria-labelledby="portal-title"
        className="container mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6 max-w-5xl"
      >
        <h1 id="portal-title" className="sr-only">
          Portal do cliente — {user.first_name ?? "YOUVISA"}
        </h1>
        {activeProcess ? (
          <>
            <TimelineCard process={activeProcess} guidance={currentGuidance} />
            <div className="grid md:grid-cols-2 gap-6">
              <NextStepsPanel guidance={currentGuidance} />
              <DocumentsList files={userFiles} />
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem nenhum processo de visto ativo. Envie seus documentos pelo
              Telegram para começar.
            </p>
          </div>
        )}

        <InteractionHistory logs={interactionLogs} />

        {userTelegramConversation && (
          <ActionButtons
            token={token}
            conversationId={userTelegramConversation._id}
          />
        )}
      </main>

      <footer className="border-t border-border mt-12">
        <div className="container mx-auto py-4 px-4 text-center text-xs text-muted-foreground max-w-5xl">
          YOUVISA · Plataforma de atendimento inteligente
        </div>
      </footer>
    </div>
  );
}
