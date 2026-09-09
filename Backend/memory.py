from datetime import datetime

from database import memories


def save_memory(user_id: str, content: str):
    memories.insert_one({
        "user_id": user_id,
        "content": content,
        "timestamp": datetime.now()
    })


def get_user_memories(user_id: str):
    return list(
        memories.find({
            "user_id": user_id
        })
    )