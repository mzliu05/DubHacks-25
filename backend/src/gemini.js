import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config("./.env");

const AI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-2.5-flash";

const COMPREHENSIVE_SCHEMA = {
  type: "OBJECT",
  properties: {
    text: {
      type: "STRING",
      description:
        "A helpful, conversational, and direct response to the user's prompt.",
    },
    mood: {
      type: "OBJECT",
      properties: {
        mood: {
          type: "STRING",
          description:
            "A single word or short phrase describing the user's detected emotion, e.g., 'Calm', 'Frustrated', 'Excited', 'Confused'.",
        },
        rageMeter: {
          type: "INTEGER",
          description:
            "A numerical score from 1 (Totally Relaxed) to 10 (Maximum Rage) indicating the intensity of negative emotion. Use 1-3 for positive/neutral moods, 4-7 for mild frustration/anxiety, and 8-10 for intense anger/rage.",
        },
      },
      required: ["mood", "rageMeter"],
    },
  },
  required: ["text", "mood"], // Ensure both fields are always present
};

const SYSTEM_INSTRUCTION =
  "You are a friendly and helpful AI assistant. Your primary task is to provide a concise and useful conversational response to the user's query. Your secondary task is to analyze the user's message tone and sentiment to detect their current mood and assign a 'Rage Meter' score from 1 to 10. You must return ONLY a single JSON object that contains the conversational response and the mood analysis, strictly adhering to the provided schema. Do not output any conversational text or markdown outside the JSON structure.";

export async function useGemini(prompt) {
  try {
    const response = await AI.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: COMPREHENSIVE_SCHEMA,
      },
    });

    const rawJsonText = response.text;
    const parsedData = JSON.parse(rawJsonText);
    const text = parsedData.text;
    const moodText = parsedData.mood.mood;
    const rageMeter = parsedData.mood.rageMeter;

    console.log(rageMeter);
    console.log(text);
    console.log(moodText);

    return { text, rageMeter, mood: moodText, raw: response };
  } catch (error) {
    console.error("Gemini API Error during mood detection:", error);
    return {
      text: "I encountered an error while processing your request.",
      rageMeter: 0,
      mood: "Error",
      raw: error,
    };
  }
}
