// pages/ChatPage.tsx
import { useState } from "react";
import { produce } from "immer";
import { ChatMessage, ChatOutput } from "../components/chat-output";
import { ChatBox } from "../components/chatbox";
import { generateUID } from "../utils/generateUID";

type ApiResponse = {
  reply?: string;
  text?: string;
  mood?: string;
  rageMeter?: number; // 0..100
};

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSend(text: string): Promise<ApiResponse> {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    if (!res.ok) {
      let detail = "";
      try {
        detail = (await res.json())?.error ?? "";
      } catch {}
      throw new Error(detail || `Request failed: ${res.status}`);
    }

    const data = (await res.json()) as ApiResponse;
    if (!data.reply && !data.text) {
      throw new Error("Malformed response (missing reply/text)");
    }
    return data;
  }

  async function handleSubmit(text: string) {
    if (locked) return;
    setError(null);
    setLocked(true);

    // user message
    setMessages((m) =>
      produce(m, (d) => {
        d.push({ id: generateUID(), role: "user", text });
      })
    );

    try {
      const { reply, text: t, mood, rageMeter } = await onSend(text);
      const display = (reply ?? t ?? "").toString();

      // assistant message with rage/mood metadata
      setMessages((m) =>
        produce(m, (d) => {
          d.push({
            id: generateUID(),
            role: "assistant",
            text: display,
            rage:
              typeof rageMeter === "number"
                ? Math.max(0, Math.min(100, Math.round(rageMeter)))
                : undefined,
            mood,
          });
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLocked(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-3 py-4">
        <h1 className="text-xl font-semibold mb-2">Chat</h1>

        <ChatOutput
          messages={messages}
          locked={locked}
          error={error}
          onDismissError={() => setError(null)}
        />

        <ChatBox locked={locked} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
