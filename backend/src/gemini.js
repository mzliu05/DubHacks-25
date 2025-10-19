import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Assuming GEMINI_API_KEY is in your .env file
const AI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-2.5-flash";

export async function useGemini(prompt) {
  // Correct: use AI.generateContent()
  const response = await AI.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  // Correct: access the text simply with .text
  const text = response.text;

  // Returning the text and the raw response object
  return { text, raw: response };
}