// src/components/MessageInput.tsx
'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

interface Props {
  onSend: (text: string) => Promise<void> | void;
}

export function MessageInput({ onSend }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handle = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSend(text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed left-64 right-0 bottom-0 bg-white border-t border-gray-200 p-3 flex items-center gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handle()}
        placeholder="Type a message..."
        className="flex-1 border rounded px-3 py-2"
        disabled={sending}
      />
      <button onClick={handle} disabled={sending || !text.trim()} className="px-3 py-2 bg-green-600 text-white rounded">
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
