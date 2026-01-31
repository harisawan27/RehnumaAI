
'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { useUser } from '@/firebase';
import { Paperclip, Send, BrainCircuit, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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
        <div className="p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex items-start gap-3',
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={msg.sender === 'user' ? user?.photoURL ?? '' : ''} />
                <AvatarFallback>
                  {msg.sender === 'user' ? (
                    <UserIcon className="h-5 w-5" />
                  ) : (
                    <BrainCircuit className="h-5 w-5" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  'max-w-[75%] rounded-lg p-3 text-sm',
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: marked(msg.text) }} />
              </div>
            </div>
          ))}
           {isResponding && (
             <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarFallback>
                        <BrainCircuit className="h-5 w-5 animate-pulse" />
                    </AvatarFallback>
                </Avatar>
                <div className="rounded-lg p-3 bg-muted">
                    <Skeleton className="h-5 w-24" />
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
