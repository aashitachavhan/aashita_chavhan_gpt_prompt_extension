from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
import httpx
import os
import re
from typing import Optional, List
from dotenv import load_dotenv
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
from passlib.context import CryptContext
import jwt

# Load environment variables
load_dotenv()

app = FastAPI(title="ChatGPT Context-Aware Prompt Enhancer Backend")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB configuration
MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "prompt_enhancer")
JWT_SECRET = os.getenv("JWT_SECRET")

if not MONGODB_URL:
    raise ValueError("MONGODB_URL required")
if not JWT_SECRET:
    raise ValueError("JWT_SECRET required in .env file")

try:
    client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=5000, connectTimeoutMS=10000, maxPoolSize=50, retryWrites=True)
    client.admin.command('ping')
    db = client[DATABASE_NAME]
    contexts_collection = db.contexts
    users_collection = db.users
    contexts_collection.create_index("user_id")
    contexts_collection.create_index([("user_id", 1), ("created_at", -1)])
    users_collection.create_index("email", unique=True)
    print(f"✅ Connected to MongoDB Atlas: {DATABASE_NAME}")
except Exception as e:
    print(f"❌ MongoDB Atlas connection error: {e}")
    raise e

# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY required")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")
JWT_ALGORITHM = "HS256"

class UserRegister(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class GeneratePromptRequest(BaseModel):
    role: str
    custom_role: Optional[str] = None
    persona: Optional[str] = None
    input: str
    context_id: Optional[str] = None

class SaveContextRequest(BaseModel):
    role: str
    custom_role: Optional[str] = None
    persona: Optional[str] = None
    context: Optional[str] = None
    name: Optional[str] = None
    context_id: Optional[str] = None  # Added for update

class EnhancePromptRequest(BaseModel):
    prompt: str

class PromptResponse(BaseModel):
    prompt: str

class ContextResponse(BaseModel):
    success: bool
    message: str
    context_id: Optional[str] = None

class ContextsResponse(BaseModel):
    success: bool
    contexts: List[dict]

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = users_collection.find_one({"email": email})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return {"user_id": str(user["_id"]), "email": user["email"]}
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

def clean_markdown_formatting(text: str) -> str:
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'\*{1,2}([^*]+)\*{1,2}', r'\1', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    lines = text.split('\n')
    cleaned_lines = []
    list_counter = 1
    in_list = False
    for line in lines:
        line = line.strip()
        if not line:
            if cleaned_lines and cleaned_lines[-1] != '':
                cleaned_lines.append('')
            continue
        if re.match(r'^[-*]\s+', line):
            item_text = re.sub(r'^[-*]\s+', '', line)
            cleaned_lines.append(f"{list_counter}. {item_text}")
            list_counter += 1
            in_list = True
        elif re.match(r'^\d+\.\s+', line):
            cleaned_lines.append(line)
            in_list = True
        elif line.endswith(':') or re.match(r'^[A-Z][^.]*:$', line):
            if cleaned_lines and cleaned_lines[-1] != '':
                cleaned_lines.append('')
            cleaned_lines.append(line)
            cleaned_lines.append('')
            list_counter = 1
            in_list = False
        else:
            if in_list and not line.startswith(('Requirements', 'Steps', 'Output', 'Note', 'Expected')):
                cleaned_lines.append('')
                in_list = False
            cleaned_lines.append(line)
    text = '\n'.join(cleaned_lines)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'>\s+', '', text)
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()

def get_user_context(user_id: str, context_id: Optional[str] = None) -> Optional[str]:
    try:
        if context_id:
            context_doc = contexts_collection.find_one({"_id": ObjectId(context_id), "user_id": user_id})
        else:
            context_doc = contexts_collection.find_one({"user_id": user_id}, sort=[("created_at", -1)])
        if context_doc and context_doc.get("context"):
            print(f"📥 Context retrieved for user: {user_id}, context_id: {context_id or 'latest'}")
            return context_doc.get("context", "")
        else:
            print(f"❌ No context found for user: {user_id}, context_id: {context_id or 'latest'}")
    except Exception as e:
        print(f"❌ Error retrieving context from Atlas: {e}")
    return None

async def call_gemini_api(prompt_text: str, role: str, custom_role: Optional[str] = None, persona: Optional[str] = None, context: Optional[str] = None) -> str:
    effective_role = custom_role if role == "Custom" and custom_role else role
    if role == "Custom" and persona:
        system_prompt = f"""You are assisting a user who embodies the persona of {persona}, acting as a {effective_role}. The user is asking the following query{' in the context of their project' if context else ''}. Frame the response as if the user is this persona, using their expertise and perspective to provide a tailored, actionable answer.

Persona: {persona}
User's Role: {effective_role}
{'Project Context: ' + context if context else ''}
User's Query: {prompt_text}

FORMATTING RULES:
- Use PLAIN TEXT only - NO markdown, stars, backticks, or special characters
- Structure with clear sections and numbered points for readability
- Add proper line breaks between sections for visual clarity
- Make the response conversational, addressing the user as the persona (e.g., 'As an {persona}, you would...')
- Tailor the response to the persona's expertise{' and project context' if context else ''}

STRUCTURE THE RESPONSE EXACTLY LIKE THIS:

As an {persona}, here's how you can address: [task description]

{'Project Context Integration:' if context else 'Task Overview:'}
[{'Brief summary of how the query relates to the users project, tailored to the persona' if context else 'Brief description of the task, tailored to the persona'}]

Steps to Follow:
1. [First specific step leveraging the persona's expertise{' and project context' if context else ''}]
2. [Second specific step tailored to the persona{' and project context' if context else ''}]
3. [Third specific step reflecting the persona's perspective]
4. [Additional steps as needed]

Requirements for you as an {effective_role}:
1. [Specific requirement tailored to the persona{' and project context' if context else ''}]
2. [Specific requirement reflecting the persona's expertise]
3. [Additional requirements]

Expected Output:
[Clear description of what the {persona} should produce/deliver{' considering the project context' if context else ''}]

Additional Considerations:
1. [Best practice or tip specific to the persona{' and project context' if context else ''}]
2. [Another consideration tailored to the persona]

IMPORTANT GUIDELINES:
- Start with "As an {persona}, here's how you can address:"
- Address the user directly as the persona throughout the response
- Make each step actionable and specific to the persona's expertise{' and project context' if context else ''}
- {'Reference technologies tools mentioned in the project context' if context else 'Include relevant technologies tools for the persona'}
- Keep sections well-spaced with line breaks
- No markdown formatting - just clean, structured text"""
    elif role and context:
        system_prompt = f"""You are an expert AI assistant. Create a personalized, comprehensive prompt for a {role} based on their query and project context.

User's Role: {role}
Project Context: {context}
User's Current Query: {prompt_text}

FORMATTING RULES:
- Use PLAIN TEXT only - NO markdown, stars, backticks, or special characters
- Structure with clear sections and numbered points for readability
- Add proper line breaks between sections for visual clarity
- Make it conversational and role-specific
- Integrate the project context naturally with the current query

STRUCTURE THE RESPONSE EXACTLY LIKE THIS:

Based on your {role} role and project context, here's what you need to do for: [task description]

Project Context Integration:
[Brief summary of how the current query relates to the user's project]

Steps to Follow:
1. [First specific step considering both role and project context]
2. [Second specific step that builds on the project context]
3. [Third specific step that leverages existing project knowledge]
4. [Additional steps as needed]

Requirements for your project:
1. [Requirement that aligns with project context]
2. [Technical requirement specific to the project stack]
3. [Additional requirements based on context]

Expected Output:
[Clear description of what should be delivered, considering the project context]

Contextual Considerations:
1. [How this relates to the existing project architecture]
2. [Integration points with current project components]
3. [Best practices specific to the project stack mentioned in context]

IMPORTANT GUIDELINES:
- Start with "Based on your {role} role and project context, here's what you need to do for:"
- Seamlessly blend the project context with the current query
- Make each step actionable and project-specific
- Reference technologies/tools mentioned in the project context
- Keep sections well-spaced with line breaks
- No markdown formatting - just clean, structured text"""
    elif role:
        system_prompt = f"""You are an expert AI assistant. Create a personalized, comprehensive prompt for a {role} based on their query.

User's Role: {role}
User's Query: {prompt_text}

FORMATTING RULES:
- Use PLAIN TEXT only - NO markdown, stars, backticks, or special characters
- Structure with clear sections and numbered points for readability
- Add proper line breaks between sections for visual clarity
- Make it conversational and role-specific

STRUCTURE THE RESPONSE EXACTLY LIKE THIS:

As a {role}, here's what you need to do for: [task description]

Task Overview:
[Brief description of the task, tailored to the role]

Steps to Follow:
1. [First specific step for this role]
2. [Second specific step for this role]
3. [Third specific step for this role]
4. [Additional steps as needed]

Requirements for you as a {role}:
1. [Specific requirement 1]
2. [Specific requirement 2]
3. [Additional requirements]

Expected Output:
[Clear description of what the {role} should produce/deliver]

Additional Considerations:
1. [Best practice or tip specific to this role]
2. [Another consideration for this role]

IMPORTANT GUIDELINES:
- Start with "As a {role}, here's what you need to do for:"
- Make each step actionable and role-specific
- Use "you" throughout to make it personal
- Include role-relevant best practices and considerations
- Keep sections well-spaced with line breaks
- No markdown formatting - just clean, structured text"""
    else:
        system_prompt = f"""Please enhance and structure this prompt to make it more effective for ChatGPT:

Original prompt: {prompt_text}

FORMATTING RULES:
- Use PLAIN TEXT only - NO markdown, stars, backticks, or special characters
- Structure with clear sections and numbered points
- Add proper line breaks for readability

STRUCTURE THE RESPONSE LIKE THIS:

Here's what you need to do: [clear task description]

Steps to Follow:
1. [First step]
2. [Second step]
3. [Third step]

Requirements:
1. [Requirement 1]
2. [Requirement 2]

Expected Output:
[Description of desired result]

Make it comprehensive, actionable, and well-formatted with clear sections and proper spacing."""
    
    payload = {
        "contents": [{"parts": [{"text": system_prompt}]}],
        "generationConfig": {"temperature": 0.7, "topK": 40, "topP": 0.8, "maxOutputTokens": 2048}
    }
    
    headers = {"Content-Type": "application/json", "X-goog-api-key": GEMINI_API_KEY}
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(GEMINI_API_URL, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            enhanced_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            if not enhanced_text:
                fallback = f"You are a {effective_role}. " if effective_role else ""
                if persona:
                    fallback += f"Persona: {persona}. "
                if context:
                    fallback += f"Project context: {context}. "
                fallback += f"Please help me with: {prompt_text}"
                return fallback
            cleaned_text = clean_markdown_formatting(enhanced_text)
            return cleaned_text.strip()
    except httpx.TimeoutException:
        print("Gemini API timeout")
        fallback = f"You are a {effective_role}. " if effective_role else ""
        if persona:
            fallback += f"Persona: {persona}. "
        if context:
            fallback += f"Project context: {context}. "
        fallback += f"Please help me with: {prompt_text}"
        return fallback
    except Exception as e:
        print(f"Gemini API error: {e}")
        fallback = f"You are a {effective_role}. " if effective_role else ""
        if persona:
            fallback += f"Persona: {persona}. "
        if context:
            fallback += f"Project context: {context}. "
        fallback += f"Please help me with: {prompt_text}"
        return fallback

@app.post("/register")
async def register_user(user: UserRegister):
    try:
        if users_collection.find_one({"email": user.email}):
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed_password = get_password_hash(user.password)
        user_data = {
            "email": user.email,
            "hashed_password": hashed_password,
            "created_at": datetime.utcnow()
        }
        result = users_collection.insert_one(user_data)
        print(f"✅ User registered: {user.email}, user_id: {str(result.inserted_id)}")
        return {"success": True, "user_id": str(result.inserted_id)}
    except Exception as e:
        print(f"❌ Error registering user: {e}")
        raise HTTPException(status_code=500, detail=f"Error registering user: {str(e)}")

@app.post("/login", response_model=Token)
async def login_user(user: UserLogin):
    try:
        db_user = users_collection.find_one({"email": user.email})
        if not db_user or not verify_password(user.password, db_user["hashed_password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
        print(f"✅ User logged in: {user.email}")
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        print(f"❌ Error logging in: {e}")
        raise HTTPException(status_code=500, detail=f"Error logging in: {str(e)}")

@app.post("/save-context", response_model=ContextResponse)
async def save_context(request: SaveContextRequest, current_user: dict = Depends(get_current_user)):
    try:
        context_data = {
            "user_id": current_user["user_id"],
            "role": request.role,
            "custom_role": request.custom_role,
            "persona": request.persona,
            "context": request.context,
            "name": request.name,
            "updated_at": datetime.utcnow()
        }
        if request.context_id:
            result = contexts_collection.update_one(
                {"_id": ObjectId(request.context_id), "user_id": current_user["user_id"]},
                {"$set": context_data}
            )
            if result.matched_count == 0:
                return ContextResponse(success=False, message="Context not found or not owned by user")
            context_id = request.context_id
            print(f"💾 Context updated for user: {current_user['user_id']}, context_id: {context_id}")
        else:
            context_data["created_at"] = datetime.utcnow()
            result = contexts_collection.insert_one(context_data)
            context_id = str(result.inserted_id)
            print(f"💾 Context saved for user: {current_user['user_id']}, context_id: {context_id}")
        return ContextResponse(success=True, message="Context saved successfully", context_id=context_id)
    except Exception as e:
        print(f"❌ Error saving context: {e}")
        return ContextResponse(success=False, message=f"Error saving context: {str(e)}")

@app.post("/generate-prompt", response_model=PromptResponse)
async def generate_prompt(request: GeneratePromptRequest, current_user: dict = Depends(get_current_user)):
    try:
        context = get_user_context(current_user["user_id"], request.context_id)
        enhanced_prompt = await call_gemini_api(request.input, request.role, request.custom_role, request.persona, context)
        return PromptResponse(prompt=enhanced_prompt)
    except Exception as e:
        print(f"❌ Error generating prompt: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating prompt: {str(e)}")

@app.post("/enhance-prompt", response_model=PromptResponse)
async def enhance_prompt(request: EnhancePromptRequest, current_user: dict = Depends(get_current_user)):
    try:
        enhanced_prompt = await call_gemini_api(request.prompt)
        return PromptResponse(prompt=enhanced_prompt)
    except Exception as e:
        print(f"❌ Error enhancing prompt: {e}")
        raise HTTPException(status_code=500, detail=f"Error enhancing prompt: {str(e)}")

@app.get("/get-contexts", response_model=ContextsResponse)
async def get_contexts(current_user: dict = Depends(get_current_user)):
    try:
        context_docs = contexts_collection.find({"user_id": current_user["user_id"]}).sort("created_at", -1)
        contexts = [
            {
                "context_id": str(doc["_id"]),
                "role": doc["role"],
                "custom_role": doc.get("custom_role"),
                "persona": doc.get("persona"),
                "context": doc.get("context"),
                "name": doc.get("name"),
                "created_at": doc["created_at"].isoformat()
            }
            for doc in context_docs
        ]
        print(f"✅ Contexts retrieved for user: {current_user['user_id']}")
        return ContextsResponse(success=True, contexts=contexts)
    except Exception as e:
        print(f"❌ Error retrieving contexts: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving contexts: {str(e)}")

@app.delete("/delete-context/{context_id}")
async def delete_context(context_id: str, current_user: dict = Depends(get_current_user)):
    try:
        result = contexts_collection.delete_one({"_id": ObjectId(context_id), "user_id": current_user["user_id"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Context not found or not owned by user")
        print(f"🗑️ Context deleted for user: {current_user['user_id']}, context_id: {context_id}")
        return {"success": True, "message": "Context deleted successfully"}
    except Exception as e:
        print(f"❌ Error deleting context: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting context: {str(e)}")

@app.get("/test")
async def test_endpoint():
    try:
        client.admin.command('ping')
        stats = db.command("dbstats")
        collections_count = len(db.list_collection_names())
        atlas_status = {
            "connected": True,
            "database": db.name,
            "collections_count": collections_count,
            "storage_size": f"{stats.get('storageSize', 0)} bytes"
        }
        print("🔍 MongoDB Atlas connection test successful")
    except Exception as e:
        atlas_status = {"connected": False, "error": str(e)}
        print(f"❌ MongoDB Atlas connection test failed: {e}")
    return {"message": "Backend is working!", "mongodb_atlas": atlas_status, "timestamp": datetime.utcnow().isoformat()}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Backend is running"}

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host=host, port=port)