"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { Slider } from "../ui/Slider.tsx"
import { Input } from "../ui/Input"

interface QuestionFlowProps {
  addiction: string
  answers: Record<string, string | number | boolean>
  onAnswer: (questionId: string, answer: string | number | boolean) => void
  onComplete: () => void
}

interface Question {
  id: string
  title: string
  subtitle: string
  type: "slider" | "multiple-choice" | "text"
  options?: string[]
  min?: number
  max?: number
  placeholder?: string
}

const QUESTIONS: Record<string, Question[]> = {
  Phone: [
    {
      id: "usage-hours",
      title: "Daily Usage",
      subtitle: "How many hours per day do you spend on your phone?",
      type: "slider",
      min: 0,
      max: 24,
    },
    {
      id: "impact",
      title: "Impact Level",
      subtitle: "How much is it affecting your daily life?",
      type: "multiple-choice",
      options: ["Minimal", "Moderate", "Significant", "Severe"],
    },
    {
      id: "motivation",
      title: "Your Goal",
      subtitle: "What do you want to achieve?",
      type: "text",
      placeholder: "e.g., Reduce screen time, improve focus...",
    },
  ],
  Gaming: [
    {
      id: "gaming-hours",
      title: "Gaming Time",
      subtitle: "How many hours per day do you game?",
      type: "slider",
      min: 0,
      max: 24,
    },
    {
      id: "gaming-impact",
      title: "Life Impact",
      subtitle: "How is gaming affecting your responsibilities?",
      type: "multiple-choice",
      options: ["Not at all", "Somewhat", "Quite a bit", "Severely"],
    },
    {
      id: "gaming-goal",
      title: "Recovery Goal",
      subtitle: "What outcome do you want?",
      type: "text",
      placeholder: "e.g., Balance gaming with work, quit entirely...",
    },
  ],
  "Social Media": [
    {
      id: "social-hours",
      title: "Social Media Time",
      subtitle: "How many hours per day on social media?",
      type: "slider",
      min: 0,
      max: 24,
    },
    {
      id: "social-impact",
      title: "Mental Health Impact",
      subtitle: "How does it affect your mental health?",
      type: "multiple-choice",
      options: ["Positive", "Neutral", "Negative", "Very Negative"],
    },
    {
      id: "social-goal",
      title: "Your Intention",
      subtitle: "What do you want to change?",
      type: "text",
      placeholder: "e.g., Reduce anxiety, improve self-esteem...",
    },
  ],
  Alcohol: [
    {
      id: "alcohol-frequency",
      title: "Drinking Frequency",
      subtitle: "How often do you drink per week?",
      type: "slider",
      min: 0,
      max: 7,
    },
    {
      id: "alcohol-impact",
      title: "Health Impact",
      subtitle: "How is it affecting your health?",
      type: "multiple-choice",
      options: ["Minimal", "Moderate", "Significant", "Critical"],
    },
    {
      id: "alcohol-goal",
      title: "Recovery Goal",
      subtitle: "What do you want to achieve?",
      type: "text",
      placeholder: "e.g., Quit completely, reduce consumption...",
    },
  ],
  Nicotine: [
    {
      id: "nicotine-frequency",
      title: "Nicotine Use",
      subtitle: "How many times per day?",
      type: "slider",
      min: 0,
      max: 30,
    },
    {
      id: "nicotine-impact",
      title: "Health Concerns",
      subtitle: "What concerns you most?",
      type: "multiple-choice",
      options: ["Physical health", "Cost", "Social impact", "All of the above"],
    },
    {
      id: "nicotine-goal",
      title: "Your Goal",
      subtitle: "What outcome do you want?",
      type: "text",
      placeholder: "e.g., Quit smoking, reduce dependency...",
    },
  ],
}

export function QuestionFlow({ addiction, answers, onAnswer, onComplete }: QuestionFlowProps) {
  const questions = QUESTIONS[addiction] || QUESTIONS.Phone
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      onComplete()
    }
  }

  const handleAnswer = (value: string | number | boolean) => {
    onAnswer(currentQuestion.id, value)
    handleNext()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl"
    >
      <div className="space-y-8">
        {/* Progress bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </h3>
            <span className="text-sm font-semibold text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-primary to-accent"
            />
          </div>
        </motion.div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="glass p-8 space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">{currentQuestion.title}</h2>
                <p className="text-muted-foreground">{currentQuestion.subtitle}</p>
              </div>

              {/* Question type: Slider */}
              {currentQuestion.type === "slider" && (
                <div className="space-y-4">
                  <Slider
                    min={currentQuestion.min || 0}
                    max={currentQuestion.max || 100}
                    step={1}
                    value={[(answers[currentQuestion.id] as number) || 0]}
                    onValueChange={(value) => handleAnswer(value[0])}
                    className="w-full"
                  />
                  <div className="text-center">
                    <span className="text-3xl font-bold text-primary">{answers[currentQuestion.id] || 0}</span>
                  </div>
                </div>
              )}

              {/* Question type: Multiple choice */}
              {currentQuestion.type === "multiple-choice" && (
                <div className="grid grid-cols-2 gap-3">
                  {currentQuestion.options?.map((option) => (
                    <motion.button
                      key={option}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAnswer(option)}
                      className={`p-3 rounded-lg font-medium transition-all duration-300 ${
                        answers[currentQuestion.id] === option
                          ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30"
                          : "glass hover:border-accent/50"
                      }`}
                    >
                      {option}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Question type: Text input */}
              {currentQuestion.type === "text" && (
                <div className="space-y-3">
                  <Input
                    placeholder={currentQuestion.placeholder}
                    value={(answers[currentQuestion.id] as string) || ""}
                    onChange={(e) => onAnswer(currentQuestion.id, e.target.value)}
                    className="glass border-border/50 focus:border-accent/50"
                  />
                  <Button
                    onClick={() => handleNext()}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold"
                  >
                    Continue
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
