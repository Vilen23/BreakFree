"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "../ui/Button"
import { Input } from "../ui/Input"
import { Card } from "../ui/Card"
import { Send } from "lucide-react"

interface MiscChatProps {
  messages: Array<{ role: "user" | "ai"; content: string }>
  onMessage: (message: string, isUser: boolean) => void
  onComplete: () => void
}

const AI_RESPONSES = [
  "That's helpful to know. Can you tell me more about how this started?",
  "I understand. What do you think would help you most right now?",
  "Thank you for sharing. How has this been affecting your daily routine?",
  "I see. What support system do you currently have in place?",
  "That's important information. What's your biggest challenge with this?",
]

export function MiscChat({ messages, onMessage, onComplete }: MiscChatProps) {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Add user message
    onMessage(input, true)
    setInput("")
    setIsLoading(true)

    // Simulate AI response delay
    setTimeout(() => {
      const randomResponse = AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)]
      onMessage(randomResponse, false)
      setIsLoading(false)
    }, 800)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl h-[600px] flex flex-col"
    >
      <Card className="glass flex flex-col h-full p-6 space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Let's talk</h2>
          <p className="text-sm text-muted-foreground">Share your story with our AI assistant</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                  <span className="text-xl">🤖</span>
                </div>
                <p className="text-muted-foreground text-sm">Hi! I'm here to help. Tell me about your situation.</p>
              </div>
            </motion.div>
          )}

          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-br-none"
                    : "glass rounded-bl-none"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="glass px-4 py-2 rounded-lg rounded-bl-none">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ delay: i * 0.1, duration: 0.6, repeat: Number.POSITIVE_INFINITY }}
                      className="w-2 h-2 bg-primary rounded-full"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="glass border-border/50 focus:border-accent/50"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {/* Complete button */}
        {messages.length >= 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button onClick={onComplete} variant="outline" className="w-full bg-transparent">
              Continue to Summary
            </Button>
          </motion.div>
        )}
      </Card>
    </motion.div>
  )
}
