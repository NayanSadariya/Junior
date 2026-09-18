from datetime import datetime

from fastapi import FastAPI

from ai import client, generate_response
from database import messages, conversations
from memory import get_user_memories, save_memory
from models import ChatRequest, ConversationRequest
from bson import ObjectId


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

@app.post("/conversations")
def create_conversation(request: ConversationRequest):

    conversation = {
        "user_id": request.user_id,
        "title": request.title,
        "created_at": datetime.now()
    }

    result = conversations.insert_one(conversation)

    return {
        "conversation_id": str(result.inserted_id),
        "title": request.title
    }

@app.get("/conversations/{user_id}")
def get_conversations(user_id: str):

    user_conversations = conversations.find(
        {"user_id": user_id}
    ).sort("created_at", -1)

    return [
        {
            "conversation_id": str(conversation["_id"]),
            "title": conversation["title"]
        }
        for conversation in user_conversations
    ]

@app.get("/users/{user_id}/conversations/{conversation_id}/messages")
def get_messages(user_id: str, conversation_id: str):

    conversation = conversations.find_one({
        "_id": ObjectId(conversation_id),
        "user_id": user_id
    })

    if not conversation:
        return {
            "error": "Conversation not found"
        }

    conversation_messages = messages.find({
        "user_id": user_id,
        "conversation_id": conversation_id
    }).sort("timestamp", 1)

    return [
        {
            "role": message["role"],
            "content": message["content"],
            "timestamp": message["timestamp"]
        }
        for message in conversation_messages
    ]

@app.put("/conversations/{conversation_id}")
def rename_conversation(
    conversation_id: str,
    request: ConversationRequest
):

    result = conversations.update_one(
        {
            "_id": ObjectId(conversation_id),
            "user_id": request.user_id
        },
        {
            "$set": {
                "title": request.title
            }
        }
    )

    if result.matched_count == 0:
        return {
            "error": "Conversation not found"
        }

    return {
        "message": "Conversation renamed successfully",
        "title": request.title
    }

@app.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    user_id: str
):

    result = conversations.delete_one({
        "_id": ObjectId(conversation_id),
        "user_id": user_id
    })

    if result.deleted_count == 0:
        return {
            "error": "Conversation not found"
        }

    messages.delete_many({
        "user_id": user_id,
        "conversation_id": conversation_id
    })

    return {
        "message": "Conversation deleted successfully"
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