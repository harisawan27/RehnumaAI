"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

type ChatHistory = { role: "user" | "model"; parts: { text: string }[] };

export async function generalChat({
  message,
  history = [],
}: {
  message: string;
  history?: ChatHistory[];
}) {
  try {
    console.log("📩 Sending to Gemini:", { message, history });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message);

    console.log("✅ Gemini result:", result.response.text());

    return result.response.text();
  } catch (err: any) {
    console.error("❌ generalChat error:", err.message, err.stack);
    return "Sorry, something went wrong. Please try again.";
  }
}
