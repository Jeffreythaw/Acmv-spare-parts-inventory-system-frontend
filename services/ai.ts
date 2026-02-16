
import { GoogleGenAI } from "@google/genai";
import { ReorderSuggestion } from "../types";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!GEMINI_API_KEY) return null;
  if (!ai) ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  return ai;
}

export const aiService = {
  getReplenishmentAdvice: async (suggestions: ReorderSuggestion[]) => {
    try {
      const client = getAiClient();
      if (!client) {
        return "AI assistant is not configured. Set VITE_GEMINI_API_KEY in frontend environment variables.";
      }

      const prompt = `Analyze these inventory reorder suggestions for an ACMV (HVAC) spare parts system and provide a 2-3 sentence strategic advice on which items to prioritize and why. 
      Suggestions: ${JSON.stringify(suggestions)}`;
      
      // Updated to use 'gemini-3-flash-preview' for basic text tasks
      const response = await client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature: 0.7,
        },
      });

      // Extract text output using the .text property
      return response.text || "Unable to generate advice at this time.";
    } catch (error) {
      console.error("AI Advice Error:", error);
      return "AI assistant is currently offline. Please review manually.";
    }
  }
};
