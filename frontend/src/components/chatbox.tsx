import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  type FormEvent,
} from "react";

type ChatBoxProps = {
  locked: boolean;
  onSubmit: (text: string) => void | Promise<void>;
};

export type ChatBoxHandle = {
  /** Optional: parent can focus the textarea, etc. */
  focus: () => void;
  /** Optional: parent can clear input if needed */
  clear: () => void;
};

export const ChatBox = forwardRef<ChatBoxHandle, ChatBoxProps>(
  ({ locked, onSubmit }, ref) => {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      clear: () => setInput(""),
    }));

    // Auto-resize
    useEffect(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "0px";
      el.style.height = `${el.scrollHeight}px`;
    }, [input]);

    async function handleSend(e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      const text = input.trim();
      if (!text || locked) return;
      await onSubmit(text);
      setInput("");
    }

    return (
      <form onSubmit={handleSend} className="max-w-lg mx-auto mt-2 flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={locked ? "Locked…" : "Type anything here"}
          rows={1}
          disabled={locked}
          className="flex-1 resize-none overflow-hidden px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
          style={{ minHeight: "40px", maxHeight: "200px" }}
        />
        <button
          type="submit"
          disabled={locked}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    );
  }
);
