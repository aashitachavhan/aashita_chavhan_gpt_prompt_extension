import axios from "axios";

const GEMINI_API_KEY = "AIzaSyDG3rsL6xxgzeCnWKDqAW-5-ckjbrozaXw"; // Replace this with your key

export const generatePrompt = async (role, userInput) => {
  const systemInstruction = `You are a helpful AI that takes a user message and role, and generates a well-structured and accurate prompt tailored for that role. The role is: ${role}.`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: userInput }],
      },
    ],
  };

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-client": "gl-js/1.0.0",
        },
      }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || `${role}: ${userInput}`;
  } catch (error) {
    console.error("Gemini API error:", error);
    return `${role}: ${userInput}`; // fallback
  }
};
