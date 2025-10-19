<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Audio Therapy Analyst</title>
    <!-- Load Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Configure Tailwind to use Inter font and apply rounded corners -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                    colors: {
                        'primary': '#4f46e5', // Indigo-600
                        'secondary': '#818cf8', // Indigo-400
                        'accent': '#10b981', // Emerald-500
                    }
                }
            }
        }
    </script>
    <style>
        /* Custom styles for professional, gentle look */
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f7f9fb; /* Light background */
        }
        .card {
            box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            transition: transform 0.3s ease;
        }
        .record-button {
            transition: all 0.3s ease;
            transform: scale(1);
        }
        .recording {
            animation: pulse-red 1.5s infinite;
        }
        @keyframes pulse-red {
            0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
            50% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
        }
    </style>
    <!-- Lucide Icons (for UI elements) -->
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="min-h-screen flex items-center justify-center p-4">

    <div class="w-full max-w-2xl bg-white rounded-xl card p-8 space-y-6">
        <header class="text-center">
            <h1 class="text-3xl font-extrabold text-gray-800">AI Wellness Companion</h1>
            <p class="mt-2 text-gray-500">Press the button to record your thoughts for analysis.</p>
        </header>

        <!-- Status and Button Area -->
        <div class="flex flex-col items-center space-y-4">
            <div id="statusMessage" class="h-6 text-sm font-medium text-gray-600 transition-opacity duration-300">
                Ready to listen.
            </div>
            
            <button id="recordButton" class="record-button w-24 h-24 rounded-full bg-primary hover:bg-secondary text-white flex items-center justify-center shadow-lg" onclick="toggleRecording()">
                <!-- Microphone Icon from Lucide -->
                <i data-lucide="mic" class="w-8 h-8"></i>
            </button>
            <p id="timer" class="text-xl font-mono text-gray-700 opacity-0">00:00</p>
        </div>

        <!-- Result/Advice Area -->
        <div id="outputContainer" class="hidden pt-4 border-t border-gray-200">
            <div class="flex items-center space-x-2 text-primary">
                <!-- Heart Icon from Lucide -->
                <i data-lucide="heart-handshake" class="w-6 h-6"></i>
                <h2 class="text-xl font-semibold">Your AI Guidance</h2>
            </div>
            <div id="outputContent" class="mt-3 p-4 bg-gray-50 rounded-lg text-gray-700 whitespace-pre-wrap">
                <!-- Analysis and Advice will be injected here -->
            </div>
        </div>

        <!-- Error/Loading Area -->
        <div id="loadingIndicator" class="hidden text-center text-primary font-semibold space-y-2">
            <p>Analyzing audio and generating advice...</p>
            <div class="flex justify-center items-center space-x-2">
                <div class="w-3 h-3 bg-primary rounded-full animate-bounce delay-100"></div>
                <div class="w-3 h-3 bg-primary rounded-full animate-bounce delay-200"></div>
                <div class="w-3 h-3 bg-primary rounded-full animate-bounce delay-300"></div>
            </div>
        </div>
        <div id="errorAlert" class="hidden bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong class="font-bold">Error: </strong>
            <span class="block sm:inline" id="errorMessage"></span>
        </div>
    </div>

    <script>
        // Load Lucide icons on the page
        lucide.createIcons();

        // --- Global Variables and Constants ---
        // MANDATORY: The system will automatically inject __initial_auth_token and __app_id, but the API Key is needed for fetch.
        // For development, this must be an empty string, and the environment will inject the real key.
        const apiKey = ""; 
        const API_MODEL = 'gemini-2.5-flash-preview-09-2025'; // FIX: Explicitly using the supported preview model for better compatibility with API key injection.
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL}:generateContent?key=${apiKey}`;

        const SYSTEM_PROMPT = `
You are a therapy AI bot, that gives advice to people regarding their mental health problems.
Persona: You are professional but gentle.
Disclaimer: Make sure to remind your users that you do not provide actual medical advice and direct them to seek help from a licensed source on a regular basis in case they forget.
`;

        const PROMPT_1_VOICE_ANALYSIS = 'Give an analysis of the general emotional state of the person from the sound of the voice, not the content.';
        const PROMPT_2_COMPREHENSIVE_ADVICE = 'Give a general emotional outline based on the text of the audio clip and the previous emotional analysis, then provide actionable, gentle advice.';

        // --- Audio Recording State ---
        let mediaRecorder;
        let audioChunks = [];
        let audioBlob = null;
        let recordingInterval;
        let startTime;

        // --- DOM Elements ---
        const recordButton = document.getElementById('recordButton');
        const statusMessage = document.getElementById('statusMessage');
        const loadingIndicator = document.getElementById('loadingIndicator');
        const outputContainer = document.getElementById('outputContainer');
        const outputContent = document.getElementById('outputContent');
        const errorAlert = document.getElementById('errorAlert');
        const errorMessage = document.getElementById('errorMessage');
        const timerElement = document.getElementById('timer');

        // --- Utility Functions ---

        /** Converts a Blob to a Base64 string for API transmission. */
        function blobToBase64(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    // Extract the base64 part (after "data:audio/webm;codecs=opus;base64,")
                    const base64String = reader.result.split(',')[1];
                    resolve(base64String);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }

        /** Handles displaying UI status and errors. */
        function updateUI(state, message = '') {
            outputContainer.classList.add('hidden');
            loadingIndicator.classList.add('hidden');
            recordButton.disabled = false;
            errorAlert.classList.add('hidden');

            if (state === 'recording') {
                recordButton.classList.add('recording', 'bg-red-500', 'hover:bg-red-600');
                recordButton.classList.remove('bg-primary', 'hover:bg-secondary');
                statusMessage.textContent = 'Recording... Press again to stop.';
                timerElement.classList.remove('opacity-0');
            } else if (state === 'ready') {
                recordButton.classList.remove('recording', 'bg-red-500', 'hover:bg-red-600');
                recordButton.classList.add('bg-primary', 'hover:bg-secondary');
                statusMessage.textContent = 'Ready to listen.';
                timerElement.classList.add('opacity-0');
            } else if (state === 'processing') {
                recordButton.disabled = true;
                loadingIndicator.classList.remove('hidden');
                statusMessage.textContent = 'Processing your message...';
            } else if (state === 'error') {
                errorAlert.classList.remove('hidden');
                errorMessage.textContent = message;
                statusMessage.textContent = 'An error occurred.';
            }
        }

        function updateTimer() {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const seconds = String(elapsed % 60).padStart(2, '0');
            timerElement.textContent = `${minutes}:${seconds}`;
        }

        // --- Audio Recording Functions ---

        async function startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                // Use a standard, high-quality format compatible with Gemini API
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
                audioChunks = [];
                audioBlob = null;

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    // Stop the stream tracks to release microphone
                    stream.getTracks().forEach(track => track.stop());
                    
                    // Combine chunks into a single audio Blob
                    audioBlob = new Blob(audioChunks, { 'type': 'audio/webm;codecs=opus' });
                    
                    // Process the audio
                    processAudio(audioBlob);
                };

                mediaRecorder.start();
                
                startTime = Date.now();
                recordingInterval = setInterval(updateTimer, 1000);

                updateUI('recording');

            } catch (err) {
                console.error('Microphone access denied or error:', err);
                updateUI('error', 'Could not access the microphone. Please check permissions.');
            }
        }

        function stopRecording() {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                clearInterval(recordingInterval);
            }
        }

        function toggleRecording() {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                stopRecording();
            } else {
                startRecording();
            }
        }

        // --- Gemini API Logic ---

        async function processAudio(audioBlob) {
            updateUI('processing');
            outputContent.textContent = '';
            
            try {
                const base64Audio = await blobToBase64(audioBlob);
                await callGeminiAPI(base64Audio);
            } catch (err) {
                console.error('Processing or API error:', err);
                // Check if the error message is related to permission denied (403)
                if (err.message.includes('permission denied') || err.message.includes('unregistered callers')) {
                     updateUI('error', 'API key error: The service failed to authenticate. This usually means the API key is missing or invalid. Please ensure the environment is providing the key.');
                } else {
                     updateUI('error', 'Failed to process audio or communicate with the AI model. Check console for details.');
                }
            } finally {
                updateUI('ready');
            }
        }

        async function callGeminiAPI(base64Audio) {
            let history = []; // Conversation history for multi-turn chat

            // --- 1. Turn 1: Emotional State Analysis (Voice only) ---
            const initialContents = [
                {
                    role: "user",
                    parts: [
                        { text: PROMPT_1_VOICE_ANALYSIS },
                        { inlineData: { mimeType: 'audio/webm', data: base64Audio } }
                    ]
                }
            ];

            const payload1 = {
                contents: initialContents,
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
            };

            const response1 = await fetchWithRetry(API_URL, payload1);
            if (!response1 || !response1.candidates || response1.candidates.length === 0) {
                 throw new Error("First API call failed to return content.");
            }

            const analysisText = response1.candidates[0].content.parts[0].text;
            
            // Add turn 1 to history
            history.push(initialContents[0]);
            history.push({ role: "model", parts: [{ text: analysisText }] });

            // --- 2. Turn 2: Comprehensive Emotional Outline & Advice ---
            const userPrompt2 = {
                role: "user",
                parts: [{ text: PROMPT_2_COMPREHENSIVE_ADVICE }]
            };

            const payload2 = {
                contents: history.concat(userPrompt2),
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
            };

            const response2 = await fetchWithRetry(API_URL, payload2);
            if (!response2 || !response2.candidates || response2.candidates.length === 0) {
                 throw new Error("Second API call failed to return content.");
            }

            const finalAdvice = response2.candidates[0].content.parts[0].text;
            
            outputContent.textContent = finalAdvice;
            outputContainer.classList.remove('hidden');
        }

        // --- Robust Fetching with Exponential Backoff ---

        async function fetchWithRetry(url, data, maxRetries = 5) {
            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            };

            for (let i = 0; i < maxRetries; i++) {
                try {
                    const response = await fetch(url, requestOptions);
                    const result = await response.json();

                    if (response.ok) {
                        return result;
                    } else if (response.status === 429 && i < maxRetries - 1) {
                        // Handle rate limiting (429) with exponential backoff
                        const delay = Math.pow(2, i) * 1000 + (Math.random() * 1000);
                        console.warn(`Rate limit hit (429). Retrying in ${Math.round(delay / 1000)}s...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        // Handle other non-successful status codes
                        console.error("API Error Response:", result);
                        const errorMessage = result.error?.message || response.statusText;
                        throw new Error(`API call failed: ${errorMessage}`);
                    }
                } catch (error) {
                    if (error.message.includes('API call failed')) {
                        throw error; // Re-throw fatal API error
                    }
                    console.error(`Fetch attempt ${i + 1} failed:`, error);
                    if (i === maxRetries - 1) throw new Error("Maximum retries reached. Network error.");
                    
                    const delay = Math.pow(2, i) * 1000 + (Math.random() * 1000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // --- Initial Setup ---
        window.onload = () => {
             updateUI('ready');
        };

    </script>
</body>
</html>
