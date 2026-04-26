import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("NEXT_PUBLIC_GEMINI_API_KEY is missing. AI features may fail.");
}

export const ai = new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY' });
