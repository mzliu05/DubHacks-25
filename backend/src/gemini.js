import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const AI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-2.5-flash";

export async function useGemini(prompt) {
  const response = await AI.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  const text = response.text;
  return { text, raw: response };
}
