
'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { useUser } from '@/firebase';
import { Send, BrainCircuit, User as UserIcon, Copy, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { generalChat } from '@/app/actions';
import { cn } from '@/lib/utils';
import { marked } from 'marked';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

// Map client-side sender to server-side role
const roleMap = {
  user: 'user',
  bot: 'model',
} as const;


export function GeneralChatView() {
  const { user } = useUser();
  const [input, setInput] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'A';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isResponding]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMessageText = input;
    const userMessage: Message = { id: `user-${Date.now()}`, text: userMessageText, sender: 'user' };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsResponding(true);
    
    // Artificial delay for UX
    await new Promise(res => setTimeout(res, 300));
    scrollToBottom();

    try {
      // Prepare history for the API call
      const history = updatedMessages.slice(0, -1).map(msg => ({
        role: roleMap[msg.sender],
        parts: [{ text: msg.text }],
      }));  
        
      const botResponseText = await generalChat({
        message: userMessageText,
        history: history,
      });

      const botMessage: Message = { id: `bot-${Date.now()}`, text: botResponseText, sender: 'bot' };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = { id: `bot-error-${Date.now()}`, text: 'Sorry, something went wrong. Please try again.', sender: 'bot' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex items-start gap-2',
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={msg.sender === 'user' ? user?.photoURL ?? '' : ''} />
                <AvatarFallback className={msg.sender === 'user' ? 'bg-emerald-500 text-white' : 'bg-slate-200'}>
                  {msg.sender === 'user' ? (
                    <UserIcon className="h-4 w-4" />
                  ) : (
                    <BrainCircuit className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                'flex flex-col gap-1',
                msg.sender === 'user' ? 'items-end' : 'items-start'
              )}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
                    msg.sender === 'user'
                      ? 'message-user'
                      : 'message-ai'
                  )}
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0" dangerouslySetInnerHTML={{ __html: marked(msg.text) }} />
                </div>
                {/* Action buttons - always visible */}
                <div className={cn(
                  'flex items-center gap-1',
                  msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}>
                  <button
                    onClick={() => copyToClipboard(msg.text, msg.id)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                    title="Copy message"
                  >
                    {copiedId === msg.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition"
                    title="Delete message"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {isResponding && (
            <div className="flex items-start gap-2">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarFallback className="bg-slate-200">
                  <BrainCircuit className="h-4 w-4 animate-pulse text-emerald-500" />
                </AvatarFallback>
              </Avatar>
              <div className="message-ai px-4 py-2">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t bg-background p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1"
            disabled={isResponding}
          />
          <Button type="submit" disabled={!input.trim() || isResponding}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
