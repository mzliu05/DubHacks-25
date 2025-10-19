import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { useGemini } from "./gemini.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Allow frontend to access backend
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      "file://"
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  })
);
app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ status: "Tranquility backend is running", timestamp: new Date() });
});

// Main chat endpoint - calls Gemini AI
app.post("/api/chat", async (req, res) => {
  try {
    console.log("[API] POST /api/chat received:", req.body);
    
    const { message } = req.body || {};
    
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' string in request body" });
    }

    // Call Gemini AI
    const { text, mood, rageMeter } = await useGemini(message);

    if (!text) {
      return res.status(502).json({ error: "Empty response from Gemini AI" });
    }

    // Return AI response to frontend
    res.json({ 
      reply: text,
      mood: mood,
      intensity: rageMeter
    });
    
  } catch (err) {
    console.error("[API] Error:", err);
    res.status(500).json({ error: "Server error processing your request" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Tranquility Backend running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/chat`);
});