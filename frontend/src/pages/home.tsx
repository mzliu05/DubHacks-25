export function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-3xl font-bold">Welcome</h1>
        <p className="mt-2 text-slate-600">
          This is your home page. Head to the chat to start a conversation.
        </p>

        <a
          href="/chat"
          className="inline-block mt-6 rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          Go to Chat
        </a>
      </div>
    </main>
  );
}
