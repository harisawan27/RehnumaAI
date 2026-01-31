'use server';
import 'dotenv/config'; // Load environment variables
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, ChatSession } from "@google/generative-ai";

const MODEL_NAME = "gemini-2.5-flash";

interface SimpleHistoryItem {
  role: "user" | "model";
  content: string;
}

export async function chatWithRehnuma(
  message: string,
  history: SimpleHistoryItem[] = [],
): Promise<string> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY in .env file.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    };

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];
    
    // The history for the ChatSession needs to have a specific format.
    // It expects `parts` to be an array of objects with a `text` property.
    const formattedHistoryForSDK = history.map(item => ({
        role: item.role,
        parts: [{ text: item.content }]
    }));


    const chat: ChatSession = model.startChat({
      generationConfig,
      safetySettings,
      history: formattedHistoryForSDK,
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    return text.trim() || "I couldn’t generate a proper reply. Please try again.";
  } catch (error: any) {
    console.error("❌ Gemini error:", error.message || error);
    return "Sorry, something went wrong. Please try again later.";
  }
}
