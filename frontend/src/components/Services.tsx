import { ServicesCard } from "./ui/ServicesCard"
import { useNavigate } from "react-router-dom"

export const OurServicesSection = () => {
  const navigate = useNavigate()
  return (
    <div id='services' className="bg-white py-20 pt-0 px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Our Services
          </h2>
          <p className="text-xl text-gray-600">
            Gentle tools to support your recovery journey.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Smart Journaling Card */}
          <ServicesCard
            onClick={() => navigate("/journal", { replace: true })}
            className="cursor-pointer"
            title="Smart Journaling"
            description="Write freely and let AI detect your emotions instantly."
            features={["Emotion chips", "Auto-save", "Privacy first"]}
            buttonText="Try Now"
            image="/smartjournaling.jpeg"
          />

          {/* Daily Plans Card */}
          <ServicesCard
            onClick={() => navigate("/daily-tasks", { replace: true })}
            className="cursor-pointer"
            title="Daily Plans"
            description="Receive gentle, achievable tasks tailored to your mood."
            features={["Daily plans", "Mood tracking", "Relapse alerts"]}
            buttonText="Try Now"
            image="/dailyplans.jpeg"
          />

          {/* Progress Tracking Card */}
          <ServicesCard
            title="Progress Tracking"
            description="Track your progress and stay motivated."
            features={["Progress tracking", "Mood tracking", "Relapse alerts"]}
            buttonText="Try Now"
            image="/progresstracking.jpeg"
          />
        </div>
      </div>
    </div>
  )
}
