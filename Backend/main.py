from datetime import datetime

import os

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.auth.transport import requests
from google.oauth2 import id_token

from ai import client, generate_response
from database import messages, conversations
from memory import get_user_memories, save_memory
from models import ChatRequest, ConversationRequest, GoogleAuthRequest


load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

app = FastAPI()


# -------------------- AUTHENTICATION --------------------

def verify_google_credential(credential: str):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Google Client ID is not configured",
        )

    try:
        user_info = id_token.verify_oauth2_token(
            credential,
            requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid Google credential",
        )

    return {
        "user_id": user_info["sub"],
        "name": user_info.get("name"),
        "email": user_info.get("email"),
        "picture": user_info.get("picture"),
    }


def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing authentication token",
        )

    credential = authorization.split(" ", 1)[1]

    return verify_google_credential(credential)


@app.post("/auth/google")
def google_login(request: GoogleAuthRequest):
    user = verify_google_credential(request.credential)

    return {
        "sub": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "picture": user["picture"],
    }

# -------------------- CORS --------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "https://junior-six-delta.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------- MEMORY EXTRACTION --------------------

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
                "content": user_message,
            },
        ],
    )

    memory = (memory_check.choices[0].message.content or "").strip()

    if memory and memory != "NONE":
        save_memory(user_id, memory)


# -------------------- HELPERS --------------------

def get_owned_conversation(user_id: str, conversation_id: str):
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(
            status_code=404,
            detail="Conversation not found",
        )

    conversation = conversations.find_one({
        "_id": ObjectId(conversation_id),
        "user_id": user_id,
    })

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found",
        )

    return conversation


# -------------------- HOME --------------------

@app.get("/")
def home():
    return {
        "message": "Junior backend is running.."
    }


# -------------------- CONVERSATIONS --------------------

@app.post("/conversations")
def create_conversation(
    request: ConversationRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]

    conversation = {
        "user_id": user_id,
        "title": request.title,
        "created_at": datetime.now(),
    }

    result = conversations.insert_one(conversation)

    return {
        "conversation_id": str(result.inserted_id),
        "title": request.title,
    }


@app.get("/conversations/{user_id}")
def get_conversations(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    authenticated_user_id = current_user["user_id"]

    if user_id != authenticated_user_id:
        raise HTTPException(
            status_code=403,
            detail="You cannot access another user's conversations",
        )

    user_conversations = conversations.find(
        {"user_id": authenticated_user_id}
    ).sort("created_at", -1)

    return [
        {
            "conversation_id": str(conversation["_id"]),
            "title": conversation["title"],
        }
        for conversation in user_conversations
    ]


@app.get("/users/{user_id}/conversations/{conversation_id}/messages")
def get_messages(
    user_id: str,
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    authenticated_user_id = current_user["user_id"]

    if user_id != authenticated_user_id:
        raise HTTPException(
            status_code=403,
            detail="You cannot access another user's messages",
        )

    get_owned_conversation(authenticated_user_id, conversation_id)

    conversation_messages = messages.find({
        "user_id": authenticated_user_id,
        "conversation_id": conversation_id,
    }).sort("timestamp", 1)

    return [
        {
            "role": message["role"],
            "content": message["content"],
            "timestamp": message["timestamp"],
        }
        for message in conversation_messages
    ]


@app.put("/conversations/{conversation_id}")
def rename_conversation(
    conversation_id: str,
    request: ConversationRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]

    if request.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You cannot modify another user's conversation",
        )

    get_owned_conversation(user_id, conversation_id)

    conversations.update_one(
        {
            "_id": ObjectId(conversation_id),
            "user_id": user_id,
        },
        {
            "$set": {
                "title": request.title,
            }
        },
    )

    return {
        "message": "Conversation renamed successfully",
        "title": request.title,
    }


@app.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]

    get_owned_conversation(user_id, conversation_id)

    conversations.delete_one({
        "_id": ObjectId(conversation_id),
        "user_id": user_id,
    })

    messages.delete_many({
        "user_id": user_id,
        "conversation_id": conversation_id,
    })

    return {
        "message": "Conversation deleted successfully"
    }


# -------------------- CHAT --------------------

@app.post("/chat")
def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]

    if request.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You cannot chat as another user",
        )

    get_owned_conversation(user_id, request.conversation_id)

    # Get recent conversation history
    history = list(
        messages.find({
            "user_id": user_id,
            "conversation_id": request.conversation_id,
        })
        .sort("timestamp", -1)
        .limit(10)
    )

    history.reverse()

    # Format history for the AI
    conversation_history = [
        {
            "role": message["role"],
            "content": message["content"],
        }
        for message in history
    ]

    # Get long-term memories
    user_memories = get_user_memories(user_id)

    memory_context = "\n".join(
        memory["content"]
        for memory in user_memories
    )

    # Generate Junior's response
    junior_response = generate_response(
        conversation_history,
        memory_context,
        request.message,
    )

    # Save user's message
    messages.insert_one({
        "user_id": user_id,
        "conversation_id": request.conversation_id,
        "role": "user",
        "content": request.message,
        "timestamp": datetime.now(),
    })

    # Save Junior's response
    messages.insert_one({
        "user_id": user_id,
        "conversation_id": request.conversation_id,
        "role": "assistant",
        "content": junior_response,
        "timestamp": datetime.now(),
    })

    # Extract important memory
    extract_memory(
        user_id,
        request.message,
    )

    return {
        "response": junior_response
    }