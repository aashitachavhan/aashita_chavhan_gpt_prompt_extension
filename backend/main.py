from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
import re
from typing import Optional
from dotenv import load_dotenv
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId
import uuid

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="ChatGPT Context-Aware Prompt Enhancer Backend")

# Add CORS middleware to allow requests from the extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Atlas configuration
MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "prompt_enhancer")

if not MONGODB_URL:
    raise ValueError("MONGODB_URL environment variable is required. Please set your MongoDB Atlas connection string in your .env file.")

try:
    # MongoDB Atlas connection with additional options for better reliability
    client = MongoClient(
        MONGODB_URL,
        serverSelectionTimeoutMS=5000,  # 5 second timeout
        connectTimeoutMS=10000,         # 10 second connection timeout
        maxPoolSize=50,                 # Maximum number of connections
        retryWrites=True               # Enable retryable writes
    )
    
    # Test the connection
    client.admin.command('ping')
    
    db = client[DATABASE_NAME]
    contexts_collection = db.contexts
    
    # Create index on user_id for better query performance
    contexts_collection.create_index("user_id")
    contexts_collection.create_index([("user_id", 1), ("created_at", -1)])
    
    print(f"✅ Connected to MongoDB Atlas: {DATABASE_NAME}")
    print(f"📊 Database: {db.name}")
    print(f"🔗 Collection: {contexts_collection.name}")
    
except Exception as e:
    print(f"❌ MongoDB Atlas connection error: {e}")
    print("🔧 Please check your MONGODB_URL in .env file")
    print("🔧 Make sure your IP is whitelisted in MongoDB Atlas")
    raise e

# Gemini API configuration from environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required. Please set it in your .env file.")

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

class GeneratePromptRequest(BaseModel):
    role: str
    input: str
    user_id: Optional[str] = None

class SaveContextRequest(BaseModel):
    role: str
    context: str
    user_id: Optional[str] = None

class EnhancePromptRequest(BaseModel):
    prompt: str

class PromptResponse(BaseModel):
    prompt: str

class ContextResponse(BaseModel):
    success: bool
    message: str
    context_id: Optional[str] = None

def clean_markdown_formatting(text: str) -> str:
    """Remove markdown formatting and convert to clean, well-structured text with proper spacing"""
    
    # Remove markdown headers (##, ###, etc.)
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    
    # Remove bold/italic markdown (**text**, *text*)
    text = re.sub(r'\*{1,2}([^*]+)\*{1,2}', r'\1', text)
    
    # Remove backticks for code (`code`)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    
    # Process lines for better structure
    lines = text.split('\n')
    cleaned_lines = []
    list_counter = 1
    in_list = False
    
    for line in lines:
        line = line.strip()
        
        # Skip empty lines but preserve one for spacing
        if not line:
            if cleaned_lines and cleaned_lines[-1] != '':
                cleaned_lines.append('')
            continue
        
        # Handle bullet points (- item or * item) 
        if re.match(r'^[-*]\s+', line):
            item_text = re.sub(r'^[-*]\s+', '', line)
            cleaned_lines.append(f"{list_counter}. {item_text}")
            list_counter += 1
            in_list = True
        # Handle existing numbered lists (1. item, 2. item)
        elif re.match(r'^\d+\.\s+', line):
            cleaned_lines.append(line)
            in_list = True
        # Section headers (lines ending with colon)
        elif line.endswith(':') or re.match(r'^[A-Z][^.]*:$', line):
            # Add spacing before new section if needed
            if cleaned_lines and cleaned_lines[-1] != '':
                cleaned_lines.append('')
            cleaned_lines.append(line)
            cleaned_lines.append('')  # Add space after header
            list_counter = 1
            in_list = False
        # Regular text
        else:
            # Add proper spacing after lists
            if in_list and not line.startswith(('Requirements', 'Steps', 'Output', 'Note', 'Expected')):
                cleaned_lines.append('')
                in_list = False
            cleaned_lines.append(line)
    
    # Join back and clean up excessive newlines
    text = '\n'.join(cleaned_lines)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Remove any remaining markdown-like formatting
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)  # Remove links [text](url)
    text = re.sub(r'>\s+', '', text)  # Remove blockquotes
    
    # Clean up extra spaces
    text = re.sub(r' {2,}', ' ', text)
    
    return text.strip()

def get_user_context(user_id: str) -> Optional[str]:
    """Retrieve user's saved context from MongoDB Atlas"""
    try:
        # Get the most recent context for the user
        context_doc = contexts_collection.find_one(
            {"user_id": user_id},
            sort=[("created_at", -1)]
        )
        
        if context_doc:
            print(f"📥 Context retrieved for user: {user_id}")
            return context_doc.get("context", "")
        else:
            print(f"❌ No context found for user: {user_id}")
        
    except Exception as e:
        print(f"❌ Error retrieving context from Atlas: {e}")
    
    return None

async def call_gemini_api(prompt_text: str, role: Optional[str] = None, context: Optional[str] = None) -> str:
    """Call Gemini 2.0 Flash API to generate enhanced prompt with context"""
    
    if role and context:
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
- No markdown formatting - just clean, structured text

Create a comprehensive, context-aware guide that speaks directly to the {role} working on their specific project."""
    
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
        "contents": [
            {
                "parts": [
                    {
                        "text": system_prompt
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "topK": 40,
            "topP": 0.8,
            "maxOutputTokens": 2048
        }
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": GEMINI_API_KEY
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GEMINI_API_URL,
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            
            data = response.json()
            enhanced_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            
            if not enhanced_text:
                fallback = f"You are a {role}. " if role else ""
                if context:
                    fallback += f"Project context: {context}. "
                fallback += f"Please help me with: {prompt_text}"
                return fallback
            
            # Clean markdown formatting from the response
            cleaned_text = clean_markdown_formatting(enhanced_text)
            
            return cleaned_text.strip()
            
    except httpx.TimeoutException:
        print("Gemini API timeout")
        fallback = f"You are a {role}. " if role else ""
        if context:
            fallback += f"Project context: {context}. "
        fallback += f"Please help me with: {prompt_text}"
        return fallback
    except Exception as e:
        print(f"Gemini API error: {e}")
        fallback = f"You are a {role}. " if role else ""
        if context:
            fallback += f"Project context: {context}. "
        fallback += f"Please help me with: {prompt_text}"
        return fallback

@app.post("/save-context", response_model=ContextResponse)
async def save_context(request: SaveContextRequest):
    """Save user context to MongoDB Atlas"""
    try:
        # Generate user_id if not provided
        user_id = request.user_id or str(uuid.uuid4())
        
        context_data = {
            "user_id": user_id,
            "role": request.role,
            "context": request.context,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Update existing context or insert new one
        result = contexts_collection.update_one(
            {"user_id": user_id},
            {"$set": context_data},
            upsert=True
        )
        
        context_id = str(result.upserted_id) if result.upserted_id else "updated"
        
        print(f"💾 Context saved to Atlas for user: {user_id}")
        print(f"📝 Context preview: {request.context[:100]}...")
        
        return ContextResponse(
            success=True,
            message="Context saved successfully to MongoDB Atlas",
            context_id=context_id
        )
            
    except Exception as e:
        print(f"❌ Error saving context to Atlas: {e}")
        return ContextResponse(
            success=False,
            message=f"Error saving context to MongoDB Atlas: {str(e)}"
        )

@app.post("/generate-prompt", response_model=PromptResponse)
async def generate_prompt(request: GeneratePromptRequest):
    """Generate enhanced prompt based on role, input, and saved context"""
    try:
        # Get user's saved context if user_id is provided
        context = None
        if request.user_id:
            context = get_user_context(request.user_id)
        
        enhanced_prompt = await call_gemini_api(request.input, request.role, context)
        return PromptResponse(prompt=enhanced_prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating prompt: {str(e)}")

@app.post("/enhance-prompt", response_model=PromptResponse)
async def enhance_prompt(request: EnhancePromptRequest):
    """Enhance a general prompt without specific role"""
    try:
        enhanced_prompt = await call_gemini_api(request.prompt)
        return PromptResponse(prompt=enhanced_prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error enhancing prompt: {str(e)}")

@app.get("/get-context/{user_id}")
async def get_context(user_id: str):
    """Get user's saved context"""
    try:
        context = get_user_context(user_id)
        if context:
            return {"success": True, "context": context}
        else:
            return {"success": False, "message": "No context found for user"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving context: {str(e)}")

@app.get("/test")
async def test_endpoint():
    """Test endpoint for debugging with MongoDB Atlas status"""
    try:
        # Test Atlas connection
        client.admin.command('ping')
        
        # Get database stats
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
        atlas_status = {
            "connected": False,
            "error": str(e)
        }
        print(f"❌ MongoDB Atlas connection test failed: {e}")
    
    return {
        "message": "Backend is working!",
        "mongodb_atlas": atlas_status,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Backend is running"}

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host=host, port=port)