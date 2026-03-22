"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface CopilotContext {
  page: string;
  experiment?: Record<string, unknown>;
  results?: Record<string, unknown>;
  designQuality?: string;
}

interface CopilotState {
  isOpen: boolean;
  messages: ChatMessage[];
  isStreaming: boolean;
  context: CopilotContext;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  sendMessage: (content: string) => Promise<void>;
  setContext: (ctx: Partial<CopilotContext>) => void;
  clearMessages: () => void;
}

const CopilotCtx = createContext<CopilotState | null>(null);

export function useCopilot() {
  const ctx = useContext(CopilotCtx);
  if (!ctx) throw new Error("useCopilot must be used within CopilotProvider");
  return ctx;
}

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [context, setContextState] = useState<CopilotContext>({ page: "" });
  const abortRef = useRef<AbortController | null>(null);

  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);
  const setOpen = useCallback((open: boolean) => setIsOpen(open), []);

  const setContext = useCallback((ctx: Partial<CopilotContext>) => {
    setContextState((prev) => ({ ...prev, ...ctx }));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (isStreaming) return;

      // Add user message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);

      // Create placeholder assistant message
      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages([...updatedMessages, assistantMsg]);
      setIsStreaming(true);

      // Abort previous if still going
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Get auth token
        const supabase = createClient();
        const { data: refreshData } = await supabase.auth.refreshSession();
        let accessToken = refreshData.session?.access_token || "";
        if (!accessToken) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          accessToken = session?.access_token || "";
        }

        if (!accessToken) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "Please sign in to use the AI copilot." }
                : m
            )
          );
          setIsStreaming(false);
          return;
        }

        // Build API messages (just role + content for Claude)
        const apiMessages = updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000"}/api/copilot/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              messages: apiMessages,
              context,
            }),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              const { event, data } = parsed;

              if (event === "text") {
                accumulated += data.text;
                const text = accumulated;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: text } : m
                  )
                );
              } else if (event === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: data.message || "Something went wrong." }
                      : m
                  )
                );
              }
            } catch {
              // skip
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    "Sorry, I couldn't connect to the AI service. Please try again.",
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming, context]
  );

  return (
    <CopilotCtx.Provider
      value={{
        isOpen,
        messages,
        isStreaming,
        context,
        toggleOpen,
        setOpen,
        sendMessage,
        setContext,
        clearMessages,
      }}
    >
      {children}
    </CopilotCtx.Provider>
  );
}
