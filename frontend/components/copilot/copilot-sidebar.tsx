"use client";

import { useState, useRef, useEffect } from "react";
import { useCopilot } from "./copilot-provider";

export function CopilotSidebar() {
  const {
    isOpen,
    messages,
    isStreaming,
    toggleOpen,
    sendMessage,
  } = useCopilot();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    await sendMessage(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="fixed right-6 bottom-6 z-50 h-11 px-4 rounded-full bg-[#0B1D2E] text-[#F8F6F1] shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
          aria-label="Open AI Copilot"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a7 7 0 0 1 7 7c0 3-1.5 5.5-4 7v2H9v-2c-2.5-1.5-4-4-4-7a7 7 0 0 1 7-7z" />
            <path d="M9 22h6" />
            <path d="M10 18h4" />
          </svg>
          <span className="text-sm font-medium">AI Copilot</span>
        </button>
      )}

      {/* Sidebar panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-[360px] bg-white border-l border-[rgba(0,0,0,0.08)] shadow-[-4px_0_24px_rgba(0,0,0,0.04)] z-50 flex flex-col transition-transform duration-250 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7A9E7E]" />
            <span className="text-sm font-semibold text-[#0B1D2E]">
              AI Copilot
            </span>
          </div>
          <button
            onClick={toggleOpen}
            className="text-[#8A8880] hover:text-[#0B1D2E] transition-colors p-1"
            aria-label="Close copilot"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <div className="w-10 h-10 rounded-full bg-[#E8F0E8] flex items-center justify-center mx-auto">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3D6B42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 0 1 7 7c0 3-1.5 5.5-4 7v2H9v-2c-2.5-1.5-4-4-7a7 7 0 0 1 7-7z" />
                  <path d="M9 22h6" />
                  <path d="M10 18h4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[#0B1D2E]">
                  LiftProof AI Copilot
                </p>
                <p className="text-xs text-[#8A8880] mt-1">
                  Ask me anything about your experiment, results, or methodology.
                </p>
              </div>
              <div className="space-y-2 pt-2">
                {[
                  "How should I pick treatment geos?",
                  "What does p-value mean?",
                  "Is my test well-powered?",
                  "Explain synthetic control simply",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-[#F8F6F1] text-[#5C5B56] hover:bg-[#EDE9E0] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#0B1D2E] text-white"
                    : "bg-[#F8F6F1] text-[#1A1A18]"
                }`}
              >
                {msg.role === "assistant" && !msg.content && isStreaming ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8A8880] animate-pulse" />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[#8A8880] animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[#8A8880] animate-pulse"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                ) : (
                  <MessageContent content={msg.content} />
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-3 border-t border-[rgba(0,0,0,0.08)]">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your experiment..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-sm placeholder:text-[#8A8880] focus:outline-none focus:border-[#7A9E7E] focus:ring-1 focus:ring-[#7A9E7E]/20"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="shrink-0 w-9 h-9 rounded-lg bg-[#0B1D2E] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#132D44] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

/**
 * Renders assistant message content with basic markdown-like formatting.
 */
function MessageContent({ content }: { content: string }) {
  // Split into paragraphs
  const paragraphs = content.split("\n\n").filter(Boolean);

  return (
    <div className="space-y-2">
      {paragraphs.map((p, i) => {
        // Check for bullet points
        if (p.includes("\n- ") || p.startsWith("- ")) {
          const lines = p.split("\n");
          return (
            <div key={i} className="space-y-1">
              {lines.map((line, j) => {
                if (line.startsWith("- ")) {
                  return (
                    <div key={j} className="flex gap-2 pl-1">
                      <span className="text-[#7A9E7E] shrink-0 mt-0.5">•</span>
                      <span>{formatInlineMarkdown(line.slice(2))}</span>
                    </div>
                  );
                }
                return <p key={j}>{formatInlineMarkdown(line)}</p>;
              })}
            </div>
          );
        }

        // Check for numbered lists
        if (/^\d+\.\s/.test(p)) {
          const lines = p.split("\n");
          return (
            <div key={i} className="space-y-1">
              {lines.map((line, j) => (
                <p key={j}>{formatInlineMarkdown(line)}</p>
              ))}
            </div>
          );
        }

        // Regular paragraph
        return <p key={i}>{formatInlineMarkdown(p)}</p>;
      })}
    </div>
  );
}

/**
 * Simple inline markdown: **bold** and `code`
 */
function formatInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Code
    const codeMatch = remaining.match(/`(.+?)`/);

    // Find the earliest match
    let earliest: { type: string; match: RegExpMatchArray } | null = null;
    if (boldMatch?.index !== undefined) {
      earliest = { type: "bold", match: boldMatch };
    }
    if (codeMatch?.index !== undefined) {
      if (!earliest || codeMatch.index < (earliest.match.index ?? Infinity)) {
        earliest = { type: "code", match: codeMatch };
      }
    }

    if (!earliest || earliest.match.index === undefined) {
      parts.push(remaining);
      break;
    }

    // Text before match
    if (earliest.match.index > 0) {
      parts.push(remaining.slice(0, earliest.match.index));
    }

    if (earliest.type === "bold") {
      parts.push(
        <strong key={key++} className="font-semibold">
          {earliest.match[1]}
        </strong>
      );
    } else {
      parts.push(
        <code
          key={key++}
          className="bg-[#EDE9E0] text-[#0B1D2E] px-1 py-0.5 rounded text-[12px] font-mono"
        >
          {earliest.match[1]}
        </code>
      );
    }

    remaining = remaining.slice(
      earliest.match.index + earliest.match[0].length
    );
  }

  return <>{parts}</>;
}
