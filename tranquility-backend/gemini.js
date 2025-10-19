import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const MODEL = "gemini-2.5-flash"; // or "gemini-1.5-pro" for more complex replies

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define schema and system instruction
const COMPREHENSIVE_SCHEMA = {
  type: "object",
  properties: {
    text: {
      type: "string",
      description:
        "A helpful, compassionate, and conversational response crafted to comfort and gently support the user.",
    },
    mood: {
      type: "object",
      properties: {
        mood: {
          type: "string",
          description:
            "A short phrase describing the user's emotional tone, e.g., 'Calm', 'Anxious', 'Sad', 'Overwhelmed'.",
        },
        rageMeter: {
          type: "integer",
          description:
            "A score from 1 (very calm) to 10 (intense distress). Use low numbers for positive/neutral tones and high for strong negative feelings.",
        },
      },
      required: ["mood", "rageMeter"],
    },
  },
  required: ["text", "mood"],
};

const SYSTEM_INSTRUCTION = `
You are Tranquility, a warm mental health AI companion.
Your main job:
  1. Offer empathetic, validating, and gentle responses.
  2. Reflect emotional understanding and emotional safety.
  3. Include short, actionable comfort or insight when fitting.
  4. Be concise — 2–3 sentences per response.
  5. Detect emotional tone + intensity and return as JSON per the schema.
If a message expresses crisis (suicide, harm), convey immediate empathy and concern.
Output ONLY raw JSON matching the schema — no markdown, preambles, or explanations.
`;

// Modern SDK-compatible implementation
export async function useGemini(prompt) {
  try {
    // Create a generative model instance
    const model = genAI.getGenerativeModel({ model: MODEL });

    // Ask Gemini to respond based on the prompt
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_INSTRUCTION },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: COMPREHENSIVE_SCHEMA,
      },
    });

    // Extract JSON text from Gemini output
    const rawJsonText = result.response.text();

    // Parse and extract structured data
    const parsedData = JSON.parse(rawJsonText);
    const text = parsedData.text;
    const moodText = parsedData.mood.mood;
    const rageMeter = parsedData.mood.rageMeter;

    console.log(`[Gemini] Mood: ${moodText}, Rage: ${rageMeter}`);
    console.log(`[Gemini] Response: ${text}`);

    return { text, rageMeter, mood: moodText, raw: result };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      text:
        "I'm here with you, though something went wrong with my response. Let's try again in a moment.",
      rageMeter: 0,
      mood: "Error",
      raw: error,
    };
  }
}
