// src/app/api/chat/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

// Debug: Check if API key is present
const apiKey = process.env.GEMINI_API_KEY;
console.log('[Chat API] API Key present:', !!apiKey);
console.log('[Chat API] API Key length:', apiKey?.length || 0);

if (!apiKey) {
  console.error('[Chat API] GEMINI_API_KEY is not set!');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

export async function POST(req: Request) {
  try {
    // Check API key first
    if (!apiKey) {
      console.error('[Chat API] Request failed: No API key configured');
      return new Response(JSON.stringify({
        error: 'API key not configured',
        details: 'GEMINI_API_KEY environment variable is missing'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { message, instructions, top_p, top_k, files } = await req.json(); // ✅ Added files
    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: instructions || "You are Rehnuma AI, a friendly, helpful assistant created by Muhammad Haris Awan.Your role is to help the user learn, guide ethically, and provide accurate educational content. Always respond politely and respectfully, keeping Islamic history and ethical teachings in mind when relevant.Encourage good character, honesty, and thoughtful reflection.If the user asks general knowledge or study questions, answer clearly and concisely.Avoid giving harmful advice or false information.Always follow instructions provided. Respond with informative, polite, and accurate answers.",
    });

    // ✅ Build content parts with files support
    const parts: any[] = [];

    // ✅ Add file attachments FIRST if present (important for context)
    if (files && Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        if (file.mimeType && file.data) {
          parts.push({
            inlineData: {
              mimeType: file.mimeType,
              data: file.data, // base64 string
            },
          });
        }
      }
    }

    // ✅ Add text message AFTER files
    parts.push({ text: message });

    const stream = await model.generateContentStream({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        topP: top_p || 0.95,
        topK: top_k || 50,
      },
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream.stream) {
            const text = chunk.text();
            if (text) {
              const payload = JSON.stringify({ text });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('[Chat API] Error:', err);
    console.error('[Chat API] Error message:', err?.message);
    console.error('[Chat API] Error stack:', err?.stack);

    // Return detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development'
      ? err?.message || 'Unknown error'
      : 'Internal Server Error';

    return new Response(JSON.stringify({
      error: errorMessage,
      details: err?.message || 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}