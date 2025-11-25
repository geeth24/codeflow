'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles } from 'lucide-react';
import { explainCode } from '@/lib/api';
import { TraceStep } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { AppLogo } from '@/components/app-logo';

interface TutorPanelProps {
  code: string;
  trace: TraceStep[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function TutorPanel({ code, trace }: TutorPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Add initial empty assistant message for streaming
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      await explainCode(code, trace, (chunk) => {
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          const lastMessage = newMessages[lastIndex];

          if (lastMessage.role === 'assistant') {
            newMessages[lastIndex] = {
              ...lastMessage,
              content: lastMessage.content + chunk,
            };
          }
          return newMessages;
        });
      });
    } catch (error) {
      setMessages((prev) => {
        const newMessages = [...prev];
        // Remove the empty assistant message if it failed
        if (
          newMessages[newMessages.length - 1].role === 'assistant' &&
          !newMessages[newMessages.length - 1].content
        ) {
          newMessages.pop();
        }
        return [
          ...newMessages,
          {
            role: 'assistant',
            content: `Error: ${error instanceof Error ? error.message : 'Failed to get explanation'}`,
          },
        ];
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      <div className="border-border/20 bg-muted/50 flex items-center justify-between border-b p-4 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-500 to-cyan-400 p-1.5 shadow-lg shadow-blue-500/20">
            <AppLogo className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">CodeFlow Tutor</h3>
            <p className="text-muted-foreground text-[10px]">AI Execution Assistant</p>
          </div>
        </div>
        {loading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          >
            <Sparkles className="h-4 w-4 text-blue-400" />
          </motion.div>
        )}
      </div>

      <ScrollArea className="h-0 flex-1 p-4">
        <div className="space-y-4 pb-4">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-8 text-center"
            >
              <div className="bg-muted/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Sparkles className="h-8 w-8 text-blue-400/50" />
              </div>
              <p className="text-muted-foreground mb-2 text-sm">
                Ready to explain your code execution
              </p>
              <p className="text-muted-foreground/50 mx-auto max-w-[200px] text-xs">
                Ask questions about variables, flow, or logic patterns
              </p>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: message.role === 'user' ? 20 : -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-none'
                      : 'bg-muted/50 text-foreground border-border/20 rounded-tl-none border'
                  }`}
                >
                  <div className="text-xs leading-relaxed">
                    <ReactMarkdown
                      components={{
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          return match ? (
                            <div className="bg-muted my-2 overflow-x-auto rounded-md p-2">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </div>
                          ) : (
                            <code
                              className="bg-muted rounded px-1 py-0.5 font-mono text-[10px]"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
                        ol: ({ children }) => (
                          <ol className="mb-2 ml-4 list-decimal">{children}</ol>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}

            {loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-start"
              >
                <div className="bg-muted/50 border-border/20 flex gap-1 rounded-2xl rounded-tl-none border p-4">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="bg-muted/50 border-border/20 border-t p-3 backdrop-blur-xl">
        <div className="relative flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about the code..."
            disabled={loading}
            className="bg-background border-border focus-visible:ring-primary/50 h-10 rounded-xl pr-10 text-xs"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="bg-primary hover:bg-primary/90 absolute top-1 right-1 h-8 w-8 rounded-lg transition-all"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
