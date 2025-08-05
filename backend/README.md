# ChatGPT Prompt Enhancer Backend

This is the backend API for the ChatGPT Prompt Enhancer Chrome extension.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env file and add your Gemini API key
   # Get your API key from: https://makersuite.google.com/app/apikey
   ```

3. **Configure your .env file:**
   ```env
   # Replace with your actual Gemini API key
   GEMINI_API_KEY=your_actual_api_key_here
   
   # Optional: Customize server settings
   HOST=127.0.0.1
   PORT=8000
   ALLOWED_ORIGINS=chrome-extension://*
   ```

4. **Run the backend:**
   ```bash
   python main.py
   ```
   
   Or with uvicorn directly:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

## Security Features

- **Environment variables**: API keys are stored securely in `.env` files
- **Git ignore**: `.env` files are automatically excluded from version control
- **Validation**: Backend validates that required environment variables are set

## Features

- **AI-powered enhancement**: Uses Google's Gemini 2.0 Flash API for intelligent prompt enhancement
- **Role-specific prompts**: Tailored enhancement for different professional roles
- **General enhancement**: Generic prompt enhancement for any type of request
- **Async processing**: Fast and efficient API calls

## API Endpoints

- `POST /generate-prompt` - Generate enhanced prompt with role
- `POST /enhance-prompt` - Enhance general prompt
- `GET /health` - Health check

## Example Usage

```bash
# Generate prompt with role
curl -X POST "http://127.0.0.1:8000/generate-prompt" \
  -H "Content-Type: application/json" \
  -d '{"role": "Developer", "input": "help me debug this code"}'

# Enhance general prompt
curl -X POST "http://127.0.0.1:8000/enhance-prompt" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "write a story about a robot"}'
```

## How It Works

The backend uses Gemini 2.0 Flash API to enhance prompts:

1. **Role-based enhancement**: Sends user input with role context to Gemini for professional enhancement
2. **General enhancement**: Uses Gemini to improve any prompt with better structure and clarity
3. **Smart prompting**: Gemini understands context and generates more effective prompts for ChatGPT

## Development

The backend runs on `http://127.0.0.1:8000` and includes:
- CORS support for Chrome extensions
- Error handling and fallbacks
- Async HTTP client for API calls
- Pydantic models for request/response validation
- Secure environment variable management 