import os
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ai import client, generate_response_stream
from database import messages, conversations
from memory import get_user_memories, save_memory


load_dotenv()

app = FastAPI()


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://junior-six-delta.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# MODELS
# --------------------------------------------------

class ChatRequest(BaseModel):
    user_id: str
    conversation_id: str
    message: str


class ConversationCreateRequest(BaseModel):
    user_id: str
    title: str = "New Chat"


class ConversationRenameRequest(BaseModel):
    user_id: str
    title: str


# --------------------------------------------------
# BASIC ROUTE
# --------------------------------------------------

@app.get("/")
def root():
    return {"message": "Junior backend is running.."}


# --------------------------------------------------
# MEMORY EXTRACTION
# --------------------------------------------------

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
""",
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


# --------------------------------------------------
# CREATE CONVERSATION
# --------------------------------------------------

@app.post("/conversations")
def create_conversation(request: ConversationCreateRequest):
    title = request.title.strip() or "New Chat"

    conversation = {
        "user_id": request.user_id,
        "title": title,
    }

    result = conversations.insert_one(conversation)

    return {
        "conversation_id": str(result.inserted_id),
        "title": title,
    }


# --------------------------------------------------
# GET CONVERSATIONS
# --------------------------------------------------

@app.get("/conversations/{user_id}")
def get_conversations(user_id: str):
    conversation_list = []

    cursor = conversations.find(
        {"user_id": user_id}
    ).sort("_id", -1)

    for conversation in cursor:
        conversation_id = str(conversation["_id"])

        # Only show conversations that actually contain
        # at least one user message.
        has_user_message = messages.find_one(
            {
                "conversation_id": conversation_id,
                "user_id": user_id,
                "role": "user",
            }
        )

        if not has_user_message:
            continue

        conversation_list.append(
            {
                "conversation_id": conversation_id,
                "title": conversation.get(
                    "title",
                    "New Chat",
                ),
            }
        )

    return conversation_list


# --------------------------------------------------
# RENAME CONVERSATION
# --------------------------------------------------

@app.put("/conversations/{conversation_id}")
def rename_conversation(
    conversation_id: str,
    request: ConversationRenameRequest,
):
    title = request.title.strip()

    if not title:
        raise HTTPException(
            status_code=400,
            detail="Conversation title cannot be empty.",
        )

    result = conversations.update_one(
        {
            "_id": __import__("bson").ObjectId(conversation_id),
            "user_id": request.user_id,
        },
        {
            "$set": {
                "title": title,
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    return {
        "conversation_id": conversation_id,
        "title": title,
    }


# --------------------------------------------------
# DELETE CONVERSATION
# --------------------------------------------------

@app.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str):
    from bson import ObjectId

    try:
        object_id = ObjectId(conversation_id)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid conversation ID.",
        )

    conversations.delete_one(
        {"_id": object_id}
    )

    messages.delete_many(
        {"conversation_id": conversation_id}
    )

    return {
        "message": "Conversation deleted successfully.",
    }


# --------------------------------------------------
# GET CONVERSATION MESSAGES
# --------------------------------------------------

@app.get(
    "/users/{user_id}/conversations/{conversation_id}/messages"
)
def get_conversation_messages(
    user_id: str,
    conversation_id: str,
):
    conversation_messages = []

    cursor = messages.find(
        {
            "user_id": user_id,
            "conversation_id": conversation_id,
        }
    ).sort("_id", 1)

    for message in cursor:
        conversation_messages.append(
            {
                "role": message["role"],
                "content": message["content"],
                "timestamp": message.get(
                    "timestamp"
                ),
            }
        )

    return conversation_messages


# --------------------------------------------------
# STREAMING CHAT
# --------------------------------------------------

@app.post("/chat")
async def chat(
    request: Request,
    chat_request: ChatRequest,
):
    user_id = chat_request.user_id
    conversation_id = chat_request.conversation_id
    user_message = chat_request.message.strip()

    if not user_message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    # --------------------------------------------------
    # Get previous conversation history
    # --------------------------------------------------

    history = []

    cursor = messages.find(
        {
            "user_id": user_id,
            "conversation_id": conversation_id,
        }
    ).sort("_id", 1)

    for message in cursor:
        history.append(
            {
                "role": message["role"],
                "content": message["content"],
            }
        )

    # --------------------------------------------------
    # Get memories
    # --------------------------------------------------

    memory_context = get_user_memories(user_id)

    # --------------------------------------------------
    # Generate streaming response
    # --------------------------------------------------

    async def response_generator() -> AsyncGenerator[str, None]:
        full_response = ""
        completed = False

        try:
            stream = generate_response_stream(
                history,
                memory_context,
                user_message,
            )

            for chunk in stream:
                # Stop generation if the browser disconnected.
                if await request.is_disconnected():
                    print(
                        "Client disconnected. "
                        "Stopping response."
                    )
                    return

                full_response += chunk

                yield chunk

            completed = True

        except GeneratorExit:
            print(
                "Client stopped the streaming response."
            )
            return

        except Exception as error:
            print(
                f"Streaming generation error: {error}"
            )
            return

        # --------------------------------------------------
        # Only save the conversation if generation
        # completed successfully.
        # --------------------------------------------------

        if (
            completed
            and full_response.strip()
            and not await request.is_disconnected()
        ):
            try:
                messages.insert_one(
                    {
                        "user_id": user_id,
                        "conversation_id": conversation_id,
                        "role": "user",
                        "content": user_message,
                    }
                )

                messages.insert_one(
                    {
                        "user_id": user_id,
                        "conversation_id": conversation_id,
                        "role": "assistant",
                        "content": full_response,
                    }
                )

            except Exception as error:
                print(
                    f"Database save error: {error}"
                )

            # --------------------------------------------------
            # Extract long-term memory only after a
            # successfully completed response.
            # Memory failure must NOT break the chat.
            # --------------------------------------------------

            try:
                extract_memory(
                    user_id,
                    user_message,
                )
            except Exception as error:
                print(
                    f"Memory extraction error: {error}"
                )

    return StreamingResponse(
        response_generator(),
        media_type="text/plain",
    )