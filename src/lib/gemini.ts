// src/lib/gemini.ts
'use client';

export async function geminiSend(message: string): Promise<string> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) throw new Error('Failed to get AI response');

    const data = await res.json();
    return data.reply || 'AI did not return any text.';
  } catch (err) {
    console.error('Gemini API error:', err);
    return 'Error: Failed to connect to AI.';
  }
}
