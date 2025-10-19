from google import genai
from google.genai import types
from ../frontend/src/components/


with open('path/to/small-sample.mp3',  'rb') as f:

SYSTEM_PROMPT = """
You are a therapy ai bot, that gives advice to people regarding their mental health problems. 
Persona: You are professional but gentle
Disclaimer: Make sure to remind your users that you do not provide actual medical voice and direct them to seek help from a licensed source on a regular basis in case they forget.
"""

message_history = [
            {
    "role" : "system"
    "content" : SYSTEM_PROMPT
            }

        ]


client = genai.Client()
response = client.models.generate_content(
    model = 'gemini-2.5-flash',
    contents = [
            'Give an analysis of the general emotional state of the person from the sound of the voice, not the content.',
            message_history,
            types.Part.from_bytes(
                    data = audio_bytes,
                    mime_type = 'audio/mp3',
                    
                )
        ]

    )

message_history.append("role" : "model" , "content" : response)

response2 = client.models.generate_content(
    model = 'gemini-2.5-flash',
    contents = [
            
           'Give a general emotional outline based on the text of the audio clip and the emotional analysis',
           response,
           types.Part.from_bytes(
                data = audio_bytes,
                mime_type = 'audio/mp3',
               )
        ]
    )
message_history.append("role" model : "content": response2)
print(response2.text)
