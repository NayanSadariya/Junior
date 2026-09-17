from pydantic import BaseModel


class ChatRequest(BaseModel):
    user_id: str
    conversation_id: str
    message: str

class ConversationRequest(BaseModel):
    user_id: str
    title: str = "New Chat"
