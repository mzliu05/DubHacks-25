import os
import time
from google import genai
from google.genai import types

# --- Configuration and Constants ---

# You should set your API key as an environment variable (e.g., GEMINI_API_KEY)
# or pass it to the Client() constructor.
# client = genai.Client(api_key="YOUR_API_KEY")
client = genai.Client()

# This is the path to your audio file.
# NOTE: The file must be under 10MB and in a supported format (like MP3, WAV, FLAC).
AUDIO_FILE_PATH = 'path/to/small-sample.mp3'

SYSTEM_PROMPT = """
You are a therapy AI bot, that gives advice to people regarding their mental health problems.
Persona: You are professional but gentle.
Disclaimer: Make sure to remind your users that you do not provide actual medical advice and direct them to seek help from a licensed source on a regular basis in case they forget.
"""

# --- Helper Functions for File and History Management ---

def load_audio_file(file_path):
    """Reads the audio file and returns its bytes."""
    try:
        with open(file_path, 'rb') as f:
            return f.read()
    except FileNotFoundError:
        print(f"Error: Audio file not found at '{file_path}'. Please check the path.")
        # Create dummy data for demonstration if the file is missing
        return b"This is dummy audio data."

def create_content_part(text, audio_bytes=None, mime_type=None):
    """Creates a list of Content Parts for a single turn."""
    parts = [types.Part.from_text(text)]
    if audio_bytes and mime_type:
        # Note: 'audio/mp3' is a common mime_type, ensure it matches your file.
        parts.append(types.Part.from_bytes(data=audio_bytes, mime_type=mime_type))
    
    # Return a list of parts that form the user's message
    return parts

# --- Main Logic ---

def run_therapy_analysis():
    """Executes the two-turn audio analysis conversation."""

    # 1. Load the audio file
    audio_bytes = load_audio_file(AUDIO_FILE_PATH)
    
    # 2. Initialize Conversation History
    # History will store Content objects after the first successful turn.
    message_history = [] 

    # Configuration for the API calls
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT
    )

    print("--- Starting Therapy Bot Analysis ---")
    
    # --- Turn 1: Emotional State Analysis (Voice only) ---
    
    # Create the first user message (Text prompt + Audio file)
    user_prompt_1 = 'Give an analysis of the general emotional state of the person from the sound of the voice, not the content.'
    
    # This Content will contain the text prompt and the audio Part
    current_user_content_1 = create_content_part(user_prompt_1, audio_bytes, 'audio/mp3')

    print(f"\n[User Query 1] Requesting: {user_prompt_1}")
    
    try:
        # Pass only the current user message (current_user_content_1) for the first turn
        response_1 = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=current_user_content_1,
            config=config
        )

        # 3. Update History after Turn 1
        # Add the user's first message to the history
        message_history.append(types.Content(role="user", parts=current_user_content_1))
        # Add the model's first response to the history
        message_history.append(types.Content(
            role="model", 
            parts=[types.Part.from_text(response_1.text)]
        ))

        print("\n[AI Response 1] Emotional Analysis (Voice):")
        print(response_1.text)
        
    except Exception as e:
        print(f"An error occurred during Turn 1: {e}")
        return # Stop execution if the first call fails

    # --- Turn 2: Comprehensive Emotional Outline (Text + Voice Analysis) ---

    user_prompt_2 = 'Give a general emotional outline based on the text of the audio clip and the previous emotional analysis.'
    
    # Create the second user message (Text prompt only, as audio is already in history)
    current_user_content_2 = create_content_part(user_prompt_2)

    print(f"\n[User Query 2] Requesting: {user_prompt_2}")

    try:
        # Pass the FULL message history + the new user message (current_user_content_2)
        full_contents = message_history + current_user_content_2
        
        response_2 = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=full_contents,
            config=config
        )

        # 4. Final Output
        print("\n[AI Response 2] Comprehensive Outline:")
        print(response_2.text)

    except Exception as e:
        print(f"An error occurred during Turn 2: {e}")

# Execute the script
if __name__ == "__main__":
    run_therapy_analysis()
