"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, Sparkles } from "lucide-react"
import { explainCode } from "@/lib/api"
import { TraceStep } from "@/lib/types"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import { AppLogo } from "@/components/app-logo"

interface TutorPanelProps {
  code: string
  trace: TraceStep[]
}

interface Message {
  role: "user" | "assistant"
  content: string
}

export function TutorPanel({ code, trace }: TutorPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    // Add initial empty assistant message for streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    try {
      await explainCode(code, trace, (chunk) => {
        setMessages((prev) => {
          const newMessages = [...prev]
          const lastIndex = newMessages.length - 1
          const lastMessage = newMessages[lastIndex]
          
          if (lastMessage.role === "assistant") {
            newMessages[lastIndex] = {
              ...lastMessage,
              content: lastMessage.content + chunk
            }
          }
          return newMessages
        })
      })
    } catch (error) {
      setMessages((prev) => {
        const newMessages = [...prev]
        // Remove the empty assistant message if it failed
        if (newMessages[newMessages.length - 1].role === "assistant" && !newMessages[newMessages.length - 1].content) {
           newMessages.pop()
        }
        return [...newMessages, {
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Failed to get explanation"}`,
        }]
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-transparent">
      <div className="p-4 border-b border-border/20 bg-muted/50 flex items-center justify-between backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 p-1.5">
            <AppLogo className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">CodeFlow Tutor</h3>
            <p className="text-[10px] text-muted-foreground">AI Execution Assistant</p>
          </div>
        </div>
        {loading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
          </motion.div>
        )}
      </div>

      <ScrollArea className="flex-1 h-0 p-4">
        <div className="space-y-4 pb-4">
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-blue-400/50" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Ready to explain your code execution
              </p>
              <p className="text-xs text-muted-foreground/50 max-w-[200px] mx-auto">
                Ask questions about variables, flow, or logic patterns
              </p>
            </motion.div>
          )}
          
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: message.role === "user" ? 20 : -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted/50 text-foreground rounded-tl-none border border-border/20"
                  }`}
                >
                  <div className="text-xs leading-relaxed">
                    <ReactMarkdown 
                      components={{
                        code({node, className, children, ...props}) {
                          const match = /language-(\w+)/.exec(className || '')
                          return match ? (
                            <div className="rounded-md bg-muted p-2 my-2 overflow-x-auto">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </div>
                          ) : (
                            <code className="bg-muted px-1 py-0.5 rounded font-mono text-[10px]" {...props}>
                              {children}
                            </code>
                          )
                        },
                        p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({children}) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
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
                <div className="bg-muted/50 rounded-2xl rounded-tl-none p-4 border border-border/20 flex gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-3 bg-muted/50 border-t border-border/20 backdrop-blur-xl">
        <div className="flex gap-2 relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about the code..."
            disabled={loading}
            className="bg-background border-border focus-visible:ring-primary/50 pr-10 h-10 rounded-xl text-xs"
          />
          <Button 
            onClick={handleSend} 
            disabled={loading || !input.trim()}
            size="icon"
            className="absolute right-1 top-1 h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 transition-all"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

