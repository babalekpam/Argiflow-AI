import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Send, User, X, Trash2, MessageCircle, Sparkles } from "lucide-react";
import type { AiChatMessage } from "@shared/schema";

function formatChatMarkdown(text: string): string {
  const escapeHtml = (str: string): string =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const lines = text.split("\n");
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("### ")) {
      if (inList) { result.push("</ul>"); inList = false; }
      const heading = escapeHtml(trimmed.slice(4));
      result.push(`<p class="font-semibold text-foreground mt-2 mb-0.5">${heading}</p>`);
    } else if (trimmed.startsWith("## ")) {
      if (inList) { result.push("</ul>"); inList = false; }
      const heading = escapeHtml(trimmed.slice(3));
      result.push(`<p class="font-semibold text-foreground mt-2 mb-0.5">${heading}</p>`);
    } else if (trimmed.startsWith("# ")) {
      if (inList) { result.push("</ul>"); inList = false; }
      const heading = escapeHtml(trimmed.slice(2));
      result.push(`<p class="font-bold text-foreground mt-2 mb-0.5">${heading}</p>`);
    } else if (/^[-*]\s/.test(trimmed)) {
      if (!inList) { result.push('<ul class="space-y-0.5 my-1 ml-2">'); inList = true; }
      const item = escapeHtml(trimmed.replace(/^[-*]\s+/, ""));
      result.push(`<li class="flex items-start gap-1.5"><span class="text-primary mt-0.5 shrink-0">&bull;</span><span>${applyInline(item)}</span></li>`);
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (!inList) { result.push('<ul class="space-y-0.5 my-1 ml-2">'); inList = true; }
      const num = trimmed.match(/^(\d+)\./)?.[1] || "1";
      const item = escapeHtml(trimmed.replace(/^\d+\.\s+/, ""));
      result.push(`<li class="flex items-start gap-1.5"><span class="text-primary font-medium shrink-0">${num}.</span><span>${applyInline(item)}</span></li>`);
    } else if (trimmed === "") {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push('<div class="h-1.5"></div>');
    } else {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(`<p>${applyInline(escapeHtml(trimmed))}</p>`);
    }
  }
  if (inList) result.push("</ul>");
  return result.join("");
}

function applyInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-[10px]">$1</code>');
}

export function AiChatDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages } = useQuery<AiChatMessage[]>({
    queryKey: ["/api/chat/messages"],
    enabled: isOpen,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/chat/messages", { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setMessage("");
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/chat/messages");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || sendMutation.isPending) return;
    sendMutation.mutate(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25 transition-transform hover:scale-105"
        data-testid="button-ai-chat-toggle"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-3rem)] bg-card border border-border rounded-md shadow-xl flex flex-col"
          style={{ height: "520px" }}
          data-testid="ai-chat-dialog"
        >
          <div className="flex items-center justify-between gap-2 p-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">ArgiFlow AI</p>
                <p className="text-[10px] text-emerald-400 font-medium">Powered by Anthropic Claude</p>
              </div>
            </div>
            {messages && messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => clearMutation.mutate()}
                disabled={clearMutation.isPending}
                data-testid="button-dialog-clear-chat"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-3">
            {messages && messages.length > 0 ? (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarFallback className={msg.role === "user" ? "bg-primary/10 text-primary text-xs" : "bg-chart-3/10 text-chart-3 text-xs"}>
                        {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[85%] rounded-md p-2.5 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary/10 text-foreground whitespace-pre-wrap"
                          : "bg-secondary/50 text-muted-foreground"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div
                          className="chat-markdown"
                          dangerouslySetInnerHTML={{ __html: formatChatMarkdown(msg.content) }}
                        />
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {sendMutation.isPending && (
                  <div className="flex gap-2">
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarFallback className="bg-chart-3/10 text-chart-3 text-xs">
                        <Bot className="w-3.5 h-3.5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="max-w-[85%] rounded-md p-2.5 bg-secondary/50 text-foreground">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                        <span className="text-[10px] text-muted-foreground">Thinking...</span>
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-semibold mb-1">ArgiFlow AI Strategist</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Your AI-powered business advisor. Ask me anything about lead generation, marketing strategy, or automation.
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {["Generate leads", "Marketing strategy", "Book appointments"].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setMessage(s); }}
                      className="text-[10px] px-2 py-1 rounded-md bg-primary/5 text-primary border border-primary/10 transition-colors"
                      data-testid={`button-quick-${s.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-border/50">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your AI strategist..."
                disabled={sendMutation.isPending}
                className="text-sm"
                data-testid="input-dialog-chat-message"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!message.trim() || sendMutation.isPending}
                data-testid="button-dialog-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
