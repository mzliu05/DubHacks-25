<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Wellness Companion (TS Style)</title>
    <!-- Load Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                    colors: {
                        'primary': '#4f46e5',
                        'secondary': '#818cf8',
                        'accent': '#10b981',
                    }
                }
            }
        }
    </script>
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f7f9fb;
        }
        .card {
            box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
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
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="min-h-screen flex items-center justify-center p-4">

    <div class="w-full max-w-2xl bg-white rounded-xl card p-8 space-y-6">
        <header class="text-center">
            <h1 class="text-3xl font-extrabold text-gray-800">AI Wellness Companion</h1>
            <p class="mt-2 text-gray-500">Press the button to record your thoughts for analysis via the backend service.</p>
        </header>

        <!-- Status and Button Area -->
        <div class="flex flex-col items-center space-y-4">
            <div id="statusMessage" class="h-6 text-sm font-medium text-gray-600 transition-opacity duration-300">
                Ready to listen.
            </div>
            
            <button id="recordButton" class="record-button w-24 h-24 rounded-full bg-primary hover:bg-secondary text-white flex items-center justify-center shadow-lg" onclick="toggleRecording()">
                <i data-lucide="mic" class="w-8 h-8"></i>
            </button>
            <p id="timer" class="text-xl font-mono text-gray-700 opacity-0">00:00</p>
        </div>

        <!-- Result/Advice Area -->
        <div id="outputContainer" class="hidden pt-4 border-t border-gray-200">
            <div class="flex items-center space-x-2 text-primary">
                <i data-lucide="heart-handshake" class="w-6 h-6"></i>
                <h2 class="text-xl font-semibold">Your AI Guidance</h2>
            </div>
            <div id="outputContent" class="mt-3 p-4 bg-gray-50 rounded-lg text-gray-700 whitespace-pre-wrap">
                <!-- Analysis and Advice will be injected here -->
            </div>
        </div>

        <!-- Error/Loading Area -->
        <div id="loadingIndicator" class="hidden text-center text-primary font-semibold space-y-2">
            <p>Sending audio to backend for analysis...</p>
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
        // Use JSDoc to define types and interfaces for a TypeScript-like structure

        /**
         * @typedef {Object} BackendRequest
         * @property {string} audio_data - The Base64 encoded audio string.
         * @property {string} mime_type - The MIME type of the audio data ('audio/webm').
         */

        /**
         * @typedef {Object} BackendResponse
         * @property {string} advice - The final text advice from the Gemini API.
         * @property {Object} [error] - Optional error object if the request failed.
         */

        // Load Lucide icons on the page
        lucide.createIcons();

        // --- Global Variables and Constants ---
        /** @type {string} The URL for the backend analysis endpoint. */
        const BACKEND_API_URL = '/analyze-audio'; 
        
        // --- Audio Recording State ---
        /** @type {MediaRecorder | null} */
        let mediaRecorder = null;
        /** @type {BlobPart[]} */
        let audioChunks = [];
        /** @type {Blob | null} */
        let audioBlob = null;
        /** @type {number | null} */
        let recordingInterval = null;
        /** @type {number} */
        let startTime = 0;

        // --- DOM Elements (Typed with JSDoc) ---
        /** @type {HTMLButtonElement} */
        const recordButton = /** @type {HTMLButtonElement} */ (document.getElementById('recordButton'));
        /** @type {HTMLElement} */
        const statusMessage = /** @type {HTMLElement} */ (document.getElementById('statusMessage'));
        /** @type {HTMLElement} */
        const loadingIndicator = /** @type {HTMLElement} */ (document.getElementById('loadingIndicator'));
        /** @type {HTMLElement} */
        const outputContainer = /** @type {HTMLElement} */ (document.getElementById('outputContainer'));
        /** @type {HTMLElement} */
        const outputContent = /** @type {HTMLElement} */ (document.getElementById('outputContent'));
        /** @type {HTMLElement} */
        const errorAlert = /** @type {HTMLElement} */ (document.getElementById('errorAlert'));
        /** @type {HTMLElement} */
        const errorMessage = /** @type {HTMLElement} */ (document.getElementById('errorMessage'));
        /** @type {HTMLElement} */
        const timerElement = /** @type {HTMLElement} */ (document.getElementById('timer'));

        // --- Utility Functions ---

        /** * Converts an audio Blob to a Base64 string for API transmission.
         * @param {Blob} blob - The audio data blob.
         * @returns {Promise<string>} The Base64 string of the audio data.
         */
        function blobToBase64(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        // Extract the base64 part (after the mime type header)
                        const base64String = reader.result.split(',')[1];
                        resolve(base64String);
                    } else {
                        reject(new Error("Failed to read blob as data URL."));
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }

        /** * Handles displaying UI status and errors.
         * @param {'recording' | 'ready' | 'processing' | 'error'} state - The current UI state.
         * @param {string} [message] - Optional message for status or error.
         * @returns {void}
         */
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
                statusMessage.textContent = 'Sending to backend for analysis...';
            } else if (state === 'error') {
                errorAlert.classList.remove('hidden');
                errorMessage.textContent = message;
                statusMessage.textContent = 'An error occurred.';
            }
        }

        /**
         * Updates the recording timer display.
         * @returns {void}
         */
        function updateTimer() {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const seconds = String(elapsed % 60).padStart(2, '0');
            timerElement.textContent = `${minutes}:${seconds}`;
        }

        // --- Audio Recording Functions ---

        /**
         * Initiates microphone access and starts audio recording.
         * @returns {Promise<void>}
         */
        async function startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
                audioChunks = [];
                audioBlob = null;

                mediaRecorder.ondataavailable = (/** @type {BlobEvent} */ event) => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    stream.getTracks().forEach(track => track.stop());
                    audioBlob = new Blob(audioChunks, { 'type': 'audio/webm;codecs=opus' });
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

        /**
         * Stops the audio recording.
         * @returns {void}
         */
        function stopRecording() {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                if (recordingInterval) {
                    clearInterval(recordingInterval);
                }
            }
        }

        /**
         * Toggles between starting and stopping recording.
         * @returns {void}
         */
        function toggleRecording() {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                stopRecording();
            } else {
                startRecording();
            }
        }

        // --- Backend API Logic ---

        /**
         * Processes the recorded audio blob by converting it to Base64 and sending it to the backend.
         * @param {Blob} audioBlob - The recorded audio data.
         * @returns {Promise<void>}
         */
        async function processAudio(audioBlob) {
            updateUI('processing');
            outputContent.textContent = '';
            
            try {
                const base64Audio = await blobToBase64(audioBlob);
                await callBackendAPI(base64Audio);
            } catch (err) {
                console.error('Processing or API error:', err);
                // @ts-ignore
                updateUI('error', `Failed to get advice from the backend: ${err.message || 'Unknown error.'}`);
            } finally {
                updateUI('ready');
            }
        }
        
        /**
         * Sends the Base64 audio string to the Node.js backend API for analysis.
         * @param {string} base64Audio - The Base64 encoded audio string.
         * @returns {Promise<void>}
         */
        async function callBackendAPI(base64Audio) {
            /** @type {BackendRequest} */
            const payload = { 
                audio_data: base64Audio,
                mime_type: 'audio/webm'
            };

            const response = await fetchWithRetry(BACKEND_API_URL, payload);
            
            /** @type {BackendResponse} */
            const result = response;
            
            if (!result.advice) {
                // If the backend returns an error structure or empty advice
                const errorDetail = result.error ? JSON.stringify(result.error) : "Response was malformed or empty.";
                throw new Error(`Backend returned invalid or error response: ${errorDetail}`);
            }

            outputContent.textContent = result.advice;
            outputContainer.classList.remove('hidden');
        }


        // --- Robust Fetching with Exponential Backoff ---

        /**
         * Performs a fetch request with exponential backoff for retries.
         * @param {string} url - The API endpoint URL.
         * @param {BackendRequest} data - The payload to send.
         * @param {number} [maxRetries] - Maximum number of retries.
         * @returns {Promise<BackendResponse>}
         */
        async function fetchWithRetry(url, data, maxRetries = 5) {
            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            };

            for (let i = 0; i < maxRetries; i++) {
                try {
                    const response = await fetch(url, requestOptions);
                    /** @type {BackendResponse} */
                    const result = await response.json();

                    if (response.ok) {
                        return result;
                    } else if (response.status === 429 && i < maxRetries - 1) {
                        // Handle rate limiting (429) with exponential backoff
                        const delay = Math.pow(2, i) * 1000 + (Math.random() * 1000);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        // Handle other non-successful status codes
                        const errorMessage = result.error?.message || response.statusText;
                        throw new Error(`Backend call failed: ${errorMessage}`);
                    }
                } catch (error) {
                    if (error instanceof Error && error.message.includes('Backend call failed')) {
                        throw error; // Re-throw fatal backend error
                    }
                    if (i === maxRetries - 1) throw new Error("Maximum retries reached. Network error.");
                    
                    const delay = Math.pow(2, i) * 1000 + (Math.random() * 1000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            // Fallback for typesafety, although the loop should handle it
            throw new Error("API call failed after all retries.");
        }

        // --- Initial Setup ---
        window.onload = () => {
             updateUI('ready');
        };

    </script>
</body>
</html>
