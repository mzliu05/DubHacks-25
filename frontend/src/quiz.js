import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, Loader2, Undo2, Download } from "lucide-react";

/**
 * Therapy Diagnostic Quiz (single-file React component)
 * ----------------------------------------------------
 * What it is:
 *  - A lightweight, client-side screening quiz to get a general snapshot of how a user is feeling.
 *  - Uses a Likert scale and a few safety check items to surface immediate support guidance.
 *  - Calculates category scores (Mood, Anxiety, Stress, Sleep, Energy) + safety signal.
 *  - Persists progress to localStorage; exports a JSON summary.
 *
 * Important notes:
 *  - This is *not* a medical diagnosis. It's a quick check-in to guide conversations.
 *  - If a user indicates urgent risk, a crisis banner appears with immediate steps.
 *
 * Styling:
 *  - Tailwind classes are used; adjust to your design system if needed.
 *  - Cards, rounded corners, gentle motion.
 */

// --- Utility / Types -------------------------------------------------------
const STORAGE_KEY = "therapy-diagnostic-quiz-v1";

const LIKERT = [
  { label: "Never", value: 0 },
  { label: "Rarely", value: 1 },
  { label: "Sometimes", value: 2 },
  { label: "Often", value: 3 },
  { label: "Nearly every day", value: 4 },
];

const CATEGORY_META = {
  mood: { label: "Mood" },
  anxiety: { label: "Anxiety" },
  stress: { label: "Stress" },
  sleep: { label: "Sleep" },
  energy: { label: "Energy" },
};

// --- Questions -------------------------------------------------------------
// Keep items neutral, brief, and non-diagnostic. Safety items are clearly marked.
const QUESTIONS = [
  // Mood
  { id: "q1", text: "Felt down, sad, or hopeless", category: "mood" },
  { id: "q2", text: "Had little interest or pleasure in doing things", category: "mood" },
  // Anxiety
  { id: "q3", text: "Felt nervous, anxious, or on edge", category: "anxiety" },
  { id: "q4", text: "Noticed excessive worry that's hard to control", category: "anxiety" },
  // Stress
  { id: "q5", text: "Felt stressed or overwhelmed by day-to-day tasks", category: "stress" },
  { id: "q6", text: "Felt irritable or easily frustrated", category: "stress" },
  // Sleep
  { id: "q7", text: "Had trouble falling or staying asleep", category: "sleep" },
  { id: "q8", text: "Woke unrefreshed or tired despite sleeping", category: "sleep" },
  // Energy
  { id: "q9", text: "Had low energy or fatigue", category: "energy" },
  { id: "q10", text: "Found it hard to concentrate or stay focused", category: "energy" },
  // Safety check (worded carefully, single-select severity)
  {
    id: "s1",
    text:
      "Had thoughts that you'd be better off not here, or thoughts of harming yourself",
    category: "safety",
    type: "safety",
    options: [
      { label: "No", value: 0 },
      { label: "Brief thoughts, not now", value: 1 },
      { label: "Yes, currently", value: 2 },
    ],
  },
  {
    id: "s2",
    text: "Felt unsafe where you live or in a relationship",
    category: "safety",
    type: "safety",
    options: [
      { label: "No", value: 0 },
      { label: "Sometimes", value: 1 },
      { label: "Yes", value: 2 },
    ],
  },
];

// --- Helper components -----------------------------------------------------
function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl shadow-sm border border-gray-200 bg-white p-6 ${className}`}>
      {children}
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border px-3 py-1 text-sm">
      {children}
    </span>
  );
}

function Progress({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div>
      <div className="flex justify-between mb-1 text-sm text-gray-600">
        <span>Progress</span>
        <span>{current}/{total}</span>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gray-800"
          style={{ width: `${pct}%` }}
          aria-label={`Progress ${pct}%`}
        />
      </div>
    </div>
  );
}

// --- Main Component --------------------------------------------------------
export default function TherapyDiagnosticQuiz({
  title = "How are you feeling today?",
  onComplete,
}) {
  const [answers, setAnswers] = useState(() =>
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
  );
  const [index, setIndex] = useState(() => Number(localStorage.getItem(`${STORAGE_KEY}-index`) || 0));
  const [notes, setNotes] = useState(() => localStorage.getItem(`${STORAGE_KEY}-notes`) || "");
  const total = QUESTIONS.length;
  const currentQ = QUESTIONS[index];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-index", String(index));
  }, [index]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-notes`, notes);
  }, [notes]);

  const { categories, safety } = useMemo(() => summarize(answers), [answers]);
  const allAnswered = useMemo(() => QUESTIONS.every(q => answers[q.id] !== undefined), [answers]);

  const safetyUrgent = safety.selfHarm >= 2 || safety.personalSafety >= 2;
  const safetyConcern = !safetyUrgent && (safety.selfHarm === 1 || safety.personalSafety === 1);

  function setAnswer(id, value) {
    setAnswers(prev => ({ ...prev, [id]: value }));
  }

  function resetAll() {
    setAnswers({});
    setIndex(0);
    setNotes("");
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}-index`);
    localStorage.removeItem(`${STORAGE_KEY}-notes`);
  }

  function handleExport() {
    const payload = buildExportPayload({ answers, categories, safety, notes });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagnostic-quiz-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-gray-600 mt-2 text-sm">
          This short check-in helps you reflect on mood, anxiety, stress, sleep, and energy over the last 2 weeks.
          It's not a diagnosis and isn't a substitute for professional care.
        </p>
      </header>

      {safetyUrgent && (
        <Card className="border-red-300 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1" />
            <div>
              <h2 className="font-medium">You matter. If you're in immediate danger, get help now.</h2>
              <ul className="list-disc ml-5 text-sm text-gray-800 mt-2 space-y-1">
                <li>Call your local emergency number (e.g., 911 in the U.S.).</li>
                <li>Contact a crisis line (e.g., 988 Lifeline in the U.S.).</li>
                <li>If you can, go to a safe place or reach out to someone you trust.</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6">
        <Card>
          <div className="flex items-center justify-between gap-4 mb-4">
            <Progress current={Math.min(index + 1, total)} total={total} />
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm disabled:opacity-40"
                onClick={resetAll}
              >
                <Undo2 size={16} /> Reset
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
                onClick={handleExport}
              >
                <Download size={16} /> Export
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  {currentQ.category === "safety"
                    ? "Safety check"
                    : CATEGORY_META[currentQ.category]?.label || "General"}
                </div>
                <h2 className="text-lg font-medium">{currentQ.text}</h2>
              </div>

              {currentQ.type === "safety" ? (
                <div className="grid sm:grid-cols-3 gap-2">
                  {currentQ.options.map(opt => (
                    <button
                      key={opt.value}
                      className={`rounded-xl border px-3 py-2 text-left ${
                        answers[currentQ.id] === opt.value
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => setAnswer(currentQ.id, opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid sm:grid-cols-5 gap-2">
                  {LIKERT.map(opt => (
                    <button
                      key={opt.value}
                      className={`rounded-xl border px-3 py-2 text-left ${
                        answers[currentQ.id] === opt.value
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => setAnswer(currentQ.id, opt.value)}
                    >
                      <div className="text-sm font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  className="rounded-xl border px-4 py-2 text-sm disabled:opacity-40"
                  onClick={() => setIndex(i => Math.max(0, i - 1))}
                  disabled={index === 0}
                >
                  Back
                </button>
                {index < total - 1 ? (
                  <button
                    className="rounded-xl bg-gray-900 text-white px-4 py-2 text-sm disabled:opacity-40"
                    onClick={() => setIndex(i => Math.min(total - 1, i + 1))}
                    disabled={answers[currentQ.id] === undefined}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    className="rounded-xl bg-gray-900 text-white px-4 py-2 text-sm disabled:opacity-40"
                    onClick={() => {
                      if (!allAnswered) return;
                      if (typeof onComplete === "function") {
                        const payload = buildExportPayload({ answers, categories, safety, notes });
                        onComplete(payload);
                      }
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={!allAnswered}
                  >
                    Finish
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Your snapshot</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(categories).map(([key, value]) => (
              <div key={key} className="rounded-xl border p-4">
                <div className="text-sm text-gray-600">{CATEGORY_META[key]?.label || key}</div>
                <div className="flex items-end justify-between mt-2">
                  <div className="text-2xl font-semibold">{value.total}</div>
                  <Pill>{bandLabel(value.band)}</Pill>
                </div>
                <div className="text-xs text-gray-500 mt-2">{value.details}</div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            {safetyUrgent ? (
              <p className="text-sm text-red-700">
                We flagged urgent safety concerns. Please use the steps above to get support now.
              </p>
            ) : safetyConcern ? (
              <p className="text-sm text-amber-700">
                We noticed some safety concerns. Consider reaching out to a trusted person or professional.
              </p>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 size={16} />
                <span>No immediate safety concerns based on responses.</span>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-2">Anything else you'd like to note?</h3>
          <textarea
            className="w-full rounded-xl border p-3 min-h-[120px]"
            placeholder="Add context (e.g., big changes, supports, patterns)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-2">
            This information stays on your device unless you choose to export it.
          </p>
        </Card>

        <footer className="text-xs text-gray-500 leading-relaxed">
          <p><strong>Friendly disclaimer:</strong> This tool provides a general well-being snapshot. It does not diagnose, treat, or replace care from a licensed professional. If you're worried about your safety, contact local emergency services or a crisis line (e.g., 988 in the U.S.).</p>
        </footer>
      </div>
    </div>
  );
}

// --- Scoring & Summary -----------------------------------------------------
function summarize(answers) {
  const init = { mood: 0, anxiety: 0, stress: 0, sleep: 0, energy: 0 };
  const counts = { ...init };

  for (const q of QUESTIONS) {
    const v = answers[q.id];
    if (v === undefined) continue;
    if (q.category in counts) counts[q.category] += Number(v) || 0;
  }

  // Basic banding heuristic by category (0-8 = Low, 9-14 = Moderate, >=15 = High)
  const categories = Object.fromEntries(
    Object.entries(counts).map(([k, total]) => [
      k,
      {
        total,
        band: total >= 15 ? "high" : total >= 9 ? "moderate" : "low",
        details:
          total >= 15
            ? "Signals suggest this area may be strongly impacting day-to-day life."
            : total >= 9
            ? "Some challenges present—consider strategies or supports."
            : "Generally manageable based on current answers.",
      },
    ])
  );

  const safety = {
    selfHarm: Number(answers.s1 ?? 0),
    personalSafety: Number(answers.s2 ?? 0),
  };

  return { categories, safety };
}

function bandLabel(band) {
  switch (band) {
    case "high":
      return "High";
    case "moderate":
      return "Moderate";
    default:
      return "Low";
  }
}

function buildExportPayload({ answers, categories, safety, notes }) {
  return {
    tool: "Therapy Diagnostic Quiz",
    version: 1,
    timestamp: new Date().toISOString(),
    answers,
    summary: { categories, safety },
    notes,
  };
}
