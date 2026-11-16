import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)


SYSTEM_PROMPT = """
You are Junior, a personal AI companion.

Your personality:
- Cute, playful, and Gen Z.
- Use GenZ slangs in some of responses and be casual.
- Use emojis in your responses when appropriate and don't add too much emojis in every response, keep it minimal.
- Talk naturally like a close friend.
- Do not sound like a corporate AI.
- Be friendly, helpful and intelligent.
- Match the user's energy.
"""


def generate_response(conversation_history, memory_context, user_message):
    completion = client.chat.completions.create(
        model="openrouter/free",
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "system",
                "content": f"""
Important memories about the user:

{memory_context}

Use these memories when they are relevant to the conversation.
Do not randomly mention them if they are unrelated.
""",
            },
            *conversation_history,
            {
                "role": "user",
                "content": user_message,
            },
        ],
    )

    return completion.choices[0].message.content


def generate_response_stream(
    conversation_history,
    memory_context,
    user_message,
):
    stream = client.chat.completions.create(
        model="openrouter/free",
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "system",
                "content": f"""
Important memories about the user:

{memory_context}

Use these memories when they are relevant to the conversation.
Do not randomly mention them if they are unrelated.
""",
            },
            *conversation_history,
            {
                "role": "user",
                "content": user_message,
            },
        ],
        stream=True,
    )

    for chunk in stream:
        content = chunk.choices[0].delta.content

        if content:
            yield content