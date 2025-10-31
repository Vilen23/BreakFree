"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence } from "framer-motion"
import { WelcomeScreen } from "../components/OnBoardingSteps/WelcomeScreen"
import { AddictionSelector } from "../components/OnBoardingSteps/Addiction"
import { QuestionFlow } from "../components/OnBoardingSteps/QuestionFlow"
import { MiscChat } from "../components/OnBoardingSteps/MiscChat"
import { SummaryPanel } from "../components/OnBoardingSteps/SummaryPannel"
import { saveOnboarding } from "../lib/api"

export type OnboardingStep = "welcome" | "selector" | "questions" | "chat" | "summary"

export interface OnboardingData {
  addiction: string | null
  answers: Record<string, string | number | boolean>
  chatMessages: Array<{ role: "user" | "ai"; content: string }>
}

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome")
  const [data, setData] = useState<OnboardingData>({
    addiction: null,
    answers: {},
    chatMessages: [],
  })
  const navigate = useNavigate()

  const handleSelectAddiction = (addiction: string) => {
    setData((prev) => ({ ...prev, addiction }))
    if (addiction === "Other") {
      setCurrentStep("chat")
    } else {
      setCurrentStep("questions")
    }
  }

  const handleAnswerQuestion = (questionId: string, answer: string | number | boolean) => {
    setData((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer },
    }))
  }

  const handleChatMessage = (message: string, isUser: boolean) => {
    setData((prev) => ({
      ...prev,
      chatMessages: [...prev.chatMessages, { role: isUser ? "user" : "ai", content: message }],
    }))
  }

  const handleEditResponses = () => {
    if (data.addiction === "Other") {
      setCurrentStep("chat")
    } else {
      setCurrentStep("questions")
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F1F6] w-full flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {currentStep === "welcome" && <WelcomeScreen key="welcome" onNext={() => setCurrentStep("selector")} />}
        {currentStep === "selector" && <AddictionSelector key="selector" onSelect={handleSelectAddiction} />}
        {currentStep === "questions" && (
          <QuestionFlow
            key="questions"
            addiction={data.addiction || ""}
            answers={data.answers}
            onAnswer={handleAnswerQuestion}
            onComplete={() => setCurrentStep("summary")}
          />
        )}
        {currentStep === "chat" && (
          <MiscChat
            key="chat"
            messages={data.chatMessages}
            onMessage={handleChatMessage}
            onComplete={() => setCurrentStep("summary")}
          />
        )}
        {currentStep === "summary" && (
          <SummaryPanel
            key="summary"
            data={data}
            onEdit={handleEditResponses}
            onProceed={async () => {
              if (!data.addiction) return
              try {
                await saveOnboarding({ addiction: data.addiction, answers: data.answers })
                // Allow access to post-onboarding page only once, immediately after save
                sessionStorage.setItem("post_onboarding_allowed", "1")
                navigate("/post-onboarding", { replace: true })
              } catch (e) {
                console.error("Failed to save onboarding", e)
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
