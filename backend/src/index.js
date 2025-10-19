// backend/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { useGemini } from "./gemini.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json());

// Handles frontend API calls
app.post("/api/chat", async (req, res) => {
  try {
    console.log("POST /api/chat body:", req.body);
    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' string" });
    }

    const { text, mood, rageMeter } = await useGemini(message); // ✅ CALLING GEMINI HERE!!!!!

    if (!text) {
      return res.status(502).json({ error: "Empty response from Gemini" });
    }

    res.json({ reply: text, mood: mood, rageMeter: rageMeter });
  } catch (err) {
    console.error("Gemini error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
