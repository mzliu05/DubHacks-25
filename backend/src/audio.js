// This file is designed to run in a Node.js environment and acts as a backend service.
// It uses the standard global `fetch` (available in modern Node.js versions)
// to communicate with the Gemini API, keeping the API key secure on the server side.

// --- Configuration and Constants ---

// In a real application, the API key would be loaded securely from environment variables.
const apiKey = ""; 
const API_MODEL = 'gemini-2.5-flash-preview-09-2025';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL}:generateContent?key=${apiKey}`;

const SYSTEM_PROMPT = `
You are a therapy AI bot, that gives advice to people regarding their mental health problems.
Persona: You are professional but gentle.
Disclaimer: Make sure to remind your users that you do not provide actual medical advice and direct them to seek help from a licensed source on a regular basis in case they forget.
`;

const PROMPT_1_VOICE_ANALYSIS = 'Give an analysis of the general emotional state of the person from the sound of the voice, not the content.';
const PROMPT_2_COMPREHENSIVE_ADVICE = 'Give a general emotional outline based on the text of the audio clip and the previous emotional analysis, then provide actionable, gentle advice.';


/**
 * Performs the two-turn audio analysis using the Gemini API.
 * @param {string} base64Audio - The base64 encoded audio data (e.g., 'audio/webm' without the header).
 * @returns {Promise<string>} The final AI-generated advice text.
 */
async function analyzeAudioData(base64Audio) {
    
    let history = [];
    const systemInstruction = {
        role: "system",
        parts: [{ text: SYSTEM_PROMPT }]
    };
    
    // --- 1. Turn 1: Emotional State Analysis (Voice only) ---
    
    const initialUserContent = {
        role: "user",
        parts: [
            { text: PROMPT_1_VOICE_ANALYSIS },
            { 
                inlineData: { 
                    mimeType: 'audio/webm', // NOTE: Frontend sends 'audio/webm'
                    data: base64Audio
                } 
            }
        ]
    };

    try {
        const payload1 = {
            contents: [initialUserContent],
            systemInstruction: systemInstruction
        };

        const response1 = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload1)
        });
        
        const result1 = await response1.json();
        
        if (!response1.ok) {
             const errorMsg = result1.error?.message || 'Unknown API error during Turn 1.';
             console.error(`Gemini API Error (Turn 1): ${errorMsg}`);
             throw new Error("API failed during initial voice analysis.");
        }

        const analysisText = result1.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!analysisText) {
             throw new Error("Turn 1 analysis returned empty content.");
        }

        // Update history for Turn 2
        history.push(initialUserContent);
        history.push({ role: "model", parts: [{ text: analysisText }] });

        // --- 2. Turn 2: Comprehensive Emotional Outline & Advice ---
        
        const userPrompt2 = {
            role: "user",
            parts: [{ text: PROMPT_2_COMPREHENSIVE_ADVICE }]
        };

        // Pass the FULL message history + the new user prompt
        const fullContents = history.concat(userPrompt2);
        
        const payload2 = {
            contents: fullContents,
            systemInstruction: systemInstruction
        };

        const response2 = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload2)
        });

        const result2 = await response2.json();

        if (!response2.ok) {
            const errorMsg = result2.error?.message || 'Unknown API error during Turn 2.';
            console.error(`Gemini API Error (Turn 2): ${errorMsg}`);
            throw new Error("API failed during advice generation.");
        }

        const finalAdvice = result2.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!finalAdvice) {
             throw new Error("Turn 2 advice generation returned empty content.");
        }
        
        return finalAdvice;

    } catch (e) {
        // Log the internal error and return a safe message to the caller
        console.error("Backend processing failed:", e);
        return "An internal server error occurred while processing the audio. Please check logs.";
    }
}

// Export the function for use in a Node.js module (e.g., in an Express route)
module.exports = { analyzeAudioData };

// --- Example of usage within a fictional JavaScript/Node.js web framework ---
// This part is illustrative and shows how the function would be used by a server 
// receiving data from the frontend.

async function main() {
    // Simulating the data received from the frontend via a POST request body
    const MOCK_BASE64_AUDIO = "YOUR_BASE64_ENCODED_AUDIO_STRING_HERE"; 

    if (MOCK_BASE64_AUDIO !== "YOUR_BASE64_ENCODED_AUDIO_STRING_HERE" && apiKey !== "") {
        console.log("--- Starting Backend Analysis Mock ---");
        const finalAdvice = await analyzeAudioData(MOCK_BASE64_AUDIO);
        console.log("\n[Final Advice from Backend]:\n", finalAdvice);
    } else {
        console.log("Backend JavaScript function is ready. Ensure 'apiKey' is set and integrate into your web framework to receive 'base64Audio'.");
    }
}

// main();
