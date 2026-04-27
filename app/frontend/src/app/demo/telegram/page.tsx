"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Telegram-style simulator for the Sprint 4 demo recording.
 * Drives the real multi-agent pipeline via /demo/send on the agent.
 * UI is faithful to Telegram Web visually (blue background, bubbles,
 * typing indicator) but is not the actual Telegram client.
 */

const AGENT_URL =
  process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:7777";

const TG_ID = "900_001_001";
const CHAT_ID = "900_001_001";
const FIRST_NAME = "Maria";

interface Bubble {
  id: string;
  side: "user" | "bot";
  text: string;
  time: string;
  intent?: string;
  intent_confidence?: number;
  trace?: { step: string; duration_ms: number }[];
}

const INTENT_BADGE: Record<string, { label: string; cls: string }> = {
  status_query: { label: "Status", cls: "bg-blue-500/15 text-blue-700" },
  document_question: { label: "Documentos", cls: "bg-blue-500/15 text-blue-700" },
  want_human: { label: "Atendente", cls: "bg-amber-500/15 text-amber-700" },
  open_portal: { label: "Portal", cls: "bg-cyan-500/15 text-cyan-700" },
  general: { label: "Geral", cls: "bg-slate-500/15 text-slate-700" },
  injection_attempt: { label: "Bloqueado", cls: "bg-red-500/15 text-red-700" },
  transferred: { label: "Transferido", cls: "bg-slate-500/15 text-slate-600" },
  provide_email: { label: "Email", cls: "bg-emerald-500/15 text-emerald-700" },
};

function nowTime() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STORAGE_KEY = "youvisa-demo-bubbles";

export default function TelegramSimulatorPage() {
  const [input, setInput] = useState("");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [typing, setTyping] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage so navigating away and back preserves
  // the conversation (the demo recording script switches between this
  // page and the operator console mid-recording).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setBubbles(JSON.parse(raw) as Bubble[]);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bubbles));
    } catch {
      // ignore
    }
  }, [bubbles, hydrated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [bubbles, typing]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userBubble: Bubble = {
      id: `u-${Date.now()}`,
      side: "user",
      text: trimmed,
      time: nowTime(),
    };
    setBubbles((b) => [...b, userBubble]);
    setInput("");
    setTyping(true);

    try {
      const res = await fetch(`${AGENT_URL}/demo/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          chat_id: CHAT_ID,
          telegram_id: TG_ID,
          first_name: FIRST_NAME,
        }),
      });
      const data = await res.json();
      setTyping(false);

      if (data.response_skipped) {
        // Bot é silenciado pelo handoff — adicionamos bolha "system" sutil
        setBubbles((b) => [
          ...b,
          {
            id: `s-${Date.now()}`,
            side: "bot",
            text: "🔇 Conversa transferida para atendente humano. O bot está em silêncio até retornar.",
            time: nowTime(),
            intent: data.intent,
          },
        ]);
        return;
      }

      const botBubble: Bubble = {
        id: `b-${Date.now()}`,
        side: "bot",
        text: data.response ?? "(sem resposta)",
        time: nowTime(),
        intent: data.intent,
        intent_confidence: data.intent_confidence,
        trace: (data.agent_trace ?? []).map((t: any) => ({
          step: t.step,
          duration_ms: t.duration_ms,
        })),
      };
      setBubbles((b) => [...b, botBubble]);
    } catch (err) {
      setTyping(false);
      setBubbles((b) => [
        ...b,
        {
          id: `e-${Date.now()}`,
          side: "bot",
          text: `Erro: ${(err as Error).message}`,
          time: nowTime(),
        },
      ]);
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#17212B] text-[#e9e9e9] flex font-sans">
      {/* Sidebar — chat list (only one chat for the demo) */}
      <aside className="hidden md:flex w-72 shrink-0 flex-col bg-[#17212B] border-r border-[#0e1621]">
        <div className="px-4 py-3 border-b border-[#0e1621] flex items-center gap-2">
          <button
            type="button"
            className="w-9 h-9 rounded-full hover:bg-white/5 flex items-center justify-center"
            aria-label="Menu"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex-1 px-3 py-1.5 rounded-full bg-[#242F3D] text-sm text-[#7e8a96]">
            Buscar
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto">
          <li className="px-3 py-2.5 bg-[#2B5278] hover:bg-[#2B5278] cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5288c1] to-[#3a679a] flex items-center justify-center font-semibold text-white shrink-0">
                Y
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate">YOUVISA Assistant</p>
                  <span className="text-[11px] text-[#7e8a96] tabular-nums">
                    {nowTime()}
                  </span>
                </div>
                <p className="text-xs text-[#7e8a96] truncate">
                  Olá! Sou o assistente da YOUVISA.
                </p>
              </div>
            </div>
          </li>
        </ul>
      </aside>

      {/* Main chat panel */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-14 px-4 border-b border-[#0e1621] bg-[#17212B] flex items-center gap-3 z-10 shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#5288c1] to-[#3a679a] flex items-center justify-center font-semibold text-white">
            Y
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium leading-none">YOUVISA Assistant</p>
            <p className="text-xs text-[#7e8a96] mt-1">bot · online</p>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2"
          style={{
            background:
              "linear-gradient(180deg, #0E1621 0%, #182028 100%)",
          }}
          data-testid="chat-scroll"
        >
          {bubbles.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="bg-[#182028] border border-[#0e1621] rounded-xl px-6 py-4 max-w-md text-center">
                <p className="text-sm text-[#a8b3bd]">
                  Inicie a conversa enviando uma mensagem.
                </p>
              </div>
            </div>
          )}

          {bubbles.map((b) => (
            <div
              key={b.id}
              className={`flex ${b.side === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`bubble-${b.side}`}
            >
              <div className="max-w-[85%] sm:max-w-md">
                <div
                  className={`px-3 py-2 rounded-2xl shadow-sm leading-snug ${
                    b.side === "user"
                      ? "bg-[#2B5278] text-white rounded-br-md"
                      : "bg-[#182028] text-[#e9e9e9] rounded-bl-md border border-white/5"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{b.text}</p>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    {b.side === "bot" && b.intent && INTENT_BADGE[b.intent] && (
                      <span
                        className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${INTENT_BADGE[b.intent].cls}`}
                      >
                        {INTENT_BADGE[b.intent].label}
                        {b.intent_confidence !== undefined && (
                          <span className="ml-1 opacity-70 normal-case">
                            {Math.round(b.intent_confidence * 100)}%
                          </span>
                        )}
                      </span>
                    )}
                    <span className="text-[10px] text-white/50 tabular-nums">
                      {b.time}
                    </span>
                  </div>
                </div>
                {/* Trace (only for bot messages, when present) */}
                {b.trace && b.trace.length > 0 && (
                  <div className="mt-1 ml-1 flex flex-wrap gap-1">
                    {b.trace.map((t, i) => (
                      <span
                        key={i}
                        className="text-[9px] font-mono text-[#7e8a96] bg-[#182028] border border-white/5 rounded px-1.5 py-0.5 tabular-nums"
                      >
                        {t.step.replace(/-/g, " ")} · {t.duration_ms}ms
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex justify-start" data-testid="typing-indicator">
              <div className="bg-[#182028] border border-white/5 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#5288c1] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-[#5288c1] animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="w-2 h-2 rounded-full bg-[#5288c1] animate-bounce" style={{ animationDelay: "240ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          className="border-t border-[#0e1621] bg-[#17212B] p-3 flex items-center gap-2 shrink-0"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="flex-1 bg-[#242F3D] text-[#e9e9e9] placeholder:text-[#7e8a96] rounded-full px-4 py-2.5 outline-none focus:ring-1 focus:ring-[#5288c1]"
            data-testid="composer-input"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            className="w-10 h-10 rounded-full bg-[#5288c1] hover:bg-[#3a679a] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            aria-label="Enviar"
            data-testid="composer-send"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </main>
    </div>
  );
}
