from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
import re
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

async def call_gemini_api(prompt_text: str, role: Optional[str] = None) -> str:
    """Call Gemini 2.0 Flash API to generate enhanced prompt tailored for a specific role"""
    
    if role:
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
- No markdown formatting - just clean, structured text

Create a comprehensive, actionable guide that speaks directly to the {role} about their specific task."""
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
                return f"You are a {role}. Please help me with: {prompt_text}" if role else prompt_text
            
            # Clean markdown formatting from the response
            cleaned_text = clean_markdown_formatting(enhanced_text)
            
            return cleaned_text.strip()
            
    except httpx.TimeoutException:
        print("Gemini API timeout")
        return f"You are a {role}. Please help me with: {prompt_text}" if role else prompt_text
    except Exception as e:
        print(f"Gemini API error: {e}")
        return f"You are a {role}. Please help me with: {prompt_text}" if role else prompt_text

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