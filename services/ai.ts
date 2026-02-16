
import { GoogleGenAI } from "@google/genai";
import { ReorderSuggestion } from "../types";

// Corrected GoogleGenAI initialization as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const aiService = {
  getReplenishmentAdvice: async (suggestions: ReorderSuggestion[]) => {
    try {
      const prompt = `Analyze these inventory reorder suggestions for an ACMV (HVAC) spare parts system and provide a 2-3 sentence strategic advice on which items to prioritize and why. 
      Suggestions: ${JSON.stringify(suggestions)}`;
      
      // Updated to use 'gemini-3-flash-preview' for basic text tasks
      const response = await ai.models.generateContent({
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
