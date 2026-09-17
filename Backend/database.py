import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

# MongoDB connection
mongo_client = MongoClient(os.getenv("MONGODB_URL"))

db = mongo_client["junior"]

messages = db["messages"]
memories = db["memories"]
conversations = db["conversations"] 