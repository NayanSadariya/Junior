from pydantic import BaseModel


class GoogleAuthRequest(BaseModel):
    credential: str


class ChatRequest(BaseModel):
    user_id: str | None = None
    conversation_id: str
    message: str


class ConversationRequest(BaseModel):
    user_id: str | None = None
    title: str = "New Chat"
