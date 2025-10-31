"use client"

import { motion } from "framer-motion"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import type { OnboardingData } from "../../pages/OnBoarding"

interface SummaryPanelProps {
  data: OnboardingData
  onEdit: () => void
  onProceed: () => void
}

export function SummaryPanel({ data, onEdit, onProceed }: SummaryPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl"
    >
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-2"
        >
          <h2 className="text-3xl font-bold">Your Profile Summary</h2>
          <p className="text-muted-foreground">Review your responses before proceeding</p>
        </motion.div>

        {/* Summary card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass p-8 space-y-6">
            {/* Addiction type */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Focus Area</h3>
              <p className="text-2xl font-bold text-primary">{data.addiction}</p>
            </div>

            {/* Answers */}
            {Object.keys(data.answers).length > 0 && (
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Responses</h3>
                <div className="grid gap-3">
                  {Object.entries(data.answers).map(([key, value]) => (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex justify-between items-center p-3 rounded-lg bg-muted/30"
                    >
                      <span className="text-sm font-medium capitalize">{key.replace(/-/g, " ")}</span>
                      <span className="text-sm font-semibold text-primary">{String(value)}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {data.chatMessages.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Conversation</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {data.chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`text-sm p-2 rounded ${
                        msg.role === "user" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                      }`}
                    >
                      <span className="font-semibold">{msg.role === "user" ? "You" : "AI"}:</span> {msg.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3"
        >
          <Button onClick={onEdit} variant="outline" className="flex-1 bg-transparent">
            Edit Responses
          </Button>
          <Button
            onClick={onProceed}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold"
          >
            Proceed to Analysis
          </Button>
        </motion.div>
      </div>
    </motion.div>
  )
}
