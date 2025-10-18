import { useState } from "react";
import { produce } from "immer";
import { ChatMessage, ChatOutput } from "../components/chat-output";
import { ChatBox } from "../components/chatbox";
import { generateUID } from "../utils/generateUID";

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Example API call — replace with your real endpoint if needed
  async function onSend(text: string): Promise<string> {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = (await res.json()) as { reply?: string };
    if (!data?.reply) throw new Error("Malformed response");
    return data.reply;
  }

  async function handleSubmit(text: string) {
    if (locked) return;
    setError(null);
    setLocked(true);

    // add user message
    setMessages((m) =>
      produce(m, (d) => {
        d.push({ id: generateUID(), role: "user", text });
      })
    );

    try {
      const reply = await onSend(text);
      setMessages((m) =>
        produce(m, (d) => {
          d.push({ id: generateUID(), role: "assistant", text: reply });
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

        {/* Output */}
        <ChatOutput
          messages={messages}
          locked={locked}
          error={error}
          onDismissError={() => setError(null)}
        />

        {/* Input */}
        <ChatBox locked={locked} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
