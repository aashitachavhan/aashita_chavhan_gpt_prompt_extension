from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="ChatGPT Prompt Enhancer Backend")

# Add CORS middleware to allow requests from the extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini API configuration from environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required. Please set it in your .env file.")

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

class GeneratePromptRequest(BaseModel):
    role: str
    input: str

class EnhancePromptRequest(BaseModel):
    prompt: str

class PromptResponse(BaseModel):
    prompt: str

async def call_gemini_api(prompt_text: str, role: Optional[str] = None) -> str:
    """Call Gemini 2.0 Flash API to generate enhanced prompt"""
    
    if role:
        system_prompt = f"""You are a helpful AI that takes a user message and role, and generates a well-structured and accurate prompt tailored for that role. 

Role: {role}
User Input: {prompt_text}

Please enhance this into a professional, detailed prompt that will get the best response from ChatGPT. Include:
1. Clear context about the role
2. Specific requirements
3. Desired output format
4. Any relevant constraints or considerations

Make it comprehensive but concise."""
    else:
        system_prompt = f"""Please enhance and structure this prompt to make it more effective for ChatGPT:

Original prompt: {prompt_text}

Please provide:
1. A clear, well-structured prompt
2. Specific requirements and context
3. Desired output format
4. Any relevant considerations

Make it professional and comprehensive."""
    
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": system_prompt
                    }
                ]
            }
        ]
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
                return f"{role}: {prompt_text}" if role else prompt_text
                
            return enhanced_text.strip()
            
    except httpx.TimeoutException:
        print("Gemini API timeout")
        return f"{role}: {prompt_text}" if role else prompt_text
    except Exception as e:
        print(f"Gemini API error: {e}")
        return f"{role}: {prompt_text}" if role else prompt_text

@app.post("/generate-prompt", response_model=PromptResponse)
async def generate_prompt(request: GeneratePromptRequest):
    """Generate enhanced prompt based on role and input"""
    try:
        enhanced_prompt = await call_gemini_api(request.input, request.role)
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

@app.get("/test")
async def test_endpoint():
    """Test endpoint for debugging"""
    return {"message": "Backend is working!", "timestamp": "2024-01-01"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Backend is running"}

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host=host, port=port) 