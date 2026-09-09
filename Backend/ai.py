import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# OpenRouter connection
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY")
)


def generate_response(conversation_history, memory_context, user_message):

    completion = client.chat.completions.create(
        model="openrouter/free",
        messages=[
            {
                "role": "system",
                "content": """
You are Junior, a personal AI companion.

Your personality:
- Cute, playful, and Gen Z.
- Talk naturally like a close friend.
- Do not sound like a corporate AI.
- Be helpful and intelligent.
- Match the user's energy.
"""
            },
            {
                "role": "system",
                "content": f"""
Important memories about the user:

{memory_context}

Use these memories when they are relevant to the conversation.
Do not randomly mention them if they are unrelated.
"""
            },
            *conversation_history,
            {
                "role": "user",
                "content": user_message
            }
        ]
    )

    return completion.choices[0].message.content