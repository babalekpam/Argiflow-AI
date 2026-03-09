import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export function AriaWidget({ position = "bottom-right" }: { position?: "bottom-right" | "bottom-left" }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [pulse, setPulse] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/chatbot/greeting")
      .then((r) => r.json())
      .then((d) => setGreeting(d.greeting || "Hi! I'm Aria, ArgiFlow's AI. How can I help?"))
      .catch(() => setGreeting("Hi! I'm Aria, ArgiFlow's AI. How can I help?"));
    const t = setTimeout(() => setPulse(false), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open && messages.length === 0 && greeting) {
      setMessages([{ role: "assistant", content: greeting, ts: Date.now() }]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, greeting]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const newMsg: Message = { role: "user", content: text, ts: Date.now() };
    const updated = [...messages, newMsg];
    setMessages(updated);
    setLoading(true);

    try {
      const res = await fetch("/api/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "Sorry, I had a hiccup. Try again!",
          ts: Date.now(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection issue. You can reach us at partnerships@argilette.co",
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const positionClasses =
    position === "bottom-left" ? "left-6" : "right-6";

  return (
    <>
      {open && (
        <div
          data-testid="aria-chat-window"
          className={`fixed bottom-24 ${positionClasses} z-[9999] w-[360px] h-[520px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col border border-sky-200/30 dark:border-sky-500/20 animate-in fade-in slide-in-from-bottom-4 duration-300`}
        >
          <div className="px-4 py-3 rounded-t-2xl bg-gradient-to-r from-sky-500 to-violet-500 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold shrink-0">
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">Aria</div>
              <div className="text-[11px] text-white/75">ArgiFlow AI &middot; Online</div>
            </div>
            <button
              data-testid="aria-close"
              onClick={() => setOpen(false)}
              className="bg-white/20 hover:bg-white/30 border-none rounded-lg text-white cursor-pointer p-1.5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center text-[10px] text-white mr-2 mt-0.5 shrink-0">
                    A
                  </div>
                )}
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-sky-500 text-white rounded-2xl rounded-br-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center text-[10px] text-white mr-2 mt-0.5 shrink-0">
                  A
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                data-testid="aria-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-sky-400 transition-colors"
              />
              <button
                data-testid="aria-send"
                onClick={send}
                disabled={!input.trim() || loading}
                className="px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="text-center mt-2 text-[10px] text-gray-400">
              Powered by ArgiFlow AI
            </div>
          </div>
        </div>
      )}

      <button
        data-testid="aria-toggle"
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 ${positionClasses} z-[9998] w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 shadow-lg hover:shadow-xl flex items-center justify-center text-white cursor-pointer border-none transition-all hover:scale-105 ${
          pulse ? "animate-pulse" : ""
        }`}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageSquare className="h-6 w-6" />
        )}
      </button>
    </>
  );
}
