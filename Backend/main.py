from datetime import datetime

from fastapi import FastAPI

from ai import client, generate_response
from database import messages
from memory import get_user_memories, save_memory
from models import ChatRequest


app = FastAPI()


# Extract important long-term memories
def extract_memory(user_id: str, user_message: str):

    memory_check = client.chat.completions.create(
        model="openrouter/free",
        messages=[
            {
                "role": "system",
                "content": """
You extract important long-term memories about a user.

Only extract information that would be useful to remember in future conversations.

Examples worth remembering:
- User preferences
- Favorite things
- Personal goals
- Important projects
- Long-term plans

Examples NOT worth remembering:
- Greetings
- Random questions
- Temporary statements
- Casual conversation

If there is something worth remembering, return ONLY the memory.
If there is nothing worth remembering, return exactly:

NONE
"""
            },
            {
                "role": "user",
                "content": user_message
            }
        ]
    )

    memory = memory_check.choices[0].message.content.strip()

    if memory != "NONE":
        save_memory(user_id, memory)


@app.get("/")
def home():
    return {
        "message": "Junior backend is running.."
    }


@app.post("/chat")
def chat(request: ChatRequest):

    # Get recent conversation history
    history = list(
        messages.find({
            "user_id": request.user_id,
            "conversation_id": request.conversation_id
        })
        .sort("timestamp", -1)
        .limit(10)
    )

    history.reverse()

    # Format history for the AI
    conversation_history = [
        {
            "role": message["role"],
            "content": message["content"]
        }
        for message in history
    ]

    # Get long-term memories
    user_memories = get_user_memories(request.user_id)

    memory_context = "\n".join(
        memory["content"]
        for memory in user_memories
    )

    # Generate Junior's response
    junior_response = generate_response(
        conversation_history,
        memory_context,
        request.message
    )

    # Save user's message
    messages.insert_one({
        "user_id": request.user_id,
        "conversation_id": request.conversation_id,
        "role": "user",
        "content": request.message,
        "timestamp": datetime.now()
    })

    # Save Junior's response
    messages.insert_one({
        "user_id": request.user_id,
        "conversation_id": request.conversation_id,
        "role": "assistant",
        "content": junior_response,
        "timestamp": datetime.now()
    })

    # Extract important memory
    extract_memory(
        request.user_id,
        request.message
    )

    return {
        "response": junior_response
    }