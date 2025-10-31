"use client"

import { motion } from "framer-motion"
import { Card } from "../ui/Card"

interface AddictionSelectorProps {
  onSelect: (addiction: string) => void
}

const ADDICTIONS = [
  { id: "phone", label: "Phone", icon: "📱" },
  { id: "gaming", label: "Gaming", icon: "🎮" },
  { id: "social", label: "Social Media", icon: "📲" },
  { id: "alcohol", label: "Alcohol", icon: "🍷" },
  { id: "nicotine", label: "Nicotine", icon: "🚬" },
  { id: "other", label: "Other", icon: "✨" },
]

export function AddictionSelector({ onSelect }: AddictionSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl"
    >
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-2"
        >
          <h2 className="text-3xl font-bold">What brings you here?</h2>
          <p className="text-muted-foreground">Select the addiction you'd like to address</p>
        </motion.div>

        {/* Grid of addiction cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, staggerChildren: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          {ADDICTIONS.map((addiction, index) => (
            <motion.div
              key={addiction.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card
                onClick={() => onSelect(addiction.label)}
                className="glass cursor-pointer p-6 flex flex-col items-center justify-center gap-3 h-32 transition-all duration-300 delay-200 hover:border-accent/60 hover:ring-2 hover:ring-accent/60 hover:ring-offset-2 hover:shadow-lg hover:shadow-accent/20"
              >
                <span className="text-4xl">{addiction.icon}</span>
                <span className="font-semibold text-sm text-center">{addiction.label}</span>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  )
}
