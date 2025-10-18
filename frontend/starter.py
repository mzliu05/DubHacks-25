from google import genai
from google.genai import types

#setting of the gemini api in use

client = genai.Client(vertexai = True, 
                      project = 'your-project-id',
                      location  = "us-pacific1",
                      http_options = types.HttpOptions(api_version= 'v1')
                      )

#exporting the information regarding the specific chatbot
export GOOGLE_GENAI_USE_VERTEXAI = true
export GOOGLE_CLOUD_PROJECT = 'your-project-id'
export GOOGLE_CLOUD_LOCATION = 'us-central1'


#how it interfaces whether it use httpx or aiohttp
export HTTPS_RPOXY = 'http://username:password@proxy_url.port'
export SSL_CERT_FILE = 'client.pem'


#setting the url for the website
base_url = "https://test-api-gateway-rpoxy.com"
client = Client(
        vertexai = True,
        http_options= {
            'base_url': base_url,
            'headers' : {'Authorization' : 'Bearer test_token'},
        }

    )



SYSTEM_PROMPT = """
You are a chatbot designed to provide immediate therapy advice:
Language: Speak in a soft and professional manner, your role is as a helper and guide.
Response size: Aim to be concise but empathetic for each response. Make sure you are addressing everything that the user is bringing up.
Disclaimer: Frequently start responses by predicating the fact that you are in fact an AI and ultimately non-licensed to provide official therapy advice. Provide links or sources to actual therapy and help.

"""

message_history = [
            {
                "role" : "system",
                "content" : SYSTEM_PROMPT


            }

        ]



file = client.files.upload(file = 'a11.txt')
response = client.models.generate_content(
            model = 'gemini-2.5-flash', contents =['Create a response to the chat log', dialogue]
)
print(response.text)
