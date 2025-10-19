import type { FC } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

export type Role = "user" | "assistant";
export type ChatMessage = { id: string; role: Role; text: string };

type ChatOutputProps = {
  messages: ChatMessage[];
  locked: boolean;
  error: string | null;
  onDismissError: () => void;
};

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
          <p className="text-slate-500 text-center italic">
            Start chatting below 👇
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`px-3 py-2 rounded-xl max-w-[80%] break-words overflow-hidden prose prose-sm ${
                m.role === "user"
                  ? "self-end bg-indigo-100 text-slate-900"
                  : "self-start bg-slate-100 text-slate-900"
              }`}
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
                        className="text-blue-600 underline hover:opacity-80"
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
          ))
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
              <button
                type="button"
                className="underline"
                onClick={onDismissError}
              >
                dismiss
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
