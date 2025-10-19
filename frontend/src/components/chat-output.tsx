import type { FC } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

export type Role = "user" | "assistant";
export type ChatMessage = {
  id: string;
  role: Role;
  text: string;
  rage?: number;  // 0..10
  mood?: string;
};

type ChatOutputProps = {
  messages: ChatMessage[];
  locked: boolean;
  error: string | null;
  onDismissError: () => void;
};

// Map 0..10 rage -> hue 210..0 (blue -> red)
function rageToStyles(rage?: number) {
  if (typeof rage !== "number" || isNaN(rage)) return {};
  const clamped = Math.max(0, Math.min(10, Math.round(rage)));
  const hue = 210 - (210 * clamped) / 10; // 0 => 210 blue, 10 => 0 red
  // softer saturation/lightness for readability
  const bg = `hsl(${hue} 85% 50%)`;
  const fg = clamped >= 4 ? "#ffffff" : "#0f172a"; // white text when hotter
  return { backgroundColor: bg, color: fg };
}

export const ChatOutput: FC<ChatOutputProps> = ({
  messages,
  locked,
  error,
  onDismissError,
}) => {
  return (
    <div className="flex flex-col w-full max-w-lg mx-auto mt-8 border rounded-2xl shadow bg-white p-4">
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[300px]">
        {messages.length === 0 ? (
          <p className="text-slate-500 text-center italic">Start chatting below 👇</p>
        ) : (
          messages.map((m) => {
            const isUser = m.role === "user";
            const assistantStyle = rageToStyles(m.rage);
            return (
              <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className="relative max-w-[80%]">
                  {/* mood badge for assistant */}
                  {!isUser && m.mood && (
                    <span
                      className="absolute -top-2 left-2 z-10 rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white backdrop-blur-sm"
                      title={`Mood: ${m.mood}${typeof m.rage === "number" ? ` • Rage: ${m.rage}/10` : ""}`}
                    >
                      {m.mood}
                    </span>
                  )}

                  <div
                    className={`px-3 py-2 rounded-xl break-words overflow-hidden prose prose-sm ${
                      isUser ? "bg-indigo-100 text-slate-900" : ""
                    }`}
                    style={isUser ? undefined : assistantStyle}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw, rehypeSanitize]}
                      components={{
                        a({ children, ...props }) {
                          return (
                            <a
                              {...props}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 underline hover:opacity-80"
                            >
                              {children}
                            </a>
                          );
                        },
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {(locked || error) && (
        <div className="mt-2 mb-1 flex items-center gap-2 text-sm">
          {locked && (
            <>
              <span className="inline-block h-3 w-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
              <span className="text-slate-600">Locked — sending…</span>
            </>
          )}
          {error && (
            <span className="text-red-600">
              {error}{" "}
              <button type="button" className="underline" onClick={onDismissError}>
                dismiss
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
